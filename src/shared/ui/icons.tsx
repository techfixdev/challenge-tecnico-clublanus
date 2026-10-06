import type { SVGProps } from "react";

/**
 * Inline SVG icons (no icon library: a handful of glyphs is cheaper than a dependency).
 * Decorative by default: the accessible name lives on the button or link that wraps them.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      width={24}
      height={24}
      {...props}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
      <path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" />
    </Icon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5a3 3 0 0 0-6 0v5.5H5.5A1.5 1.5 0 0 1 4 19v-8.5Z" />
    </Icon>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="3.5" width="14" height="17" rx="3" />
      <path d="M9 9h6M9 12.5h6M9 16h4" />
    </Icon>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 7V5.5A1.5 1.5 0 0 0 12.5 4h-6A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h6a1.5 1.5 0 0 0 1.5-1.5V17" />
      <path d="M10 12h10m0 0-3-3m3 3-3 3" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m15 5-7 7 7 7" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

/** Solid arrows used inside the movement type tiles (as in the design). */
export function ArrowDownIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M12 5v13m0 0-5-5m5 5 5-5" />
    </Icon>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.4} {...props}>
      <path d="M12 19V6m0 0-5 5m5-5 5 5" />
    </Icon>
  );
}

/** Up + down arrows: recurring debit (subscription). */
export function SwapVerticalIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="M8 18V5m0 0L5 8m3-3 3 3" />
      <path d="M16 6v13m0 0-3-3m3 3 3-3" />
    </Icon>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4" />
      <path d="M6.6 6.6C4 8.3 2.5 12 2.5 12s3.5 6.5 9.5 6.5a9.3 9.3 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </Icon>
  );
}

/** Diagonal arrows of the Home quick actions: money leaving / arriving. */
export function SendIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="M7 17 17 7m0 0H9m8 0v8" />
    </Icon>
  );
}

export function ReceiveIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="M17 7 7 17m0 0h8m-8 0V9" />
    </Icon>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </Icon>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 15V4m0 0L8 8m4-4 4 4" />
      <path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5H16" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m9 5 7 7-7 7" />
    </Icon>
  );
}
