export const runtimeConfig = {
  databaseUrl: process.env.DATABASE_URL,
  stripeSecret: process.env.STRIPE_SECRET_KEY,
  cacheTtl: Number(process.env.CACHE_TTL ?? "300"),
  logLevel: process.env.LOG_LEVEL ?? "info"
};
