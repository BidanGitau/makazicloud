import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";
import {
  signSessionToken,
  TOKEN_MAX_AGE_SECONDS,
} from "../auth/session-token";
import { ACCOUNT_TYPE } from "../auth/account-types";
import { assertPasswordPolicy } from "../auth/password-policy";
import { hashPassword } from "../auth/password-hash";
import type { TenantPortalSession } from "./tenant-portal.guard";
import { sendPortalInviteEmail } from "./tenant-portal.email";

const EXPIRY_DAYS = 7;
const MAINTENANCE_CATEGORIES = new Set([
  "general",
  "plumbing",
  "electrical",
  "security",
  "cleaning",
]);
const MAINTENANCE_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);

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
export class TenantPortalService {
  constructor(private readonly prisma: PrismaService) {}


  buildProfile(session: TenantPortalSession) {
    return {
      id: session.tenantId,
      fullName: session.fullName,
      email: session.email,
      status: session.status,
      leaseStart: session.leaseStart,
      rentDueDate: session.rentDueDate,
      rentAmount: session.unit?.rentAmount ?? null,
      unit: session.unit
        ? {
            id: session.unit.id,
            unitNumber: session.unit.unitNumber,
            unitType: session.unit.type,
            floor: session.unit.floor,
            propertyName: session.unit.propertyName,
            blockName: session.unit.blockName,
          }
        : null,
    };
  }

