-- AlterTable
ALTER TABLE "Route" ADD COLUMN "imagePublicIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
                    ADD COLUMN "videoUrl" TEXT;
