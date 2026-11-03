import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ *
 * Customer authentication (demo-grade, browser only).
 * Passwords are never stored in plain text: salted simple hash, the way
 * the original project keeps secrets out of the UI layer. Sessions are
 * revocable; reset codes expire after five minutes.
 * ------------------------------------------------------------------ */

const USERS_KEY = "50500_users_v1";
const SESSION_KEY = "50500_session_v1";
const RESET_KEY = "50500_reset_v1";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  pass: string;
  createdAt: string;
};

export type ResetTicket = { email: string; code: string; expires: number };

export type AuthResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string) {
  let digits = value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[^0-9]/g, "");
  if (digits.startsWith("0098")) digits = "0" + digits.slice(4);
  else if (digits.startsWith("98")) digits = "0" + digits.slice(2);
  if (digits.length === 10 && digits.startsWith("9")) digits = "0" + digits;
  return digits;
}

/** Salted non-reversible digest — adequate for a local demo account. */
function hash(password: string, salt: string): string {
  let h = 2166136261;
  const input = `${salt}::${password}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${salt}$${(h >>> 0).toString(16)}`;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota/storage errors */
  }
}

export function passwordIssue(password: string): string | null {
  if (password.length < 8) return "رمز عبور باید حداقل ۸ کاراکتر باشد.";
  if (!/[a-zA-Zا-ی]/.test(password)) return "رمز عبور باید حداقل یک حرف داشته باشد.";
  if (!/[0-9۰-۹]/.test(password)) return "رمز عبور باید حداقل یک عدد داشته باشد.";
  return null;
}

export function emailIssue(email: string): string | null {
  return EMAIL_RE.test(normalizeEmail(email)) ? null : "ایمیل معتبر نیست. مثلاً: name@mail.com";
}

export function phoneIssue(phone: string): string | null {
  return /^09\d{9}$/.test(normalizePhone(phone)) ? null : "شماره موبایل معتبر نیست. مثلاً: 09121234567";
}

type Session = { userId: string } | null;

