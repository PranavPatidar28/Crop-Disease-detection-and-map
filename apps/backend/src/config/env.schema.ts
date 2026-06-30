import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default(''),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('crop-disease/reports'),

  FASTAPI_URL: z.string().url().default('http://localhost:8000'),

  /** Hugging Face crop-disease inference base URL (used when AI_PROVIDER=huggingface). */
  HF_URL: z.string().url().default('https://prateek712-cpl-crop-disease-api.hf.space'),

  AI_PROVIDER: z.enum(['mock', 'fastapi', 'huggingface']).default('mock'),

  // Outbreak engine thresholds (v7). Tunable via env without code changes.
  OUTBREAK_CREATE_THRESHOLD: z.coerce.number().int().min(2).default(5),
  OUTBREAK_CREATE_RADIUS_KM: z.coerce.number().min(0.1).default(3),
  OUTBREAK_ESCALATE_THRESHOLD: z.coerce.number().int().min(2).default(10),
  OUTBREAK_ESCALATE_RADIUS_KM: z.coerce.number().min(0.1).default(5),
  OUTBREAK_HIGH_REPORT_COUNT: z.coerce.number().int().min(2).default(20),
  OUTBREAK_HIGH_SEVERITY_COUNT: z.coerce.number().int().min(1).default(5),
  OUTBREAK_DEACTIVATE_HOURS: z.coerce.number().min(0.05).default(48),

  // Notifications (v8)
  EXPO_ACCESS_TOKEN: z.string().optional().default(''),
  NOTIFICATION_NEARBY_BUFFER_KM: z.coerce.number().min(0).default(5),
  NOTIFICATION_DEDUP_WINDOW_HOURS: z.coerce.number().min(0.1).default(24),
  NOTIFICATION_REPORT_TRIGGER_RADIUS_KM: z.coerce.number().min(0.1).default(5),
  PLOT_MAX_PER_USER: z.coerce.number().int().min(1).default(20),

  // Demo mode (v10) — speeds up mock AI, biases outputs to severe diseases,
  // and exposes the DEMO badge on /version. Off in production.
  // NOTE: do NOT use z.coerce.boolean() — it runs Boolean(value), so the
  // string "false" coerces to `true`. Parse the literal explicitly instead.
  DEMO_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  GIT_SHA: z.string().optional().default('dev'),
  BUILD_TIME: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>): Env => {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const formatted = parsed.error.errors
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${formatted}`);
  }
  return parsed.data;
};
