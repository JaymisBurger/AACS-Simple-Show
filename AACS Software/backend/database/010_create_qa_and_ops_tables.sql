USE aacs_vendor_booths;

CREATE TABLE IF NOT EXISTS qa_checklist_results (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_key VARCHAR(120) NOT NULL,
  status ENUM('not_checked', 'passed', 'failed', 'needs_review') NOT NULL DEFAULT 'not_checked',
  notes TEXT NULL,
  checked_by_user_id BIGINT UNSIGNED NULL,
  checked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY qa_checklist_results_item_key_unique (item_key),
  CONSTRAINT qa_checklist_results_checked_by_fk
    FOREIGN KEY (checked_by_user_id)
    REFERENCES users (id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  migration_name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY schema_migrations_name_unique (migration_name)
);

CREATE TABLE IF NOT EXISTS seed_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  seed_name VARCHAR(120) NOT NULL,
  action ENUM('seeded', 'cleaned') NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX seed_runs_seed_name_index (seed_name)
);

INSERT IGNORE INTO schema_migrations (migration_name) VALUES
  ('001_initial_schema'),
  ('002_create_shows.sql'),
  ('003_create_floor_maps.sql'),
  ('004_create_booths.sql'),
  ('005_create_vendor_management.sql'),
  ('006_vendor_show_exclusions.sql'),
  ('007_create_booth_assignments.sql'),
  ('008_create_vendor_communications.sql'),
  ('009_create_event_day_tools.sql'),
  ('010_create_qa_and_ops_tables.sql');
