import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ENV } from "./env.js";

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization;
  const token = hdr?.startsWith("Bearer ") ? hdr.slice(7) : null;

  if (!token) return res.status(401).json({
    ok: false,
    code: "AUTH_MISSING_TOKEN",
    message: "يجب إرسال توكن المصادقة في ترويسة Authorization.",
    requestId: (req as any).id,
  });

  try {
    const secret = ENV.JWT_ACCESS_SECRET || ENV.JWT_REFRESH_SECRET;
    if (!secret) {
      return res.status(500).json({
        ok: false,
        code: "AUTH_CONFIG_ERROR",
        message: "خطأ في إعدادات المصادقة.",
        requestId: (req as any).id,
      });
    }
    
    const payload = jwt.verify(token, secret) as { sub: string };
    (req as any).userId = payload.sub;
    next();
  } catch (e) {
    return res.status(401).json({
      ok: false,
      code: "AUTH_INVALID_TOKEN",
      message: "التوكن مفقود أو منتهي أو غير صالح.",
      requestId: (req as any).id,
    });
  }
}