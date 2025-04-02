-- CreateIndex
CREATE INDEX "City_name_idx" ON "City"("name");

-- CreateIndex
CREATE INDEX "City_slug_idx" ON "City"("slug");

-- CreateIndex
CREATE INDEX "City_countryId_idx" ON "City"("countryId");

-- CreateIndex
CREATE INDEX "Country_name_idx" ON "Country"("name");

-- CreateIndex
CREATE INDEX "Country_slug_idx" ON "Country"("slug");

-- CreateIndex
CREATE INDEX "Route_displayName_idx" ON "Route"("displayName");

-- CreateIndex
CREATE INDEX "Route_routeSlug_idx" ON "Route"("routeSlug");

-- CreateIndex
CREATE INDEX "Route_departureCityId_idx" ON "Route"("departureCityId");

-- CreateIndex
CREATE INDEX "Route_destinationCityId_idx" ON "Route"("destinationCityId");

-- CreateIndex
CREATE INDEX "Route_departureCountryId_idx" ON "Route"("departureCountryId");

-- CreateIndex
CREATE INDEX "Route_destinationCountryId_idx" ON "Route"("destinationCountryId");

-- CreateIndex
CREATE INDEX "Route_createdAt_idx" ON "Route"("createdAt");
