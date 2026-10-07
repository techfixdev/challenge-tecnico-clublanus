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
 */
export function receiveQrPayload(details: { alias: string; cvu: string }) {
  if (!isValidAlias(details.alias) || !isValidCvu(details.cvu)) {
    throw new RangeError("A receive QR needs a valid alias and CVU");
  }
  return ["GranaBank", `Alias: ${details.alias}`, `CVU: ${details.cvu}`].join(
    "\n",
  );
}
