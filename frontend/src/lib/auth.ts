const TOKEN_KEY = "radar_token";

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
  // Cookie aussi pour le middleware Next.js (edge runtime)
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=86400; SameSite=Strict`;
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};
