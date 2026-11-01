import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";
export const dynamic="force-dynamic";
const bad=(error:string,status=400)=>Response.json({error},{status});
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401); await ensureDb();
 const id=Number((await params).id); if(!Number.isInteger(id)||id<1)return bad("شناسه سفارش خرید نامعتبر است");
 const b=await req.json().catch(()=>null) as Record<string,unknown>|null; const receipts=Array.isArray(b?.items)?b.items as Record<string,unknown>[]:[]; const note=typeof b?.note==="string"?b.note.trim().slice(0,300):"دریافت کالا طبق سفارش خرید";
 if(!receipts.length)return bad("مقدار دریافتی را وارد کنید");
 const client=await pool.connect(); let code=""; let units=0; let receivedCost=0;
 try{
  await client.query("BEGIN");
  const h=await client.query("SELECT code,status FROM purchase_orders WHERE id=$1 FOR UPDATE",[id]); if(!h.rowCount)throw new Error("PO_NOT_FOUND"); code=h.rows[0].code; if(h.rows[0].status==="cancelled"||h.rows[0].status==="received")throw new Error("PO_CLOSED");
  const lines=await client.query("SELECT * FROM purchase_order_items WHERE purchase_order_id=$1 ORDER BY id FOR UPDATE",[id]);
  for(const r of receipts){const lineId=Number(r.itemId);const qty=Math.floor(Number(r.quantity));if(!Number.isInteger(lineId)||!Number.isInteger(qty)||qty<1)throw new Error("RECEIPT_INVALID");const line=lines.rows.find(x=>Number(x.id)===lineId);if(!line)throw new Error("LINE_NOT_FOUND");if(Number(line.received_quantity)+qty>Number(line.quantity))throw new Error("OVER_RECEIVE");
   await client.query("UPDATE purchase_order_items SET received_quantity=received_quantity+$1 WHERE id=$2",[qty,lineId]);
   await client.query(
    `UPDATE products
        SET cost_price=CASE
          WHEN stock + $1 > 0
            THEN round(((stock::numeric * cost_price::numeric) + ($1::numeric * $2::numeric)) / (stock + $1))::integer
          ELSE cost_price
        END,
        stock=stock+$1,
        updated_at=now()
      WHERE id=$3`,
    [qty, Number(line.unit_cost), Number(line.product_id)],
   );
   await client.query("INSERT INTO stock_movements(product_id,quantity_delta,movement_type,reference,note,actor) VALUES($1,$2,'purchase_receipt',$3,$4,'admin')",[Number(line.product_id),qty,code,note]);units+=qty;receivedCost+=qty*Number(line.unit_cost);
  }
  const updated=await client.query("SELECT bool_and(received_quantity=quantity) AS all_received,bool_or(received_quantity>0) AS any_received FROM purchase_order_items WHERE purchase_order_id=$1",[id]);
  const status=updated.rows[0].all_received?"received":"partially_received";
  await client.query("UPDATE purchase_orders SET status=$1,updated_at=now(),received_at=CASE WHEN $1='received' THEN now() ELSE received_at END WHERE id=$2",[status,id]);
  if(receivedCost>0){
   const accounts=await client.query("SELECT code,id FROM finance_accounts WHERE code IN ('1201','2001') AND is_active=true");
   const byCode=new Map(accounts.rows.map(x=>[String(x.code),Number(x.id)]));
   if(!byCode.has('1201')||!byCode.has('2001'))throw new Error("FINANCE_ACCOUNTS_MISSING");
   const journalCode=`AUTO-PO-${id}-${Date.now()}`;
   const journal=await client.query("INSERT INTO finance_journals(journal_code,description,reference) VALUES($1,$2,$3) RETURNING id",[journalCode,`ثبت موجودی دریافتی از ${code}`,code]);
   await client.query("INSERT INTO finance_journal_lines(journal_id,account_id,debit,credit) VALUES($1,$2,$3,0),($1,$4,0,$3)",[Number(journal.rows[0].id),byCode.get('1201'),receivedCost,byCode.get('2001')]);
  }
  await client.query("COMMIT");
 }catch(e){await client.query("ROLLBACK");if(e instanceof Error&&e.message==="PO_NOT_FOUND")return bad("سفارش خرید پیدا نشد",404);if(e instanceof Error&&e.message==="PO_CLOSED")return bad("سفارش خرید بسته یا لغو شده است",409);if(e instanceof Error&&e.message==="OVER_RECEIVE")return bad("مقدار دریافت نمی‌تواند از مقدار سفارش بیشتر باشد",409);if(e instanceof Error&&e.message==="RECEIPT_INVALID")return bad("مقدار دریافت نامعتبر است");if(e instanceof Error&&e.message==="LINE_NOT_FOUND")return bad("قلم سفارش پیدا نشد",404);if(e instanceof Error&&e.message==="FINANCE_ACCOUNTS_MISSING")return bad("سرفصل‌های مالی موجودی و حساب‌های پرداختنی تعریف نشده‌اند",500);throw e;}finally{client.release();}
 await logAdminAudit({action:"purchase_receipt",resource:"purchase_orders",resourceId:id,summary:`دریافت ${units} واحد از ${code}`});
 return Response.json({ok:true,receivedUnits:units});
}
