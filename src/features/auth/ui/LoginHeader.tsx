import Image from "next/image";
import type { CSSProperties } from "react";

import { BRAND_ASSETS } from "@/shared/ui/brand/assets";

/** Intrinsic size of the shield with stars (its viewBox is 126.2 × 147.6). */
const EMBLEM = { width: 112, height: 131 } as const;

/**
 * Brand block of the login screen: the club's shield (the official vector, untouched,
 * with the gold stars, the version for granate backgrounds), the "GranaBank"
 * wordmark and the tagline from the Figma design. The shield's depth is CSS only (see
 * `.login-emblem` in globals.css).
 */
export function LoginHeader() {
  return (
    <header className="flex flex-col items-center text-center">
      <span
        className="login-emblem"
        style={
          {
            "--emblem-mask": `url(${BRAND_ASSETS.escudoEstrellasDoradas})`,
          } as CSSProperties
        }
      >
        <Image
          src={BRAND_ASSETS.escudoEstrellasDoradas}
          alt="Escudo del Club Atlético Lanús"
          width={EMBLEM.width}
          height={EMBLEM.height}
          loading="eager"
          fetchPriority="high"
        />
      </span>
      <h1 className="login-wordmark mt-6 font-display text-[36px] leading-tight font-bold wrap-anywhere text-white">
        GranaBank
      </h1>
      <p className="mt-2 text-sm text-white/80">
        Con cada compra, sumás orgullo granate
      </p>
    </header>
  );
}
