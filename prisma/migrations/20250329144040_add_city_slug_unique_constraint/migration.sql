/*
  Warnings:

  - A unique constraint covering the columns `[slug,countryId]` on the table `City` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "City_slug_countryId_key" ON "City"("slug", "countryId");
