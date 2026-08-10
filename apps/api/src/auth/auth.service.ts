import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
  ForbiddenException,
} from "@nestjs/common";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import {
  readSessionToken,
  signSessionToken,
  TOKEN_MAX_AGE_SECONDS,
  verifySessionToken,
} from "./session-token";
import {
  resolveUserPermissions,
  seedOrganizationRoles,
} from "./permissions";
import {
  addTrialDays,
  DEFAULT_SUBSCRIPTION_PLAN_ID,
  getSubscriptionPlan,
} from "../billing/subscription-plans";
import { ACCOUNT_TYPE, type AccountType } from "./account-types";
import { assertPasswordPolicy } from "./password-policy";
import { hashPassword, verifyPassword } from "./password-hash";
import { assertEmailFreeForUser } from "./email-uniqueness";
import { assertOrgSlugValid, normalizeOrgSlug } from "./org-slug";
import { escapeHtml } from "../email/escape-html";
import {
  EntitlementsService,
  type OrganizationEntitlements,
} from "../entitlements/entitlements.service";
import type { TenantContext } from "../tenancy/tenant-context";

const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;
const EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES = 15;
const PASSWORD_RESET_EXPIRY_HOURS = 1;
const DEFAULT_LOGIN_FAILURE_LIMIT = 5;
const DEFAULT_LOGIN_LOCK_MS = 60_000;
const EMAIL_FROM =
  process.env.EMAIL_FROM || "MakaziCloud <noreply@support.makazicloud.com>";

