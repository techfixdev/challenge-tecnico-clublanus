import type { Metadata } from "next";

import { login } from "@/features/auth/actions";
import { LoginForm } from "@/features/auth/ui/LoginForm";

export const metadata: Metadata = {
  title: "Ingresar · GranaBank",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col">
      <LoginForm action={login} />
    </main>
  );
}
