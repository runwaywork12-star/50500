import { readFileSync, writeFileSync } from "node:fs";

// Replace these four payloads only. Do not regenerate unrelated image entries.
const modulePath = new URL("../src/lib/images.ts", import.meta.url);
let source = readFileSync(modulePath, "utf8");
const before = source;
const keys = ["domestic", "chinese", "asian", "european"];

for (const key of keys) {
  const file = new URL(`../public/images/cars/${key}.jpg`, import.meta.url);
  const bytes = readFileSync(file);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(`Invalid JPEG: ${key}`);
  const pattern = new RegExp(`("images/cars/${key}\\.jpg":\\s*")data:[^"]+("[,;]?)`);
  if (!pattern.test(source)) throw new Error(`Missing image key: ${key}`);
  source = source.replace(pattern, (_, prefix, suffix) => `${prefix}data:image/jpeg;base64,${bytes.toString("base64")}${suffix}`);
}

const withoutCars = (text) => text.replace(/"images\/cars\/(?:domestic|chinese|asian|european)\.jpg":\s*"data:[^"]+"/g, "CAR_IMAGE");
if (withoutCars(source) !== withoutCars(before)) throw new Error("An unrelated image or helper was changed");
writeFileSync(modulePath, source);
console.log("Updated four car images. All other image payloads and the img helper are unchanged.");