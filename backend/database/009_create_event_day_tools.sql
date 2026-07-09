USE aacs_vendor_booths;

CREATE TABLE IF NOT EXISTS show_public_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  show_id BIGINT UNSIGNED NOT NULL,
  public_map_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  public_directory_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  public_share_token VARCHAR(128) NULL,
  public_view_expires_at DATETIME NULL,
  display_options JSON NULL,
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
  checked_in_at DATETIME NULL,
  checked_in_by_user_id BIGINT UNSIGNED NULL,
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
