USE aacs_vendor_booths;

ALTER TABLE users
  ADD COLUMN requires_password_change BOOLEAN NOT NULL DEFAULT FALSE AFTER is_active,
  ADD COLUMN activation_token_hash VARCHAR(255) NULL AFTER requires_password_change,
  ADD COLUMN activation_expires_at DATETIME NULL AFTER activation_token_hash,
  ADD COLUMN reset_token_hash VARCHAR(255) NULL AFTER activation_expires_at,
  ADD COLUMN reset_expires_at DATETIME NULL AFTER reset_token_hash;

ALTER TABLE vendor_profiles
  MODIFY company_name VARCHAR(255) NULL,
  ADD COLUMN website VARCHAR(500) NULL AFTER phone,
  ADD COLUMN description TEXT NULL AFTER website,
  ADD COLUMN is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE AFTER tier;

CREATE TABLE IF NOT EXISTS show_vendors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  show_id BIGINT UNSIGNED NOT NULL,
  vendor_profile_id BIGINT UNSIGNED NOT NULL,
  status ENUM('invited', 'active', 'declined', 'removed') NOT NULL DEFAULT 'invited',
  special_access_opens_at DATETIME NULL,
  invited_at DATETIME NULL,
  activated_at DATETIME NULL,
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

UPDATE vendor_profiles
SET is_profile_complete = company_name IS NOT NULL
  AND company_name <> ''
  AND contact_name IS NOT NULL
  AND contact_name <> ''
  AND logo_url IS NOT NULL
  AND logo_url <> '';
