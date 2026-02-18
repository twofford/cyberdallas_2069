-- Add per-campaign starting money for new characters.

ALTER TABLE "Campaign" ADD COLUMN     "startingMoney" INTEGER NOT NULL DEFAULT 0;
