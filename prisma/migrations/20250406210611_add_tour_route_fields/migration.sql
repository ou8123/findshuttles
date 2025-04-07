/*
  Warnings:

  - You are about to drop the column `icon` on the `Amenity` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Amenity" DROP COLUMN "icon";

-- AlterTable
ALTER TABLE "Route" ADD COLUMN     "isPrivateDriver" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSightseeingShuttle" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mapWaypoints" JSONB,
ALTER COLUMN "isCityToCity" SET DEFAULT true;
