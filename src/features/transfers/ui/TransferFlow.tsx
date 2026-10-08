"use client";

import { AnimatePresence, LayoutGroup, useIsPresent } from "motion/react";
import * as m from "motion/react-m";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { parseAmount } from "@/shared/lib/money";
import { ROUTES } from "@/shared/lib/routes";
import { Button } from "@/shared/ui/Button";
import { FADE } from "@/shared/ui/motion/springs";
import { useReducedMotionPreference } from "@/shared/ui/reduced-motion";

import {
  keypadKeyForKeyboard,
  pressKeypadKey,
  type KeypadKey,
} from "../domain/amount-keypad";
import {
  amountInputError,
  defaultSourceCardId,
  INITIAL_SEND_TRANSFER_STATE,
  normalizeAmountInput,
  type ConfirmedRecipient,
  type LookupRecipientAction,
  type SendTransferAction,
  type SendTransferState,
  type TransferStep,
} from "../domain/transfer-form";
import type { TransferPrefill } from "../domain/transfer-prefill";
import { AmountKeypad } from "./AmountKeypad";
import { AMOUNT_FORM_ID, AmountStep, type SourceCard } from "./AmountStep";
import { RecipientMonogram } from "./RecipientMonogram";
import { RECIPIENT_FORM_ID, RecipientStep } from "./RecipientStep";
import { REVIEW_FORM_ID, ReviewStep } from "./ReviewStep";
import { PRIMARY_DISABLED_CLASSES, StepActions } from "./StepActions";
import { FormAlert, RecipientIdentity, StepHeader } from "./TransferParts";
import { TransferSuccess } from "./TransferSuccess";
import { arrivalTransition } from "./transfer-morph";

/** What the screen shows: one of the three steps, or the receipt once the money moved. */
type View = TransferStep | "done";

/** A failure the user must fix, shown on the step that can fix it. */
type StepError = { step: TransferStep; message: string };

const STEP_HEADER: Record<
  TransferStep,
  { step: number; title: string; description?: string }
> = {
  recipient: {
    step: 1,
    title: "¿A quién le enviás?",
    description: "Elegí a alguien de tus recientes o ingresá su alias o CVU.",
  },
  amount: { step: 2, title: "¿Cuánto le enviás?" },
  review: {
    step: 3,
    title: "Revisá la transferencia",
    description: "Confirmá que los datos sean correctos antes de enviar.",
  },
};

/**
 * The send flow: recipient → amount → review → done, on one URL and on one surface.
 * Moving between steps never slides in a new page: the header stays, the chosen
 * recipient's tile shrinks from the carousel into the header row, the keypad rises from
 * the bottom for the amount and folds away for the review, and the amount travels on to
 * the receipt (shared elements, see transfer-morph.ts). Going back plays it in reverse.
 *
 * Every value lives here, so going back a step keeps what was typed. The Server Actions
 * are injected (the page wires the real ones, tests pass fakes).
 *
 * Idempotency: the key comes from the server with the page and stays fixed for this
 * attempt, whatever happens (a retry after a network error must replay, not pay twice).
 * It only changes when the server says so: after a success (next transfer) or a conflict.
 *
 * `prefill` (from a `?to=` link, resolved on the server) starts the flow addressed to
 * someone: on the amount step when the account was confirmed, else on the first step with
 * the alias typed in. Either way the alias stays in the field, so going back can change it.
 */
