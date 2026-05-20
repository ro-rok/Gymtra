import type { AuthUser } from "@/lib/types";

/** Default post-login destination for an authenticated user. */
export const getDashboardPathForUser = (user: AuthUser): string | null => {
  if (user.mustChangePassword && user.gymSlug) {
    return `/${user.gymSlug}/change-password-required`;
  }

  switch (user.role) {
    case "super_admin":
      return "/admin";
    case "owner":
      return user.gymSlug ? `/${user.gymSlug}/owner` : null;
    case "trainer":
      return user.gymSlug ? `/${user.gymSlug}/trainer` : null;
    case "member":
      return user.gymSlug ? `/${user.gymSlug}/member` : null;
    default:
      return null;
  }
};
