import { betterAuth } from "better-auth";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import { Kysely } from "kysely";

// Only create database connection if env vars are present (not during build)
const createDatabase = () => {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    console.warn("TURSO_DATABASE_URL not set, auth will not work");
    return undefined;
  }

  return new Kysely({
    dialect: new LibsqlDialect({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    }),
  });
};

export const auth = betterAuth({
  database: createDatabase() ? {
    db: createDatabase()!,
    type: "sqlite" as const,
  } : {
    // Fallback for build time - use in-memory SQLite
    provider: "sqlite",
    url: ":memory:",
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ],
});

export type Session = typeof auth.$Infer.Session;
