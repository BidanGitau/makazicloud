import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";

import { readSessionToken, verifySessionToken } from "./session-token";

export type CurrentUserInfo = {
  userId: string;
  organizationId: string;
};

type AuthedRequest = Request & { currentUser?: CurrentUserInfo };


export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserInfo => {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    if (request.currentUser) return request.currentUser;

    const payload = verifySessionToken(readSessionToken(request.headers.cookie));
    if (!payload) {
      throw new UnauthorizedException("Authentication is required");
    }

    request.currentUser = {
      userId: payload.userId,
      organizationId: payload.organizationId,
    };
    return request.currentUser;
  },
);
