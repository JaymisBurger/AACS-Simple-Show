USE aacs_vendor_booths;

ALTER TABLE show_vendors
  MODIFY status ENUM('invited', 'active', 'declined', 'removed', 'excluded') NOT NULL DEFAULT 'excluded';
