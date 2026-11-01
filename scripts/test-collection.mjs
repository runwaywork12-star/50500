import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.PREVIEW_URL || "http://localhost:3000";
await fs.mkdir("artifacts/collection", { recursive: true });
const browser = await chromium.launch();
const results = [];
const errors = [];

try {
  for (const [label, width, height] of [
    ["desktop", 1440, 1000],
    ["wide", 1780, 1080],
    ["tablet", 820, 1100],
    ["mobile", 390, 844],
    ["small-mobile", 360, 800],
  ]) {
    for (const [theme, route] of [["dark", "/"], ["light", "/v2"]]) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      page.on("pageerror", (error) => errors.push(error.message));
      console.log(`Checking ${theme} at ${width}px`);
      const response = await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      assert.equal(response?.status(), 200, `Page status: ${theme} ${label}`);
      const section = page.locator('main [data-testid="collection-showcase"]:visible').first();
      await section.waitFor({ state: "visible" });
      await section.evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
      await section.locator("img").evaluateAll(async (images) => {
        images.forEach((image) => { image.loading = "eager"; });
        await Promise.race([
          Promise.all(images.map((image) => image.decode())),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Collection images did not load in time")), 20000)),
        ]);
      });
      await page.evaluate(() => Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]));

      const measurement = await section.evaluate((section) => {
        const rgb = (value) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        const luminance = (color) => {
          const c = rgb(color).map((v) => {
            const x = v / 255;
            return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
          });
          return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
        };
        const contrast = (a, b) => {
          const A = luminance(a), B = luminance(b);
          return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05);
        };
        const cards = [...section.querySelectorAll('[data-testid="collection-accessory"]')].map((card) => {
          const media = card.querySelector('[data-testid="collection-accessory-media"]');
          const copy = card.querySelector('[data-testid="collection-accessory-copy"]');
          const title = copy.querySelector("h3");
          const price = copy.querySelector(":scope > div > p");
          const image = media.querySelector("img");
          const box = media.getBoundingClientRect();
          const textBox = copy.getBoundingClientRect();
          const style = getComputedStyle(image);
          const imageW = box.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
          const imageH = box.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
          const objectScale = Math.min(imageW / image.naturalWidth, imageH / image.naturalHeight);
          const background = getComputedStyle(copy).backgroundColor;
          return {
            title: title.textContent.trim(),
            price: price.textContent.trim(),
            titleContrast: contrast(getComputedStyle(title).color, background),
            priceContrast: contrast(getComputedStyle(price).color, background),
            mediaHeight: Math.round(box.height),
            visibleObjectHeight: Math.round(image.naturalHeight * objectScale),
            mediaCopyGap: Math.round(textBox.top - box.bottom),
            copyWidth: Math.round(textBox.width),
            textOverflow: copy.scrollWidth > copy.clientWidth + 1,
            image: image.currentSrc,
            loaded: image.complete && image.naturalWidth > 0,
          };
        });
        const mat = section.querySelector('[data-testid="collection-mat"]');
        const img = mat.querySelector("img");
        return {
          cards,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          matImage: img.currentSrc,
          matBackground: getComputedStyle(img.parentElement).backgroundColor,
          matFit: getComputedStyle(img).objectFit,
          matBorder: getComputedStyle(img.parentElement).borderWidth,
        };
      });

      assert.equal(measurement.cards.length, 4, `Four accessory cards: ${label}`);
      assert.ok(measurement.overflow <= 1, `Horizontal overflow: ${theme} ${label}`);
      assert.equal(measurement.matBackground, "rgba(0, 0, 0, 0)", "Mat container must be transparent");
      assert.equal(measurement.matFit, "contain", "Complete mat set must remain visible");
      assert.ok(measurement.matImage.includes("showcase"), "Mat must use the real alpha cutout, not the white source");
      for (const card of measurement.cards) {
        assert.ok(card.loaded && card.image.includes("showcase"), `Cutout loaded: ${card.title}`);
        assert.ok(card.title.length > 8 && card.price.includes("تومان"), `Visible product information: ${card.title}`);
        assert.ok(card.titleContrast >= 4.5, `Title contrast ${card.titleContrast}: ${theme} ${card.title}`);
        assert.ok(card.priceContrast >= 4.5, `Price contrast: ${theme} ${card.title}`);
        assert.ok(card.mediaCopyGap >= -1, `Image overlaps caption: ${card.title}`);
        assert.ok(card.visibleObjectHeight >= 120, `Product is too small: ${card.title}, ${card.visibleObjectHeight}px`);
        assert.equal(card.textOverflow, false, `Text overflows: ${card.title}`);
      }

      // Hit-testing at the centre of every heading catches an image covering the text.
      for (const heading of await section.locator('[data-testid="collection-accessory"] h3').all()) {
        await heading.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
        const unobscured = await heading.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return Boolean(hit && (hit === el || el.contains(hit)));
        });
        assert.ok(unobscured, `Heading covered in ${theme}/${label}: ${await heading.textContent()}`);
      }

      if (["desktop", "mobile"].includes(label)) {
        await section.screenshot({ path: `artifacts/collection/${theme}-${label}.png`, animations: "disabled" });
      }
      if (label === "desktop") {
        const first = section.getByTestId("collection-accessory").first();
        const href = await first.getAttribute("href");
        assert.ok(href?.startsWith(theme === "light" ? "/v2/products/" : "/products/"), "Product link keeps the selected theme");
        const expectedTitle = await first.locator("h3").textContent();
        await first.click();
        await page.waitForURL((url) => url.pathname === href);
        assert.equal((await page.locator("h1").textContent())?.trim(), expectedTitle?.trim(), "Card opens its own product");
      }
      results.push({ theme, viewport: label, ...measurement });
      console.log(`${theme.padEnd(5)} ${label.padEnd(12)} titles+prices visible · contrast ${measurement.cards[0].titleContrast.toFixed(1)}:1 · product height ${measurement.cards.map((c) => c.visibleObjectHeight).join("/")}px · overflow ${measurement.overflow}px`);
      await context.close();
    }
  }
  assert.equal(errors.length, 0, `Browser errors: ${errors.join("; ")}`);
  await fs.writeFile("artifacts/collection/report.json", JSON.stringify(results, null, 2));
  console.log("PASS: both themes, five viewport sizes, no image/caption overlap, no covered titles, all product links correct.");
} finally {
  await browser.close();
}
