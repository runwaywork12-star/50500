import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

/**
 * Safety net: if any image fails (missing file, offline asset, bad URL) we swap in
 * a branded 50500 placeholder instead of showing a broken-image icon.
 */
const FALLBACK_IMG =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="420" viewBox="0 0 600 420">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#171a20"/><stop offset="1" stop-color="#08090c"/></linearGradient>
        <pattern id="q" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="30" height="30" fill="#0d1014"/>
          <rect x="2" y="2" width="26" height="26" rx="5" fill="#1b1f26" stroke="#ff6b1a" stroke-opacity=".35"/>
        </pattern>
      </defs>
      <rect width="600" height="420" fill="url(#bg)"/>
      <path d="M110 250 C170 175 250 130 330 136 C410 142 470 195 486 250 C480 296 420 314 320 316 C215 318 130 300 110 250 Z" fill="url(#q)" stroke="#ff6b1a" stroke-width="4"/>
      <text x="300" y="240" text-anchor="middle" font-family="Arial, sans-serif" font-size="46" font-weight="bold" fill="#ff8a3a">50500</text>
      <text x="300" y="366" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" fill="#9aa3b1">کارگاه کفپوش چرمی 50500</text>
    </svg>`,
  );

window.addEventListener(
  "error",
  (event) => {
    const el = event.target as HTMLElement | null;
    if (!el || el.tagName !== "IMG") return;
    const image = el as HTMLImageElement;
    if (image.dataset.fallback === "1") return;
    image.dataset.fallback = "1";
    image.classList.add("img-fallback");
    image.src = FALLBACK_IMG;
  },
  true,
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
