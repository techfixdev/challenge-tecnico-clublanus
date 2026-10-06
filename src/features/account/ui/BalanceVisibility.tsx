"use client";

import { createContext, use, useState, type ReactNode } from "react";

import { EyeIcon, EyeOffIcon } from "@/shared/ui/icons";

import { balanceHiddenCookie } from "../domain/balance-visibility";

type BalanceVisibility = { hidden: boolean; toggle: () => void };

const BalanceVisibilityContext = createContext<BalanceVisibility>({
  hidden: false,
  toggle: () => {},
});

function persist(hidden: boolean) {
  try {
    document.cookie = balanceHiddenCookie(hidden);
  } catch {
    // Cookies blocked (e.g. a sandboxed frame): the choice lasts until the page reloads.
  }
}

/**
 * Shares "balance hidden" with every card on Home. `initialHidden` comes from the cookie
 * read on the server, so the first render already matches the user's choice.
 */
export function BalanceVisibilityProvider({
  initialHidden,
  children,
}: {
  initialHidden: boolean;
  children: ReactNode;
}) {
  const [hidden, setHidden] = useState(initialHidden);

  function toggle() {
    const next = !hidden;
    setHidden(next);
    persist(next);
  }

  return (
    <BalanceVisibilityContext value={{ hidden, toggle }}>
      {children}
    </BalanceVisibilityContext>
  );
}

export function useBalanceHidden(): boolean {
  return use(BalanceVisibilityContext).hidden;
}

/**
 * Eye toggle on the primary card. A toggle button keeps one name ("Ocultar saldo") and
 * exposes its state with `aria-pressed` (WAI-ARIA pattern): screen readers announce
 * "Ocultar saldo, presionado" instead of a label that contradicts the pressed state.
 * The icon is 16px, as small as the "Balance" label it sits next to, while the
 * pseudo-element extends the touch target to 40px without moving the layout.
 */
export function BalanceToggle() {
  const { hidden, toggle } = use(BalanceVisibilityContext);
  const Icon = hidden ? EyeOffIcon : EyeIcon;
  return (
    <button
      type="button"
      aria-label="Ocultar saldo"
      aria-pressed={hidden}
      onClick={toggle}
      className="relative flex size-4 pressable items-center justify-center rounded-full text-white/75 after:absolute after:-inset-[12px] hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
    >
      <Icon className="size-full" />
    </button>
  );
}
