import { requireUser } from "@/features/auth/session/current-user";
import { LogoutButton } from "@/features/auth/ui/LogoutButton";

// Temporary authenticated landing page; the real Home (cards + latest movements) comes in T3.
export default async function HomePage() {
  const user = await requireUser();

  return (
    <main className="flex flex-1 flex-col px-6 pt-12 pb-8">
      <p className="text-sm text-muted">Hola</p>
      <h1 className="text-2xl font-semibold text-foreground">
        {user.firstName}
      </h1>
      <div className="mt-auto">
        <LogoutButton />
      </div>
    </main>
  );
}
