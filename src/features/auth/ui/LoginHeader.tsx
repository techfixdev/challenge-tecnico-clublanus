import Image from "next/image";

import { BRAND_ASSETS } from "@/shared/ui/brand/assets";

/** Rendered size of the shield (its viewBox is square, 245 × 245). */
const EMBLEM_SIZE = 96;

/**
 * Brand block of the login screen: the club's shield (the official vector, untouched:
 * granate with white initials), the "GranaBank" wordmark and the tagline from the Figma
 * design. A granate shield would sink into the granate backdrop, so it sits on a white
 * round plate instead of being recolored; the plate's depth is CSS only (see
 * `.login-emblem` in globals.css).
 */
export function LoginHeader() {
  return (
    <header className="flex flex-col items-center text-center">
      <span className="login-emblem">
        <Image
          src={BRAND_ASSETS.escudo}
          alt="Escudo del Club Atlético Lanús"
          width={EMBLEM_SIZE}
          height={EMBLEM_SIZE}
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
