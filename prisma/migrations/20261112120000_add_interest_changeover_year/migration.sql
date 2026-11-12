-- Umstellungsjahr (ADR 0005): existing projects keep the old interest rules for every Zinsjahr up to the
-- current one, which may already be booked. The corrected rules start with the next Zinsjahr.
ALTER TABLE "Configuration" ADD COLUMN "interestChangeoverYear" INTEGER;

UPDATE "Configuration" SET "interestChangeoverYear" = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER + 1;
