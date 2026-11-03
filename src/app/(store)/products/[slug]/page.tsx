import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Headset, MessageSquare, PackageCheck, Truck } from "lucide-react";
import { Carousel } from "@/components/store/Motion";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductExperience } from "@/components/store/ProductExperience";
import { ReviewForm } from "@/components/store/ReviewForm";
import { Breadcrumbs, SectionHeading, Stars } from "@/components/ui";
import { fa, faDate } from "@/lib/format";
import { CONTACT } from "@/lib/options";
import { getApprovedReviews, getProductBySlug, getRelatedProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProductBySlug(decodeURIComponent(slug));
  if (!data) return { title: "محصول یافت نشد" };
  return { title: data.product.title, description: data.product.description.split("\n")[0]?.slice(0, 160) };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getProductBySlug(decodeURIComponent(slug));
  if (!data) notFound();
  const { product, category, brand, model } = data;
  const [reviewList, related] = await Promise.all([getApprovedReviews(product.id), getRelatedProducts(product)]);
  const paragraphs = product.description.split("\n").filter(Boolean);
  const avg = reviewList.length ? reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length : product.rating;

  return (
    <>
      <div className="container-x pt-6">
        <Breadcrumbs
          items={[
            { href: "/", label: "خانه" },
            { href: "/products", label: "فروشگاه" },
            { href: `/products?category=${category.slug}`, label: category.shortName },
            ...(brand ? [{ href: `/products?brand=${brand.slug}`, label: brand.name }] : []),
            { label: model?.fullName ?? product.title },
          ]}
        />
      </div>

      <ProductExperience
        product={{
          id: product.id,
          slug: product.slug,
          title: product.title,
          price: product.price,
          comparePrice: product.comparePrice,
          images: product.images,
          rating: product.rating,
          ratingCount: product.ratingCount,
          salesCount: product.salesCount,
          stock: product.stock,
          deliveryDays: product.deliveryDays,
          summary: paragraphs[0] ?? "",
        }}
        category={{ slug: category.slug, shortName: category.shortName, optionsType: category.optionsType }}
        carName={model?.fullName ?? null}
      />

            <div className="container-x mt-14">
        <nav aria-label="بخش‌های صفحه" className="no-scrollbar flex gap-2 overflow-x-auto rounded-2xl border bd bg-ink-850 p-1.5">
          {[
            { href: "#intro", label: "معرفی محصول" },
            { href: "#specs", label: "مشخصات فنی" },
            { href: "#reviews", label: "نظرات خریداران" },
          ].map((t) => (
            <a key={t.href} href={t.href} className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold tdim transition soft-h hover:text-white">
              {t.label}
            </a>
          ))}
        </nav>
      </div>

      <section className="container-x mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <div id="intro" className="surface scroll-mt-28 rounded-3xl p-6 sm:p-8">
            <h2 className="text-xl font-black">معرفی محصول</h2>
            <div className="prose-fa mt-4">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>

          {product.specs.length > 0 && (
            <div id="specs" className="surface scroll-mt-28 rounded-3xl p-6 sm:p-8">
              <h2 className="text-xl font-black">مشخصات فنی</h2>
              <dl className="mt-5 overflow-hidden rounded-2xl border bd">
                {product.specs.map((s, i) => (
                  <div key={s.label} className={`grid grid-cols-[140px_1fr] gap-4 px-4 py-3.5 text-sm sm:grid-cols-[200px_1fr] ${i % 2 ? "" : "soft"}`}>
                    <dt className="tdim">{s.label}</dt>
                    <dd className="font-semibold tdim">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div id="reviews" className="surface scroll-mt-28 rounded-3xl p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <MessageSquare className="size-5 text-brand-400" /> نظرات خریداران
              </h2>
              <div className="flex items-center gap-3 rounded-2xl soft px-4 py-2">
                <span className="text-2xl font-black">{fa(Math.round(avg * 10) / 10)}</span>
                <div>
                  <Stars value={avg} className="size-3.5" />
                  <p className="mt-0.5 text-[11px] tdim">{fa(reviewList.length)} نظر ثبت‌شده</p>
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-4">
              {reviewList.length === 0 && <p className="text-sm tdim">هنوز نظری ثبت نشده است. اولین نفر باشید!</p>}
              {reviewList.map((r) => (
                <article key={r.id} className="rounded-2xl border bd soft p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-full bg-linear-to-br from-brand-400 to-brand-700 text-sm font-black">
                        {r.name.slice(0, 1)}
                      </span>
                      <div>
                        <p className="text-sm font-bold">{r.name}</p>
                        <p className="text-xs tdim">
                          {r.city ? `${r.city} · ` : ""}
                          {faDate(r.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Stars value={r.rating} className="size-3.5" />
                  </div>
                  <p className="mt-3 text-sm leading-8 tdim">{r.comment}</p>
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    <PackageCheck className="size-3" /> خریدار این محصول
                  </span>
                </article>
              ))}
            </div>
            <div className="mt-6">
              <ReviewForm productId={product.id} />
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="surface grid gap-4 rounded-3xl p-6">
            {[
              { icon: Truck, t: "ارسال به سراسر ایران", d: "ارسال رایگان برای خریدهای بالای ۵ میلیون تومان" },
              { icon: PackageCheck, t: "بسته‌بندی ویژه", d: "بسته‌بندی ضد ضربه با کارت گارانتی و هولوگرام اصالت" },
              { icon: Headset, t: "مشاوره رایگان", d: `پیش از خرید با کارشناسان ما تماس بگیرید: ${CONTACT.phone}` },
            ].map((x) => (
              <div key={x.t} className="flex gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-400">
                  <x.icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-bold">{x.t}</p>
                  <p className="mt-1 text-xs leading-6 tdim">{x.d}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {related.length > 0 && (
        <section className="container-x mt-20">
          <SectionHeading eyebrow="پیشنهاد ما" title="محصولات مرتبط" />
          <Carousel>
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </Carousel>
        </section>
      )}
    </>
  );
}
