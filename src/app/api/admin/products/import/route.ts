import { pool } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { isAdminRequest } from "@/lib/auth";
import { logAdminAudit } from "@/lib/admin-audit";
export const dynamic="force-dynamic";
const bad=(error:string,status=400)=>Response.json({error},{status});
function parseCsv(text:string):string[][]{
 const rows:string[][]=[];let row:string[]=[];let cell="";let quoted=false;
 for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;}else if(ch==='"'){quoted=true;}else if(ch===","){row.push(cell);cell="";}else if(ch==="\n"){row.push(cell);rows.push(row);row=[];cell="";}else if(ch!=="\r")cell+=ch;}
 if(quoted)throw new Error("CSV_UNCLOSED_QUOTE");if(cell.length||row.length){row.push(cell);rows.push(row);}return rows.filter(r=>r.some(x=>x.trim().length));
}
function truth(value:string):boolean|null{const v=value.trim().toLowerCase();if(["1","true","yes","بله","فعال"].includes(v))return true;if(["0","false","no","خیر","غیرفعال"].includes(v))return false;return null;}
export async function GET(req: Request){if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401);const body="slug,price,comparePrice,costPrice,stock,isActive,isFeatured\nproduct-slug,1250000,1490000,780000,25,true,false\n";return new Response(body,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=50500-product-import-template.csv","Cache-Control":"no-store"}});}
export async function POST(req:Request){
 if(!(await isAdminRequest(req)))return bad("دسترسی غیرمجاز",401);await ensureDb();const form=await req.formData().catch(()=>null);const file=form?.get("file");if(!(file instanceof File))return bad("فایل CSV ارسال نشده است");if(file.size>2_000_000)return bad("حجم فایل باید کمتر از ۲ مگابایت باشد");
 let parsed:string[][];try{parsed=parseCsv((await file.text()).replace(/^\uFEFF/,""));}catch(e){return bad(e instanceof Error&&e.message==="CSV_UNCLOSED_QUOTE"?"ساختار کوتیشن CSV ناقص است":"خواندن CSV ناموفق بود");}
 if(parsed.length<2||parsed.length>501)return bad("فایل باید شامل سرستون و حداکثر ۵۰۰ ردیف کالا باشد");const header=parsed[0].map(x=>x.trim());const required=["slug","price","comparePrice","costPrice","stock","isActive","isFeatured"];if(required.some(x=>!header.includes(x)))return bad(`ستون‌های لازم: ${required.join(", ")}`);
 const col=Object.fromEntries(required.map(k=>[k,header.indexOf(k)])) as Record<string,number>;const rows:{slug:string;price:number;comparePrice:number|null;costPrice:number;stock:number;isActive:boolean;isFeatured:boolean}[]=[];const seen=new Set<string>();
 for(let i=1;i<parsed.length;i++){const r=parsed[i];const slug=(r[col.slug]||"").trim();const price=Number(r[col.price]);const compare=Number(r[col.comparePrice]);const cost=Number(r[col.costPrice]);const stock=Number(r[col.stock]);const active=truth(r[col.isActive]||"");const featured=truth(r[col.isFeatured]||"");
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||seen.has(slug))return bad(`شناسه لاتین ردیف ${i+1} نامعتبر یا تکراری است`);if(!Number.isSafeInteger(price)||price<1||price>2_000_000_000||!(r[col.comparePrice]===""||(Number.isSafeInteger(compare)&&compare>=0&&compare<=2_000_000_000))||!Number.isSafeInteger(cost)||cost<0||cost>2_000_000_000||!Number.isSafeInteger(stock)||stock<0||stock>1_000_000||active===null||featured===null)return bad(`مقادیر ردیف ${i+1} معتبر نیستند`);seen.add(slug);rows.push({slug,price,comparePrice:compare>0?compare:null,costPrice:cost,stock,isActive:active,isFeatured:featured});
 }
 const client=await pool.connect();let updated=0;try{await client.query("BEGIN");const slugs=rows.map(r=>r.slug);const found=await client.query("SELECT id,slug,stock FROM products WHERE slug=ANY($1::text[]) FOR UPDATE",[slugs]);const foundSet=new Map(found.rows.map(x=>[String(x.slug),{id:Number(x.id),stock:Number(x.stock)}]));const missing=slugs.filter(s=>!foundSet.has(s));if(missing.length)throw new Error(`MISSING:${missing.slice(0,5).join(",")}`);
  for(const r of rows){const current=foundSet.get(r.slug)!;const delta=r.stock-current.stock;await client.query("UPDATE products SET price=$1,compare_price=$2,cost_price=$3,stock=$4,is_active=$5,is_featured=$6,updated_at=now() WHERE id=$7",[r.price,r.comparePrice,r.costPrice,r.stock,r.isActive,r.isFeatured,current.id]);if(delta!==0)await client.query(`INSERT INTO stock_movements(product_id,quantity_delta,movement_type,reference,note,actor) VALUES($1,$2,'adjustment','CSV-IMPORT',$3,'admin')`,[current.id,delta,"اصلاح موجودی از طریق ورود گروهی CSV"]);updated++;}
  await client.query("COMMIT");
 }catch(e){await client.query("ROLLBACK");if(e instanceof Error&&e.message.startsWith("MISSING:"))return bad(`این کالاها در فروشگاه پیدا نشدند: ${e.message.slice(8)}`,404);throw e;}finally{client.release();}
 await logAdminAudit({action:"product_csv_import",resource:"products",summary:`به‌روزرسانی گروهی ${updated} محصول از فایل CSV`});return Response.json({ok:true,updated});
}
