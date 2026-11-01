/** Fail closed before serving production traffic if administrator credentials are unsafe. */
export async function register() {
  if (process.env.NODE_ENV !== "production") return;
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 16) {
    throw new Error("ADMIN_PASSWORD must be set to a unique value of at least 16 characters in production");
  }
  if (!process.env.ADMIN_SECRET || process.env.ADMIN_SECRET.length < 32) {
    throw new Error("ADMIN_SECRET must be set to a unique value of at least 32 characters in production");
  }
}
