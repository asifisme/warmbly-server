import { useEffect } from "react";
import { useLocation, useMatches } from "@tanstack/react-router";
import { useCurrentOrg, useUnseenCount } from "@/stores";
import { setFaviconBadge } from "@/lib/faviconBadge";
import useBrand from "@/hooks/useBrand";

// "Section | Brand" from the deepest route's `staticData.title` in router.tsx.

function titleForMatches(title: string | undefined, notFound: boolean, brand: string): string {
  if (notFound) return `Page not found | ${brand}`;
  return title ? `${title} | ${brand}` : brand;
}

// Fold the current workspace in as context, before the brand:
//   "Mailboxes | Brand"  ->  "Mailboxes · Acme | Brand"
//   "Brand"              ->  "Acme | Brand"
function withOrg(base: string, org: string | undefined, brand: string): string {
  if (!org) return base;
  const suffix = ` | ${brand}`;
  if (base === brand) return `${org}${suffix}`;
  if (base.endsWith(suffix)) return `${base.slice(0, -suffix.length)} · ${org}${suffix}`;
  return `${base} · ${org}`;
}

/**
 * Sets document.title from the current route, folding in the current workspace
 * and a leading unread-count prefix ("(3) …") on the dashboard, and mirrors the
 * unread count onto the favicon as a red badge. Pass an explicit `override` to
 * title a page from loaded data (e.g. a campaign name) instead of the map.
 */
export function useDocumentTitle(override?: string) {
  const { pathname } = useLocation();
  const brand = useBrand();
  const brandName = brand.name || "Cloudsnow";
  // The deepest route that names itself, so a layout never titles its pages.
  const title = useMatches({
    select: (ms) => [...ms].reverse().find((m) => m.staticData?.title)?.staticData?.title,
  });
  const notFound = useMatches({
    select: (ms) => ms.length === 0 || ms.some((m) => m._notFound || m.status === "notFound"),
  });
  const org = useCurrentOrg();
  const unread = useUnseenCount();

  useEffect(() => {
    // Workspace context + the unread badge are dashboard-only; on auth /
    // marketing routes (or with no selected workspace) use the plain title.
    const onApp = pathname.startsWith("/app");
    const count = onApp ? unread : 0;

    const base = override ? `${override} | ${brandName}` : titleForMatches(title, notFound, brandName);
    const titled = withOrg(base, onApp ? org?.name : undefined, brandName);
    const prefix = count > 0 ? `(${count > 99 ? "99+" : count}) ` : "";
    document.title = `${prefix}${titled}`;

    setFaviconBadge(count);
  }, [pathname, title, notFound, override, org?.name, unread, brandName]);
}

/** Renders nothing; keeps the title hook's router subscription off the layout it sits in. */
export function DocumentTitle() {
  useDocumentTitle();
  return null;
}
