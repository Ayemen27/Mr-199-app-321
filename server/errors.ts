import type { Request, Response, NextFunction } from "express";
import { logger } from "./logging.js";

export class AppError extends Error {
  status: number; 
  code: string; 
  details?: unknown;
  
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message); 
    this.status = status; 
    this.code = code; 
    this.details = details;
  }
}

export class AuthError extends AppError {
  constructor(message = "غير مصرح") { 
    super(401, "AUTH_ERROR", message); 
  }
}

export class ValidationError extends AppError {
  constructor(message = "بيانات غير صالحة", details?: unknown) { 
    super(400, "VALIDATION_ERROR", message, details); 
  }
}

export class NotFoundError extends AppError {
  constructor(message = "غير موجود") { 
    super(404, "NOT_FOUND", message); 
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = "خطأ في خدمة خارجية") { 
    super(502, "EXTERNAL_SERVICE_ERROR", message); 
  }
}

// معالج الأخطاء العام
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = err?.status ?? 500;
  const code   = err?.code   ?? "INTERNAL_ERROR";
  const body = {
    ok: false,
    code,
    message: err?.message || "حدث خطأ غير متوقع.",
    requestId: (req as any).id,
    details: process.env.NODE_ENV === "production" ? undefined : err?.details ?? String(err),
  };
  
  if (status >= 500) {
    logger.error({ err, requestId: (req as any).id }, "Unhandled error");
  } else {
    logger.warn({ err, requestId: (req as any).id }, "Handled error");
  }
  
  res.status(status).json(body);
}