import type { ReactNode } from "react";

/** Re-mounts on every navigation, giving a soft cross-fade between pages. */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
