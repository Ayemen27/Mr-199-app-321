import { z } from "zod";

// للتطوير فقط - نظام مرن لمتغيرات البيئة
const isDevelopment = process.env.NODE_ENV !== "production";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
});

// تحليل متغيرات البيئة مع معالجة الأخطاء
let ENV: z.infer<typeof envSchema>;

try {
  ENV = envSchema.parse(process.env);
  console.log("✅ تم التحقق من متغيرات البيئة بنجاح");
} catch (error) {
  console.warn("⚠️ بعض متغيرات البيئة مفقودة، سيتم استخدام قيم افتراضية للتطوير");
  ENV = {
    NODE_ENV: process.env.NODE_ENV as any || "development",
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "dev-jwt-secret-key-that-is-32-chars",
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-key-32-chars",
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "dev-encryption-key-32-chars-long",
    DATABASE_URL: process.env.DATABASE_URL,
  };
}

export { ENV };