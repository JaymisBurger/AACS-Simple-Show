# AACS Vendor Booth Selection

Full-stack application for managing vendor booth selection at association events. The current scope includes MySQL schema, JWT authentication, role-based route protection, admin show management, floor-map editing, booth records, vendor management, vendor booth selection, and admin booth assignments.

## Stack

- React with Vite
- Node.js with Express
- MySQL using `mysql2`
- Axios
- JWT authentication
- bcrypt password hashing

## Project Structure

```text
backend/
  database/schema.sql
  database/002_create_shows.sql
  database/003_create_floor_maps.sql
  database/004_create_booths.sql
  database/005_create_vendor_management.sql
  database/006_vendor_show_exclusions.sql
  database/007_create_booth_assignments.sql
  database/008_create_vendor_communications.sql
  database/009_create_event_day_tools.sql
  database/010_create_qa_and_ops_tables.sql
  src/config
  src/controllers
  src/middleware
  src/models
  src/routes
  src/scripts
  src/services
frontend/
  src/components
  src/context
  src/layouts
  src/pages
  src/routes
  src/services
  src/styles
```

## Create the Database

1. Create a MySQL database and tables by running the schema file:

   ```bash
   mysql -u root -p < backend/database/schema.sql
   ```

2. The schema creates:

   - `users`
   - `vendor_profiles`
   - `shows`
   - `show_tier_windows`
   - `show_maps`
   - `map_objects`
   - `booths`
   - `show_vendors`
   - `booth_assignments`
   - `assignment_history`
   - `vendor_communications`
   - `show_public_settings`
   - `vendor_check_ins`
   - `qa_checklist_results`
   - `schema_migrations`
   - `seed_runs`

The `vendor_profiles.user_id` column references `users.id`. `shows.created_by` references the admin user that created the show. `show_tier_windows.show_id` references `shows.id` and has a unique constraint on `show_id` and `tier` so a show can have only one opening time per tier. `show_maps.show_id` is unique so each show has one active floor map for now. `map_objects` stores percentage-based editor objects tied to both the show and its map. `booths` stores booth numbers, status, type, dimensions, price, notes, and featured flags tied to booth map objects. `show_vendors` stores vendor-specific show exceptions such as exclusions. `booth_assignments` is the source of truth for booth occupancy, and `assignment_history` records selection, admin assignment, move, swap, and release events. `vendor_communications` stores admin-only draft/copy/sent-external communication records. `show_public_settings` stores tokened public map/directory settings, `vendor_check_ins` stores event-day check-in state, `qa_checklist_results` stores manual QA status, `schema_migrations` records known migration files, and `seed_runs` records explicit demo seed/cleanup runs.

If you already created the database before show management was added, run the update file:

```bash
mysql -u root -p aacs_vendor_booths < backend/database/002_create_shows.sql
```

Vendor tiers and show tier windows are restricted to `platinum`, `gold`, `silver`, and `bronze`. Show statuses are restricted to `draft`, `published`, `closed`, and `archived`.

If you already created the database before floor-map management was added, run:

```bash
mysql -u root -p aacs_vendor_booths < backend/database/003_create_floor_maps.sql
```

If you already created the database before booth record management was added, run:

```bash
mysql -u root -p aacs_vendor_booths < backend/database/004_create_booths.sql
```

Booth statuses are restricted to `available`, `reserved`, `unavailable`, and `assigned`. Booth types are restricted to `standard`, `premium`, `corner`, `double`, and `custom`. Booth numbers are unique per show, and each booth record is tied to one booth map object.

If you already created the database before vendor management was added, run:

```bash
mysql -u root -p aacs_vendor_booths < backend/database/005_create_vendor_management.sql
```

If you already created the database before vendor show exclusions were added, run:

```bash
mysql -u root -p aacs_vendor_booths < backend/database/006_vendor_show_exclusions.sql
```

