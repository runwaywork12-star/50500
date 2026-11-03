import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { rateLimit } from "@/lib/rate-limit";
import { createTotpSecret, decryptTotpSecret, encryptTotpSecret, getAdminContext, verifyTotpCode } from "@/lib/auth";
export const dynamic = "force-dynamic";
const bad=(error:string,status=400)=>Response.json({error},{status});
async function currentStaff(){const ctx=await getAdminContext();return ctx?.kind==="staff"?ctx:null;}
export async function GET(){
 const staff=await currentStaff();if(!staff)return bad("این قابلیت برای حساب کارمند در دسترس است",403);
 await ensureDb();
 let result=await pool.query<{totp_enabled:boolean;totp_secret_enc:string|null;totp_pending_secret_enc:string|null}>("SELECT totp_enabled,totp_secret_enc,totp_pending_secret_enc FROM admin_staff WHERE id=$1 AND is_active=true",[staff.id]);
 const row=result.rows[0];if(!row)return bad("حساب کاربری پیدا نشد",404);
 if(row.totp_enabled)return Response.json({enabled:true});
 if(!row.totp_pending_secret_enc){
  const secret=createTotpSecret();
  await pool.query("UPDATE admin_staff SET totp_pending_secret_enc=$1,updated_at=now() WHERE id=$2 AND totp_enabled=false AND totp_pending_secret_enc IS NULL",[encryptTotpSecret(secret),staff.id]);
  result=await pool.query("SELECT totp_enabled,totp_secret_enc,totp_pending_secret_enc FROM admin_staff WHERE id=$1",[staff.id]);
 }
 const current=result.rows[0];if(current.totp_enabled)return Response.json({enabled:true});
 const secret=decryptTotpSecret(current.totp_pending_secret_enc || "");
 const issuer="50500 Admin";const account=staff.email;
 const otpauthUrl=`otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
 return Response.json({enabled:false,secret,otpauthUrl});
}
export async function POST(req:Request){
 const staff=await currentStaff();if(!staff)return bad("این قابلیت برای حساب کارمند در دسترس است",403);
 const limit=rateLimit(`admin-totp:${staff.id}`,10,15*60*1000);if(!limit.allowed)return bad("تعداد تلاش‌های کد دومرحله‌ای بیش از حد مجاز است",429);
 await ensureDb();const body=await req.json().catch(()=>null) as {code?:unknown;action?:unknown}|null;
 const code=typeof body?.code==="string"?body.code.trim():"";
 if(!/^\d{6}$/.test(code))return bad("کد شش‌رقمی را وارد کنید");
 const result=await pool.query<{totp_enabled:boolean;totp_secret_enc:string|null;totp_pending_secret_enc:string|null}>("SELECT totp_enabled,totp_secret_enc,totp_pending_secret_enc FROM admin_staff WHERE id=$1 AND is_active=true",[staff.id]);
 const row=result.rows[0];if(!row)return bad("حساب کاربری پیدا نشد",404);
 if(body?.action==="disable"){
  if(!row.totp_enabled||!row.totp_secret_enc||!verifyTotpCode(decryptTotpSecret(row.totp_secret_enc),code))return bad("کد فعلی دومرحله‌ای درست نیست",401);
  await pool.query("UPDATE admin_staff SET totp_enabled=false,totp_secret_enc=NULL,totp_pending_secret_enc=NULL,updated_at=now() WHERE id=$1",[staff.id]);
  await pool.query("UPDATE admin_staff_sessions SET revoked_at=now() WHERE staff_id=$1 AND revoked_at IS NULL",[staff.id]);
  return Response.json({ok:true,enabled:false,reauthenticate:true});
 }
 if(row.totp_enabled)return bad("تأیید دومرحله‌ای قبلاً فعال شده است");
 if(!row.totp_pending_secret_enc)return bad("ابتدا صفحه راه‌اندازی را دوباره باز کنید",409);
 const secret=decryptTotpSecret(row.totp_pending_secret_enc);
 if(!verifyTotpCode(secret,code))return bad("کد تأیید نادرست است؛ ساعت گوشی را روی تنظیم خودکار بگذارید",401);
 await pool.query("UPDATE admin_staff SET totp_secret_enc=totp_pending_secret_enc,totp_pending_secret_enc=NULL,totp_enabled=true,updated_at=now() WHERE id=$1",[staff.id]);
 await pool.query("UPDATE admin_staff_sessions SET revoked_at=now() WHERE staff_id=$1 AND revoked_at IS NULL",[staff.id]);
 return Response.json({ok:true,enabled:true,reauthenticate:true});
}
