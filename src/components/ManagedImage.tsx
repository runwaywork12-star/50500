import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { img } from "@/lib/images";
import { getLocalMedia, LOCAL_MEDIA_PREFIX } from "@/lib/media-library";
import { useSiteContent } from "@/lib/site-content";

export function useMediaSource(reference: string | undefined) {
  const isLocal = Boolean(reference?.startsWith(LOCAL_MEDIA_PREFIX));
  const [localSource, setLocalSource] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (reference?.startsWith(LOCAL_MEDIA_PREFIX)) {
      setLocalSource("");
      void getLocalMedia(reference.slice(LOCAL_MEDIA_PREFIX.length))
        .then((asset) => { if (!cancelled) setLocalSource(asset?.dataUrl ?? ""); })
        .catch(() => { if (!cancelled) setLocalSource(""); });
    }
    return () => { cancelled = true; };
  }, [reference]);

  return isLocal ? localSource : reference ? img(reference) : "";
}

type ManagedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  slot?: string;
};

export function ManagedImage({ src, slot, alt = "", ...props }: ManagedImageProps) {
  const { content } = useSiteContent();
  const override = slot ? content.imageSlots?.[slot] : undefined;
  const resolved = useMediaSource(override?.src || src);
  return <img {...props} src={resolved || undefined} alt={override?.alt || alt} />;
}