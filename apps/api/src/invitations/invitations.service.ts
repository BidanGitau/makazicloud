import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";
import { resolveUserPermissions } from "../auth/permissions";
import { signSessionToken, TOKEN_MAX_AGE_SECONDS } from "../auth/session-token";
import { escapeHtml } from "../email/escape-html";
import { assertEmailFreeForUser } from "../auth/email-uniqueness";

const EXPIRY_DAYS = 7;
const FROM_EMAIL =
  process.env.EMAIL_FROM || "MakaziCloud <noreply@support.makazicloud.com>";

function resolveAppUrl(): string {
  const url = process.env.APP_BASE_URL || process.env.WEB_APP_URL;
  if (url) return url.replace(/\/+$/, "");
  if ((process.env.NODE_ENV || "development") !== "development") {
    throw new InternalServerErrorException(
      "APP_BASE_URL is not configured — refusing to generate localhost links in production",
    );
  }
  return "http://localhost:5173";
}

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}


  async invite(
    tenant: TenantContext,
    createdById: string,
    input: { email: string; fullName?: string; roleId?: string | null },
  ) {
    const email = input.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException("Email is required");

    await this.assertInviterOwnsOrganization(tenant.organizationId, createdById);
    await this.assertInviteEmailAvailable(tenant.organizationId, email);

    if (input.roleId) {
      const role = await this.prisma.role.findFirst({
        where: { id: input.roleId, organizationId: tenant.organizationId },
        select: { id: true },
      });
      if (!role) throw new NotFoundException("Role not found");
    }


    await this.prisma.invitation.deleteMany({
      where: {
        organizationId: tenant.organizationId,
        email,
        acceptedAt: null,
      },
    });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId: tenant.organizationId,
        email,
        fullName: input.fullName?.trim() || null,
        roleId: input.roleId || null,
        token,
        expiresAt,
        createdById,
      },
    });

    const acceptUrl = `${resolveAppUrl()}/accept-invite?token=${token}`;
    const emailResult = await this.sendInviteEmail({
      email,
      fullName: invitation.fullName,
      organizationId: tenant.organizationId,
      acceptUrl,
    });

    return {
      id: invitation.id,
      email: invitation.email,
      fullName: invitation.fullName,
      expiresAt: invitation.expiresAt,
      acceptUrl,
      emailSent: emailResult.sent,
      emailError: emailResult.error,
    };
  }


  async getByToken(token: string) {
    if (!token) throw new BadRequestException("Token is required");

    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
      },
    });

    if (!invitation) throw new NotFoundException("Invitation not found");
    if (invitation.acceptedAt) {
      throw new BadRequestException("This invitation has already been used");
    }
    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException("This invitation has expired");
    }

    return {
      email: invitation.email,
      fullName: invitation.fullName,
      expiresAt: invitation.expiresAt,
      organization: invitation.organization,
    };
  }


  async accept(token: string, input: { password: string; fullName?: string }) {
    if (!token) throw new BadRequestException("Token is required");
    if (!input.password || input.password.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters");
    }

    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });
    if (!invitation) throw new NotFoundException("Invitation not found");
    if (invitation.acceptedAt) {
      throw new BadRequestException("This invitation has already been used");
    }
    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException("This invitation has expired");
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException(
        "This email is already associated with a MakaziCloud user account. Use a different email for the staff invite.",
      );
    }

    await assertEmailFreeForUser(this.prisma, invitation.email);

    const fullName = input.fullName?.trim() || invitation.fullName || null;
    const passwordHash = this.hashPassword(input.password);

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: invitation.email,
          name: fullName,
          passwordHash,
          emailVerifiedAt: new Date(),
        },
      });

      await tx.membership.create({
        data: {
          userId: created.id,
          organizationId: invitation.organizationId,
          role: "VIEWER",
          roleId: invitation.roleId || null,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return { userId: created.id };
    });


    const user = await this.prisma.user.findUnique({
      where: { id: result.userId },
    });
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: result.userId,
        organizationId: invitation.organizationId,
      },
    });
    if (!user || !membership) {
      throw new BadRequestException("Failed to finalize invitation");
    }

    const permissions = await resolveUserPermissions(this.prisma, {
      role: membership.role,
      roleId: membership.roleId,
      organizationId: membership.organizationId,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.name || "",
        role: membership.role,
        organizationId: membership.organizationId,
        roleId: membership.roleId,
        permissions,
      },
      token: signSessionToken({
        userId: user.id,
        organizationId: membership.organizationId,
        exp: Math.floor(Date.now() / 1000) + TOKEN_MAX_AGE_SECONDS,
      }),
    };
  }

  private async sendInviteEmail(args: {
    email: string;
    fullName: string | null;
    organizationId: string;
    acceptUrl: string;
  }) {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return {
        sent: false,
        error: "RESEND_API_KEY not set — share the accept URL manually.",
      };
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: args.organizationId },
      select: { name: true },
    });
    const orgName = org?.name || "MakaziCloud";

    const safeOrgName = escapeHtml(orgName);
    const safeFullName = escapeHtml(args.fullName || "there");
    const safeAcceptUrl = escapeHtml(args.acceptUrl);
    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
      <div style="background:#0369a1;color:white;padding:24px;text-align:center">
        <h2 style="margin:0;letter-spacing:0.05em">YOU'RE INVITED</h2>
        <p style="margin:8px 0 0;font-size:13px;opacity:0.9">${safeOrgName} on MakaziCloud</p>
      </div>
      <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb">
        <p>Hi ${safeFullName},</p>
        <p>You've been invited to join <strong>${safeOrgName}</strong> on MakaziCloud Property Management. Click below to set your password and finish setting up your account.</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${safeAcceptUrl}"
             style="background:#0369a1;color:white;padding:14px 32px;text-decoration:none;font-weight:bold;letter-spacing:0.08em;display:inline-block">
            ACCEPT INVITATION
          </a>
        </p>
        <p style="font-size:12px;color:#6b7280">
          Or paste this link into your browser:<br>
          <span style="word-break:break-all">${safeAcceptUrl}</span>
        </p>
        <p style="font-size:12px;color:#6b7280;margin-top:24px">
          This invitation expires in ${EXPIRY_DAYS} days. If you didn't expect this, you can safely ignore it.
        </p>
      </div>
    </body></html>`;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: args.email,
          subject: `Join ${orgName} on MakaziCloud`,
          html,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          sent: false,
          error: payload?.message || `Resend returned ${response.status}`,
        };
      }
      return { sent: true, error: null };
    } catch (err: any) {
      return { sent: false, error: err?.message || "Email request failed" };
    }
  }

  private async assertInviteEmailAvailable(organizationId: string, email: string) {
    await assertEmailFreeForUser(this.prisma, email);

    const existingUser = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      include: {
        memberships: {
          select: { organizationId: true },
        },
      },
    });

    if (!existingUser) return;

    const sameOrganization = existingUser.memberships.some(
      (membership) => membership.organizationId === organizationId,
    );
    if (sameOrganization) {
      throw new ConflictException("This user is already a member of this organization");
    }

    throw new ConflictException(
      "This email is already associated with a MakaziCloud user account. Use a different email for the staff invite.",
    );
  }

  private async assertInviterOwnsOrganization(
    organizationId: string,
    createdById: string,
  ) {
    if (!createdById) {
      throw new ForbiddenException("Only the account owner can invite members");
    }

    const ownerMembership = await this.prisma.membership.findFirst({
      where: {
        organizationId,
        userId: createdById,
        role: "OWNER",
      },
      select: { id: true },
    });

    if (!ownerMembership) {
      throw new ForbiddenException("Only the account owner can invite members");
    }
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
  }


  private verifyPassword(password: string, stored: string) {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
    return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
  }
}
