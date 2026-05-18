import type { AuthUser } from "@/lib/types";

const GYM_SCOPED_SEGMENTS = new Set(["member", "owner", "trainer"]);

const splitPathAndHash = (path: string): { pathname: string; hash: string } => {
  const hashIndex = path.indexOf("#");
  if (hashIndex === -1) return { pathname: path, hash: "" };
  return { pathname: path.slice(0, hashIndex), hash: path.slice(hashIndex) };
};

const extractGymSlugFromPathname = (pathname: string): string | undefined => {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 2 && GYM_SCOPED_SEGMENTS.has(parts[1])) {
    return parts[0];
  }
  return undefined;
};

const needsGymSlugPrefix = (pathname: string): boolean =>
  GYM_SCOPED_SEGMENTS.has(pathname.split("/").filter(Boolean)[0] ?? "");

/** Map legacy/API notification paths to SPA routes. */
export const normalizeNotificationPath = (url: string, fallbackGymSlug?: string): string => {
  if (!url) return "/";

  let path = url;
  if (url.startsWith("http")) {
    try {
      const parsed = new URL(url);
      path = parsed.pathname + parsed.search + parsed.hash;
    } catch {
      return "/";
    }
  }

  const { pathname, hash } = splitPathAndHash(path);
  let normalizedPathname = pathname.replace(/\/member\/dashboard/g, "/member");
  normalizedPathname = normalizedPathname.replace(/\/owner\/dashboard/g, "/owner");

  const gymSlug = extractGymSlugFromPathname(normalizedPathname) ?? fallbackGymSlug;

  if (gymSlug && needsGymSlugPrefix(normalizedPathname) && !normalizedPathname.startsWith(`/${gymSlug}/`)) {
    normalizedPathname = `/${gymSlug}${normalizedPathname}`;
  }

  return normalizedPathname + hash;
};

export const homePathForUser = (user: AuthUser | null | undefined): string => {
  if (!user) return "/";
  if (user.role === "super_admin") return "/admin";
  if (!user.gymSlug) return "/";
  if (user.role === "member") return `/${user.gymSlug}/member`;
  if (user.role === "owner") return `/${user.gymSlug}/owner`;
  if (user.role === "trainer") return `/${user.gymSlug}/trainer`;
  return "/";
};
