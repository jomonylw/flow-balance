-- Add stage tracking fields to recurring_processing_logs table
-- This migration adds support for tracking individual sync stages

-- Add new columns for stage tracking
-- stageDetails: JSON string storing detailed status of each sync stage
-- currentStage: Current processing stage: recurringTransactions, loanContracts, or exchangeRates
ALTER TABLE "recurring_processing_logs" ADD COLUMN "stageDetails" TEXT;
ALTER TABLE "recurring_processing_logs" ADD COLUMN "currentStage" TEXT;
