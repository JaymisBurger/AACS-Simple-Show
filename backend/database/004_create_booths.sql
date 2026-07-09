USE aacs_vendor_booths;

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

INSERT INTO booths (
  show_id,
  show_map_id,
  map_object_id,
  booth_number,
  booth_name,
  booth_type,
  status,
  width_label,
  depth_label,
  price,
  notes,
  is_featured
)
SELECT
  mo.show_id,
  mo.show_map_id,
  mo.id,
  CAST(JSON_UNQUOTE(JSON_EXTRACT(mo.metadata_json, '$.boothNumber')) AS UNSIGNED),
  NULLIF(mo.label, 'Booth'),
  COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(mo.metadata_json, '$.boothType')), ''), 'standard'),
  COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(mo.metadata_json, '$.status')), ''), 'available'),
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(mo.metadata_json, '$.widthLabel')), ''),
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(mo.metadata_json, '$.depthLabel')), ''),
  CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(mo.metadata_json, '$.price')), '') AS DECIMAL(10, 2)),
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(mo.metadata_json, '$.boothNotes')), ''),
  COALESCE(JSON_EXTRACT(mo.metadata_json, '$.isFeatured') = true, false)
FROM map_objects mo
WHERE mo.object_type = 'booth'
  AND JSON_EXTRACT(mo.metadata_json, '$.boothNumber') IS NOT NULL
  AND CAST(JSON_UNQUOTE(JSON_EXTRACT(mo.metadata_json, '$.boothNumber')) AS UNSIGNED) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM booths b
    WHERE b.map_object_id = mo.id
  );
