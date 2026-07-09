USE aacs_vendor_booths;

CREATE TABLE IF NOT EXISTS booth_change_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  show_id BIGINT UNSIGNED NOT NULL,
  vendor_profile_id BIGINT UNSIGNED NOT NULL,
  current_assignment_id BIGINT UNSIGNED NOT NULL,
  current_booth_id BIGINT UNSIGNED NOT NULL,
  requested_booth_id BIGINT UNSIGNED NOT NULL,
  message TEXT NULL,
  status ENUM('pending', 'approved', 'denied', 'cancelled') NOT NULL DEFAULT 'pending',
  admin_response TEXT NULL,
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX booth_change_requests_show_id_index (show_id),
  INDEX booth_change_requests_vendor_profile_id_index (vendor_profile_id),
  INDEX booth_change_requests_status_index (status),
  INDEX booth_change_requests_requested_booth_id_index (requested_booth_id),
  CONSTRAINT booth_change_requests_show_id_fk
    FOREIGN KEY (show_id)
    REFERENCES shows (id)
    ON DELETE CASCADE,
  CONSTRAINT booth_change_requests_vendor_profile_id_fk
    FOREIGN KEY (vendor_profile_id)
    REFERENCES vendor_profiles (id)
    ON DELETE CASCADE,
  CONSTRAINT booth_change_requests_current_assignment_id_fk
    FOREIGN KEY (current_assignment_id)
    REFERENCES booth_assignments (id)
    ON DELETE CASCADE,
  CONSTRAINT booth_change_requests_current_booth_id_fk
    FOREIGN KEY (current_booth_id)
    REFERENCES booths (id)
    ON DELETE CASCADE,
  CONSTRAINT booth_change_requests_requested_booth_id_fk
    FOREIGN KEY (requested_booth_id)
    REFERENCES booths (id)
    ON DELETE CASCADE,
  CONSTRAINT booth_change_requests_reviewed_by_fk
    FOREIGN KEY (reviewed_by_user_id)
    REFERENCES users (id)
    ON DELETE SET NULL
);

INSERT IGNORE INTO schema_migrations (migration_name) VALUES
  ('011_create_booth_change_requests.sql');
