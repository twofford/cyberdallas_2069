-- Add money to Characters.

ALTER TABLE "Character" ADD COLUMN "money" INTEGER NOT NULL DEFAULT 0;
