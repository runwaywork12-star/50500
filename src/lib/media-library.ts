import { uid } from "./control-center";
import { api, isServerMode } from "./api";

export type MediaAsset = {
  id: string;
  name: string;
  mime: string;
  size: number;
  width: number;
  height: number;
  alt: string;
  folder: string;
  tags: string[];
  dataUrl: string;
  createdAt: string;
  updatedAt: string;
};

const DB_NAME = "50500-media-library";
const STORE = "assets";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("مرورگر شما از IndexedDB پشتیبانی نمی‌کند"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("باز کردن کتابخانه تصاویر ممکن نشد"));
  });
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("خطای کتابخانه تصاویر"));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error("تراکنش تصویر ناموفق بود")); };
  });
}

export async function listMedia(): Promise<MediaAsset[]> {
  if (isServerMode()) return (await api<{ media: MediaAsset[] }>("/api/admin/media")).media;
  const rows = await withStore("readonly", (store) => store.getAll() as IDBRequest<MediaAsset[]>);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getLocalMedia(id: string): Promise<MediaAsset | undefined> {
  return withStore("readonly", (store) => store.get(id) as IDBRequest<MediaAsset | undefined>);
}

export const LOCAL_MEDIA_PREFIX = "indexeddb:";

export function contentMediaReference(asset: { src: string; assetId?: string }): string {
  if (!isServerMode() && asset.assetId) return `${LOCAL_MEDIA_PREFIX}${asset.assetId}`;
  return asset.src;
}

export async function saveMedia(asset: MediaAsset): Promise<void> {
  if (isServerMode()) {
    if (asset.dataUrl.startsWith("data:")) {
      // Restoring a backup: re-upload the file so the server validates and re-encodes it.
      const blob = await (await fetch(asset.dataUrl)).blob();
      await uploadMedia(new File([blob], asset.name, { type: blob.type }), asset.folder);
      return;
    }
    await api(`/api/admin/media/${encodeURIComponent(asset.id)}`, { method: "PATCH", body: { name: asset.name, alt: asset.alt, folder: asset.folder, tags: asset.tags } });
    return;
  }
  await withStore("readwrite", (store) => store.put(asset));
}

export async function removeMedia(id: string): Promise<void> {
  if (isServerMode()) { await api(`/api/admin/media/${encodeURIComponent(id)}`, { method: "DELETE" }); return; }
  await withStore("readwrite", (store) => store.delete(id) as IDBRequest<undefined>);
}

export async function clearMedia(): Promise<void> {
  if (isServerMode()) throw new Error("حذف گروهی تصاویر روی سرور مجاز نیست");
  await withStore("readwrite", (store) => store.clear() as IDBRequest<undefined>);
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`خواندن فایل ${file.name} ممکن نشد`));
    reader.readAsDataURL(file);
  });
}

function imageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = dataUrl;
  });
}

export async function uploadMedia(file: File, folder = "عمومی"): Promise<MediaAsset> {
  if (isServerMode()) {
    // The server checks the real file content, strips metadata and re-encodes to WebP.
    if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name}: حجم فایل باید کمتر از ۵ مگابایت باشد`);
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder.trim() || "عمومی");
    return (await api<{ asset: MediaAsset }>("/api/admin/media", { method: "POST", body: form })).asset;
  }
  if (!ACCEPTED.has(file.type)) throw new Error(`${file.name}: فقط JPG، PNG، WebP، GIF یا SVG مجاز است`);
  if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name}: حجم فایل باید کمتر از ۸ مگابایت باشد`);
  const dataUrl = await readAsDataURL(file);
  const { width, height } = await imageDimensions(dataUrl);
  const timestamp = new Date().toISOString();
  const asset: MediaAsset = {
    id: uid("media"),
    name: file.name,
    mime: file.type,
    size: file.size,
    width,
    height,
    alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
    folder: folder.trim() || "عمومی",
    tags: [],
    dataUrl,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await saveMedia(asset);
  return asset;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function downloadAsset(asset: MediaAsset) {
  const anchor = document.createElement("a");
  anchor.href = asset.dataUrl;
  anchor.download = asset.name;
  anchor.click();
}
