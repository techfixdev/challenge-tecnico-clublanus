"use client";

import * as m from "motion/react-m";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { parseAmount } from "@/shared/lib/money";
import { DURATION_S, EASE } from "@/shared/ui/motion/tokens";

import {
  defaultSourceCardId,
  INITIAL_SEND_TRANSFER_STATE,
  type ConfirmedRecipient,
  type LookupRecipientAction,
  type SendTransferAction,
  type SendTransferState,
  type TransferStep,
} from "../domain/transfer-form";
import type { TransferPrefill } from "../domain/transfer-prefill";
import { AmountStep, type SourceCard } from "./AmountStep";
import { RecipientStep } from "./RecipientStep";
import { ReviewStep } from "./ReviewStep";
import { TransferSuccess } from "./TransferSuccess";

/** What the screen shows: one of the three steps, or the receipt once the money moved. */
type View = TransferStep | "done";

/** Order of the views, to tell a step forward from a step back. */
const VIEW_ORDER: Record<View, number> = {
  recipient: 0,
  amount: 1,
  review: 2,
  done: 3,
};

type Entrance = "forward" | "back";

/** A failure the user must fix, shown on the step that can fix it. */
type StepError = { step: TransferStep; message: string };

/**
 * A step slides in from the side it comes from, like a pushed (or popped) screen: the
 * next step from the right, the previous one from the left. The fade is shorter than the
 * slide (fast vs base, on the one curve), so the step is fully readable early; under
 * reduced motion the slide jumps and only the quick fade stays.
 */
const ENTER = {
  offset: 16,
  animate: { opacity: 1, x: 0 },
  transition: {
    x: { duration: DURATION_S.base, ease: EASE },
    opacity: { duration: DURATION_S.fast, ease: EASE },
  },
} as const;

/**
 * The send flow: recipient → amount → review → done, on one URL. Every value lives here,
 * so going back a step keeps what was typed. The Server Actions are injected (the page
 * wires the real ones, tests pass fakes).
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
  const [recipient, setRecipient] = useState<ConfirmedRecipient | null>(
    prefilledRecipient,
  );
  const [amount, setAmount] = useState("");
  const [cardId, setCardId] = useState(() => defaultSourceCardId(cards));
  const [description, setDescription] = useState("");

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

  const view: View = sendResult.status === "success" ? "done" : step;
  const entrance = useViewEntrance(view);
  const headingRef = useFocusHeadingOnViewChange(view);

  const card = cards.find((option) => option.id === cardId) ?? cards[0];
  const normalizedAmount = parseAmount(amount)?.amount ?? "";

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

  function changeCard(value: string) {
    setCardId(value);
    clearErrorOn("amount");
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

  function renderView(): ReactNode {
    if (view === "done" && sendResult.status === "success") {
      return (
        <TransferSuccess receipt={sendResult.receipt} headingRef={headingRef} />
      );
    }
    if (view === "review" && recipient && card) {
      return (
        <ReviewStep
          headingRef={headingRef}
          recipient={recipient}
          amount={normalizedAmount}
          card={card}
          description={description}
          idempotencyKey={idempotencyKey}
          formAction={formAction}
          pending={sendPending}
          error={errorOn("review")}
          onBack={() => goTo("amount")}
        />
      );
    }
    // The amount and review steps both need a confirmed recipient; without one, the
    // flow falls back to the step that confirms it.
    if ((view === "amount" || view === "review") && recipient) {
      return (
        <AmountStep
          headingRef={headingRef}
          recipient={recipient}
          onChangeRecipient={() => goTo("recipient")}
          cards={cards}
          amount={amount}
          onAmountChange={changeAmount}
          cardId={card?.id ?? ""}
          onCardChange={changeCard}
          description={description}
          onDescriptionChange={setDescription}
          onContinue={() => goTo("review")}
          onBack={() => goTo("recipient")}
          error={errorOn("amount")}
        />
      );
    }
    return (
      <RecipientStep
        headingRef={headingRef}
        value={recipientText}
        onChange={changeRecipientText}
        recentRecipients={recentRecipients}
        onResolve={resolveRecipient}
        pending={lookupPending}
        error={errorOn("recipient")}
      />
    );
  }

  return (
    <ViewTransitionFrame view={view} entrance={entrance}>
      {renderView()}
    </ViewTransitionFrame>
  );
}

/**
 * The direction the current view slides in from, or null for the first view. The first
 * view arrives with the page (server-rendered): it shows at once instead of waiting for
 * hydration and Motion's lazy features to fade it in. Only later views animate in.
 */
function useViewEntrance(view: View): Entrance | null {
  const [shownView, setShownView] = useState(view);
  const [entrance, setEntrance] = useState<Entrance | null>(null);
  if (view !== shownView) {
    setShownView(view);
    setEntrance(VIEW_ORDER[view] < VIEW_ORDER[shownView] ? "back" : "forward");
  }
  return entrance;
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

/** Remounts on every view change (`key`), so each view plays its own entrance. */
function ViewTransitionFrame({
  view,
  entrance,
  children,
}: {
  view: View;
  entrance: Entrance | null;
  children: ReactNode;
}) {
  const offset = entrance === "back" ? -ENTER.offset : ENTER.offset;
  return (
    <m.div
      key={view}
      initial={entrance ? { opacity: 0, x: offset } : false}
      data-entrance={entrance ?? undefined}
      // Fills the screen, so each step can pin its action to the bottom (StepActions).
      className="flex flex-1 flex-col"
      animate={ENTER.animate}
      transition={ENTER.transition}
    >
      {children}
    </m.div>
  );
}
