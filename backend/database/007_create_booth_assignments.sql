USE aacs_vendor_booths;

CREATE TABLE IF NOT EXISTS booth_assignments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  show_id BIGINT UNSIGNED NOT NULL,
  booth_id BIGINT UNSIGNED NOT NULL,
  vendor_profile_id BIGINT UNSIGNED NOT NULL,
  assigned_by_user_id BIGINT UNSIGNED NOT NULL,
  assignment_source ENUM('vendor_selection', 'admin_assignment', 'admin_move') NOT NULL,
  status ENUM('active', 'released', 'cancelled') NOT NULL DEFAULT 'active',
  previous_booth_status ENUM('available', 'reserved', 'unavailable', 'assigned') NOT NULL DEFAULT 'available',
  active_booth_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = 'active' THEN booth_id ELSE NULL END) STORED,
  active_vendor_profile_id BIGINT UNSIGNED GENERATED ALWAYS AS (CASE WHEN status = 'active' THEN vendor_profile_id ELSE NULL END) STORED,
  selected_at DATETIME NULL,
  confirmed_at DATETIME NULL,
  released_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY booth_assignments_active_booth_unique (show_id, active_booth_id),
  UNIQUE KEY booth_assignments_active_vendor_unique (show_id, active_vendor_profile_id),
  INDEX booth_assignments_show_id_index (show_id),
  INDEX booth_assignments_booth_id_index (booth_id),
  INDEX booth_assignments_vendor_profile_id_index (vendor_profile_id),
  INDEX booth_assignments_status_index (status),
  CONSTRAINT booth_assignments_show_id_fk
    FOREIGN KEY (show_id)
    REFERENCES shows (id)
    ON DELETE CASCADE,
  CONSTRAINT booth_assignments_booth_id_fk
    FOREIGN KEY (booth_id)
    REFERENCES booths (id)
    ON DELETE RESTRICT,
  CONSTRAINT booth_assignments_vendor_profile_id_fk
    FOREIGN KEY (vendor_profile_id)
    REFERENCES vendor_profiles (id)
    ON DELETE RESTRICT,
  CONSTRAINT booth_assignments_assigned_by_fk
    FOREIGN KEY (assigned_by_user_id)
    REFERENCES users (id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS assignment_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  show_id BIGINT UNSIGNED NOT NULL,
  booth_id BIGINT UNSIGNED,
  vendor_profile_id BIGINT UNSIGNED NOT NULL,
  action ENUM('selected', 'assigned', 'moved', 'released', 'cancelled', 'reassigned') NOT NULL,
  performed_by_user_id BIGINT UNSIGNED NOT NULL,
  previous_booth_id BIGINT UNSIGNED,
  new_booth_id BIGINT UNSIGNED,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX assignment_history_show_id_index (show_id),
  INDEX assignment_history_booth_id_index (booth_id),
  INDEX assignment_history_vendor_profile_id_index (vendor_profile_id),
  INDEX assignment_history_action_index (action),
  CONSTRAINT assignment_history_show_id_fk
    FOREIGN KEY (show_id)
    REFERENCES shows (id)
    ON DELETE CASCADE,
  CONSTRAINT assignment_history_booth_id_fk
    FOREIGN KEY (booth_id)
    REFERENCES booths (id)
    ON DELETE SET NULL,
  CONSTRAINT assignment_history_vendor_profile_id_fk
    FOREIGN KEY (vendor_profile_id)
    REFERENCES vendor_profiles (id)
    ON DELETE CASCADE,
  CONSTRAINT assignment_history_performed_by_fk
    FOREIGN KEY (performed_by_user_id)
    REFERENCES users (id)
    ON DELETE RESTRICT
);
