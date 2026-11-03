import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function vaultKey(): Buffer {
  const secret = process.env.ADMIN_SECRET || process.env.AUTH_SECRET || "";
  if (secret.length < 32) throw new Error("برای ذخیره امن کلیدهای API، ADMIN_SECRET با حداقل ۳۲ کاراکتر در محیط سرور تنظیم شود.");
  return createHash("sha256").update(`50500-secret-vault:${secret}`).digest();
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptSecret(value: string): string {
  const [version, ivRaw, tagRaw, dataRaw] = value.split(":");
  if (version !== "v1" || !ivRaw || !tagRaw || !dataRaw) throw new Error("قالب کلید رمزگذاری‌شده معتبر نیست");
  const decipher = createDecipheriv("aes-256-gcm", vaultKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataRaw, "base64url")), decipher.final()]).toString("utf8");
}
