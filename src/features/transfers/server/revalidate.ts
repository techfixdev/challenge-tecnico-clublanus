import "server-only";

import { revalidatePath } from "next/cache";

/**
 * A transfer changes balances (Home) and movement lists (Home, Movimientos) for both users.
 *
 * Today those pages are dynamic (they read the session cookie) and nothing is cached on the
 * server, and the client Router Cache keeps dynamic pages for 0 s by default
 * (`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/staleTimes.md`).
 * Revalidating the root layout still makes the guarantee explicit instead of incidental:
 * from a Server Action it also purges the client cache and refreshes the current view; from
 * a Route Handler it marks every path for revalidation on its next visit
 * (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`).
 */
export function revalidateAfterTransfer(): void {
  revalidatePath("/", "layout");
}
