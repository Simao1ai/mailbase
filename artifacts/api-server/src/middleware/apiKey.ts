import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { db, tenantApiKeysTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

declare global {
  namespace Express {
    interface Locals {
      isMaster: boolean;
      tenantBusiness?: string;
    }
  }
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const masterKey = process.env.MAILBASE_API_KEY;
  const provided = (req.headers["x-api-key"] as string | undefined) ?? "";

  if (!provided) {
    res.status(401).json({
      error: "Unauthorized",
      message: "A valid API key is required. Pass it via the x-api-key header.",
    });
    return;
  }

  // Master key — full unrestricted access
  if (!masterKey || provided === masterKey) {
    res.locals.isMaster = true;
    return next();
  }

  // Check per-tenant key (async DB lookup)
  const hash = createHash("sha256").update(provided).digest("hex");
  db.select()
    .from(tenantApiKeysTable)
    .where(and(eq(tenantApiKeysTable.keyHash, hash), eq(tenantApiKeysTable.isActive, true)))
    .limit(1)
    .then(([key]) => {
      if (key) {
        res.locals.isMaster = false;
        res.locals.tenantBusiness = key.business;
        // Fire-and-forget last used timestamp
        db.update(tenantApiKeysTable)
          .set({ lastUsedAt: new Date() })
          .where(eq(tenantApiKeysTable.id, key.id))
          .execute()
          .catch(() => {});
        return next();
      }
      res.status(401).json({
        error: "Unauthorized",
        message: "A valid API key is required. Pass it via the x-api-key header.",
      });
    })
    .catch(() => {
      res.status(500).json({ error: "Internal server error during authentication" });
    });
}

export function requireMasterKey(req: Request, res: Response, next: NextFunction) {
  if (!res.locals.isMaster) {
    res.status(403).json({
      error: "Forbidden",
      message: "This endpoint requires the master API key.",
    });
    return;
  }
  next();
}
