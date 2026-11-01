import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";
export const dynamic="force-dynamic";
const bad=(error:string,status=400)=>Response.json({error},{status});
export async function GET(req: Request){
 if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401); await ensureDb();
 const [orders,suppliers,products]=await Promise.all([
  pool.query(`SELECT po.*,s.name AS supplier_name,coalesce(sum(i.quantity),0)::int AS item_units,coalesce(sum(i.received_quantity),0)::int AS received_units,
    coalesce(jsonb_agg(jsonb_build_object('id',i.id,'productId',i.product_id,'title',i.product_title,'quantity',i.quantity,'receivedQuantity',i.received_quantity,'unitCost',i.unit_cost)) FILTER(WHERE i.id IS NOT NULL),'[]'::jsonb) AS items
   FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id LEFT JOIN purchase_order_items i ON i.purchase_order_id=po.id
   GROUP BY po.id,s.name ORDER BY po.created_at DESC LIMIT 200`),
  pool.query("SELECT id,name,company,phone,email,address,notes,is_active FROM suppliers ORDER BY is_active DESC,name"),
  pool.query("SELECT id,title,stock,cost_price FROM products WHERE is_active=true ORDER BY title LIMIT 500")
 ]);
 return Response.json({orders:orders.rows,suppliers:suppliers.rows,products:products.rows});
}
export async function POST(req:Request){
 if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401); await ensureDb();
 const b=await req.json().catch(()=>null) as Record<string,unknown>|null;
 const supplierId=Number(b?.supplierId); const items=Array.isArray(b?.items)?b.items as Record<string,unknown>[]:[];
 const notes=typeof b?.notes==="string"?b.notes.trim().slice(0,1000):"";
 const expectedAt=typeof b?.expectedAt==="string"&&b.expectedAt?b.expectedAt:null;
 if(expectedAt && (!/^\d{4}-\d{2}-\d{2}$/.test(expectedAt) || !Number.isFinite(Date.parse(`${expectedAt}T00:00:00Z`)) || new Date(`${expectedAt}T00:00:00Z`).toISOString().slice(0,10)!==expectedAt))return bad("تاریخ مورد انتظار معتبر نیست");
 if(!Number.isInteger(supplierId)||supplierId<1)return bad("تأمین‌کننده را انتخاب کنید");
 if(!items.length||items.length>100)return bad("حداقل یک قلم و حداکثر ۱۰۰ قلم کالا انتخاب کنید");
 const clean=items.map(x=>({productId:Number(x.productId),quantity:Math.floor(Number(x.quantity)),unitCost:Math.floor(Number(x.unitCost))}));
 if(clean.some(x=>!Number.isInteger(x.productId)||x.productId<1||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>100000||!Number.isInteger(x.unitCost)||x.unitCost<0||x.unitCost>2_000_000_000))return bad("یکی از اقلام سفارش خرید معتبر نیست");
 const client=await pool.connect(); let id=0; let code="";
 try{
  await client.query("BEGIN");
  const s=await client.query("SELECT id FROM suppliers WHERE id=$1 AND is_active=true FOR SHARE",[supplierId]); if(!s.rowCount)throw new Error("SUPPLIER_NOT_FOUND");
  const unique=[...new Set(clean.map(x=>x.productId))]; if(unique.length!==clean.length)throw new Error("DUPLICATE_PRODUCTS"); const p=await client.query("SELECT id,title FROM products WHERE id=ANY($1::int[])",[unique]);
  if(p.rowCount!==unique.length)throw new Error("PRODUCT_NOT_FOUND");
  const names=new Map(p.rows.map(x=>[Number(x.id),String(x.title)]));
  const total=clean.reduce((sum,x)=>sum+x.quantity*x.unitCost,0); if(!Number.isSafeInteger(total))throw new Error("TOTAL_INVALID");
  code=`PO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const h=await client.query("INSERT INTO purchase_orders(code,supplier_id,status,total_cost,notes,expected_at) VALUES($1,$2,'ordered',$3,$4,$5) RETURNING id",[code,supplierId,total,notes,expectedAt]); id=Number(h.rows[0].id);
  for(const x of clean)await client.query("INSERT INTO purchase_order_items(purchase_order_id,product_id,product_title,quantity,unit_cost) VALUES($1,$2,$3,$4,$5)",[id,x.productId,names.get(x.productId),x.quantity,x.unitCost]);
  await client.query("COMMIT");
 }catch(e){await client.query("ROLLBACK");if(e instanceof Error&&e.message==="SUPPLIER_NOT_FOUND")return bad("تأمین‌کننده فعال پیدا نشد",404);if(e instanceof Error&&e.message==="PRODUCT_NOT_FOUND")return bad("یکی از کالاها پیدا نشد",404);if(e instanceof Error&&e.message==="DUPLICATE_PRODUCTS")return bad("هر کالا را فقط یک‌بار در سفارش خرید وارد کنید");if(e instanceof Error&&e.message==="TOTAL_INVALID")return bad("جمع مبلغ سفارش بیش از محدوده مجاز است");throw e;}finally{client.release();}
 await logAdminAudit({action:"purchase_order_created",resource:"purchase_orders",resourceId:id,summary:`ثبت سفارش خرید ${code}`});
 return Response.json({ok:true,id,code});
}
