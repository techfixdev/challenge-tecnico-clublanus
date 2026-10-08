import { isValidAlias, isValidCvu } from "./account-identifiers";

/**
 * What the Receive screen's QR code encodes: the alias and the raw CVU as labelled plain
 * text lines, e.g.
 *
 *   GranaBank
 *   Alias: soy.granate.lanus
 *   CVU: 2850590940090418135201
 *
 * Deliberately NOT a "Transferencias 3.0" / interoperable payment QR: that is an EMVCo
 * payload issued and registered through the BCRA's acquirer network, which a demo cannot
 * (and must not pretend to) produce. Plain text is honest and still useful: any phone
 * camera shows it, and the person can copy the alias or CVU into their own bank app.
 * Holder name stays out (it is on screen and in "Compartir"); fewer bytes, a sparser code.
 *
 * Validation is the escaping: a valid alias is only [a-z0-9.-] and a valid CVU only
 * digits, so a stored value can never add or forge a line. Anything else has no payload
 * (null) and the screen simply shows no code, instead of a code nobody can transfer to.
 */
export function receiveQrPayload(details: {
  alias: string;
  cvu: string;
}): string | null {
  if (!isValidAlias(details.alias) || !isValidCvu(details.cvu)) return null;
  return ["GranaBank", `Alias: ${details.alias}`, `CVU: ${details.cvu}`].join(
    "\n",
  );
}
