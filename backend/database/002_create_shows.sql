USE aacs_vendor_booths;

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
