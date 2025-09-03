-- Safe schema updates for abastecimentos table
-- This script preserves existing content and only adds the new column and index if missing.

-- Add optional codigo column to abastecimentos if it doesn't exist
ALTER TABLE IF EXISTS public.abastecimentos
  ADD COLUMN IF NOT EXISTS codigo text;

-- Optional index to speed up lookups by codigo
CREATE INDEX IF NOT EXISTS idx_abastecimentos_codigo ON public.abastecimentos (codigo);
