import { createHash } from "node:crypto";
import { db, pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { pageViews } from "@/db/schema";

export type TrackInput = {
  sessionId: string;
  path: string;
  referrer?: string;
  url?: string;
  userAgent?: string;
  language?: string;
  ip?: string;
  country?: string;
};

export function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  const u = ua || "";
  const device = /ipad|tablet/i.test(u) ? "تبلت" : /mobile|android|iphone|phone/i.test(u) ? "موبایل" : "دسکتاپ";
  let browser = "نامشخص";
  if (/Edg\//i.test(u)) browser = "Edge";
  else if (/SamsungBrowser/i.test(u)) browser = "Samsung";
  else if (/OPR\/|Opera/i.test(u)) browser = "Opera";
  else if (/Firefox\/|FxiOS/i.test(u)) browser = "Firefox";
  else if (/CriOS|Chrome\//i.test(u)) browser = "Chrome";
  else if (/Safari\//i.test(u)) browser = "Safari";
  let os = "نامشخص";
  if (/Windows/i.test(u)) os = "Windows";
  else if (/Android/i.test(u)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(u)) os = "iOS";
  else if (/Mac OS/i.test(u)) os = "macOS";
  else if (/Linux/i.test(u)) os = "Linux";
  return { device, browser, os };
}

export function referrerHost(referrer: string): string {
  if (!referrer) return "ورود مستقیم";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (!host || host.includes("50500") || host.includes("localhost") || host.endsWith(".e2b.app")) return "ورود مستقیم";
    if (host.includes("google.")) return "گوگل";
    if (host.includes("instagram.")) return "اینستاگرام";
    if (host.includes("t.me") || host.includes("telegram.")) return "تلگرام";
    if (host.includes("divar.") || host.includes("torob.") || host.includes("emalls.")) return host;
    return host;
  } catch {
    return "ورود مستقیم";
  }
}

export async function trackPageView(input: TrackInput): Promise<void> {
  await ensureDb();
  const path = (input.path || "/").slice(0, 500);
  if (path.startsWith("/admin") || path.startsWith("/api/") || path.startsWith("/_next")) return;
  const referrer = (input.referrer || "").slice(0, 1000);
  let utmSource = "", utmMedium = "", utmCampaign = "";
  try {
    const params = new URL(input.url || "", "https://store.local").searchParams;
    utmSource = (params.get("utm_source") || "").slice(0, 100);
    utmMedium = (params.get("utm_medium") || "").slice(0, 100);
    utmCampaign = (params.get("utm_campaign") || "").slice(0, 100);
  } catch {
    // ignore
  }
  const { device, browser, os } = parseUserAgent(input.userAgent || "");
  const ipHash = input.ip ? createHash("sha256").update(`50500|${input.ip}`).digest("hex").slice(0, 32) : "";
  await db.insert(pageViews).values({
    sessionId: (input.sessionId || "anon").slice(0, 64),
    path,
    referrer,
    utmSource,
    utmMedium,
    utmCampaign,
    device,
    browser,
    os,
    country: (input.country || "").slice(0, 10),
    language: (input.language || "").slice(0, 20),
    ipHash,
  });
}

export type VisitorStats = {
  visits: number;
  uniques: number;
  todayVisits: number;
  todayUniques: number;
  days: { key: string; label: string; visits: number; uniques: number }[];
  topPages: { path: string; views: number; uniques: number }[];
  referrers: { source: string; views: number }[];
  campaigns: { source: string; views: number }[];
  devices: { name: string; views: number }[];
  browsers: { name: string; views: number }[];
  osList: { name: string; views: number }[];
  recent: { path: string; referrer: string; device: string; createdAt: Date }[];
};

export async function getVisitorStats(days = 30): Promise<VisitorStats> {
  await ensureDb();
  const range = Math.min(Math.max(days, 1), 90);
  const [totals, series, pages, refs, utm, devs, bros, oss, recent] = await Promise.all([
    pool.query<{ visits: string; uniques: string; tvisits: string; tuniques: string }>(
      `select count(*)::bigint as visits, count(distinct session_id)::bigint as uniques,
              count(*) filter (where created_at > now() - interval '24 hours')::bigint as tvisits,
              count(distinct session_id) filter (where created_at > now() - interval '24 hours')::bigint as tuniques
         from page_views where created_at > now() - make_interval(days => $1)`,
      [range],
    ),
    pool.query<{ day: string; visits: string; uniques: string }>(
      `select to_char((created_at at time zone 'Asia/Tehran')::date, 'YYYY-MM-DD') as day,
              count(*)::bigint as visits, count(distinct session_id)::bigint as uniques
         from page_views where created_at > now() - make_interval(days => $1)
         group by 1 order by 1`,
      [range],
    ),
    pool.query<{ path: string; views: string; uniques: string }>(
      `select path, count(*)::bigint as views, count(distinct session_id)::bigint as uniques
         from page_views where created_at > now() - make_interval(days => $1)
         group by 1 order by 2 desc limit 10`,
      [range],
    ),
    pool.query<{ referrer: string; views: string }>(
      `select referrer, count(*)::bigint as views from page_views
        where created_at > now() - make_interval(days => $1) group by 1 order by 2 desc limit 20`,
      [range],
    ),
    pool.query<{ s: string; m: string; c: string; views: string }>(
      `select utm_source as s, utm_medium as m, utm_campaign as c, count(*)::bigint as views
         from page_views where created_at > now() - make_interval(days => $1) and utm_source <> ''
         group by 1,2,3 order by 4 desc limit 10`,
      [range],
    ),
    pool.query<{ name: string; views: string }>(
      `select nullif(device,'') as name, count(*)::bigint as views from page_views
        where created_at > now() - make_interval(days => $1) group by 1 order by 2 desc`,
      [range],
    ),
    pool.query<{ name: string; views: string }>(
      `select nullif(browser,'') as name, count(*)::bigint as views from page_views
        where created_at > now() - make_interval(days => $1) group by 1 order by 2 desc`,
      [range],
    ),
    pool.query<{ name: string; views: string }>(
      `select nullif(os,'') as name, count(*)::bigint as views from page_views
        where created_at > now() - make_interval(days => $1) group by 1 order by 2 desc`,
      [range],
    ),
    db
      .select({ path: pageViews.path, referrer: pageViews.referrer, device: pageViews.device, createdAt: pageViews.createdAt })
      .from(pageViews)
      .orderBy(pageViews.id)
      .limit(0),
  ]);

  const t = totals.rows[0];
  const byDay = new Map(series.rows.map((r) => [r.day, r]));
  const dayList = Array.from({ length: Math.min(range, 30) }, (_, i) => {
    const d = new Date(Date.now() - (Math.min(range, 30) - 1 - i) * 86400_000);
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(d);
    const label = new Intl.DateTimeFormat("fa-IR", { weekday: "short", timeZone: "Asia/Tehran" }).format(d);
    const row = byDay.get(key);
    return { key, label, visits: Number(row?.visits ?? 0), uniques: Number(row?.uniques ?? 0) };
  });

  const refMap = new Map<string, number>();
  for (const r of refs.rows) {
    const host = referrerHost(r.referrer);
    refMap.set(host, (refMap.get(host) ?? 0) + Number(r.views));
  }

  const recentRows = await db
    .select({ path: pageViews.path, referrer: pageViews.referrer, device: pageViews.device, createdAt: pageViews.createdAt })
    .from(pageViews)
    .orderBy(pageViews.id)
    .limit(1);
  void recentRows;

  const latest = await pool.query<{ path: string; referrer: string; device: string; created_at: string }>(
    `select path, referrer, device, created_at from page_views order by id desc limit 15`,
  );

  return {
    visits: Number(t?.visits ?? 0),
    uniques: Number(t?.uniques ?? 0),
    todayVisits: Number(t?.tvisits ?? 0),
    todayUniques: Number(t?.tuniques ?? 0),
    days: dayList,
    topPages: pages.rows.map((r) => ({ path: r.path, views: Number(r.views), uniques: Number(r.uniques) })),
    referrers: [...refMap.entries()].map(([source, views]) => ({ source, views })).sort((a, b) => b.views - a.views).slice(0, 8),
    campaigns: utm.rows.map((r) => ({ source: [r.s, r.m, r.c].filter(Boolean).join(" / "), views: Number(r.views) })),
    devices: devs.rows.filter((r) => r.name).map((r) => ({ name: r.name!, views: Number(r.views) })),
    browsers: bros.rows.filter((r) => r.name).map((r) => ({ name: r.name!, views: Number(r.views) })),
    osList: oss.rows.filter((r) => r.name).map((r) => ({ name: r.name!, views: Number(r.views) })),
    recent: latest.rows.map((r) => ({ path: r.path, referrer: r.referrer, device: r.device, createdAt: new Date(r.created_at) })),
  };
}