export function TransferFlow({
  cards,
  recentRecipients,
  idempotencyKey: initialKey,
  lookupAction,
  sendAction,
  prefill = null,
}: {
  cards: SourceCard[];
  recentRecipients: ConfirmedRecipient[];
  idempotencyKey: string;
  lookupAction: LookupRecipientAction;
  sendAction: SendTransferAction;
  prefill?: TransferPrefill | null;
}) {
  const prefilledRecipient =
    prefill?.kind === "confirmed" ? prefill.recipient : null;

  // What the user has entered, kept across steps.
  const [step, setStep] = useState<TransferStep>(
    prefilledRecipient ? "amount" : "recipient",
  );
  const [recipientText, setRecipientText] = useState(
    prefilledRecipient?.query ??
      (prefill?.kind === "typed" ? prefill.text : ""),
  );
  // What is typed in the recipient search (a `?to=` link types its alias there too).
  const [recipientSearch, setRecipientSearch] = useState(recipientText);
  const [recipient, setRecipient] = useState<ConfirmedRecipient | null>(
    prefilledRecipient,
  );
  const [amount, setAmount] = useState("");
  const [cardId, setCardId] = useState(() => defaultSourceCardId(cards));
  const [description, setDescription] = useState("");
  const [typingDescription, setTypingDescription] = useState(false);
  // What a screen reader hears after a keypad press (the field itself is not focused).
  const [spokenAmount, setSpokenAmount] = useState("");

  // What the server has answered.
  const [idempotencyKey, setIdempotencyKey] = useState(initialKey);
  const [stepError, setStepError] = useState<StepError | null>(null);
  const [lookupPending, startLookup] = useTransition();
  const [sendResult, formAction, sendPending] = useActionState(
    sendAction,
    INITIAL_SEND_TRANSFER_STATE,
  );

  // React to a new result of the Server Action while rendering (no effect, no extra
  // paint), so the step that can fix an error is the very next thing painted.
  const [handledSendResult, setHandledSendResult] = useState(sendResult);
  if (sendResult !== handledSendResult) {
    setHandledSendResult(sendResult);
    applySendResult(sendResult);
  }

  const card = cards.find((option) => option.id === cardId) ?? cards[0];
  const view = visibleView(
    sendResult.status === "success" ? "done" : step,
    recipient,
    card,
  );
  const headingRef = useFocusHeadingOnViewChange(view);
  const reduced = useReducedMotionPreference();

  function applySendResult(result: SendTransferState) {
    if (result.status === "success") {
      // This key is spent: the next transfer needs a fresh one.
      setIdempotencyKey(result.nextIdempotencyKey);
      return;
    }
    if (result.status !== "error") return;
    setStep(result.step);
    // Refused for the recipient (gone, or the user's own): what was confirmed no longer
    // holds, so it must be looked up and confirmed again.
    if (result.step === "recipient") setRecipient(null);
    setStepError({ step: result.step, message: result.message });
    // Only a conflict replaces the key; any other error keeps it, so a retry replays.
    if (result.nextIdempotencyKey) setIdempotencyKey(result.nextIdempotencyKey);
  }

  function goTo(next: TransferStep) {
    setStepError(null);
    setTypingDescription(false);
    setStep(next);
  }

  /** Editing a step's input clears that step's error: the user is fixing it. */
  function clearErrorOn(target: TransferStep) {
    if (stepError?.step === target) setStepError(null);
  }

  function errorOn(target: TransferStep): string | null {
    return stepError?.step === target ? stepError.message : null;
  }

  function changeRecipientText(value: string) {
    setRecipientText(value);
    clearErrorOn("recipient");
  }

  function changeAmount(value: string) {
    setAmount(value);
    clearErrorOn("amount");
  }

  function pressKey(key: KeypadKey) {
    const next = pressKeypadKey(amount, key);
    if (next === amount) return;
    changeAmount(next);
    setSpokenAmount(next === "" ? "Monto borrado" : `Monto: ${next}`);
  }

  /**
   * A hardware keyboard types the amount from anywhere on the amount step (its title has
   * the focus when the step opens); inside a text field the field handles its own keys.
   */
  function handleSurfaceKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (view !== "amount") return;
    if (event.target instanceof HTMLInputElement) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = keypadKeyForKeyboard(event.key);
    if (!key) return;
    event.preventDefault();
    pressKey(key);
  }

  function changeCard(value: string) {
    setCardId(value);
    clearErrorOn("amount");
  }

  function continueToReview() {
    // "1234,5" → "1.234,50": back from the review, the amount reads as it was shown.
    setAmount(normalizeAmountInput(amount));
    goTo("review");
  }

  function resolveRecipient(query: string) {
    setStepError(null);
    // Unchanged and already confirmed: no need to ask the server again.
    if (recipient && recipient.query === query.trim()) {
      goTo("amount");
      return;
    }
    startLookup(async () => {
      const result = await lookupAction(query);
      if (result.ok) {
        setRecipient(result.recipient);
        setStep("amount");
      } else {
        setRecipient(null);
        setStepError({ step: "recipient", message: result.message });
      }
    });
  }

  if (view === "done") {
    return sendResult.status === "success" ? (
      <LayoutGroup id="transfer">
        <TransferSuccess receipt={sendResult.receipt} headingRef={headingRef} />
      </LayoutGroup>
    ) : null;
  }

  function renderBody(): ReactNode {
    if (view === "review" && recipient && card) {
      return (
        <ReviewStep
          recipient={recipient}
          amount={parseAmount(amount)?.amount ?? ""}
          card={card}
          description={description}
          idempotencyKey={idempotencyKey}
          formAction={formAction}
        />
      );
    }
    if (view === "amount") {
      return (
        <AmountStep
          cards={cards}
          amount={amount}
          onAmountChange={changeAmount}
          cardId={card?.id ?? ""}
          onCardChange={changeCard}
          description={description}
          onDescriptionChange={setDescription}
          onTypingDescription={setTypingDescription}
          onContinue={continueToReview}
          error={errorOn("amount")}
        />
      );
    }
    return (
      <RecipientStep
        search={recipientSearch}
        onSearchChange={setRecipientSearch}
        value={recipientText}
        onChange={changeRecipientText}
        recentRecipients={recentRecipients}
        onResolve={resolveRecipient}
        pending={lookupPending}
        error={errorOn("recipient")}
      />
    );
  }

  const header = STEP_HEADER[view];
  const primary = primaryAction(view, {
    lookupPending,
    sendPending,
    recipientText,
    amountBlocked: Boolean(amountInputError(amount, card)) || !card,
  });

  return (
    <LayoutGroup id="transfer">
      {/* Fills the screen, so the pinned actions sit at its bottom (StepActions). */}
      <div
        className="flex flex-1 flex-col"
        data-transfer-step={view}
        onKeyDown={handleSurfaceKeyDown}
      >
        <StepHeader
          step={header.step}
          title={header.title}
          description={header.description}
          headingRef={headingRef}
          back={
            view === "recipient"
              ? { href: ROUTES.home }
              : {
                  onBack: () =>
                    goTo(view === "review" ? "amount" : "recipient"),
                }
          }
        />

        {view !== "recipient" && recipient ? (
          <RecipientRow
            recipient={recipient}
            onChange={view === "amount" ? () => goTo("recipient") : undefined}
          />
        ) : null}

        {renderBody()}

        <StepActions>
          <AnimatePresence initial={false}>
            {view === "amount" && !typingDescription ? (
              <KeypadDrawer key="keypad" reduced={reduced}>
                <AmountKeypad onKey={pressKey} />
              </KeypadDrawer>
            ) : null}
          </AnimatePresence>
          <p aria-live="polite" className="sr-only">
            {view === "amount" ? spokenAmount : ""}
          </p>

          {view === "review" && errorOn("review") ? (
            <FormAlert>{errorOn("review")}</FormAlert>
          ) : null}

          <Button
            type="submit"
            form={primary.form}
            className={PRIMARY_DISABLED_CLASSES}
            disabled={primary.disabled}
            aria-busy={primary.busy}
          >
            <span className="grid">
              <AnimatePresence initial={false}>
                <ActionLabel key={primary.label}>{primary.label}</ActionLabel>
              </AnimatePresence>
            </span>
          </Button>
          {view === "review" ? (
            <p className="text-center text-xs text-muted">
              Entre cuentas GranaBank el dinero llega al instante.
            </p>
          ) : null}
        </StepActions>
      </div>
    </LayoutGroup>
  );
}

