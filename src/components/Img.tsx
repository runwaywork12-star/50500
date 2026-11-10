import type { CSSProperties, ImgHTMLAttributes } from "react";

/**
 * Drop-in replacement for the old `next/image` component.
 *
 * The Next.js version optimised and resized images through the image
 * optimisation server. This project ships as a static single-file bundle,
 * so images are served straight from `public/` — we only need to keep the
 * same authoring API (`fill`, `sizes`, `priority`, ...) so that the markup
 * and layout stay identical.
 */
export type ImgProps = ImgHTMLAttributes<HTMLImageElement> & {
  /** Stretch the image to fill its positioned parent (like `next/image`). */
  fill?: boolean;
  width?: number | string;
  height?: number | string;
  /** `srcset` hint — kept for parity, the browser ignores it without a real `srcSet`. */
  sizes?: string;
  /** Load eagerly and without lazy decoding (above-the-fold art). */
  priority?: boolean;
  unoptimized?: boolean;
  quality?: number;
  placeholder?: string;
  onLoadingComplete?: () => void;
};

export default function Img({
  src,
  alt = "",
  fill,
  width,
  height,
  sizes,
  priority,
  unoptimized: _unoptimized,
  quality: _quality,
  placeholder: _placeholder,
  onLoadingComplete,
  className,
  style,
  loading,
  ...rest
}: ImgProps) {
  const fillStyle: CSSProperties = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style }
    : (style ?? {});

  return (
    <img
      src={typeof src === "string" ? src : (src as unknown as { src?: string })?.src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      loading={priority ? "eager" : (loading ?? "lazy")}
      decoding={priority ? "sync" : "async"}
      className={className}
      style={fillStyle}
      onLoad={onLoadingComplete}
      {...rest}
    />
  );
}
