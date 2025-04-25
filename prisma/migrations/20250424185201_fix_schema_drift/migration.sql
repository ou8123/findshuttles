-- Fix schema drift by adding missing columns
ALTER TABLE "Amenity" ADD COLUMN IF NOT EXISTS "iconName" TEXT;
ALTER TABLE "Route" ADD COLUMN IF NOT EXISTS "possibleNearbyStops" JSONB;
ALTER TABLE "Route" ADD COLUMN IF NOT EXISTS "viatorDestinationLink" TEXT;

-- Add video-related fields
ALTER TABLE "Route" ADD COLUMN IF NOT EXISTS "imagePublicIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Route" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
