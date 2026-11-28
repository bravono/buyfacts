-- A dashboard button is now a description plus three independent links
-- (SEE IT, HEAR IT, READ IT). There is no primary media link or media type.
ALTER TABLE "DashboardButton" DROP COLUMN "mediaType";
