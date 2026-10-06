/**
 * Copies text to the clipboard; resolves `true` when it worked.
 *
 * The async Clipboard API only exists in a secure context (HTTPS or localhost). Opened from
 * a phone on the LAN dev URL (`http://192.168.x.x:3000`) `navigator.clipboard` is
 * undefined, so the fallback selects the text in an off-screen textarea and runs the
 * legacy `copy` command, which still works inside a click handler.
 */
export async function copyText(text: string): Promise<boolean> {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Denied (permissions, embedded frame): try the legacy path below.
    }
  }
  return copyWithSelection(text);
}

function copyWithSelection(text: string): boolean {
  const previousFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.setAttribute("aria-hidden", "true");
  // Off-screen but rendered (a `display: none` field cannot be selected). 16px avoids the
  // iOS zoom on focus.
  field.style.cssText =
    "position:fixed;top:0;left:-9999px;opacity:0;font-size:16px;";
  document.body.append(field);
  field.focus();
  field.select();
  field.setSelectionRange(0, text.length);
  let copied = false;
  try {
    copied =
      typeof document.execCommand === "function" &&
      document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    field.remove();
    previousFocus?.focus();
  }
  return copied;
}
