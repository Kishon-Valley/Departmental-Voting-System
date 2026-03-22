-- Legacy index from older schema: unique on (student_id, position_id) only.
-- It prevents voting in a new election and causes duplicate key errors when the app
-- inserts (student_id, position_id, election_id) rows.
DROP INDEX IF EXISTS idx_votes_student_position_unique;

-- Election-scoped uniqueness (safe if already created by 20250321120000)
CREATE UNIQUE INDEX IF NOT EXISTS votes_student_position_election_unique
  ON votes (student_id, position_id, election_id);
