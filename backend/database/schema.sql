CREATE DATABASE IF NOT EXISTS aacs_vendor_booths
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE aacs_vendor_booths;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'vendor') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  requires_password_change BOOLEAN NOT NULL DEFAULT FALSE,
  activation_token_hash VARCHAR(255),
  activation_expires_at DATETIME,
  reset_token_hash VARCHAR(255),
  reset_expires_at DATETIME,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_email_unique (email),
  INDEX users_role_index (role)
);

CREATE TABLE IF NOT EXISTS vendor_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  company_name VARCHAR(255),
  contact_name VARCHAR(255),
  phone VARCHAR(50),
  website VARCHAR(500),
  description TEXT,
  logo_url VARCHAR(2048),
  tier ENUM('platinum', 'gold', 'silver', 'bronze') NOT NULL DEFAULT 'bronze',
  is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY vendor_profiles_user_id_unique (user_id),
  INDEX vendor_profiles_tier_index (tier),
  CONSTRAINT vendor_profiles_user_id_fk
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS show_vendors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  show_id BIGINT UNSIGNED NOT NULL,
  vendor_profile_id BIGINT UNSIGNED NOT NULL,
  status ENUM('invited', 'active', 'declined', 'removed', 'excluded') NOT NULL DEFAULT 'excluded',
  special_access_opens_at DATETIME,
  invited_at DATETIME,
  activated_at DATETIME,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY show_vendors_show_vendor_unique (show_id, vendor_profile_id),
  INDEX show_vendors_show_id_index (show_id),
  INDEX show_vendors_vendor_profile_id_index (vendor_profile_id),
  INDEX show_vendors_status_index (status),
  CONSTRAINT show_vendors_show_id_fk
    FOREIGN KEY (show_id)
    REFERENCES shows (id)
    ON DELETE CASCADE,
  CONSTRAINT show_vendors_vendor_profile_id_fk
    FOREIGN KEY (vendor_profile_id)
    REFERENCES vendor_profiles (id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shows (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  venue_name VARCHAR(255) NOT NULL,
  venue_address VARCHAR(500),
  start_date DATE,
  end_date DATE,
  vendor_selection_deadline DATETIME,
  timezone VARCHAR(100) NOT NULL,
  status ENUM('draft', 'published', 'closed', 'archived') NOT NULL DEFAULT 'draft',
  selection_paused BOOLEAN NOT NULL DEFAULT FALSE,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX shows_status_index (status),
  INDEX shows_start_date_index (start_date),
  INDEX shows_created_by_index (created_by),
  CONSTRAINT shows_created_by_fk
    FOREIGN KEY (created_by)
    REFERENCES users (id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS show_tier_windows (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  show_id BIGINT UNSIGNED NOT NULL,
  tier ENUM('platinum', 'gold', 'silver', 'bronze') NOT NULL,
  opens_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY show_tier_windows_show_tier_unique (show_id, tier),
  INDEX show_tier_windows_show_id_index (show_id),
  INDEX show_tier_windows_tier_index (tier),
  CONSTRAINT show_tier_windows_show_id_fk
    FOREIGN KEY (show_id)
    REFERENCES shows (id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS show_maps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  show_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(2048) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  image_width INT UNSIGNED NOT NULL,
  image_height INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY show_maps_show_id_unique (show_id),
  INDEX show_maps_show_id_index (show_id),
  CONSTRAINT show_maps_show_id_fk
    FOREIGN KEY (show_id)
    REFERENCES shows (id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS map_objects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  show_id BIGINT UNSIGNED NOT NULL,
  show_map_id BIGINT UNSIGNED NOT NULL,
  object_type ENUM('booth', 'door', 'label', 'arrow', 'restricted_area') NOT NULL,
  label VARCHAR(255),
  x_percent DECIMAL(8,4) NOT NULL,
  y_percent DECIMAL(8,4) NOT NULL,
  width_percent DECIMAL(8,4) NOT NULL,
  height_percent DECIMAL(8,4) NOT NULL,
  rotation DECIMAL(8,4) NOT NULL DEFAULT 0,
  z_index INT NOT NULL DEFAULT 0,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  metadata_json JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX map_objects_show_id_index (show_id),
  INDEX map_objects_show_map_id_index (show_map_id),
  INDEX map_objects_type_index (object_type),
  INDEX map_objects_z_index_index (z_index),
  CONSTRAINT map_objects_show_id_fk
    FOREIGN KEY (show_id)
    REFERENCES shows (id)
    ON DELETE CASCADE,
  CONSTRAINT map_objects_show_map_id_fk
    FOREIGN KEY (show_map_id)
    REFERENCES show_maps (id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booths (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  show_id BIGINT UNSIGNED NOT NULL,
  show_map_id BIGINT UNSIGNED NOT NULL,
  map_object_id BIGINT UNSIGNED NOT NULL,
  booth_number INT UNSIGNED NOT NULL,
  booth_name VARCHAR(255),
  booth_type ENUM('standard', 'premium', 'corner', 'double', 'custom') NOT NULL DEFAULT 'standard',
  status ENUM('available', 'reserved', 'unavailable', 'assigned') NOT NULL DEFAULT 'available',
  width_label VARCHAR(100),
  depth_label VARCHAR(100),
  price DECIMAL(10, 2),
  notes TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY booths_show_number_unique (show_id, booth_number),
  UNIQUE KEY booths_map_object_unique (map_object_id),
  INDEX booths_show_id_index (show_id),
  INDEX booths_show_map_id_index (show_map_id),
  INDEX booths_status_index (status),
  INDEX booths_type_index (booth_type),
  CONSTRAINT booths_show_id_fk
    FOREIGN KEY (show_id)
    REFERENCES shows (id)
    ON DELETE CASCADE,
  CONSTRAINT booths_show_map_id_fk
    FOREIGN KEY (show_map_id)
    REFERENCES show_maps (id)
    ON DELETE CASCADE,
  CONSTRAINT booths_map_object_id_fk
    FOREIGN KEY (map_object_id)
    REFERENCES map_objects (id)
    ON DELETE CASCADE
);

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
  selected_at DATETIME,
  confirmed_at DATETIME,
  released_at DATETIME,
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

CREATE TABLE IF NOT EXISTS vendor_communications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  show_id BIGINT UNSIGNED NOT NULL,
  vendor_profile_id BIGINT UNSIGNED,
  communication_type ENUM(
    'booth_selection_coming_soon',
    'booth_selection_now_open',
    'complete_vendor_profile',
    'booth_selection_reminder',
    'booth_confirmation',
    'admin_manual_assignment_notice',
    'custom'
  ) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('drafted', 'copied', 'sent_externally', 'cancelled') NOT NULL DEFAULT 'drafted',
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX vendor_communications_show_id_index (show_id),
  INDEX vendor_communications_vendor_profile_id_index (vendor_profile_id),
  INDEX vendor_communications_status_index (status),
  INDEX vendor_communications_type_index (communication_type),
  CONSTRAINT vendor_communications_show_id_fk
    FOREIGN KEY (show_id)
    REFERENCES shows (id)
    ON DELETE CASCADE,
  CONSTRAINT vendor_communications_vendor_profile_id_fk
    FOREIGN KEY (vendor_profile_id)
    REFERENCES vendor_profiles (id)
    ON DELETE SET NULL,
  CONSTRAINT vendor_communications_created_by_fk
    FOREIGN KEY (created_by_user_id)
    REFERENCES users (id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS show_public_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  show_id BIGINT UNSIGNED NOT NULL,
  public_map_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  public_directory_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  public_share_token VARCHAR(128),
  public_view_expires_at DATETIME,
  display_options JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY show_public_settings_show_id_unique (show_id),
  UNIQUE KEY show_public_settings_token_unique (public_share_token),
  CONSTRAINT show_public_settings_show_id_fk
    FOREIGN KEY (show_id)
    REFERENCES shows (id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_check_ins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  show_id BIGINT UNSIGNED NOT NULL,
  vendor_profile_id BIGINT UNSIGNED NOT NULL,
  checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  checked_in_at DATETIME,
  checked_in_by_user_id BIGINT UNSIGNED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY vendor_check_ins_show_vendor_unique (show_id, vendor_profile_id),
  INDEX vendor_check_ins_show_id_index (show_id),
  INDEX vendor_check_ins_vendor_profile_id_index (vendor_profile_id),
  CONSTRAINT vendor_check_ins_show_id_fk
    FOREIGN KEY (show_id)
    REFERENCES shows (id)
    ON DELETE CASCADE,
  CONSTRAINT vendor_check_ins_vendor_profile_id_fk
    FOREIGN KEY (vendor_profile_id)
    REFERENCES vendor_profiles (id)
    ON DELETE CASCADE,
  CONSTRAINT vendor_check_ins_checked_in_by_fk
    FOREIGN KEY (checked_in_by_user_id)
    REFERENCES users (id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS qa_checklist_results (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_key VARCHAR(120) NOT NULL,
  status ENUM('not_checked', 'passed', 'failed', 'needs_review') NOT NULL DEFAULT 'not_checked',
  notes TEXT,
  checked_by_user_id BIGINT UNSIGNED,
  checked_at DATETIME,
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
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX seed_runs_seed_name_index (seed_name)
);
