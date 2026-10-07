"use client";

import * as m from "motion/react-m";

import { useReducedMotionPreference } from "@/shared/ui/reduced-motion";

import { MORPH_ID, morphTransition } from "./transfer-morph";

/** "Hincha Granate" → "HG": there are no photos, so a person is their initials. */
export function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

/**
 * The carousel tile is exactly twice the header avatar (size, corner, letters), so the
 * avatar's morph between them is a pure scale: the letters and corners never distort.
 */
const SIZE_CLASSES = {
  tile: "size-24 rounded-3xl text-[28px]",
  row: "size-12 rounded-xl text-sm",
} as const;

/**
 * The tints a person who is not chosen yet can take, all from the brand palette, so a
 * row of recents reads as different people without leaving garnet, gold and gray.
 */
const IDLE_TONES = [
  "bg-primary-soft/70 text-primary",
  "bg-gold-soft text-gold-dark",
  "bg-cool-gray-soft text-cool-gray-dark",
] as const;

/** The chosen recipient: the garnet slab with gold letters, the bank's own colors. */
const CHOSEN_TONE = "bg-primary lit text-gold-light inset-shadow-specular";

/**
 * A recipient's initials tile. `tone` is the index of the person in the recents (a stable
 * tint) or "chosen". With `morph`, it is the flow's travelling avatar: only one tile on
 * screen at a time carries it.
 */
export function RecipientMonogram({
  fullName,
  size,
  tone,
  morph = false,
}: {
  fullName: string;
  size: keyof typeof SIZE_CLASSES;
  tone: number | "chosen";
  morph?: boolean;
}) {
  const reduced = useReducedMotionPreference();
  const toneClasses =
    tone === "chosen" ? CHOSEN_TONE : IDLE_TONES[tone % IDLE_TONES.length];
  return (
    <m.span
      aria-hidden="true"
      layoutId={morph ? MORPH_ID.avatar : undefined}
      transition={morphTransition(reduced)}
      className={`flex shrink-0 items-center justify-center font-semibold transition-colors duration-(--motion-duration-fast) ease-(--motion-ease) ${SIZE_CLASSES[size]} ${toneClasses}`}
    >
      {initialsOf(fullName)}
    </m.span>
  );
}