  async listPayments(session: TenantPortalSession) {
    const payments = await this.prisma.payment.findMany({
      where: {
        organizationId: session.organizationId,
        tenantId: session.tenantId,
      },
      orderBy: { paymentDate: "desc" },
      include: { allocations: { orderBy: { createdAt: "asc" } } },
    });

    return payments.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      paymentDate: payment.paymentDate,
      method: payment.method,
      reference: payment.reference,
      allocations: payment.allocations.map((allocation) => ({
        id: allocation.id,
        allocationType: allocation.allocationType,
        leaseMonth: allocation.leaseMonth,
        amount: Number(allocation.amount),
        status: allocation.status,
      })),
    }));
  }

  async listArrears(session: TenantPortalSession) {
    const arrears = await this.prisma.arrear.findMany({
      where: {
        organizationId: session.organizationId,
        tenantId: session.tenantId,
      },
      orderBy: { month: "desc" },
    });

    return arrears.map((arrear) => ({
      id: arrear.id,
      month: arrear.month,
      amountDue: Number(arrear.amountDue),
      amountPaid: Number(arrear.amountPaid),
      balance: Number(arrear.amountDue) - Number(arrear.amountPaid),
      status: arrear.status,
      dueDate: arrear.dueDate,
    }));
  }

  async listMaintenanceRequests(session: TenantPortalSession) {
    const requests = await this.prisma.maintenanceRequest.findMany({
      where: {
        organizationId: session.organizationId,
        tenantId: session.tenantId,
      },
      orderBy: { createdAt: "desc" },
    });

    return requests.map((request) => ({
      id: request.id,
      category: request.category,
      title: request.title,
      description: request.description,
      priority: request.priority,
      status: request.status,
      reportedDate: request.reportedDate,
      createdAt: request.createdAt,
    }));
  }


  async getDashboard(session: TenantPortalSession) {
    const [payments, arrears, maintenance] = await Promise.all([
      this.listPayments(session),
      this.listArrears(session),
      this.listMaintenanceRequests(session),
    ]);

    return {
      profile: this.buildProfile(session),
      payments,
      arrears,
      maintenance,
    };
  }

  async createMaintenanceRequest(
    session: TenantPortalSession,
    input: { category?: string; title?: string; description?: string; priority?: string },
  ) {
    const title = input.title?.trim();
    if (!title) throw new BadRequestException("Title is required");
    if (title.length > 160) throw new BadRequestException("Title is too long");

    const requestedCategory = (input.category || "general").trim().toLowerCase();
    const category = MAINTENANCE_CATEGORIES.has(requestedCategory)
      ? requestedCategory
      : "general";
    const requestedPriority = (input.priority || "medium").trim().toLowerCase();
    const priority = MAINTENANCE_PRIORITIES.has(requestedPriority)
      ? requestedPriority
      : "medium";
    const description = input.description?.trim() || null;

    const request = await this.prisma.maintenanceRequest.create({
      data: {
        organizationId: session.organizationId,
        tenantId: session.tenantId,
        propertyId: session.propertyId,
        blockId: session.blockId,
        unitId: session.unitId,
        category,
        title,
        description,
        priority,
        status: "pending",
        reportedDate: new Date(),
      },
    });

    return {
      id: request.id,
      category: request.category,
      title: request.title,
      description: request.description,
      priority: request.priority,
      status: request.status,
      reportedDate: request.reportedDate,
      createdAt: request.createdAt,
    };
  }


  async createInvite(
    tenant: TenantContext,
    tenantId: string,
    createdById?: string,
    options: { sendEmail?: boolean } = {},
  ) {


    const shouldEmail = options.sendEmail !== false;
    const tenantRow = await this.prisma.tenant.findFirst({
      where: { id: tenantId, organizationId: tenant.organizationId },
      include: {
        organization: { select: { name: true } },
        unit: {
          include: {
            property: { select: { name: true } },
            block: { select: { name: true } },
          },
        },
      },
    });

    if (!tenantRow) throw new NotFoundException("Tenant not found");
    const email = tenantRow.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException(
        "Tenant needs an email before portal access can be enabled",
      );
    }


    await this.prisma.tenantPortalInvitation.deleteMany({
      where: {
        organizationId: tenant.organizationId,
        tenantId,
        acceptedAt: null,
      },
    });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    const invitation = await this.prisma.tenantPortalInvitation.create({
      data: {
        organizationId: tenant.organizationId,
        tenantId,
        email,
        tokenHash: this.hashToken(token),
        expiresAt,
        createdById: createdById || null,
      },
    });


    const acceptUrl = `${resolveAppUrl()}/accept-tenant-invite#token=${token}`;

    const emailResult = shouldEmail
      ? await sendPortalInviteEmail({
          to: email,
          acceptUrl,
          expiresAt,
          tenantName: tenantRow.fullName,
          organizationName: tenantRow.organization?.name || null,
          propertyName: tenantRow.unit?.property?.name || null,
          unitNumber: tenantRow.unit?.unitNumber || null,
        }).catch((err) => {


          console.error("Failed to send tenant portal invite email", err);
          return { sent: false, reason: "Email delivery failed" as const };
        })
      : { sent: false, reason: "Email disabled for this invite" as const };

    return {
      id: invitation.id,
      tenantId,
      email,
      expiresAt: invitation.expiresAt,
      acceptUrl,
      emailSent: emailResult.sent,
      emailSkippedReason: emailResult.sent ? undefined : emailResult.reason,
      tenant: {
        fullName: tenantRow.fullName,
        propertyName: tenantRow.unit?.property?.name || null,
        blockName: tenantRow.unit?.block?.name || null,
        unitNumber: tenantRow.unit?.unitNumber || null,
      },
    };
  }


  async getInviteStatus(tenant: TenantContext, tenantId: string) {
    const tenantRow = await this.prisma.tenant.findFirst({
      where: { id: tenantId, organizationId: tenant.organizationId },
      select: { id: true, email: true, userId: true },
    });
    if (!tenantRow) throw new NotFoundException("Tenant not found");

    const pending = await this.prisma.tenantPortalInvitation.findFirst({
      where: {
        organizationId: tenant.organizationId,
        tenantId,
        acceptedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: { email: true, expiresAt: true, createdAt: true },
    });

    return {
      linked: Boolean(tenantRow.userId),
      tenantEmail: tenantRow.email,
      pendingInvitation: pending
        ? {
            email: pending.email,
            expiresAt: pending.expiresAt,
            issuedAt: pending.createdAt,
            expired: pending.expiresAt < new Date(),
          }
        : null,
    };
  }

  async revokeAccess(tenant: TenantContext, tenantId: string) {
    const tenantRow = await this.prisma.tenant.findFirst({
      where: { id: tenantId, organizationId: tenant.organizationId },
      select: { id: true, userId: true },
    });
    if (!tenantRow) throw new NotFoundException("Tenant not found");

    await this.prisma.$transaction(async (tx) => {

      await tx.tenantPortalInvitation.deleteMany({
        where: {
          organizationId: tenant.organizationId,
          tenantId,
          acceptedAt: null,
        },
      });


      if (tenantRow.userId) {
        await tx.tenant.update({
          where: { id: tenantRow.id },
          data: { userId: null },
        });
      }
    });

    return { ok: true };
  }

  async lookupInvite(token: string) {
    const invitation = await this.requireUsableInvitation(token);
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: invitation.tenantId,
        organizationId: invitation.organizationId,
      },
      include: {
        organization: { select: { name: true, slug: true } },
        unit: {
          include: {
            property: { select: { name: true } },
            block: { select: { name: true } },
          },
        },
      },
    });

    if (!tenant) throw new NotFoundException("Tenant not found");

    return {
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      tenant: {
        fullName: tenant.fullName,
        propertyName: tenant.unit?.property?.name || null,
        blockName: tenant.unit?.block?.name || null,
        unitNumber: tenant.unit?.unitNumber || null,
      },
      organization: tenant.organization,
    };
  }

  async acceptInvite(token: string, input: { password: string }) {
    assertPasswordPolicy(input.password);

    const invitation = await this.requireUsableInvitation(token);
    const passwordHashValue = hashPassword(input.password);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findFirst({
        where: {
          id: invitation.tenantId,
          organizationId: invitation.organizationId,
        },
      });
      if (!tenant) throw new NotFoundException("Tenant not found");
      if (tenant.email?.trim().toLowerCase() !== invitation.email) {
        throw new BadRequestException(
          "Invitation email no longer matches this tenant",
        );
      }

      const existingUser = await tx.user.findUnique({
        where: { email: invitation.email },
        include: {
          memberships: { select: { organizationId: true } },
          tenants: { select: { id: true, organizationId: true } },
        },
      });


      if (existingUser) {
        if (existingUser.memberships.length > 0) {
          throw new ConflictException(
            "This email is already used by a management account. Use a different email for portal access.",
          );
        }
        const collidingTenant = existingUser.tenants.some(
          (link) =>
            link.organizationId === invitation.organizationId &&
            link.id !== tenant.id,
        );
        if (collidingTenant) {
          throw new ConflictException(
            "This email is already linked to another tenant in this organization",
          );
        }
      }


      if (tenant.userId && tenant.userId !== existingUser?.id) {
        const otherLinks = await tx.tenant.count({
          where: { userId: tenant.userId, id: { not: tenant.id } },
        });
        if (otherLinks === 0) {
          await tx.user.update({
            where: { id: tenant.userId },
            data: { passwordHash: null },
          });
        }
      }

      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              name: existingUser.name || tenant.fullName,
              passwordHash: passwordHashValue,
              emailVerifiedAt: new Date(),
            },
          })
        : await tx.user.create({
            data: {
              email: invitation.email,
              name: tenant.fullName,
              passwordHash: passwordHashValue,
              emailVerifiedAt: new Date(),
            },
          });

      await tx.tenant.update({
        where: { id: tenant.id },
        data: { userId: user.id },
      });

      await tx.tenantPortalInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return { user, tenant };
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.name || "",
        accountType: ACCOUNT_TYPE.TENANT,
        organizationId: invitation.organizationId,
        tenantId: result.tenant.id,
      },
      token: signSessionToken({
        userId: result.user.id,
        organizationId: invitation.organizationId,
        exp: Math.floor(Date.now() / 1000) + TOKEN_MAX_AGE_SECONDS,
      }),
    };
  }


  private async requireUsableInvitation(token: string) {


    const reject = () =>
      new BadRequestException("This invitation link is not valid");

    if (!token) throw reject();
    const invitation = await this.prisma.tenantPortalInvitation.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });

    if (!invitation) throw reject();
    if (invitation.acceptedAt) throw reject();
    if (invitation.expiresAt < new Date()) throw reject();

    return invitation;
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}
