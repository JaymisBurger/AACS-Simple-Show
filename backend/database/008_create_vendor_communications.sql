USE aacs_vendor_booths;

CREATE TABLE IF NOT EXISTS vendor_communications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  show_id BIGINT UNSIGNED NOT NULL,
  vendor_profile_id BIGINT UNSIGNED NULL,
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
