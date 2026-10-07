"use client";

import * as m from "motion/react-m";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import { parseAmount } from "@/shared/lib/money";

import {
  defaultSourceCardId,
  INITIAL_SEND_TRANSFER_STATE,
  type ConfirmedRecipient,
  type LookupRecipientAction,
  type SendTransferAction,
  type TransferStep,
} from "../domain/transfer-form";
import { AmountStep, type SourceCard } from "./AmountStep";
import { RecipientStep } from "./RecipientStep";
import { ReviewStep } from "./ReviewStep";
import { TransferSuccess } from "./TransferSuccess";

/**
 * A step slides in from the side it comes from, like a pushed (or popped) screen: the
 * next step from the right, the previous one from the left. The fade is shorter than the
 * slide, so the step is fully readable early; under reduced motion the slide jumps and
 * only the quick fade stays.
 */
const ENTER = {
  offset: 16,
  animate: { opacity: 1, x: 0 },
  transition: {
    x: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
    opacity: { duration: 0.12, ease: "easeOut" },
  },
} as const;

type StepError = { step: TransferStep; message: string };

type View = TransferStep | "done";

/** Order of the views, to tell a step forward from a step back. */
const VIEW_ORDER: Record<View, number> = {
  recipient: 0,
  amount: 1,
  review: 2,
  done: 3,
};

/**
 * The send flow: recipient → amount → review → done, on one URL. Every value lives here,
 * so going back a step keeps what was typed. The Server Actions are injected (the page
 * wires the real ones, tests pass fakes).
 *
 * Idempotency: the key comes from the server with the page and stays fixed for this
 * attempt, whatever happens (a retry after a network error must replay, not pay twice).
 * It only changes when the server says so: after a success (next transfer) or a conflict.
 */
export function TransferFlow({
  cards,
  recentRecipients,
  idempotencyKey: initialKey,
  lookupAction,
  sendAction,
}: {
  cards: SourceCard[];
  recentRecipients: ConfirmedRecipient[];
  idempotencyKey: string;
  lookupAction: LookupRecipientAction;
  sendAction: SendTransferAction;
}) {
  const [step, setStep] = useState<TransferStep>("recipient");
  const [recipientText, setRecipientText] = useState("");
  const [recipient, setRecipient] = useState<ConfirmedRecipient | null>(null);
  const [amount, setAmount] = useState("");
  const [cardId, setCardId] = useState(() => defaultSourceCardId(cards));
  const [description, setDescription] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(initialKey);
  const [stepError, setStepError] = useState<StepError | null>(null);
  const [lookupPending, startLookup] = useTransition();

  const [sendState, formAction, sendPending] = useActionState(
    sendAction,
    INITIAL_SEND_TRANSFER_STATE,
  );

  // React to a new result of the Server Action while rendering (no effect, no extra
  // paint): an error sends the user to the step that can fix it.
  const [handledState, setHandledState] = useState(sendState);
  if (sendState !== handledState) {
    setHandledState(sendState);
    if (sendState.status === "error") {
      setStep(sendState.step);
      // Refused for the recipient (gone, or the user's own): what was
      // confirmed no longer holds, so it must be looked up and confirmed again.
      if (sendState.step === "recipient") setRecipient(null);
      setStepError({ step: sendState.step, message: sendState.message });
      if (sendState.nextIdempotencyKey) {
        setIdempotencyKey(sendState.nextIdempotencyKey);
      }
    }
    if (sendState.status === "success") {
      setIdempotencyKey(sendState.nextIdempotencyKey);
    }
  }

  const done = sendState.status === "success";
  const view = done ? "done" : step;

  // The first view arrives with the page (server-rendered): it shows at once instead of
  // waiting for hydration and Motion's lazy features to fade it in. Only later views
  // (a step change, the receipt) animate in.
  const [shownView, setShownView] = useState<View>(view);
  const [entrance, setEntrance] = useState<"forward" | "back" | null>(null);
  if (view !== shownView) {
    setShownView(view);
    setEntrance(VIEW_ORDER[view] < VIEW_ORDER[shownView] ? "back" : "forward");
  }

  // Move the focus to the new step's title (not on the first render: the page just loaded).
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstView = useRef(true);
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [view]);

  function goTo(next: TransferStep) {
    setStepError(null);
    setStep(next);
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

  const errorFor = (target: TransferStep) =>
    stepError?.step === target ? stepError.message : null;
  const card = cards.find((option) => option.id === cardId) ?? cards[0];
  const normalizedAmount = parseAmount(amount)?.amount ?? "";

  let content;
  if (view === "done" && sendState.status === "success") {
    content = (
      <TransferSuccess receipt={sendState.receipt} headingRef={headingRef} />
    );
  } else if (view === "review" && recipient && card) {
    content = (
      <ReviewStep
        headingRef={headingRef}
        recipient={recipient}
        amount={normalizedAmount}
        card={card}
        description={description}
        idempotencyKey={idempotencyKey}
        formAction={formAction}
        pending={sendPending}
        error={errorFor("review")}
        onBack={() => goTo("amount")}
      />
    );
  } else if ((view === "amount" || view === "review") && recipient) {
    content = (
      <AmountStep
        headingRef={headingRef}
        recipient={recipient}
        onChangeRecipient={() => goTo("recipient")}
        cards={cards}
        amount={amount}
        onAmountChange={(value) => {
          setAmount(value);
          if (stepError?.step === "amount") setStepError(null);
        }}
        cardId={card?.id ?? ""}
        onCardChange={(value) => {
          setCardId(value);
          if (stepError?.step === "amount") setStepError(null);
        }}
        description={description}
        onDescriptionChange={setDescription}
        onContinue={() => goTo("review")}
        onBack={() => goTo("recipient")}
        error={errorFor("amount")}
      />
    );
  } else {
    content = (
      <RecipientStep
        headingRef={headingRef}
        value={recipientText}
        onChange={(value) => {
          setRecipientText(value);
          if (stepError?.step === "recipient") setStepError(null);
        }}
        recentRecipients={recentRecipients}
        onResolve={resolveRecipient}
        pending={lookupPending}
        error={errorFor("recipient")}
      />
    );
  }

  return (
    <m.div
      key={view}
      initial={
        entrance
          ? {
              opacity: 0,
              x: entrance === "back" ? -ENTER.offset : ENTER.offset,
            }
          : false
      }
      data-entrance={entrance ?? undefined}
      animate={ENTER.animate}
      transition={ENTER.transition}
    >
      {content}
    </m.div>
  );
}
