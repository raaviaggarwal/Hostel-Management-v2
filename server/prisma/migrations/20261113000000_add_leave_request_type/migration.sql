ALTER TABLE "Leave"
  ADD COLUMN "requestType" TEXT NOT NULL DEFAULT 'LEAVE',
  ADD COLUMN "requestedDepartureAt" TEXT,
  ADD COLUMN "expectedReturnAt" TEXT;
