import type { Metadata, Viewport } from "next";

import { login } from "@/features/auth/server/actions";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import { LOGIN_THEME_COLOR } from "@/shared/lib/theme";

export const metadata: Metadata = {
  title: "Ingresar · GranaBank",
};

/** The browser chrome blends with the granate backdrop (see `LOGIN_THEME_COLOR`). */
export const viewport: Viewport = {
  themeColor: LOGIN_THEME_COLOR,
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Fixed, so the granate also fills the safe areas and the sides on wide screens. */}
      <div aria-hidden="true" className="login-backdrop fixed inset-0" />
      <LoginForm action={login} />
    </main>
  );
}
