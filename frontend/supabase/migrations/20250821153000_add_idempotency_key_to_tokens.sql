-- Add a new column to store the client-side generated UUID
ALTER TABLE public.tokens
ADD COLUMN client_side_uuid UUID;

-- Add a unique constraint to the new column to prevent duplicate entries
ALTER TABLE public.tokens
ADD CONSTRAINT tokens_client_side_uuid_key UNIQUE (client_side_uuid);

-- Optional: Backfill existing rows with a generated UUID if needed
-- UPDATE public.tokens
-- SET client_side_uuid = gen_random_uuid()
-- WHERE client_side_uuid IS NULL;