If you already created the database before booth selection and assignments were added, run:

```bash
mysql -u root -p aacs_vendor_booths < backend/database/007_create_booth_assignments.sql
```

Active booth assignments are unique per booth and unique per vendor per show. Assigned booths are marked with booth status `assigned`; releasing or moving an assignment restores the booth's previous status.

If you already created the database before readiness communication prep was added, run:

```bash
mysql -u root -p aacs_vendor_booths < backend/database/008_create_vendor_communications.sql
```

If you already created the database before event-day tools were added, run:

```bash
mysql -u root -p aacs_vendor_booths < backend/database/009_create_event_day_tools.sql
```

If you already created the database before final QA/ops tools were added, run:

```bash
mysql -u root -p aacs_vendor_booths < backend/database/010_create_qa_and_ops_tables.sql
```

## Configure Environment Variables

Create backend and frontend environment files from the examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Update `backend/.env`:

```env
PORT=5000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=aacs_vendor_booths

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=8h

UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE_MB=10
VENDOR_LOGO_MAX_SIZE_MB=5
INVITATION_TOKEN_EXPIRES_HOURS=72
PASSWORD_RESET_TOKEN_EXPIRES_HOURS=24

SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=your_dev_admin_password
```

Update `frontend/.env` if your API URL changes:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Install Dependencies

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd ../frontend
npm install
```

## Create the Development Admin

After the database is created and `backend/.env` is configured, run:

```bash
cd backend
npm run seed:admin
```

The seed script creates one active admin user using `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. It skips creation if a user with that email already exists. No credentials are hardcoded in source.

## Run the App

Start the backend API:

