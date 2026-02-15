-- Add ownership to Characters so users can create private unassigned characters.

ALTER TABLE "Character" ADD COLUMN "ownerId" TEXT;

ALTER TABLE "Character"
ADD CONSTRAINT "Character_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "Character_ownerId_idx" ON "Character"("ownerId");
