import { Body, Controller, Get, Post, Headers, Res, UseGuards } from "@nestjs/common";
import { SkipThrottle, Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { Response } from "express";

import { AuthService } from "./auth.service";


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
  async login(@Body() body: any, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(body);
    response.setHeader("set-cookie", this.authService.createCookie(result.token));
    return { user: result.user };
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
}
