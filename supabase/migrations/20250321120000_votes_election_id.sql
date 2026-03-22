-- Scope each vote to an election so students can vote again when a new election runs.
-- Run this in the Supabase SQL editor (or via CLI) before deploying the app changes.

ALTER TABLE votes ADD COLUMN IF NOT EXISTS election_id UUID REFERENCES elections(id);

-- Attach existing votes to your first election (adjust the subquery if needed).
UPDATE votes
SET election_id = (SELECT id FROM elections ORDER BY created_at ASC LIMIT 1)
WHERE election_id IS NULL;

-- Optional: enforce NOT NULL after backfill (uncomment when every row has election_id)
-- ALTER TABLE votes ALTER COLUMN election_id SET NOT NULL;

-- Recommended: one ballot line per student per position per election
CREATE UNIQUE INDEX IF NOT EXISTS votes_student_position_election_unique
  ON votes (student_id, position_id, election_id);
