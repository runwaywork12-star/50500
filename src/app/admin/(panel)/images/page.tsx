import { requireAdminPermission } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDb } from "@/db/bootstrap";
import { categories, products } from "@/db/schema";
import { ImageUploader } from "@/components/admin/ImageUploader";

export const dynamic = "force-dynamic";

export default async function ImagesPage() {
  await requireAdminPermission("content:read");

  await ensureDb();
  const accessories = await db
    .select({ id: products.id, title: products.title, images: products.images })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(categories.slug, "accessories"))
    .orderBy(products.id);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-black">کتابخانه تصاویر سایت و محصولات</h1>
        <p className="mt-2 text-sm leading-7 text-white/55">عکس‌های واقعی محصولات را اینجا آپلود کنید. عکس‌ها با کیفیت اصلی ذخیره می‌شوند (JPG، PNG یا WEBP تا ۶ مگابایت).</p>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-black">تصاویر هیرو صفحه اصلی</h2>
        <p className="mb-4 text-sm leading-7 text-white/50">عکس چرخ خیاطی صنعتی که برای ۵۰۵۰۰ فرستادی به‌عنوان تصویر پیش‌فرض دسکتاپ و موبایل ثبت شده است. هر زمان خواستی می‌توانی از همین بخش هر دو تصویر را جداگانه جایگزین کنی.</p>
        <a href="/admin/settings" className="mb-4 inline-flex rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-2 text-sm font-bold text-brand-200 hover:bg-brand-500/15">ویرایش متن و دکمه‌های هیرو در تنظیمات ←</a>
        <div className="grid gap-4 md:grid-cols-2">
          <ImageUploader target="site:hero" src="/api/site-image/hero" title="تصویر چرخ خیاطی صنعتی / کارگاه (دسکتاپ)" hint="عکس افقی از چرخ خیاطی صنعتی یا کارگاه؛ JPG، PNG یا WEBP تا ۶ مگابایت" big />
          <ImageUploader target="site:hero-mobile" src="/api/site-image/hero-mobile" title="تصویر چرخ خیاطی صنعتی (موبایل)" hint="عکس عمودی یا کراپ نزدیک‌تر از چرخ خیاطی/کارگاه؛ JPG، PNG یا WEBP تا ۶ مگابایت" big />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-black">تصویر پیش‌فرض مشترک کفپوش خودروها</h2>
        <p className="mb-4 text-sm leading-7 text-white/50">این عکس فعلاً برای همه محصولات کفپوش خودرو استفاده می‌شود. هر زمان خواستی، از بخش محصولات و ویرایش همان خودرو، عکس اختصاصی آن محصول را بارگذاری کن؛ تغییر عکس یک خودرو روی بقیه خودروها اثری ندارد.</p>
        <div className="max-w-xl">
          <ImageUploader target="site:mat-default" src="/api/site-image/mat-black-red" title="تصویر موقت مشترک کفپوش همه خودروها" hint="بارگذاری این تصویر، تصویر پیش‌فرض چهار مسیر رنگ کفپوش را هم‌زمان جایگزین می‌کند. عکس اختصاصی هر محصول از بخش محصولات تنظیم می‌شود." big />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-black">لوازم جانبی</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {accessories.map((a) => (
            <ImageUploader key={a.id} target={`product:${a.id}`} src={a.images[0] ?? "/images/accessories/wheel-cover.svg"} title={a.title} />
          ))}
        </div>
      </section>
    </div>
  );
}
