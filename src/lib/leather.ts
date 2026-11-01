/**
 * Procedural quilted-leather renderer (no dependencies).
 * Geometry-dependent shading (puffs, grain, sheen) is computed once and cached;
 * re-colouring leather / embroidery thread only repaints.
 */

export type LeatherPattern = "diamond" | "honeycomb" | "linear" | "grid";

export type LeatherPiece = { margin: number; radius: number; binding: number };

export type LeatherGeometry = {
  /** texture units spanning the canvas width */
  units: number;
  /** pattern cell size in units */
  cell: number;
  pattern: LeatherPattern;
  /** draw a leather piece with piped edge binding instead of a full-bleed surface */
  piece?: LeatherPiece | null;
  seed?: number;
};

export type Shading = {
  key: string;
  w: number;
  h: number;
  ppu: number;
  K: Float32Array;
  SP: Float32Array;
  A: Uint8ClampedArray;
};

const SQRT2 = Math.SQRT2;
const R2 = 1 / SQRT2;
const SQRT3 = Math.sqrt(3);
const S32 = SQRT3 / 2;
const HONEY_R = 0.6;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16) || 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

export function mixHex(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  const c = x.map((v, i) => Math.round((v + (y[i] - v) * t) * 255));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const LUT_SIZE = 4096;
const LUT_MAX = 2;
let LUT: Uint8ClampedArray | null = null;
function lut(): Uint8ClampedArray {
  if (LUT) return LUT;
  const table = new Uint8ClampedArray(LUT_SIZE);
  for (let i = 0; i < LUT_SIZE; i++) {
    let v = (i / (LUT_SIZE - 1)) * LUT_MAX;
    if (v > 0.78) v = 0.78 + 0.22 * (1 - Math.exp(-(v - 0.78) / 0.22));
    const s = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    table[i] = Math.round(s * 255);
  }
  LUT = table;
  return table;
}

function makeNoise(seed: number) {
  const vals = new Float32Array(256 * 256);
  let s = (Math.imul(seed | 0, 2654435761) | 0) || 1;
  for (let i = 0; i < vals.length; i++) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    vals[i] = (s >>> 0) / 4294967296;
  }
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const x0 = xi & 255;
    const y0 = yi & 255;
    const x1 = (x0 + 1) & 255;
    const y1 = (y0 + 1) & 255;
    const a = vals[(y0 << 8) | x0];
    const b = vals[(y0 << 8) | x1];
    const c = vals[(y1 << 8) | x0];
    const d = vals[(y1 << 8) | x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

/* ---------- distance-to-groove fields (write into F) ---------- */

const F = { d: 0, gx: 0, gy: 0 };

function smin(a: number, agx: number, agy: number, b: number, bgx: number, bgy: number, k: number) {
  let h = 0.5 + (0.5 * (b - a)) / k;
  if (h < 0) h = 0;
  else if (h > 1) h = 1;
  F.d = b + (a - b) * h - k * h * (1 - h);
  F.gx = bgx + (agx - bgx) * h;
  F.gy = bgy + (agy - bgy) * h;
}

type Field = (x: number, y: number) => void;

function gridField(S: number, k: number): Field {
  const half = S / 2;
  return (x, y) => {
    const a = x - Math.floor(x / S) * S;
    const b = y - Math.floor(y / S) * S;
    let dx: number, sx: number, dy: number, sy: number;
    if (a < half) {
      dx = a;
      sx = 1;
    } else {
      dx = S - a;
      sx = -1;
    }
    if (b < half) {
      dy = b;
      sy = 1;
    } else {
      dy = S - b;
      sy = -1;
    }
    smin(dx, sx, 0, dy, 0, sy, k);
  };
}

function diamondField(S: number, k: number): Field {
  const g = gridField(S, k);
  return (x, y) => {
    g((x + y) * R2, (x - y) * R2);
    const ga = F.gx;
    const gb = F.gy;
    F.gx = (ga + gb) * R2;
    F.gy = (ga - gb) * R2;
  };
}

function linearField(S: number): Field {
  const half = S / 2;
  return (_x, y) => {
    const b = y - Math.floor(y / S) * S;
    if (b < half) {
      F.d = b;
      F.gy = 1;
    } else {
      F.d = S - b;
      F.gy = -1;
    }
    F.gx = 0;
  };
}

function honeyField(r: number, k: number): Field {
  const w = SQRT3 * r;
  const hh = 3 * r;
  const apothem = r * S32;
  return (x, y) => {
    const ax = Math.round(x / w) * w;
    const ay = Math.round(y / hh) * hh;
    const bx = (Math.floor(x / w) + 0.5) * w;
    const by = (Math.floor(y / hh) + 0.5) * hh;
    const da = (x - ax) * (x - ax) + (y - ay) * (y - ay);
    const db = (x - bx) * (x - bx) + (y - by) * (y - by);
    const px = da < db ? x - ax : x - bx;
    const py = da < db ? y - ay : y - by;
    const p0 = px;
    const p1 = 0.5 * px + S32 * py;
    const p2 = -0.5 * px + S32 * py;
    const s0 = p0 < 0 ? -1 : 1;
    const s1 = p1 < 0 ? -1 : 1;
    const s2 = p2 < 0 ? -1 : 1;
    smin(-p0 * s0, -s0, 0, -p1 * s1, -0.5 * s1, -S32 * s1, k);
    const m = -F.d;
    const mgx = -F.gx;
    const mgy = -F.gy;
    smin(-m, -mgx, -mgy, -p2 * s2, 0.5 * s2, -S32 * s2, k);
    F.d = apothem + F.d;
    F.gx = F.gx;
    F.gy = F.gy;
  };
}

function makeField(pattern: LeatherPattern, S: number): { field: Field; ramp: number } {
  switch (pattern) {
    case "linear":
      return { field: linearField(S * 0.62), ramp: S * 0.31 };
    case "grid":
      return { field: gridField(S, S * 0.3), ramp: S * 0.5 };
    case "honeycomb": {
      const r = S * HONEY_R;
      return { field: honeyField(r, r * 0.3), ramp: r * S32 };
    }
    default:
      return { field: diamondField(S, S * 0.3), ramp: S * 0.5 };
  }
}

/* ---------- shading ---------- */

export function computeShading(w: number, h: number, geo: LeatherGeometry): Shading {
  const ppu = w / geo.units;
  const W = geo.units;
  const H = h / ppu;
  const S = geo.cell;
  const { field, ramp } = makeField(geo.pattern, S);
  const puff = S * 0.2;
  const noise = makeNoise(geo.seed ?? 7);
  const ox = W / 2;
  const oy = H / 2;
  const piece = geo.piece ?? null;
  const n = w * h;
  const K = new Float32Array(n);
  const SP = new Float32Array(n);
  const A = new Uint8ClampedArray(n);

  let Lx = -0.48;
  let Ly = -0.62;
  let Lz = 0.62;
  const ll = Math.hypot(Lx, Ly, Lz);
  Lx /= ll;
  Ly /= ll;
  Lz /= ll;
  let Hx = Lx;
  let Hy = Ly;
  let Hz = Lz + 1;
  const hl = Math.hypot(Hx, Hy, Hz);
  Hx /= hl;
  Hy /= hl;
  Hz /= hl;
  const wrap = 0.3;
  const amb = 0.2;
  const flat = (Lz + wrap) / (1 + wrap);
  const shin = 20;

  const pcx = W / 2;
  const pcy = H / 2;
  const phw = piece ? W / 2 - piece.margin : 0;
  const phh = piece ? H / 2 - piece.margin : 0;
  const pr = piece ? Math.max(0, Math.min(piece.radius, phw, phh)) : 0;
  const bw = piece?.binding ?? 0;
  const seamK = S * 0.12;
  const aa = 1 / ppu;

  let j = 0;
  for (let py = 0; py < h; py++) {
    const y = (py + 0.5) / ppu;
    for (let px = 0; px < w; px++, j++) {
      const x = (px + 0.5) / ppu;
      let e = 1e9;
      let egx = 0;
      let egy = 0;
      let alpha = 1;
      if (piece) {
        const dxc = x - pcx;
        const dyc = y - pcy;
        const sx = dxc < 0 ? -1 : 1;
        const sy = dyc < 0 ? -1 : 1;
        const qx = dxc * sx - (phw - pr);
        const qy = dyc * sy - (phh - pr);
        if (qx > 0 && qy > 0) {
          const l = Math.sqrt(qx * qx + qy * qy);
          e = pr - l;
          egx = -(qx / l) * sx;
          egy = -(qy / l) * sy;
        } else if (qx > qy) {
          e = pr - qx;
          egx = -sx;
        } else {
          e = pr - qy;
          egy = -sy;
        }
        if (e <= 0) continue;
        alpha = e < aa ? e / aa : 1;
      }

      let nx: number;
      let ny: number;
      let hgt: number;
      let albedo = 1;
      if (piece && e < bw) {
        const t = e / bw;
        hgt = Math.sin(Math.PI * t);
        const dz = puff * 0.85 * (Math.PI / bw) * Math.cos(Math.PI * t);
        nx = -dz * egx;
        ny = -dz * egy;
        albedo = 0.8;
      } else {
        field(x - ox, y - oy);
        let d = F.d;
        let gx = F.gx;
        let gy = F.gy;
        if (piece) {
          const s = e - bw;
          if (s < d + seamK) {
            smin(d, gx, gy, s, egx, egy, seamK);
            d = F.d;
            gx = F.gx;
            gy = F.gy;
          }
        }
        if (d < 0) d = 0;
        const t = d / ramp;
        if (t >= 1) {
          hgt = 1;
          nx = 0;
          ny = 0;
        } else {
          const o = 1 - t;
          hgt = 1 - o * o;
          const dz = (puff * 2 * o) / ramp;
          nx = -dz * gx;
          ny = -dz * gy;
        }
      }

      const g1 = noise(x * 0.75, y * 0.75);
      const g2 = noise(x * 1.9 + 71.3, y * 1.9 + 17.9);
      nx += (noise(x * 0.8 + 133.1, y * 0.8 + 7.7) - 0.5) * 0.1;
      ny += (noise(x * 0.8 + 11.9, y * 0.8 + 219.3) - 0.5) * 0.1;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      const nxx = nx * inv;
      const nyy = ny * inv;
      let diff = (nxx * Lx + nyy * Ly + inv * Lz + wrap) / (1 + wrap);
      if (diff < 0) diff = 0;
      const shade = amb + (1 - amb) * (diff / flat);
      const ndh = nxx * Hx + nyy * Hy + inv * Hz;
      const spec = ndh > 0 ? Math.pow(ndh, shin) : 0;
      const ao = 0.4 + 0.6 * Math.sqrt(hgt);
      const grain = 0.9 + 0.2 * (0.62 * g1 + 0.38 * g2);
      const mottle = 0.935 + 0.13 * noise(x * 0.021 + 5.5, y * 0.021 + 9.1);
      const fall = 1.06 - 0.16 * ((x / W) * 0.5 + (y / H) * 0.5);
      K[j] = shade * ao * grain * mottle * fall * albedo;
      SP[j] = spec * (0.78 + 0.44 * g1) * fall * (0.3 + 0.7 * hgt);
      A[j] = alpha * 255;
    }
  }
  return { key: "", w, h, ppu, K, SP, A };
}

/** Writes RGBA pixels for the given leather colour into `out`. */
export function shadeRGBA(sh: Shading, leatherHex: string, out: Uint8ClampedArray) {
  const [r0, g0, b0] = hexToRgb(leatherHex).map(toLinear);
  const lum = 0.2126 * r0 + 0.7152 * g0 + 0.0722 * b0;
  const ks = 0.05 + 0.24 * Math.max(0, 1 - lum * 2.4);
  const table = lut();
  const scale = (LUT_SIZE - 1) / LUT_MAX;
  const top = LUT_SIZE - 1;
  const n = sh.w * sh.h;
  for (let j = 0, i = 0; j < n; j++, i += 4) {
    const a = sh.A[j];
    if (a === 0) {
      out[i + 3] = 0;
      continue;
    }
    const k = sh.K[j];
    const s = sh.SP[j] * ks;
    let v = (r0 * k + s) * scale;
    out[i] = table[v >= top ? top : v | 0];
    v = (g0 * k + s) * scale;
    out[i + 1] = table[v >= top ? top : v | 0];
    v = (b0 * k + s) * scale;
    out[i + 2] = table[v >= top ? top : v | 0];
    out[i + 3] = a;
  }
}

/* ---------- embroidery stitches ---------- */

function roundRect(p: Path2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  p.moveTo(x + rr, y);
  p.lineTo(x + w - rr, y);
  p.arcTo(x + w, y, x + w, y + rr, rr);
  p.lineTo(x + w, y + h - rr);
  p.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  p.lineTo(x + rr, y + h);
  p.arcTo(x, y + h, x, y + h - rr, rr);
  p.lineTo(x, y + rr);
  p.arcTo(x, y, x + rr, y, rr);
  p.closePath();
}

function patternPath(pattern: LeatherPattern, S: number, W: number, H: number): Path2D {
  const p = new Path2D();
  const x0 = -W / 2 - S;
  const x1 = W / 2 + S;
  const y0 = -H / 2 - S;
  const y1 = H / 2 + S;
  if (pattern === "linear" || pattern === "grid") {
    const step = pattern === "linear" ? S * 0.62 : S;
    for (let y = Math.floor(y0 / step) * step; y <= y1; y += step) {
      p.moveTo(x0, y);
      p.lineTo(x1, y);
    }
    if (pattern === "grid") {
      for (let x = Math.floor(x0 / S) * S; x <= x1; x += S) {
        p.moveTo(x, y0);
        p.lineTo(x, y1);
      }
    }
  } else if (pattern === "diamond") {
    const step = S * SQRT2;
    for (let c = Math.floor((x0 + y0) / step) * step; c <= x1 + y1; c += step) {
      p.moveTo(c - y0, y0);
      p.lineTo(c - y1, y1);
    }
    for (let c = Math.floor((x0 - y1) / step) * step; c <= x1 - y0; c += step) {
      p.moveTo(c + y0, y0);
      p.lineTo(c + y1, y1);
    }
  } else {
    const r = S * HONEY_R;
    const w = SQRT3 * r;
    const rowH = 1.5 * r;
    for (let jr = Math.floor(y0 / rowH) - 1; jr * rowH <= y1 + r; jr++) {
      const cy = jr * rowH;
      const off = jr & 1 ? w / 2 : 0;
      for (let i = Math.floor((x0 - off) / w) - 1; i * w + off <= x1 + w; i++) {
        const cx = i * w + off;
        p.moveTo(cx, cy - r);
        p.lineTo(cx + w / 2, cy - r / 2);
        p.lineTo(cx + w / 2, cy + r / 2);
        p.lineTo(cx, cy + r);
      }
    }
  }
  return p;
}

function strokeThread(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  color: string,
  sw: number,
  ppu: number,
  tx: number,
  ty: number,
  dash: number[],
) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash(dash);
  ctx.setTransform(ppu, 0, 0, ppu, tx * ppu, ty * ppu);
  // dark groove carved into the leather first, so each stitch sits *in* the surface
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = mixHex(color, "#000000", 0.78);
  ctx.lineWidth = sw * 1.65;
  ctx.stroke(path);
  ctx.shadowColor = "rgba(0,0,0,0.62)";
  ctx.shadowBlur = sw * 0.9 * ppu;
  ctx.shadowOffsetX = sw * 0.3 * ppu;
  ctx.shadowOffsetY = sw * 0.5 * ppu;
  ctx.strokeStyle = color;
  ctx.lineWidth = sw;
  ctx.stroke(path);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.setTransform(ppu, 0, 0, ppu, (tx - sw * 0.16) * ppu, (ty - sw * 0.2) * ppu);
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = mixHex(color, "#ffffff", 0.55);
  ctx.lineWidth = sw * 0.36;
  ctx.stroke(path);
  ctx.globalAlpha = 1;
}

export function paintLeather(
  ctx: CanvasRenderingContext2D,
  sh: Shading,
  leatherHex: string,
  threadHex: string | null,
  geo: LeatherGeometry,
) {
  const img = ctx.createImageData(sh.w, sh.h);
  shadeRGBA(sh, leatherHex, img.data);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.putImageData(img, 0, 0);
  if (!threadHex) return;

  const ppu = sh.ppu;
  const W = geo.units;
  const H = sh.h / ppu;
  const S = geo.cell;
  const sw = S * 0.042;
  const dash = [S * 0.082, S * 0.062];
  const piece = geo.piece ?? null;

  ctx.save();
  if (piece) {
    const inset = piece.margin + piece.binding;
    const clip = new Path2D();
    roundRect(clip, inset, inset, W - inset * 2, H - inset * 2, piece.radius - piece.binding);
    ctx.setTransform(ppu, 0, 0, ppu, 0, 0);
    ctx.clip(clip);
  }
  strokeThread(ctx, patternPath(geo.pattern, S, W, H), threadHex, sw, ppu, W / 2, H / 2, dash);
  ctx.restore();

  if (piece) {
    ctx.save();
    const inset = piece.margin + piece.binding * 0.62;
    const edge = new Path2D();
    roundRect(edge, inset, inset, W - inset * 2, H - inset * 2, piece.radius - piece.binding * 0.62);
    strokeThread(ctx, edge, threadHex, sw * 1.05, ppu, 0, 0, dash);
    ctx.restore();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
