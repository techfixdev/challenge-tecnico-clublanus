import { describe, expect, it } from "vitest";

import { groupMovementsByDay } from "./movement-days";

const at = (iso: string, id: string) => ({ id, occurredAt: new Date(iso) });
const TODAY = "2026-10-07";

describe("groupMovementsByDay", () => {
  it("groups newest-first movements under their Buenos Aires day, in order", () => {
    const groups = groupMovementsByDay(
      [
        at("2026-10-07T15:00:00Z", "a"),
        at("2026-10-07T03:10:00Z", "b"),
        // 01:00 UTC on the 7th is still the 6th (22:00) in Buenos Aires.
        at("2026-10-07T01:00:00Z", "c"),
        at("2026-10-05T12:00:00Z", "d"),
        at("2025-12-31T12:00:00Z", "e"),
      ],
      TODAY,
    );

    expect(
      groups.map(({ day, label, movements }) => ({
        day,
        label,
        ids: movements.map((movement) => movement.id),
      })),
    ).toEqual([
      { day: "2026-10-07", label: "Hoy", ids: ["a", "b"] },
      { day: "2026-10-06", label: "Ayer", ids: ["c"] },
      { day: "2026-10-05", label: "5 de octubre", ids: ["d"] },
      { day: "2025-12-31", label: "31 de diciembre de 2025", ids: ["e"] },
    ]);
  });

  it("merges a later page into the day group it continues", () => {
    const firstPage = [
      at("2026-10-07T15:00:00Z", "a"),
      at("2026-10-05T18:00:00Z", "b"),
    ];
    const nextPage = [
      at("2026-10-05T12:00:00Z", "c"),
      at("2026-10-04T12:00:00Z", "d"),
    ];

    const groups = groupMovementsByDay([...firstPage, ...nextPage], TODAY);

    expect(groups.map((group) => group.day)).toEqual([
      "2026-10-07",
      "2026-10-05",
      "2026-10-04",
    ]);
    expect(groups[1].movements.map((movement) => movement.id)).toEqual([
      "b",
      "c",
    ]);
  });

  it("returns no groups for no movements", () => {
    expect(groupMovementsByDay([], TODAY)).toEqual([]);
  });
});
