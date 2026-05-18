const REFRESH_TOKEN_KEY = "gymtra_refresh_token";
const STAY_LOGGED_IN_KEY = "gymtra_stay_logged_in";

export const getStayLoggedInPreference = (): boolean => {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STAY_LOGGED_IN_KEY);
  if (stored === null) return true;
  return stored === "1";
};

export const setStayLoggedInPreference = (stayLoggedIn: boolean) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STAY_LOGGED_IN_KEY, stayLoggedIn ? "1" : "0");
};

export const getStoredRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  if (!getStayLoggedInPreference()) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setStoredRefreshToken = (token: string | null) => {
  if (typeof window === "undefined") return;
  if (!token || !getStayLoggedInPreference()) {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    return;
  }
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const clearStoredAuth = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};