```bash
cd backend
npm run dev
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open the Vite URL, usually:

```text
http://localhost:5173
```

Use the seeded admin credentials to sign in. Admin users are redirected to `/admin`; vendor users are redirected to `/vendor`. Protected routes redirect unauthenticated users to `/login`, and users cannot access dashboards for another role.

## Setup Checks and Demo Data

Run local setup checks:

```bash
cd backend
npm run check-setup
```

The setup helper checks environment variables, database connection, expected tables, upload directory access, active admin presence, and migration status. It does not print secrets.

Create demo data only when explicitly intended:

```bash
cd backend
DEMO_SEED_CONFIRM=I_UNDERSTAND_DEMO_DATA npm run seed:demo
```

Optional demo passwords:

```bash
DEMO_ADMIN_PASSWORD='replace_me' DEMO_VENDOR_PASSWORD='replace_me' DEMO_SEED_CONFIRM=I_UNDERSTAND_DEMO_DATA npm run seed:demo
```

Clean demo data:

```bash
cd backend
DEMO_CLEANUP_CONFIRM=DELETE_DEMO_DATA npm run cleanup:demo
```

Demo seeding is disabled in production mode, never runs on app startup, and labels demo records with `[DEMO]` or `demo.*@example.com`.

## Admin Show Management

Admins can open the Shows section from the admin sidebar at `/admin/shows`.

Frontend pages added:

- Shows List: `/admin/shows`
- Create Show: `/admin/shows/new`
- Show Details: `/admin/shows/:id`
- Edit Show: `/admin/shows/:id/edit`

Admin API routes added:

- `GET /api/admin/shows`
- `POST /api/admin/shows`
- `GET /api/admin/shows/:id`
- `PATCH /api/admin/shows/:id`
- `DELETE /api/admin/shows/:id`
- `POST /api/admin/shows/:id/tier-windows`
- `PUT /api/admin/shows/:id/tier-windows`
- `POST /api/admin/shows/:id/publish`
- `POST /api/admin/shows/:id/close`
- `POST /api/admin/shows/:id/archive`
- `POST /api/admin/shows/:id/restore`

Archived shows are hidden from the default list view and only appear when the Archived filter is selected. The normal admin UI archives shows instead of permanently deleting them. The delete API refuses deletion when dependent records exist.

Publishing validation requires:

- Show name
- Venue name
- Start date
- End date
- Timezone
- Platinum, Gold, Silver, and Bronze tier opening times

The API also validates that the end date is not before the start date, the vendor selection deadline is not after the show starts, tier opening times are not after the vendor selection deadline, and the tier order is Platinum, Gold, Silver, Bronze. Draft shows may have missing tier windows; details responses include `missingSetupItems` so the UI can show what remains incomplete.

Tier-selection schedule status is shown on the details page. Tiers display as Not scheduled, Upcoming, Open, or Closed based on each tier opening time, the vendor selection deadline, the show status, and whether selection is paused. Earlier tiers remain open after later tiers open unless selection is paused, the show is closed or archived, or the deadline has passed.

## Floor Maps and Map Editor

Admins can manage a show floor map from the Show Details page or by visiting:

```text
/admin/shows/:showId/floor-map
/admin/shows/:showId/floor-map/editor
/admin/shows/:showId/booths
```

Admin API routes added:

- `GET /api/admin/shows/:showId/floor-map`
- `POST /api/admin/shows/:showId/floor-map`
- `DELETE /api/admin/shows/:showId/floor-map`
- `GET /api/admin/shows/:showId/floor-map/image`
- `GET /api/admin/shows/:showId/floor-map/objects`
- `POST /api/admin/shows/:showId/floor-map/objects`
- `PATCH /api/admin/shows/:showId/floor-map/objects/:objectId`
- `DELETE /api/admin/shows/:showId/floor-map/objects/:objectId`
- `POST /api/admin/shows/:showId/floor-map/objects/:objectId/duplicate`
- `PUT /api/admin/shows/:showId/floor-map/objects/bulk`
- `PUT /api/admin/shows/:showId/floor-map/objects/reorder`

Uploaded floor-map files are stored on disk in `backend/uploads` by default. The database stores map metadata and an internal image path, not raw image bytes. The upload directory is ignored by git and can be changed with `UPLOAD_DIR`. Maximum upload size is configured with `MAX_UPLOAD_SIZE_MB`.

Accepted floor-map formats are PNG, JPG/JPEG, and WEBP. Images are served through the protected admin image endpoint.

The map editor uses React Konva. The uploaded map renders as a locked background layer, while booths, labels, and arrows are editable objects. Object coordinates and dimensions are saved as percentages of the source map so they stay aligned when the canvas scales.

Manual save and debounced autosave both call the bulk-save endpoint. Existing object IDs are preserved, new local objects are inserted once, and objects removed from the editor are deleted during bulk save. Creating or duplicating a booth creates a booth record transactionally, using the lowest missing booth number for the show. Deleting a booth removes both the booth record and its map object.

## Booth Records

Admins can manage booth records from:

```text
/admin/shows/:showId/booths
```

Admin API routes added:

- `GET /api/admin/shows/:showId/booths`
- `GET /api/admin/shows/:showId/booths/next-number`
- `GET /api/admin/shows/:showId/booths/:boothId`
- `PATCH /api/admin/shows/:showId/booths/:boothId`
- `PATCH /api/admin/shows/:showId/booths/:boothId/status`
- `POST /api/admin/shows/:showId/booths/:boothId/duplicate`
- `DELETE /api/admin/shows/:showId/booths/:boothId`
- `POST /api/admin/shows/:showId/booths/bulk-update`
- `POST /api/admin/shows/:showId/booths/bulk-delete`
- `POST /api/admin/shows/:showId/booths/renumber`
- `GET /api/admin/shows/:showId/booths/:boothId/locate`

The Booths page supports search, status/type/featured filters, status and featured bulk actions, duplicate/delete, locate in map editor, and renumber preview/apply. The Show Details setup checklist now marks Booths created and All booths numbered from booth records, and displays booth totals by status.

## Vendor Management

Admins can manage vendor accounts from:

```text
/admin/vendors
/admin/vendors/new
/admin/vendors/:vendorId
/admin/vendors/:vendorId/edit
```

Vendor portal routes:

```text
/vendor
/vendor/profile
```

Admin API routes added:

- `GET /api/admin/vendors`
- `POST /api/admin/vendors`
- `GET /api/admin/vendors/:vendorId`
- `PATCH /api/admin/vendors/:vendorId`
- `PATCH /api/admin/vendors/:vendorId/tier`
- `PATCH /api/admin/vendors/:vendorId/status`
- `POST /api/admin/vendors/:vendorId/reset-password`
- `POST /api/admin/vendors/:vendorId/assign-show`
- `POST /api/admin/vendors/:vendorId/logo`
- `DELETE /api/admin/vendors/:vendorId/logo`
- `GET /api/admin/shows/:showId/vendors`
- `PATCH /api/admin/shows/:showId/vendors/:vendorId`
- `DELETE /api/admin/shows/:showId/vendors/:vendorId`

Vendor API routes added:

- `GET /api/vendor/dashboard`
- `PATCH /api/vendor/profile`
- `POST /api/vendor/profile/logo`
- `DELETE /api/vendor/profile/logo`
- `POST /api/auth/activate-vendor`
- `POST /api/auth/reset-password`
- `POST /api/auth/change-password`

Vendor account creation supports either a temporary password or an invitation link. Temporary-password accounts are flagged to require a password change after login. Invitation accounts generate a secure expiring activation token; in local development the activation URL is returned in the admin response and logged by the API service.

Vendor logos are written to `backend/uploads/vendor-logos` and referenced by URL in MySQL. PNG, JPG/JPEG, and WEBP are accepted; SVG is not enabled because safe SVG support requires sanitization. Logo size is controlled by `VENDOR_LOGO_MAX_SIZE_MB`.

Vendors can access shows by default. Admins use `show_vendors` to create show-specific access exceptions, primarily `excluded` records. Effective selection opening time is displayed from the show tier window for the vendor's current tier unless a special access override exists.

The Show Details checklist marks vendor access as available by default and displays vendor totals by tier, exclusions, and profile completion.

## Vendor Booth Selection and Admin Assignments

Vendor routes:

```text
/vendor
/vendor/shows/:showId
/vendor/shows/:showId/floor-map
/vendor/shows/:showId/my-booth
```

Admin routes:

```text
/admin/booth-assignments
/admin/shows/:showId/assignments
```

Vendor API routes added:

- `GET /api/vendor/shows`
- `GET /api/vendor/shows/:showId`
- `GET /api/vendor/shows/:showId/floor-map`
- `GET /api/vendor/shows/:showId/floor-map/image`
- `POST /api/vendor/shows/:showId/booths/:boothId/select`
- `GET /api/vendor/shows/:showId/my-booth`

Admin API routes added:

- `GET /api/admin/booth-assignments`
- `GET /api/admin/shows/:showId/assignments`
- `POST /api/admin/shows/:showId/assignments`
- `GET /api/admin/shows/:showId/assignments/eligible-vendors`
- `POST /api/admin/assignments/:assignmentId/move`
- `POST /api/admin/assignments/:assignmentId/release`
- `POST /api/admin/assignments/swap`
- `GET /api/admin/shows/:showId/assignments/history`
- `GET /api/admin/shows/:showId/assignments/:assignmentId/history`

Vendor booth selection is allowed only when the vendor is active, not excluded from the show, has a complete profile, the show is published, booth selection is not paused, the tier or special opening time has arrived, the deadline has not passed, and the vendor does not already have an active assignment. The backend rechecks every selection request inside a transaction and prevents double-booking with database uniqueness constraints.

Admins can assign a vendor to an available booth, move an active assignment to another available booth, swap two active assignments in the same show, release an assignment, and review assignments across all shows. The public vendor map shows assigned booth logos or initials without exposing private vendor contact data.

## Show Readiness and Communication Prep

Admins can review show readiness from:

```text
/admin/shows/:showId/readiness
```

The readiness page summarizes show setup, floor map and booth readiness, tier schedule status, inclusive-by-default vendor access, booth assignment progress, communication prep, communication history, and assignment history.

Admin API routes added:

- `GET /api/admin/shows/:showId/readiness`
- `GET /api/admin/shows/:showId/readiness/vendors`
- `GET /api/admin/shows/:showId/readiness/tiers`
- `POST /api/admin/shows/:showId/communications/preview`
- `POST /api/admin/shows/:showId/communications`
- `GET /api/admin/shows/:showId/communications`
- `PATCH /api/admin/communications/:communicationId/copied`
- `PATCH /api/admin/communications/:communicationId/sent-externally`

Vendor eligibility is calculated from all active vendors, excluding only vendors with an `excluded` show record. No explicit show assignment record is required for a vendor to be eligible. A vendor can be blocked by an incomplete profile, show status, paused selection, unopened tier window, passed deadline, exclusion, inactive account, or an existing booth assignment.

Selection statuses are normalized as `profile_incomplete`, `excluded`, `show_not_published`, `selection_paused`, `tier_not_open`, `open`, `already_selected`, `deadline_passed`, `show_closed`, and `vendor_inactive`. The backend uses these statuses for display and still enforces actual booth selection inside the assignment transaction.

Communication templates are copy-ready only; the app does not send email. Templates include booth selection coming soon, booth selection now open, complete your vendor profile, booth selection reminder, booth confirmation, and admin manual assignment notice. Drafts can be saved, copied, marked as copied, or marked as sent externally.

## Event-Day Views, Public Links, and Exports

Admins can manage public/event-day visibility from Show Readiness:

```text
/admin/shows/:showId/readiness
/admin/shows/:showId/event-day
```

Public routes use a generated random token and do not require login:

```text
/public/shows/:token/map
/public/shows/:token/vendors
```

Public pages never expose vendor email, phone, contact name, account status, profile completion status, reset tokens, activation tokens, password hashes, or internal notes. Archived shows and disabled public settings immediately stop public access. Admins can regenerate the token, disable public access, copy the public map/directory links, and control display options such as logos, booth numbers, booth types, unassigned booths, unavailable booths, descriptions, websites, and tier badges.

Admin API routes added:

- `GET /api/admin/shows/:showId/public-settings`
- `PATCH /api/admin/shows/:showId/public-settings`
- `POST /api/admin/shows/:showId/public-settings/regenerate-token`
- `POST /api/admin/shows/:showId/public-settings/disable`
- `GET /api/admin/shows/:showId/event-day`
- `PATCH /api/admin/shows/:showId/event-day/vendors/:vendorProfileId/check-in`
- `GET /api/admin/shows/:showId/exports/:type.csv`
- `GET /api/admin/shows/:showId/archive-warnings`

Public API routes added:

- `GET /api/public/shows/:token/map`
- `GET /api/public/shows/:token/map/image`
- `GET /api/public/shows/:token/vendors`

CSV exports are admin-only and include vendor directory, booth assignments, check-in list, vendors without booths, incomplete profiles, excluded vendors, booth inventory, and assignment history. Event-day mode supports vendor/booth search, quick filters, tier and booth-type filters, and check-in toggles.

Read-only maps now support zoom in, zoom out, reset, fit, pan by scroll, booth search, and vendor search where assignment data is visible. Public map, public directory, admin event-day mode, booth assignments, and vendor My Booth include print-friendly styling. Vendor My Booth also includes Print Confirmation and Copy Booth Details actions.

## Final QA and Operations

Admin routes:

```text
/admin/qa-checklist
/admin/release-notes
/admin/notifications
/admin/help
```

Vendor route:

```text
/vendor/help
```

Admin API routes added:

- `GET /api/admin/qa-checklist`
- `PATCH /api/admin/qa-checklist/:itemKey`
- `POST /api/admin/qa-checklist/reset`
- `GET /api/admin/qa-checklist/export.csv`
- `GET /api/admin/setup-status`
- `GET /api/admin/migration-status`
- `GET /api/admin/release-notes`
- `GET /api/admin/search`
- `GET /api/admin/notifications`
- `GET /api/admin/help`
- `GET /api/vendor/help`

The QA checklist groups manual checks by feature area and persists status, notes, checked-by, and checked-at. It can be reset or exported as CSV. Release notes summarize major internal milestones. Global admin search covers shows, vendors, booths, and active assignments without searching passwords, tokens, or security fields. Notifications are generated from current data, including incomplete readiness, incomplete vendor profiles, vendors without booths for published shows, public links, and failed setup checks.

The admin layout now includes global search, notification count, and navigation links for dashboard, shows, vendors, booth assignments, readiness, event-day tools, reports/QA, notifications, release notes, settings placeholder, and help. Vendor pages link to vendor help.

Friendly frontend fallbacks include a React error boundary, a not-found page, and public-link unavailable handling.

## Deployment Notes

Recommended runtime:

- Node.js 20 LTS or newer
- MySQL 8 or newer
- A process manager such as systemd, PM2, or a container runtime
- A reverse proxy such as Nginx or Caddy for TLS and static frontend hosting

Deployment checklist:

1. Install backend dependencies with `npm ci` in `backend`.
2. Install frontend dependencies with `npm ci` in `frontend`.
3. Configure backend `.env` with database credentials, `JWT_SECRET`, `FRONTEND_ORIGIN`, `BACKEND_PUBLIC_URL`, upload paths, and expiration settings.
4. Configure frontend `.env` with `VITE_API_BASE_URL`.
5. Create the MySQL database and apply `backend/database/schema.sql`, or apply all migration files in order.
6. Ensure the upload directory exists and is writable by the backend process.
7. Build the frontend with `npm run build` in `frontend`.
8. Serve `frontend/dist` from the reverse proxy or static host.
9. Start the backend with `npm start` in `backend`.
10. Run `npm run check-setup`.
11. Create the first admin with `npm run seed:admin`.

Reverse proxy notes:

- Proxy API requests to the backend, usually `/api/*`.
- Serve uploaded logos and floor maps through backend-protected routes or the existing `/uploads/vendor-logos` static path.
- Set `FRONTEND_ORIGIN` to the exact public frontend origin for CORS.
- Use a long random `JWT_SECRET`; do not reuse development secrets.

Back up:

- MySQL database
- `backend/uploads` floor maps and vendor logos
- Backend and frontend environment files
- Public token settings in the database

Restore checklist:

1. Restore MySQL backup.
2. Restore uploaded files to the configured upload directory.
3. Restore environment configuration.
4. Run `npm run check-setup`.
5. Confirm public links, vendor logos, and floor maps render.

## Current Scope

Built now:

- Secure login API with validation
- bcrypt password hashing
- JWT generation and validation
- Auth and role authorization middleware
- Persistent frontend login state
- Logout
- Admin dashboard placeholder
- Admin show creation and management
- Floor-map upload and admin map editor foundation
- Admin booth record management
- Admin vendor management, invitations, logos, tiers, and show exclusions
- Vendor dashboard and self-service profile editing
- Vendor booth selection and confirmation
- Admin booth assignment management
- Show readiness dashboard
- Communication draft preparation and history
- Public event-day map and vendor directory
- Admin event-day staff mode and CSV exports
- Print-friendly public/admin/vendor views
- Final QA checklist, setup checks, release notes, notifications, help, and global search
- Central Express error handler
- MySQL schema and admin seed script

Not built yet:

- Public vendor registration
- Vendor-side booth swapping
