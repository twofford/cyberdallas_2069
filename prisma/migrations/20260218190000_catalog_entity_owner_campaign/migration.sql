-- Add ownership and campaign scoping to catalog entities.

ALTER TABLE "Cybernetic"
  ADD COLUMN "campaignId" TEXT,
  ADD COLUMN "ownerId" TEXT;

ALTER TABLE "Weapon"
  ADD COLUMN "campaignId" TEXT,
  ADD COLUMN "ownerId" TEXT;

ALTER TABLE "Item"
  ADD COLUMN "campaignId" TEXT,
  ADD COLUMN "ownerId" TEXT;

ALTER TABLE "Vehicle"
  ADD COLUMN "campaignId" TEXT,
  ADD COLUMN "ownerId" TEXT;

ALTER TABLE "Cybernetic"
  ADD CONSTRAINT "Cybernetic_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "Cybernetic"
  ADD CONSTRAINT "Cybernetic_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "Weapon"
  ADD CONSTRAINT "Weapon_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "Weapon"
  ADD CONSTRAINT "Weapon_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "Item"
  ADD CONSTRAINT "Item_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "Item"
  ADD CONSTRAINT "Item_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "Vehicle"
  ADD CONSTRAINT "Vehicle_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "Vehicle"
  ADD CONSTRAINT "Vehicle_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "Cybernetic_campaignId_idx" ON "Cybernetic"("campaignId");
CREATE INDEX "Cybernetic_ownerId_idx" ON "Cybernetic"("ownerId");

CREATE INDEX "Weapon_campaignId_idx" ON "Weapon"("campaignId");
CREATE INDEX "Weapon_ownerId_idx" ON "Weapon"("ownerId");

CREATE INDEX "Item_campaignId_idx" ON "Item"("campaignId");
CREATE INDEX "Item_ownerId_idx" ON "Item"("ownerId");

CREATE INDEX "Vehicle_campaignId_idx" ON "Vehicle"("campaignId");
CREATE INDEX "Vehicle_ownerId_idx" ON "Vehicle"("ownerId");
