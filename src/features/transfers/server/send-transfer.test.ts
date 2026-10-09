import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/shared/server/rate-limit-store", () => ({
  consumeRateLimit: vi.fn(),
  refundRateLimit: vi.fn(),
}));
vi.mock("../data/prisma-transfer-repository", () => ({
  prismaTransferRepository: {},
}));
vi.mock("../domain/transfer", () => ({ sendTransfer: vi.fn() }));
vi.mock("./revalidate", () => ({ revalidateAfterTransfer: vi.fn() }));

const store = await import("@/shared/server/rate-limit-store");
const domain = await import("../domain/transfer");
const { sendTransferAs } = await import("./send-transfer");

const windowStart = new Date("2026-10-08T21:00:00Z");

describe("sendTransferAs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(store.consumeRateLimit).mockResolvedValue({
      allowed: true,
      windowStart,
    } as Awaited<ReturnType<typeof store.consumeRateLimit>>);
  });

  it("returns a replayed transfer even when refunding its budget hit fails", async () => {
    const replay = { ok: true, replayed: true } as Awaited<
      ReturnType<typeof domain.sendTransfer>
    >;
    vi.mocked(domain.sendTransfer).mockResolvedValue(replay);
    vi.mocked(store.refundRateLimit).mockRejectedValueOnce(
      new Error("database unreachable"),
    );

    await expect(sendTransferAs("u1", {})).resolves.toBe(replay);

    expect(store.refundRateLimit).toHaveBeenCalledWith(
      "transfer:send",
      "u1",
      windowStart,
    );
    expect(console.error).toHaveBeenCalled();
  });
});
