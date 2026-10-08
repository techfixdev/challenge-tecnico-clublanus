import { afterEach, describe, expect, it, vi } from "vitest";

import { copyText } from "./clipboard";

const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard",
);
const originalSecure = Object.getOwnPropertyDescriptor(
  window,
  "isSecureContext",
);

function setContext({
  secure,
  writeText,
}: {
  secure: boolean;
  writeText?: (text: string) => Promise<void>;
}) {
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    value: secure,
  });
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

/** jsdom has no `execCommand`; install a fake that records what was selected. */
function fakeExecCommand(result: boolean) {
  const copied: string[] = [];
  const execCommand = vi.fn((command: string) => {
    const field = document.activeElement as HTMLTextAreaElement | null;
    if (command === "copy" && field?.value !== undefined) {
      copied.push(field.value.slice(field.selectionStart, field.selectionEnd));
    }
    return result;
  });
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: execCommand,
  });
  return { execCommand, copied };
}

afterEach(() => {
  if (originalClipboard) {
    Object.defineProperty(navigator, "clipboard", originalClipboard);
  } else {
    Reflect.deleteProperty(navigator, "clipboard");
  }
  if (originalSecure) {
    Object.defineProperty(window, "isSecureContext", originalSecure);
  } else {
    Reflect.deleteProperty(window, "isSecureContext");
  }
  Reflect.deleteProperty(document, "execCommand");
});

describe("copyText", () => {
  it("uses the async Clipboard API in a secure context", async () => {
    const writeText = vi.fn(async () => {});
    setContext({ secure: true, writeText });
    const { execCommand } = fakeExecCommand(true);

    await expect(copyText("hincha.granate")).resolves.toBe(true);

    expect(writeText).toHaveBeenCalledWith("hincha.granate");
    expect(execCommand).not.toHaveBeenCalled();
  });

  it("falls back to a selected hidden textarea on a LAN http:// page (no Clipboard API)", async () => {
    setContext({ secure: false });
    const focused = document.createElement("button");
    document.body.append(focused);
    focused.focus();
    const { execCommand, copied } = fakeExecCommand(true);

    await expect(copyText("0000003100010000000255")).resolves.toBe(true);

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(copied).toEqual(["0000003100010000000255"]);
    // Leaves no trace and gives the focus back to where the user was.
    expect(document.querySelector("textarea")).toBeNull();
    expect(document.activeElement).toBe(focused);
    focused.remove();
  });

  it("falls back too when the Clipboard API rejects (permission denied)", async () => {
    setContext({
      secure: true,
      writeText: vi.fn(async () => {
        throw new DOMException("denied", "NotAllowedError");
      }),
    });
    const { copied } = fakeExecCommand(true);

    await expect(copyText("soy.granate.lanus")).resolves.toBe(true);
    expect(copied).toEqual(["soy.granate.lanus"]);
  });

  it("reports failure when no method works", async () => {
    setContext({ secure: false });
    fakeExecCommand(false);

    await expect(copyText("x")).resolves.toBe(false);
    expect(document.querySelector("textarea")).toBeNull();
  });
});
