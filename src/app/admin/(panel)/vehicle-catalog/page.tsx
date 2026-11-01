import { requireAdminPermission } from "@/lib/auth";
import { VehicleCatalogManager } from "@/components/admin/VehicleCatalogManager";
export const dynamic = "force-dynamic";
export default async function VehicleCatalogPage() {
  await requireAdminPermission("catalog:read");

  return <div className="grid gap-6"><div><h1 className="text-2xl font-black">دسته‌بندی خودروها</h1><p className="mt-2 max-w-3xl text-sm leading-7 text-white/55">برندها را به‌عنوان دسته اصلی و مدل‌ها را به‌عنوان زیرمجموعه مدیریت کن. فهرست اولیه از تصویر ارسالی تکمیل شده و به‌صورت خودکار در انتخاب‌گر صفحه اصلی نمایش داده می‌شود. می‌توانی هر مورد را جداگانه ویرایش کنی، یا با قالب «برند | مدل اول، مدل دوم» ورود گروهی انجام بدهی و خروجی CSV بگیری. توجه: ثبت مدل به‌تنهایی محصول یا موجودی نمی‌سازد؛ برای فروش باید محصول را به مدل واقعی متصل کنی.</p></div><VehicleCatalogManager /></div>;
}
