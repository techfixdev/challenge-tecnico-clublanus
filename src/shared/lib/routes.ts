/** App routes (Spanish paths, matching the UI language). */
export const ROUTES = {
  home: "/",
  login: "/login",
  movements: "/movimientos",
  movement: (id: string) => `/movimientos/${encodeURIComponent(id)}`,
} as const;
