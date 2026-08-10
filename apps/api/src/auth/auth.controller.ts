import {
  Body,
  Controller,
  Get,
  Post,
  Headers,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { SkipThrottle, Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { Request, Response } from "express";

import { AuthService } from "./auth.service";
import { RequirePermissions } from "./permissions.decorator";
import { PermissionsGuard } from "./permissions.guard";
import { Tenant } from "../tenancy/tenant.decorator";
import type { TenantContext } from "../tenancy/tenant-context";
import { TenantGuard } from "../tenancy/tenant.guard";


@Controller("auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async signup(@Body() body: any, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.signup(body);
    if ("token" in result && typeof result.token === "string") {
      response.setHeader("set-cookie", this.authService.createCookie(result.token));
    }
    if ("requiresEmailVerification" in result) {
      response.setHeader("set-cookie", this.authService.clearCookie());
    }
    if ("user" in result) return { user: result.user };
    return result;
  }

  @Post("verification-email")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  resendVerificationEmail(@Body() body: { email?: string }) {
    return this.authService.resendVerificationEmail(body);
  }

  @Post("signup/verify-otp")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async verifySignupOtp(
    @Body() body: { email?: string; otp?: string; password?: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.verifySignupOtp(body);
    response.setHeader("set-cookie", this.authService.createCookie(result.token));
    return { user: result.user };
  }

  @Post("password-reset")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  requestPasswordReset(@Body() body: { email?: string }) {
    return this.authService.requestPasswordReset(body);
  }

  @Post("password-reset/confirm")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  confirmPasswordReset(@Body() body: { token?: string; password?: string }) {
    return this.authService.resetPasswordWithToken(body);
  }

  @Post("verify-email")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async verifyEmail(
    @Body() body: { token?: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.verifyEmail(body.token);
    response.setHeader("set-cookie", this.authService.createCookie(result.token));
    return { user: result.user };
  }

  @Post("login")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async login(
    @Body() body: any,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(body, this.requestMeta(request));
    response.setHeader("set-cookie", this.authService.createCookie(result.token));
    return { user: result.user };
  }

  @Get("audit-logs")
  @SkipThrottle()
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions("settings:manage")
  auditLogs(
    @Tenant() tenant: TenantContext,
    @Query() query: { limit?: string; offset?: string; success?: string },
  ) {
    return this.authService.listAuthAuditLogs(tenant, query);
  }

  @Post("logout")
  @SkipThrottle()
  logout(@Res({ passthrough: true }) response: Response) {
    response.setHeader("set-cookie", this.authService.clearCookie());
    return { ok: true };
  }

  @Get("me")
  @SkipThrottle()
  me(@Headers("cookie") cookieHeader?: string) {
    return this.authService.me(this.authService.readToken(cookieHeader));
  }


  @Post("password")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  password(
    @Headers("cookie") cookieHeader: string | undefined,
    @Body() body: { currentPassword?: string; newPassword?: string },
  ) {
    return this.authService.changePassword(this.authService.readToken(cookieHeader), body);
  }

  private requestMeta(request: Request) {
    const forwardedFor = request.headers["x-forwarded-for"];
    const ip =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
        ?.split(",")[0]
        ?.trim() ||
      request.ip ||
      null;
    const userAgent = request.headers["user-agent"] || null;
    return {
      ip,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    };
  }
}