type AuthContextValue = {
  user: AuthUser | null;
  register: (input: { name: string; email: string; phone: string; password: string }) => AuthResult<AuthUser>;
  login: (email: string, password: string) => AuthResult<AuthUser>;
  logout: () => void;
  updateProfile: (input: { name: string; phone: string }) => AuthResult<AuthUser>;
  changePassword: (current: string, next: string) => AuthResult;
  requestReset: (email: string) => AuthResult<{ code: string }>;
  verifyReset: (email: string, code: string, password: string) => AuthResult;
  demoEmail: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_EMAIL = "demo@50500.co";

function allUsers(): AuthUser[] {
  return read<AuthUser[]>(USERS_KEY, []);
}

function saveUsers(users: AuthUser[]) {
  write(USERS_KEY, users);
}

function findUser(id: string | null): AuthUser | null {
  if (!id) return null;
  return allUsers().find((u) => u.id === id) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const session = read<Session>(SESSION_KEY, null);
    return findUser(session?.userId ?? null);
  });

  useEffect(() => {
    if (user) write(SESSION_KEY, { userId: user.id } satisfies Session);
  }, [user]);

  const register = useCallback<AuthContextValue["register"]>((input) => {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    const issue = emailIssue(email) || phoneIssue(phone) || passwordIssue(input.password);
    if (issue) return { ok: false, error: issue };
    if (input.name.trim().length < 3) return { ok: false, error: "نام و نام خانوادگی را کامل وارد کنید." };
    const users = allUsers();
    if (users.some((u) => u.email === email)) return { ok: false, error: "این ایمیل قبلاً ثبت شده است." };
    if (users.some((u) => u.phone === phone)) return { ok: false, error: "این شماره موبایل قبلاً ثبت شده است." };
    const salt = Math.random().toString(36).slice(2, 10);
    const account: AuthUser = {
      id: `u_${Date.now().toString(36)}${Math.floor(Math.random() * 1e5).toString(36)}`,
      name: input.name.trim(),
      email,
      phone,
      pass: hash(input.password, salt),
      createdAt: new Date().toISOString(),
    };
    saveUsers([...users, account]);
    setUser(account);
    return { ok: true, data: account };
  }, []);

  const login = useCallback<AuthContextValue["login"]>((email, password) => {
    const account = allUsers().find((u) => u.email === normalizeEmail(email));
    if (!account) return { ok: false, error: "حسابی با این ایمیل پیدا نشد." };
    const [salt] = account.pass.split("$");
    if (hash(password, salt) !== account.pass) return { ok: false, error: "ایمیل یا رمز عبور نادرست است." };
    setUser(account);
    return { ok: true, data: account };
  }, []);

  const logout = useCallback(() => {
    write(SESSION_KEY, null);
    setUser(null);
  }, []);

  const updateProfile = useCallback<AuthContextValue["updateProfile"]>((input) => {
    if (!user) return { ok: false, error: "ابتدا وارد شوید." };
    const phone = normalizePhone(input.phone);
    if (input.name.trim().length < 3) return { ok: false, error: "نام معتبر نیست." };
    const issue = phoneIssue(phone);
    if (issue) return { ok: false, error: issue };
    const users = allUsers();
    if (users.some((u) => u.phone === phone && u.id !== user.id)) return { ok: false, error: "این شماره موبایل متعلق به حساب دیگری است." };
    const next = { ...user, name: input.name.trim(), phone };
    saveUsers(users.map((u) => (u.id === user.id ? next : u)));
    setUser(next);
    return { ok: true, data: next };
  }, [user]);

  const changePassword = useCallback<AuthContextValue["changePassword"]>((current, next) => {
    if (!user) return { ok: false, error: "ابتدا وارد شوید." };
    const [salt] = user.pass.split("$");
    if (hash(current, salt) !== user.pass) return { ok: false, error: "رمز فعلی نادرست است." };
    const issue = passwordIssue(next);
    if (issue) return { ok: false, error: issue };
    const updated: AuthUser = { ...user, pass: hash(next, Math.random().toString(36).slice(2, 10)) };
    saveUsers(allUsers().map((u) => (u.id === updated.id ? updated : u)));
    setUser(updated);
    return { ok: true };
  }, [user]);

  const requestReset = useCallback<AuthContextValue["requestReset"]>((email) => {
    const target = normalizeEmail(email);
    const issue = emailIssue(target);
    if (issue) return { ok: false, error: issue };
    const account = allUsers().find((u) => u.email === target);
    if (!account) return { ok: false, error: "حسابی با این ایمیل پیدا نشد. ابتدا ثبت‌نام کنید." };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const ticket: ResetTicket = { email: target, code, expires: Date.now() + 5 * 60_000 };
    write(RESET_KEY, ticket);
    return { ok: true, data: { code } };
  }, []);

  const verifyReset = useCallback<AuthContextValue["verifyReset"]>((email, code, password) => {
    const ticket = read<ResetTicket | null>(RESET_KEY, null);
    if (!ticket || ticket.expires < Date.now()) return { ok: false, error: "کد یک‌بارمصرف منقضی شده است. درخواست جدید بدهید." };
    if (ticket.email !== normalizeEmail(email)) return { ok: false, error: "ایمیل و کد همخوانی ندارند." };
    if (ticket.code !== code.trim()) return { ok: false, error: "کد یک‌بارمصرف نادرست است." };
    const issue = passwordIssue(password);
    if (issue) return { ok: false, error: issue };
    const users = allUsers();
    const account = users.find((u) => u.email === ticket.email);
    if (!account) return { ok: false, error: "حساب پیدا نشد." };
    const next: AuthUser = { ...account, pass: hash(password, Math.random().toString(36).slice(2, 10)) };
    saveUsers(users.map((u) => (u.id === next.id ? next : u)));
    write(RESET_KEY, null);
    setUser(next);
    return { ok: true };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, register, login, logout, updateProfile, changePassword, requestReset, verifyReset, demoEmail: DEMO_EMAIL }),
    [user, register, login, logout, updateProfile, changePassword, requestReset, verifyReset],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
