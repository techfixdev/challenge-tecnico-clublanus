import { ESCUDO_PATHS, ESCUDO_VIEW_BOX } from "./escudo-vector";

/**
 * The club's shield drawn inline, for places that must paint at once with no request (the
 * branded intro). Decorative by default; pass `title` to name it. Its size comes from
 * `className`; the vector keeps its own proportions (square).
 */
export function Escudo({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={ESCUDO_VIEW_BOX}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {ESCUDO_PATHS.map(({ d, fill, fillRule }) => (
        <path key={d.slice(0, 24)} d={d} fill={fill} fillRule={fillRule} />
      ))}
    </svg>
  );
}
