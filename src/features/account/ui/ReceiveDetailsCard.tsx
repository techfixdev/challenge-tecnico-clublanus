"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/shared/ui/Button";
import { copyText } from "@/shared/ui/clipboard";
import { CheckIcon, CopyIcon, ShareIcon } from "@/shared/ui/icons";

import {
  receiveShareText,
  type ReceiveDetails,
} from "../domain/account-identifiers";

const FEEDBACK_MS = 2000;
const COPY_FAILED =
  "No pudimos copiar. Mantené presionado el texto para copiarlo.";

type Feedback = { key: "alias" | "cvu" | "share"; message: string } | null;

/**
 * Receive screen body: the user's alias and CVU, each with its own copy button, and
 * "Compartir" (the native share sheet, or a ready-made message copied where it does not
 * exist). Copying works on the LAN dev URL too (see `copyText`). The values stay
 * selectable text, the last resort if every copy method fails.
 */
export function ReceiveDetailsCard({ details }: { details: ReceiveDetails }) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function show(next: NonNullable<Feedback>) {
    clearTimeout(timer.current);
    setFeedback(next);
    timer.current = setTimeout(() => setFeedback(null), FEEDBACK_MS);
  }

  async function copy(key: "alias" | "cvu", label: string, value: string) {
    const copied = await copyText(value);
    show({ key, message: copied ? `${label} copiado` : COPY_FAILED });
  }

  async function share() {
    const text = receiveShareText(details);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Mis datos de GranaBank", text });
        return;
      } catch (error) {
        // Closing the share sheet is a choice, not a failure.
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }
    const copied = await copyText(text);
    show({
      key: "share",
      message: copied
        ? "Copiamos tus datos para que los pegues donde quieras"
        : COPY_FAILED,
    });
  }

  const copiedKey =
    feedback && feedback.message !== COPY_FAILED ? feedback.key : null;

  return (
    <div className="flex flex-col">
      <dl className="divide-y divide-border rounded-3xl bg-surface p-5 shadow-card">
        <div className="pb-4">
          <dt className="text-xs text-muted">Titular</dt>
          <dd className="mt-1 text-[15px] font-medium text-foreground">
            {details.holderName}
          </dd>
        </div>
        <CopyRow
          term="Alias"
          value={details.alias}
          copied={copiedKey === "alias"}
          onCopy={() => copy("alias", "Alias", details.alias)}
        />
        <CopyRow
          term="CVU"
          value={details.cvuFormatted}
          numeric
          copied={copiedKey === "cvu"}
          onCopy={() => copy("cvu", "CVU", details.cvu)}
        />
      </dl>

      <Button variant="secondary" className="mt-6 gap-2" onClick={share}>
        {copiedKey === "share" ? (
          <CheckIcon className="size-5" />
        ) : (
          <ShareIcon className="size-5" />
        )}
        Compartir mis datos
      </Button>

      <p role="status" className="mt-3 min-h-4 text-center text-xs text-muted">
        {feedback?.message}
      </p>
    </div>
  );
}

function CopyRow({
  term,
  value,
  numeric = false,
  copied,
  onCopy,
}: {
  term: string;
  value: string;
  numeric?: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  // "Copiar alias", but "Copiar CVU" (an acronym keeps its capitals).
  const spokenTerm = numeric ? term : term.toLowerCase();
  return (
    <div className="py-4 last:pb-0">
      <div className="flex h-9 items-center justify-between gap-4">
        <dt className="text-xs text-muted">{term}</dt>
        <button
          type="button"
          onClick={onCopy}
          aria-label={copied ? `${term} copiado` : `Copiar ${spokenTerm}`}
          data-copied={copied}
          className="inline-flex h-9 shrink-0 pressable items-center gap-1.5 rounded-full bg-primary-soft/40 px-3 text-xs font-semibold text-primary hover:bg-primary-soft/60 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none data-[copied=true]:bg-success-soft data-[copied=true]:text-success"
        >
          {copied ? (
            <CheckIcon className="size-4" />
          ) : (
            <CopyIcon className="size-4" />
          )}
          <span aria-hidden="true">{copied ? "Copiado" : "Copiar"}</span>
        </button>
      </div>
      {/* Full width (a CVU in groups fits one line at 360px); selectable as a last resort. */}
      <dd
        className={`mt-1 text-[15px] font-medium break-words text-foreground select-all ${numeric ? "tabular-nums" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
