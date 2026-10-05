import { Button } from "@/shared/ui/Button";

import { logout } from "../actions";

/** Plain form posting to the logout Server Action: works without client JavaScript. */
export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="secondary">
        Cerrar sesión
      </Button>
    </form>
  );
}
