-- Remove TRANSFER transaction type
-- First, check if there are any TRANSFER transactions (there shouldn't be any based on our analysis)
-- If there are any, they would need to be converted to appropriate types first

-- For SQLite, we need to recreate the table with the new enum constraint
-- Since we're using Prisma's enum mapping, the actual constraint is handled by Prisma Client
-- This migration serves as documentation of the schema change