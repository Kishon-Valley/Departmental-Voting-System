-- Human-readable label for each election row (admin UI, vote history).
ALTER TABLE elections ADD COLUMN IF NOT EXISTS name TEXT;

UPDATE elections
SET name = 'Legacy election'
WHERE name IS NULL OR btrim(name) = '';
