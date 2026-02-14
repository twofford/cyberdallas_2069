-- CreateEnum
CREATE TYPE "CampaignRole" AS ENUM ('OWNER', 'MEMBER');

-- AlterTable
ALTER TABLE "CampaignMembership" ADD COLUMN     "role" "CampaignRole" NOT NULL DEFAULT 'MEMBER';