/**
 * The step on screen: the amount and the review need a confirmed recipient (and the
 * review a card); without one, the flow shows the step that provides it.
 */
function visibleView(
  wanted: View,
  recipient: ConfirmedRecipient | null,
  card: SourceCard | undefined,
): View {
  if (wanted === "done") return "done";
  if (wanted === "recipient" || !recipient) return "recipient";
  if (wanted === "review" && !card) return "amount";
  return wanted;
}

/**
 * The one pinned button of the steps. It is the same element from step to step: what it
 * submits (`form`), whether it can, and its label change, and the label crossfades
 * ("Continuar" → "Confirmar y enviar") instead of a new button arriving.
 */
function primaryAction(
  view: Exclude<View, "done">,
  state: {
    lookupPending: boolean;
    sendPending: boolean;
    recipientText: string;
    amountBlocked: boolean;
  },
) {
  switch (view) {
    case "recipient":
      return {
        form: RECIPIENT_FORM_ID,
        disabled: state.lookupPending || state.recipientText.trim() === "",
        busy: state.lookupPending,
        label: state.lookupPending ? "Buscando cuenta…" : "Continuar",
      };
    case "amount":
      return {
        form: AMOUNT_FORM_ID,
        disabled: state.amountBlocked,
        busy: false,
        label: "Continuar",
      };
    case "review":
      return {
        form: REVIEW_FORM_ID,
        disabled: state.sendPending,
        busy: state.sendPending,
        label: state.sendPending ? "Enviando…" : "Confirmar y enviar",
      };
  }
}

