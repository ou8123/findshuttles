/*
  Warnings:

  - You are about to drop the column `isAirportCity` on the `City` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "City" DROP COLUMN "isAirportCity";

-- AlterTable
ALTER TABLE "Route" ADD COLUMN     "isAirportDropoff" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isAirportPickup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isCityToCity" BOOLEAN NOT NULL DEFAULT false;
