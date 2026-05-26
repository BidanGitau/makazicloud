import { Body, Controller, Get, Post, Headers, Res, UseGuards } from "@nestjs/common";
import { SkipThrottle, Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { Response } from "express";

import { AuthService } from "./auth.service";


@Controller("auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  @Throttle({ auth: { limit: 60, ttl: 60_000 } })
  async signup(@Body() body: any, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.signup(body);
    response.setHeader("set-cookie", this.authService.createCookie(result.token));
    return { user: result.user };
  }

  @Post("login")
  @Throttle({ auth: { limit: 60, ttl: 60_000 } })
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
  @Throttle({ auth: { limit: 60, ttl: 60_000 } })
  password(
    @Headers("cookie") cookieHeader: string | undefined,
    @Body() body: { currentPassword?: string; newPassword?: string },
  ) {
    return this.authService.changePassword(this.authService.readToken(cookieHeader), body);
  }
}
