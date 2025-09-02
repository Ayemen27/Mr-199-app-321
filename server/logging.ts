import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: undefined, // لا تُضمّن pid/hostname لتقليل الضوضاء
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers["x-request-id"]?.toString() || randomUUID(),
  customLogLevel: (res, err) => (err ? "error" : (res.statusCode || 200) >= 500 ? "error" : (res.statusCode || 200) >= 400 ? "warn" : "info"),
  serializers: {
    req(req) { return { id: req.id, method: req.method, url: req.url }; },
    res(res) { return { statusCode: res.statusCode || 200 }; },
  },
});