function resolveAppUrl() {
  const url = process.env.APP_BASE_URL || process.env.WEB_APP_URL;
  if (url) return url.replace(/\/+$/, "");
  if ((process.env.NODE_ENV || "development") !== "development") {
    throw new Error(
      "APP_BASE_URL is not configured - refusing to generate localhost links in production",
    );
  }
  return "http://localhost:5173";
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roleId?: string | null;
  roleName?: string | null;
  organizationId: string;
  permissions: string[];
  emailVerified?: boolean;
  accountType?: AccountType;
  tenantId?: string;
  subscription?: {
    planId: string;
    planName: string;
    status: string;
    trialEndsAt: string | null;
    subscriptionEndsAt: string | null;
    limits: {
      properties: number | null;
      units: number | null;
      teamMembers: number | null;
    };
  };
  entitlements?: OrganizationEntitlements;
  organization?: {
    name: string;
    institutionName: string;
    displayName: string;
    logoDataUrl: string | null;
    hasCustomLogo: boolean;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async signup(input: {
    email: string;
    password?: string;
    name?: string;
    organizationName?: string;
    organizationSlug?: string;
  }) {
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (!existing.emailVerifiedAt && !existing.passwordHash) {
        await this.createAndSendVerificationOtp(existing.id);
        return {
          requiresEmailVerification: true,
          requiresOtpVerification: true,
          message: "We sent a new verification code to your email.",
          email: existing.email,
        };
      }
      throw new ConflictException("An account already exists for this email");
    }


    await assertEmailFreeForUser(this.prisma, email);


    const organizationSlug = normalizeOrgSlug(
      input.organizationSlug ||
        input.organizationName ||
        email.split("@")[0],
    );
    assertOrgSlugValid(organizationSlug);

    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name,
        passwordHash: null,
        memberships: {
          create: {
            role: "OWNER",
            organization: {
              create: {
                name: input.organizationName || "Local Organization",
                slug: organizationSlug,
                subscriptionPlan: DEFAULT_SUBSCRIPTION_PLAN_ID,
                subscriptionStatus: "trialing",
                trialEndsAt: addTrialDays(),
              },
            },
          },
        },
      },
      include: { memberships: true },
    });

    const membership = user.memberships[0];


    const adminRoleId = await seedOrganizationRoles(
      this.prisma,
      membership.organizationId,
    );
    if (adminRoleId) {
      await this.prisma.membership.update({
        where: { id: membership.id },
        data: { roleId: adminRoleId },
      });
    }

    await this.createAndSendVerificationOtp(user.id);

    return {
      requiresEmailVerification: true,
      requiresOtpVerification: true,
      message: "We sent a verification code to your email.",
      email: user.email,
    };
  }

  async login(
    input: { email: string; password: string },
    meta: { ip?: string | null; userAgent?: string | null } = {},
  ) {
    const email = input.email.trim().toLowerCase();
    await this.assertLoginAllowed(email);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });

    if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
      await this.recordLoginFailure(email);
      await this.recordAuthAuditLog({
        email,
        event: "login",
        success: false,
        reason: "invalid_credentials",
        userId: user?.id,
        organizationId: user?.memberships?.[0]?.organizationId,
        role: user?.memberships?.[0]?.role,
        ...meta,
      });
      throw new UnauthorizedException("Invalid email or password");
    }

    await this.clearLoginFailures(email);

    if (!user.emailVerifiedAt) {
      await this.recordAuthAuditLog({
        email,
        event: "login",
        success: false,
        reason: "email_not_verified",
        userId: user.id,
        organizationId: user.memberships[0]?.organizationId,
        role: user.memberships[0]?.role,
        ...meta,
      });
      throw new UnauthorizedException(
        "Please verify your email and create a password before logging in.",
      );
    }

    const membership = user.memberships[0];
    if (!membership) {
      const tenant = await this.prisma.tenant.findFirst({
        where: { userId: user.id, status: { in: ["active", "Active"] } },
        select: { id: true, organizationId: true },
      });
      if (!tenant) {
        await this.recordAuthAuditLog({
          email,
          event: "login",
          success: false,
          reason: "missing_organization",
          userId: user.id,
          ...meta,
        });
        throw new UnauthorizedException("User is not assigned to an organization");
      }

      await this.recordAuthAuditLog({
        email,
        event: "login",
        success: true,
        userId: user.id,
        organizationId: tenant.organizationId,
        role: "TENANT",
        ...meta,
      });

      return this.tenantSessionResponse({
        id: user.id,
        email: user.email,
        fullName: user.name || "",
        organizationId: tenant.organizationId,
        tenantId: tenant.id,
      });
    }

    await this.recordAuthAuditLog({
      email,
      event: "login",
      success: true,
      userId: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
      ...meta,
    });

    return this.sessionResponse({
      id: user.id,
      email: user.email,
      fullName: user.name || "",
      organizationId: membership.organizationId,
      membershipRole: membership.role,
      roleId: membership.roleId,
    });
  }

  async listAuthAuditLogs(
    tenant: TenantContext,
    query: { limit?: string | number; offset?: string | number; success?: string },
  ) {
    if (tenant.role !== "OWNER") {
      throw new ForbiddenException("Only the account owner can view audit logs");
    }

    const limit = Math.min(Math.max(Number(query.limit || 100), 1), 250);
    const offset = Math.max(Number(query.offset || 0), 0);
    const success =
      query.success === "true" ? true : query.success === "false" ? false : undefined;

    const rows = await this.prisma.authAuditLog.findMany({
      where: {
        organizationId: tenant.organizationId,
        ...(success === undefined ? {} : { success }),
      },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    return {
      data: rows.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.user?.name || null,
        event: row.event,
        success: row.success,
        reason: row.reason,
        role: row.role,
        ip: row.ip,
        user_agent: row.userAgent,
        created_at: row.createdAt,
      })),
    };
  }

  private loginFailureLimit() {
    const limit = Number.parseInt(process.env.AUTH_LOGIN_FAILURE_LIMIT || "", 10);
    return Number.isFinite(limit) && limit > 0
      ? limit
      : DEFAULT_LOGIN_FAILURE_LIMIT;
  }

  private loginLockMs() {
    const lockMs = Number.parseInt(process.env.AUTH_LOGIN_LOCK_MS || "", 10);
    return Number.isFinite(lockMs) && lockMs > 0
      ? lockMs
      : DEFAULT_LOGIN_LOCK_MS;
  }

  private retryAfterSeconds(lockedUntil: Date, now = new Date()) {
    return Math.max(
      1,
      Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000),
    );
  }

  private loginLockoutException(lockedUntil: Date, now = new Date()) {
    const retryAfterSeconds = this.retryAfterSeconds(lockedUntil, now);
    return new HttpException(
      {
        message: `Too many failed attempts. Try again in ${retryAfterSeconds}s.`,
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private async assertLoginAllowed(email: string) {
    const now = new Date();
    const lockout = await this.prisma.loginAttemptLockout.findUnique({
      where: { email },
    });

    if (!lockout) return;

    if (lockout.lockedUntil && lockout.lockedUntil > now) {
      throw this.loginLockoutException(lockout.lockedUntil, now);
    }

    if (lockout.lockedUntil && lockout.failedCount >= this.loginFailureLimit()) {
      await this.prisma.loginAttemptLockout.update({
        where: { email },
        data: { failedCount: 0, lockedUntil: null },
      });
      return;
    }

    if (
      lockout.lastFailedAt &&
      now.getTime() - lockout.lastFailedAt.getTime() > this.loginLockMs()
    ) {
      await this.prisma.loginAttemptLockout.update({
        where: { email },
        data: { failedCount: 0, lockedUntil: null },
      });
    }
  }

  private async recordLoginFailure(email: string) {
    const now = new Date();
    const lockout = await this.prisma.loginAttemptLockout.findUnique({
      where: { email },
    });
    const hasRecentFailure =
      lockout?.lastFailedAt &&
      now.getTime() - lockout.lastFailedAt.getTime() <= this.loginLockMs();
    const failedCount = hasRecentFailure ? (lockout?.failedCount || 0) + 1 : 1;
    const lockedUntil =
      failedCount >= this.loginFailureLimit()
        ? new Date(now.getTime() + this.loginLockMs())
        : null;

    await this.prisma.loginAttemptLockout.upsert({
      where: { email },
      create: {
        email,
        failedCount,
        lockedUntil,
        lastFailedAt: now,
      },
      update: {
        failedCount,
        lockedUntil,
        lastFailedAt: now,
      },
    });

    if (lockedUntil) {
      throw this.loginLockoutException(lockedUntil, now);
    }
  }

  private async clearLoginFailures(email: string) {
    await this.prisma.loginAttemptLockout.deleteMany({ where: { email } });
  }

  private async recordAuthAuditLog(input: {
    email: string;
    event: string;
    success: boolean;
    reason?: string | null;
    userId?: string | null;
    organizationId?: string | null;
    role?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    try {
      await this.prisma.authAuditLog.create({
        data: {
          email: input.email,
          event: input.event,
          success: input.success,
          reason: input.reason || null,
          userId: input.userId || null,
          organizationId: input.organizationId || null,
          role: input.role || null,
          ip: input.ip || null,
          userAgent: input.userAgent || null,
        },
      });
    } catch (err) {
      console.warn("Auth audit log failed:", err);
    }
  }

  async me(token?: string) {
    if (!token) return { user: null };

    const payload = verifySessionToken(token);
    if (!payload) return { user: null };

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      include: { memberships: { include: { customRole: true } } },
    });

    if (!user) return { user: null };


    const membership = user.memberships.find(
      (m) => m.organizationId === payload.organizationId,
    );

    if (!membership) {
      const tenant = await this.prisma.tenant.findFirst({
        where: {
          userId: user.id,
          organizationId: payload.organizationId,
          status: { in: ["active", "Active"] },
        },
        select: { id: true, organizationId: true },
      });
      if (!tenant) return { user: null };


      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.name || "",
          role: "TENANT",
          accountType: ACCOUNT_TYPE.TENANT,
          tenantId: tenant.id,
          organizationId: tenant.organizationId,
          emailVerified: Boolean(user.emailVerifiedAt),
          permissions: [],
        },
      };
    }

    const permissions = await resolveUserPermissions(this.prisma, {
      role: membership.role,
      roleId: membership.roleId,
      organizationId: membership.organizationId,
    });
    const [subscription, organization, entitlements] = await Promise.all([
      this.getSubscriptionSnapshot(membership.organizationId),
      this.getOrganizationBranding(membership.organizationId),
      this.entitlements.getOrganizationEntitlements(membership.organizationId),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.name || "",
        role: membership.role,
        organizationId: membership.organizationId,
        roleId: membership.roleId,
        roleName: membership.customRole?.name || null,
        accountType: ACCOUNT_TYPE.STAFF,
        emailVerified: Boolean(user.emailVerifiedAt),
        permissions,
        subscription,
        entitlements,
        organization,
      },
    };
  }

  async changePassword(
    token: string | undefined,
    input: { currentPassword?: string; newPassword?: string },
  ) {
    if (!token) throw new UnauthorizedException("Authentication is required");
    const payload = verifySessionToken(token);
    if (!payload) throw new UnauthorizedException("Authentication is required");

    const currentPassword = input.currentPassword || "";
    const newPassword = input.newPassword || "";
    assertPasswordPolicy(newPassword);

    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user?.passwordHash || !verifyPassword(currentPassword, user.passwordHash)) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(newPassword) },
    });

    return { ok: true };
  }

  async resendVerificationEmail(input: { email?: string }) {
    const email = input.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException("Email is required");

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return {
        success: true,
        message: "If an account exists, a verification email has been sent.",
      };
    }
    if (user.emailVerifiedAt) {
      return { success: true, message: "This email is already verified." };
    }

    await this.createAndSendVerificationOtp(user.id);
    return {
      success: true,
      message: "Verification code sent. Please check your inbox.",
    };
  }

  async verifySignupOtp(input: {
    email?: string;
    otp?: string;
    password?: string;
  }) {
    const email = input.email?.trim().toLowerCase();
    const otp = (input.otp || "").replace(/\D/g, "");
    if (!email) throw new BadRequestException("Email is required");
    if (!/^\d{6}$/.test(otp)) {
      throw new BadRequestException("Enter the 6-digit verification code");
    }
    assertPasswordPolicy(input.password);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });
    if (!user) throw new NotFoundException("Account not found");

    const verification = await this.prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        tokenHash: this.hashToken(otp),
        usedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
    if (!verification) {
      throw new BadRequestException("Invalid verification code");
    }
    if (verification.expiresAt < new Date()) {
      throw new BadRequestException("This verification code has expired");
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new BadRequestException("User is not assigned to an organization");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashPassword(input.password || ""),
          emailVerifiedAt: user.emailVerifiedAt || new Date(),
        },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          id: { not: verification.id },
        },
        data: { usedAt: new Date() },
      }),
    ]);

    return this.sessionResponse({
      id: user.id,
      email: user.email,
      fullName: user.name || "",
      organizationId: membership.organizationId,
      membershipRole: membership.role,
      roleId: membership.roleId,
    });
  }

  async requestPasswordReset(input: { email?: string }) {
    const email = input.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException("Email is required");

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return {
        success: true,
        message: "If an account exists, a password reset link has been sent.",
      };
    }

    await this.createAndSendPasswordResetEmail(user.id);
    return {
      success: true,
      message: "Password reset link sent. Please check your inbox.",
    };
  }

  async resetPasswordWithToken(input: { token?: string; password?: string }) {
    const token = input.token;
    if (!token) throw new BadRequestException("Reset token is required");
    assertPasswordPolicy(input.password);

    const reset = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: true },
    });
    if (!reset) throw new NotFoundException("Reset link not found");
    if (reset.usedAt) {
      throw new BadRequestException("This reset link has already been used");
    }
    if (reset.expiresAt < new Date()) {
      throw new BadRequestException("This reset link has expired");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: {
          passwordHash: hashPassword(input.password || ""),
          emailVerifiedAt: reset.user.emailVerifiedAt || new Date(),
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: {
          userId: reset.userId,
          usedAt: null,
          id: { not: reset.id },
        },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true, message: "Password updated successfully." };
  }

  async verifyEmail(token: string | undefined) {
    if (!token) throw new BadRequestException("Verification token is required");

    const verification = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: { include: { memberships: true } } },
    });
    if (!verification) throw new NotFoundException("Verification link not found");
    if (verification.usedAt) {
      throw new BadRequestException("This verification link has already been used");
    }
    if (verification.expiresAt < new Date()) {
      throw new BadRequestException("This verification link has expired");
    }

    const membership = verification.user.memberships[0];
    if (!membership) {
      throw new BadRequestException("User is not assigned to an organization");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return this.sessionResponse({
      id: verification.user.id,
      email: verification.user.email,
      fullName: verification.user.name || "",
      organizationId: membership.organizationId,
      membershipRole: membership.role,
      roleId: membership.roleId,
    });
  }

  createCookie(token: string) {
    return `makazicloud_session=${token}; HttpOnly; Path=/; Max-Age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax${this.cookieSuffix()}`;
  }

  clearCookie() {
    return `makazicloud_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${this.cookieSuffix()}`;
  }


  private cookieSuffix() {
    return (process.env.NODE_ENV || "development") === "development" ? "" : "; Secure";
  }

  readToken(cookieHeader?: string) {
    return readSessionToken(cookieHeader);
  }

  private async sessionResponse(input: {
    id: string;
    email: string;
    fullName: string;
    organizationId: string;
    membershipRole: string;
    roleId: string | null;
  }) {
    const permissions = await resolveUserPermissions(this.prisma, {
      role: input.membershipRole,
      roleId: input.roleId,
      organizationId: input.organizationId,
    });
    const [subscription, organization, customRole, entitlements] = await Promise.all([
      this.getSubscriptionSnapshot(input.organizationId),
      this.getOrganizationBranding(input.organizationId),
      input.roleId
        ? this.prisma.role.findFirst({
            where: { id: input.roleId, organizationId: input.organizationId },
            select: { name: true },
          })
        : Promise.resolve(null),
      this.entitlements.getOrganizationEntitlements(input.organizationId),
    ]);

    const user: AuthUser = {
      id: input.id,
      email: input.email,
      fullName: input.fullName,
      role: input.membershipRole,
      roleId: input.roleId,
      roleName: customRole?.name || null,
      organizationId: input.organizationId,
      emailVerified: true,
      accountType: ACCOUNT_TYPE.STAFF,
      permissions,
      subscription,
      entitlements,
      organization,
    };

    return {
      user,
      token: signSessionToken({
        userId: input.id,
        organizationId: input.organizationId,
        exp: Math.floor(Date.now() / 1000) + TOKEN_MAX_AGE_SECONDS,
      }),
    };
  }

  private async tenantSessionResponse(input: {
    id: string;
    email: string;
    fullName: string;
    organizationId: string;
    tenantId: string;
  }) {
    return {
      user: {
        id: input.id,
        email: input.email,
        fullName: input.fullName,
        role: "TENANT",
        accountType: ACCOUNT_TYPE.TENANT,
        tenantId: input.tenantId,
        organizationId: input.organizationId,
        emailVerified: true,
        permissions: [],
      },
      token: signSessionToken({
        userId: input.id,
        organizationId: input.organizationId,
        exp: Math.floor(Date.now() / 1000) + TOKEN_MAX_AGE_SECONDS,
      }),
    };
  }

  private async getSubscriptionSnapshot(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
      },
    });
    const plan = getSubscriptionPlan(organization?.subscriptionPlan);

    return {
      planId: plan.id,
      planName: plan.name,
      status: organization?.subscriptionStatus || "trialing",
      trialEndsAt: organization?.trialEndsAt?.toISOString() || null,
      subscriptionEndsAt: organization?.subscriptionEndsAt?.toISOString() || null,
      limits: plan.limits,
    };
  }

  private async getOrganizationBranding(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        slug: true,
        name: true,
        institutionName: true,
        logoDataUrl: true,
      },
    });
    const name = organization?.name?.trim() || "MakaziCloud Property Management";
    const institutionName = organization?.institutionName?.trim() || name;
    return {
      slug: organization?.slug || null,
      name,
      institutionName,
      displayName: institutionName || name,
      logoDataUrl: organization?.logoDataUrl || null,
      hasCustomLogo: Boolean(organization?.logoDataUrl),
    };
  }

  private async createAndSendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const token = randomBytes(32).toString("base64url");
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(
          Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000,
        ),
      },
    });

    const verifyUrl = `${resolveAppUrl()}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;
    const emailResult = await this.sendVerificationEmail({
      to: user.email,
      fullName: user.name,
      verifyUrl,
    });
    if (!emailResult.sent) {
      throw new BadRequestException(emailResult.reason);
    }
  }

  private async createAndSendVerificationOtp(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(otp),
        expiresAt: new Date(
          Date.now() + EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES * 60 * 1000,
        ),
      },
    });

    const emailResult = await this.sendVerificationOtpEmail({
      to: user.email,
      fullName: user.name,
      otp,
    });
    if (!emailResult.sent) {
      throw new BadRequestException(emailResult.reason);
    }
  }

  private async createAndSendPasswordResetEmail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const token = randomBytes(32).toString("base64url");
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(
          Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000,
        ),
      },
    });

    const resetUrl = `${resolveAppUrl()}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;
    const emailResult = await this.sendPasswordResetEmail({
      to: user.email,
      fullName: user.name,
      resetUrl,
    });
    if (!emailResult.sent) {
      throw new BadRequestException(emailResult.reason);
    }
  }

  private async sendVerificationEmail(args: {
    to: string;
    fullName?: string | null;
    verifyUrl: string;
  }) {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return { sent: false, reason: "RESEND_API_KEY is not configured." };
    }

    const safeName = escapeHtml(args.fullName || "there");
    const safeUrl = escapeHtml(args.verifyUrl);
    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
      <div style="background:#0369a1;color:white;padding:24px;text-align:center">
        <h2 style="margin:0;letter-spacing:0.05em">VERIFY YOUR EMAIL</h2>
        <p style="margin:8px 0 0;font-size:13px;opacity:0.9">MakaziCloud account access</p>
      </div>
      <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb">
        <p>Hi ${safeName},</p>
        <p>Confirm your email address to activate your MakaziCloud account.</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${safeUrl}" style="background:#0369a1;color:white;padding:14px 32px;text-decoration:none;font-weight:bold;letter-spacing:0.08em;display:inline-block">VERIFY EMAIL</a>
        </p>
        <p style="font-size:12px;color:#6b7280">Or paste this link into your browser:<br><span style="word-break:break-all">${safeUrl}</span></p>
        <p style="font-size:12px;color:#6b7280;margin-top:24px">This link expires in ${EMAIL_VERIFICATION_EXPIRY_HOURS} hours.</p>
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
          from: EMAIL_FROM,
          to: args.to,
          subject: "Verify your MakaziCloud account",
          html,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          sent: false,
          reason: payload?.message || "Resend rejected the request",
        };
      }
      return { sent: true, reason: null };
    } catch (err: any) {
      return { sent: false, reason: err?.message || "Email request failed" };
    }
  }

  private async sendVerificationOtpEmail(args: {
    to: string;
    fullName?: string | null;
    otp: string;
  }) {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return { sent: false, reason: "RESEND_API_KEY is not configured." };
    }

    const safeName = escapeHtml(args.fullName || "there");
    const safeOtp = escapeHtml(args.otp);
    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
      <div style="background:#0369a1;color:white;padding:24px;text-align:center">
        <h2 style="margin:0;letter-spacing:0.05em">VERIFY YOUR ACCOUNT</h2>
        <p style="margin:8px 0 0;font-size:13px;opacity:0.9">MakaziCloud account access</p>
      </div>
      <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb">
        <p>Hi ${safeName},</p>
        <p>Use this code to verify your email address and create your MakaziCloud password.</p>
        <p style="text-align:center;margin:32px 0">
          <span style="display:inline-block;background:white;border:1px solid #d1d5db;padding:16px 24px;font-size:32px;font-weight:bold;letter-spacing:0.24em">${safeOtp}</span>
        </p>
        <p style="font-size:12px;color:#6b7280;margin-top:24px">This code expires in ${EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES} minutes. If you did not request it, you can ignore this email.</p>
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
          from: EMAIL_FROM,
          to: args.to,
          subject: "Your MakaziCloud verification code",
          html,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          sent: false,
          reason: payload?.message || "Resend rejected the request",
        };
      }
      return { sent: true, reason: null };
    } catch (err: any) {
      return { sent: false, reason: err?.message || "Email request failed" };
    }
  }

  private async sendPasswordResetEmail(args: {
    to: string;
    fullName?: string | null;
    resetUrl: string;
  }) {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return { sent: false, reason: "RESEND_API_KEY is not configured." };
    }

    const safeName = escapeHtml(args.fullName || "there");
    const safeUrl = escapeHtml(args.resetUrl);
    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
      <div style="background:#1d4ed8;color:white;padding:24px;text-align:center">
        <h2 style="margin:0;letter-spacing:0.05em">RESET YOUR PASSWORD</h2>
        <p style="margin:8px 0 0;font-size:13px;opacity:0.9">MakaziCloud account security</p>
      </div>
      <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb">
        <p>Hi ${safeName},</p>
        <p>We received a request to reset your MakaziCloud password. Use the button below to set a new password.</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${safeUrl}" style="background:#1d4ed8;color:white;padding:14px 32px;text-decoration:none;font-weight:bold;letter-spacing:0.08em;display:inline-block">RESET PASSWORD</a>
        </p>
        <p style="font-size:12px;color:#6b7280">Or paste this link into your browser:<br><span style="word-break:break-all">${safeUrl}</span></p>
        <p style="font-size:12px;color:#6b7280;margin-top:24px">This link expires in ${PASSWORD_RESET_EXPIRY_HOURS} hour. If you did not request it, you can ignore this email.</p>
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
          from: EMAIL_FROM,
          to: args.to,
          subject: "Reset your MakaziCloud password",
          html,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          sent: false,
          reason: payload?.message || "Resend rejected the request",
        };
      }
      return { sent: true, reason: null };
    } catch (err: any) {
      return { sent: false, reason: err?.message || "Email request failed" };
    }
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}
