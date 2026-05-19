import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
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

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organizationId: string;
  permissions: string[];
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
  constructor(private readonly prisma: PrismaService) {}

  async signup(input: {
    email: string;
    password: string;
    name?: string;
    organizationName?: string;
    organizationSlug?: string;
  }) {
    const email = input.email.trim().toLowerCase();
    assertPasswordPolicy(input.password);
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException("An account already exists for this email");
    }
    // Strict email uniqueness — a staff signup can't shadow an existing
    // tenant who's using this email for portal access.
    await assertEmailFreeForUser(this.prisma, email);

    // Slug is the tenant identifier sent as `x-tenant-slug`. Derive from
    // explicit input → org name → email local-part, then validate against
    // the reserved/DNS-shape rules. Uniqueness is enforced by
    // Organization.slug @unique at the DB level.
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
        passwordHash: hashPassword(input.password),
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

    // Seed the catalog of permissions + default roles for the new org and
    // assign the Admin role to the owner. This is a no-op on existing orgs
    // so it's safe to re-run.
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

    return this.sessionResponse({
      id: user.id,
      email: user.email,
      fullName: user.name || "",
      organizationId: membership.organizationId,
      membershipRole: "OWNER",
      roleId: adminRoleId,
    });
  }

  async login(input: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
      include: { memberships: true },
    });

    if (!user?.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const membership = user.memberships[0];
    if (!membership) {
      const tenant = await this.prisma.tenant.findFirst({
        where: { userId: user.id, status: { in: ["active", "Active"] } },
        select: { id: true, organizationId: true },
      });
      if (!tenant) {
        throw new UnauthorizedException("User is not assigned to an organization");
      }

      return this.tenantSessionResponse({
        id: user.id,
        email: user.email,
        fullName: user.name || "",
        organizationId: tenant.organizationId,
        tenantId: tenant.id,
      });
    }

    return this.sessionResponse({
      id: user.id,
      email: user.email,
      fullName: user.name || "",
      organizationId: membership.organizationId,
      membershipRole: membership.role,
      roleId: membership.roleId,
    });
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

    // Only honor a membership that matches the org baked into the token.
    // Falling back to memberships[0] would silently switch org context if
    // the token's org link has been revoked — caller would get a session
    // for a different org than the cookie claims.
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

      // Tenants don't act on subscription state — skip the extra query.
      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.name || "",
          role: "TENANT",
          accountType: ACCOUNT_TYPE.TENANT,
          tenantId: tenant.id,
          organizationId: tenant.organizationId,
          permissions: [],
        },
      };
    }

    const permissions = await resolveUserPermissions(this.prisma, {
      role: membership.role,
      roleId: membership.roleId,
      organizationId: membership.organizationId,
    });
    const [subscription, organization] = await Promise.all([
      this.getSubscriptionSnapshot(membership.organizationId),
      this.getOrganizationBranding(membership.organizationId),
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
        permissions,
        subscription,
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

  createCookie(token: string) {
    return `makazicloud_session=${token}; HttpOnly; Path=/; Max-Age=${TOKEN_MAX_AGE_SECONDS}; SameSite=Lax${this.cookieSuffix()}`;
  }

  clearCookie() {
    return `makazicloud_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${this.cookieSuffix()}`;
  }

  // Add `Secure` outside development so cookies are never sent over plain HTTP
  // in production / staging. Local dev (http://localhost) stays cookie-friendly.
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
    const [subscription, organization] = await Promise.all([
      this.getSubscriptionSnapshot(input.organizationId),
      this.getOrganizationBranding(input.organizationId),
    ]);

    const user: AuthUser = {
      id: input.id,
      email: input.email,
      fullName: input.fullName,
      role: input.membershipRole,
      organizationId: input.organizationId,
      accountType: ACCOUNT_TYPE.STAFF,
      permissions,
      subscription,
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
}
