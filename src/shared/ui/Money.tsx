import {
  formatMoney,
  formatMoneyForSpeech,
  formatSignedMoney,
  formatSignedMoneyForSpeech,
  type MoneyDirection,
  type MoneyInput,
} from "@/shared/lib/format";

/**
 * An amount as the app writes it ("US$ 978,85", "+$ 12.400") and, for screen readers, as
 * it should be said ("978,85 dólares", "más 12.400 pesos"): symbols like "US$" are read
 * inconsistently, words never are. With `direction` it carries the movement's sign.
 */
export function Money({
  value,
  currency,
  direction,
}: {
  value: MoneyInput;
  currency: string;
  direction?: MoneyDirection;
}) {
  const text = direction
    ? formatSignedMoney(value, currency, direction)
    : formatMoney(value, currency);
  const spoken = direction
    ? formatSignedMoneyForSpeech(value, currency, direction)
    : formatMoneyForSpeech(value, currency);
  return (
    <>
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{spoken}</span>
    </>
  );
}
