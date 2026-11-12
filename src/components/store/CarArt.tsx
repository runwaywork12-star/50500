/** Stylized inline SVG car silhouette matching the live vehicle heroes. */
export function carArtSvg(modelHint: string): string {
  const isSuv =
    /tiggo|sportage|tucson|santafe|santa|ix35|ix25|creta|seltos|sorento|carnival|palisade|rav4|crv|hrv|koleos|duster|captur|kadjar|qashqai|xtrail|x-trail|juke|kicks|terra|navara|hilux|landcruiser|prado|fortuner|highlander|outlander|asx|pajero|forester|outback|xv|cx5|cx9|cx30|mazda3?cx|s7|s5|8s|haval|jolion|f7|f5|cs35|cs55|cs75|cs85|cs95|uni|gx3|gx5|gx7|rx5|rx8|rx9|exeed|txl|vx|lx|vx6|e5|es8|es6|ec6|et5|et7|modelx|modely|gLE|GLC|GLA|GLB|glc|gle|gls|x1|x3|x5|x6|x7|q2|q3|q5|q7|q8|touareg|tiguan|troc|ateca|arona|karoq|kodiaq|macan|cayenne|xc40|xc60|xc90|ghibli|levante|durango|journey|nitro|compass|renegade|cherokee|grand|suv|cross|sport/i.test(
      modelHint || "",
    );
  const body = isSuv
    ? "M46 214 C58 168 96 150 150 142 C176 108 232 92 300 90 C368 88 420 100 452 122 C492 132 540 146 574 168 C596 182 606 196 606 210 L606 216 C606 226 598 232 588 232 L64 232 C52 232 44 226 46 214 Z"
    : "M44 216 C58 176 104 158 168 150 C204 116 268 100 330 100 C392 100 436 116 470 142 C512 152 556 166 584 186 C600 198 606 206 606 214 L606 218 C606 228 598 232 588 232 L62 232 C50 232 42 226 44 216 Z";
  const glass = isSuv
    ? "M176 142 C198 116 244 104 300 102 C356 100 402 112 430 130 L414 148 L196 150 Z"
    : "M196 150 C224 122 274 110 330 110 C384 110 424 124 452 146 L436 158 L212 160 Z";

  return (
    '<svg viewBox="0 0 640 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' +
    "<defs>" +
    '<linearGradient id="caBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b313b"/><stop offset=".5" stop-color="#161a21"/><stop offset="1" stop-color="#0a0d12"/></linearGradient>' +
    '<linearGradient id="caGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4250" stop-opacity=".9"/><stop offset="1" stop-color="#12161d" stop-opacity=".9"/></linearGradient>' +
    '<radialGradient id="caGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff7a1a" stop-opacity=".5"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="caFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12151b"/><stop offset="1" stop-color="#07090c"/></linearGradient>' +
    "</defs>" +
    '<rect x="0" y="238" width="640" height="62" fill="url(#caFloor)"/>' +
    '<ellipse cx="320" cy="244" rx="270" ry="26" fill="url(#caGlow)"/>' +
    `<path d="${body}" fill="url(#caBody)" stroke="#3a414c" stroke-width="1.5"/>` +
    `<path d="${glass}" fill="url(#caGlass)" stroke="#454d59" stroke-width="1"/>` +
    '<path d="M60 214 C160 206 480 206 596 214" fill="none" stroke="#ff7a1a" stroke-width="2.5" stroke-linecap="round" opacity=".9"/>' +
    '<circle cx="176" cy="232" r="46" fill="#0d1015"/><circle cx="470" cy="232" r="46" fill="#0d1015"/>' +
    '<circle cx="176" cy="232" r="33" fill="#05070a" stroke="#2a303a" stroke-width="3"/><circle cx="176" cy="232" r="14" fill="none" stroke="#ff7a1a" stroke-width="2.5"/><circle cx="176" cy="232" r="4" fill="#ff7a1a"/>' +
    '<circle cx="470" cy="232" r="33" fill="#05070a" stroke="#2a303a" stroke-width="3"/><circle cx="470" cy="232" r="14" fill="none" stroke="#ff7a1a" stroke-width="2.5"/><circle cx="470" cy="232" r="4" fill="#ff7a1a"/>' +
    '<ellipse cx="596" cy="196" rx="10" ry="6" fill="#ffb063" opacity=".95"/>' +
    '<ellipse cx="52" cy="206" rx="7" ry="5" fill="#ff5a3c" opacity=".8"/>' +
    "</svg>"
  );
}
