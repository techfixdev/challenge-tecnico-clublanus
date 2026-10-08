import { QrCode } from "@/shared/ui/qr/QrCode";

import { receiveQrPayload } from "../domain/receive-qr";

/**
 * The Receive screen's QR card: plain text with the alias and CVU, not an interbank
 * payment QR (see `receiveQrPayload`). Server-rendered. Identifiers that cannot make a
 * usable code leave the card out, so the rest of the screen still renders.
 */
export function ReceiveQrCard({
  details,
  className = "",
}: {
  details: { alias: string; cvu: string };
  className?: string;
}) {
  const payload = receiveQrPayload(details);
  if (!payload) return null;

  return (
    <section
      aria-labelledby="receive-qr"
      className={`flex flex-col items-center rounded-3xl bg-surface lit-surface p-5 text-center shadow-card ${className}`}
    >
      <h2 id="receive-qr" className="text-sm font-medium text-foreground">
        Tu código QR
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Quien lo escanee ve tu alias y tu CVU para transferirte.
      </p>
      <QrCode
        value={payload}
        label={`Código QR con tu alias ${details.alias} y tu CVU`}
        className="mt-3 max-w-48 rounded-2xl ring-1 ring-border"
      />
    </section>
  );
}
