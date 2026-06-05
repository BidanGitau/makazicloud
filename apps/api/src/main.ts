import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "express";
import { createHash } from "node:crypto";

import { AppModule } from "./app.module";

const bodyLimit = process.env.API_BODY_LIMIT || "1mb";

function buildCorsOriginCheck() {
  const explicit = new Set(
    [
      process.env.WEB_ORIGIN ?? "http://localhost:5173",
      ...(process.env.WEB_ALLOWED_HOSTS?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) ?? []),
    ],
  );

  return (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) => {

    if (!origin) return cb(null, true);
    if (explicit.has(origin)) return cb(null, true);
    try {
      const { hostname } = new URL(origin);
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return cb(null, true);
      }
    } catch {

    }
    return cb(new Error(`Origin ${origin} not allowed by CORS policy`), false);
  };
}

function weakEtagFor(body: unknown) {
  const value = Buffer.isBuffer(body)
    ? body
    : typeof body === "string"
      ? body
      : JSON.stringify(body);
  return `W/"${createHash("sha1").update(value).digest("base64url")}"`;
}

function applyConditionalGetCaching(app: any) {
  const express = app.getHttpAdapter().getInstance();
  express.use((req: any, res: any, next: () => void) => {
    if (req.method !== "GET") return next();

    const originalSend = res.send.bind(res);
    res.send = (body: unknown) => {
      if (res.statusCode !== 200 || body === undefined || res.getHeader("ETag")) {
        return originalSend(body);
      }

      const etag = weakEtagFor(body);
      res.setHeader("ETag", etag);
      res.setHeader("Cache-Control", "private, must-revalidate");
      res.vary("Origin");
      res.vary("Cookie");

      if (req.headers["if-none-match"] === etag) {
        return res.status(304).end();
      }

      return originalSend(body);
    };

    return next();
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  app.enableCors({
    origin: buildCorsOriginCheck(),
    credentials: true,
  });
  applyConditionalGetCaching(app);
  app.setGlobalPrefix("api");

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000);
}

void bootstrap();
