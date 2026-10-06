-- AlterTable
ALTER TABLE "Card" ADD COLUMN "pan" CHAR(16);

-- A full card number is 16 digits and ends in the card's last4 (NULL until the seed
-- assigns one). Luhn validity is checked where the numbers are built (seed, unit tests).
ALTER TABLE "Card" ADD CONSTRAINT "Card_pan_format_check"
  CHECK ("pan" IS NULL OR ("pan" ~ '^[0-9]{16}$' AND right("pan", 4) = "last4"));
