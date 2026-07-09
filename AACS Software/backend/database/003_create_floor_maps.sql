USE aacs_vendor_booths;

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
