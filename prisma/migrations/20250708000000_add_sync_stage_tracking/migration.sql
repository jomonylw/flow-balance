-- Add stage tracking fields to recurring_processing_logs table
-- This migration adds support for tracking individual sync stages

-- Add new columns for stage tracking
ALTER TABLE "recurring_processing_logs" ADD COLUMN "stageDetails" TEXT;
ALTER TABLE "recurring_processing_logs" ADD COLUMN "currentStage" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "recurring_processing_logs"."stageDetails" IS 'JSON string storing detailed status of each sync stage';
COMMENT ON COLUMN "recurring_processing_logs"."currentStage" IS 'Current processing stage: recurringTransactions, loanContracts, or exchangeRates';
