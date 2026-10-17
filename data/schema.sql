-- Vezelvriend B.V. (fictional) - database schema.
--
-- Why SQLite: one file, no database server to run, and participants can write
-- real SQL against it in the Klantsysteem SQL screen. The database is rebuilt
-- from the JSON files in data/seed/ on every start, so the seed files stay the
-- single, readable source of truth and nobody can break the data for good.
--
-- Shared keys: customer_id (K-....) and address_id (A-....) tie everything together.
-- All timestamps are local time in the fictional world ('YYYY-MM-DD HH:MM').

CREATE TABLE addresses (
  address_id          TEXT PRIMARY KEY,
  street              TEXT NOT NULL,
  house_number        INTEGER NOT NULL,
  house_number_suffix TEXT,
  postcode            TEXT NOT NULL,
  city                TEXT NOT NULL,      -- filled from config/world.json at build time
  network_segment     TEXT NOT NULL,      -- the street cable the address is connected to
  is_placeholder      INTEGER NOT NULL DEFAULT 1  -- 1 until real BAG addresses replace them
);

CREATE TABLE customers (
  customer_id      TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  customer_type    TEXT NOT NULL CHECK (customer_type IN ('particulier', 'zakelijk')),
  address_id       TEXT NOT NULL REFERENCES addresses(address_id),
  phone            TEXT,
  email            TEXT,
  status           TEXT NOT NULL CHECK (status IN ('actief', 'beëindigd')),
  customer_since   TEXT NOT NULL,
  end_date         TEXT,
  open_balance_eur REAL NOT NULL DEFAULT 0
);

CREATE TABLE contracts (
  contract_id     TEXT PRIMARY KEY,
  customer_id     TEXT NOT NULL REFERENCES customers(customer_id),
  product         TEXT NOT NULL,
  download_mbps   INTEGER NOT NULL,
  upload_mbps     INTEGER NOT NULL,
  monthly_fee_eur REAL NOT NULL,
  start_date      TEXT NOT NULL,
  end_date        TEXT
);

CREATE TABLE modems (
  modem_id      TEXT PRIMARY KEY,
  customer_id   TEXT NOT NULL REFERENCES customers(customer_id),
  model         TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  mac_address   TEXT NOT NULL,
  firmware      TEXT NOT NULL
);

CREATE TABLE modem_measurements (
  measurement_id TEXT PRIMARY KEY,
  modem_id       TEXT NOT NULL REFERENCES modems(modem_id),
  measured_at    TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('online', 'offline', 'wisselend')),
  session        TEXT NOT NULL,
  download_mbps  INTEGER NOT NULL,
  upload_mbps    INTEGER NOT NULL
);

CREATE TABLE remote_restarts (
  restart_id   TEXT PRIMARY KEY,
  modem_id     TEXT NOT NULL REFERENCES modems(modem_id),
  requested_at TEXT NOT NULL,
  result       TEXT NOT NULL CHECK (result IN ('gelukt', 'mislukt'))
);

CREATE TABLE area_status (
  network_segment TEXT PRIMARY KEY,
  status          TEXT NOT NULL CHECK (status IN ('normaal', 'storing')),
  since           TEXT,
  ticket_id       TEXT,
  description     TEXT
);

CREATE TABLE tickets (
  ticket_id       TEXT PRIMARY KEY,
  ticket_type     TEXT NOT NULL CHECK (ticket_type IN ('gebiedsstoring', 'klant')),
  customer_id     TEXT REFERENCES customers(customer_id),
  network_segment TEXT,
  created_at      TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('open', 'gesloten')),
  title           TEXT NOT NULL,
  description     TEXT
);

-- Every contact moment is stored per address, not only per customer,
-- so the employee sees what happened at the address before.
CREATE TABLE contacts (
  contact_id  TEXT PRIMARY KEY,
  address_id  TEXT NOT NULL REFERENCES addresses(address_id),
  customer_id TEXT NOT NULL REFERENCES customers(customer_id),
  contact_at  TEXT NOT NULL,
  channel     TEXT NOT NULL CHECK (channel IN ('telefoon', 'mail', 'chat')),
  direction   TEXT NOT NULL CHECK (direction IN ('in', 'uit')),
  subject     TEXT NOT NULL,
  summary     TEXT
);

-- The network map is kept by network management, separately from the customer system.
CREATE TABLE network_map (
  address_id      TEXT PRIMARY KEY REFERENCES addresses(address_id),
  map_label       TEXT NOT NULL,
  network_segment TEXT NOT NULL,
  splitter        TEXT NOT NULL
);

-- Free-text notes written by service desk employees.
CREATE TABLE support_log (
  log_id      TEXT PRIMARY KEY,
  logged_at   TEXT NOT NULL,
  agent       TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(customer_id),
  category    TEXT NOT NULL,
  free_text   TEXT NOT NULL
);
