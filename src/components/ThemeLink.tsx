import { Link, type LinkProps } from "react-router-dom";

export type ThemeLinkProps = Omit<LinkProps, "to"> & {
  href?: string;
  to?: string;
  skin?: "dark" | "light";
};

/** Compatibility link component that accepts either href or to. */
export function ThemeLink({ href, to, skin: _skin, ...props }: ThemeLinkProps) {
  const destination = to ?? href ?? "/";
  return <Link to={destination} {...props} />;
}