/** One label of the pinned button; the outgoing one fades over the incoming one. */
function ActionLabel({ children }: { children: string }) {
  const isPresent = useIsPresent();
  return (
    <m.span
      aria-hidden={!isPresent || undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={FADE}
      className="col-start-1 row-start-1"
    >
      {children}
    </m.span>
  );
}

/**
 * The keypad's place above the button: it opens from nothing, rising from the bottom
 * edge, and folds back down when the step leaves the amount. While folding it is inert,
 * so a key can no longer be pressed on its way out.
 */
function KeypadDrawer({
  reduced,
  children,
}: {
  reduced: boolean;
  children: ReactNode;
}) {
  const isPresent = useIsPresent();
  const folded = { height: 0, opacity: 0, y: 24 };
  return (
    <m.div
      inert={!isPresent}
      initial={folded}
      animate={{ height: "auto", opacity: 1, y: 0 }}
      exit={folded}
      transition={arrivalTransition(reduced)}
      className="overflow-hidden"
    >
      {children}
    </m.div>
  );
}

/**
 * Who the money goes to, at the top of the amount and the review: the avatar the chosen
 * carousel tile shrank into, with a way back to change it while the amount is open.
 */
function RecipientRow({
  recipient,
  onChange,
}: {
  recipient: ConfirmedRecipient;
  onChange?: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      <RecipientMonogram
        fullName={recipient.fullName}
        size="row"
        tone="chosen"
        morph
      />
      <span className="sr-only">Para: </span>
      <RecipientIdentity recipient={recipient} />
      {onChange ? (
        <button
          type="button"
          onClick={onChange}
          className="ml-auto inline-flex min-h-11 items-center rounded-md px-1 text-xs font-medium text-primary hover:underline focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none"
        >
          Cambiar
        </button>
      ) : null}
    </div>
  );
}

/**
 * Moves the focus to the new view's title, so a screen reader announces it and keyboard
 * users continue from there. Not on the first render: the page just loaded.
 */
function useFocusHeadingOnViewChange(view: View) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isFirstView = useRef(true);
  useEffect(() => {
    if (isFirstView.current) {
      isFirstView.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [view]);
  return headingRef;
}
