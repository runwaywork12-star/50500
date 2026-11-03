import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";
export const dynamic="force-dynamic";
const bad=(error:string,status=400)=>Response.json({error},{status});
export async function GET(req: Request){
 if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401);await ensureDb();
 const [accounts,journals]=await Promise.all([
  pool.query(`SELECT a.id,a.code,a.name,a.account_type,a.is_active,coalesce(sum(l.debit) FILTER(WHERE j.status='posted'),0)::bigint AS total_debit,coalesce(sum(l.credit) FILTER(WHERE j.status='posted'),0)::bigint AS total_credit FROM finance_accounts a LEFT JOIN finance_journal_lines l ON l.account_id=a.id LEFT JOIN finance_journals j ON j.id=l.journal_id AND j.status='posted' GROUP BY a.id ORDER BY a.code`),
  pool.query(`SELECT j.id,j.journal_code,j.description,j.reference,j.happened_at,j.status,coalesce(sum(l.debit),0)::bigint AS debit_total FROM finance_journals j LEFT JOIN finance_journal_lines l ON l.journal_id=j.id GROUP BY j.id ORDER BY j.happened_at DESC LIMIT 200`)
 ]);return Response.json({accounts:accounts.rows,journals:journals.rows});
}
export async function POST(req:Request){
 if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401);await ensureDb();const b=await req.json().catch(()=>null) as Record<string,unknown>|null;
 const debitAccount=Number(b?.debitAccount);const creditAccount=Number(b?.creditAccount);const amount=Math.floor(Number(b?.amount));const description=typeof b?.description==="string"?b.description.trim().slice(0,300):"";const reference=typeof b?.reference==="string"?b.reference.trim().slice(0,120):"";const happenedAt=b?.happenedAt?new Date(String(b.happenedAt)):new Date();
 if(!Number.isInteger(debitAccount)||!Number.isInteger(creditAccount)||debitAccount===creditAccount)return bad("حساب بدهکار و بستانکار باید متفاوت باشند");if(!Number.isSafeInteger(amount)||amount<1||amount>2_000_000_000)return bad("مبلغ سند معتبر نیست");if(description.length<3||Number.isNaN(happenedAt.getTime()))return bad("شرح یا تاریخ سند معتبر نیست");
 const client=await pool.connect();let id=0;let code="";
 try{await client.query("BEGIN");const acc=await client.query("SELECT id FROM finance_accounts WHERE id=ANY($1::int[]) AND is_active=true",[[debitAccount,creditAccount]]);if(acc.rowCount!==2)throw new Error("ACCOUNT_NOT_FOUND");code=`JV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;const h=await client.query("INSERT INTO finance_journals(journal_code,description,reference,happened_at) VALUES($1,$2,$3,$4) RETURNING id",[code,description,reference,happenedAt]);id=Number(h.rows[0].id);await client.query("INSERT INTO finance_journal_lines(journal_id,account_id,debit,credit) VALUES($1,$2,$3,0),($1,$4,0,$3)",[id,debitAccount,amount,creditAccount]);await client.query("COMMIT");}
 catch(e){await client.query("ROLLBACK");if(e instanceof Error&&e.message==="ACCOUNT_NOT_FOUND")return bad("یکی از حساب‌های مالی فعال نیست",404);throw e;}finally{client.release();}
 await logAdminAudit({action:"journal_posted",resource:"finance_journals",resourceId:id,summary:`ثبت سند متوازن ${code} به مبلغ ${amount} تومان`});return Response.json({ok:true,id,code});
}
