// Read queries shared by the Klantsysteem and the Klantbeeld.
// Plain SQL on purpose: participants can read these and reuse them in the SQL screen.
import { now, minutesAgo, world } from './world.js';

const CUSTOMER_SELECT = `
  SELECT c.*, a.street, a.house_number, a.house_number_suffix, a.postcode, a.city, a.network_segment,
         k.contract_id, k.product, k.download_mbps, k.upload_mbps, k.monthly_fee_eur,
         k.start_date AS contract_start, k.end_date AS contract_end
  FROM customers c
  JOIN addresses a ON a.address_id = c.address_id
  LEFT JOIN contracts k ON k.customer_id = c.customer_id`;

export function formatAddress(row) {
  return `${row.street} ${row.house_number}${row.house_number_suffix ?? ''}, ${row.postcode} ${row.city}`;
}

/**
 * Searches on name, address, postcode, customer number, e-mail and phone.
 * The search is deliberately naive (a simple LIKE), just like many real
 * customer systems: it shows every record that matches, also old ones.
 */
export function searchCustomers(db, query) {
  const q = (query ?? '').trim();
  if (!q) return db.prepare(`${CUSTOMER_SELECT} ORDER BY c.customer_id`).all();
  const like = `%${q}%`;
  return db.prepare(`${CUSTOMER_SELECT}
    WHERE c.name LIKE ? OR c.customer_id LIKE ? OR c.email LIKE ? OR c.phone LIKE ?
       OR (a.street || ' ' || a.house_number || IFNULL(a.house_number_suffix, '')) LIKE ?
       OR a.postcode LIKE ?
    ORDER BY c.name, c.customer_id`).all(like, like, like, like, like, like);
}

export function getCustomer(db, customerId) {
  return db.prepare(`${CUSTOMER_SELECT} WHERE c.customer_id = ?`).get(customerId);
}

/** Everything that happened at an address, newest first, whoever the customer was. */
export function getAddressHistory(db, addressId) {
  const contacts = db.prepare(`
    SELECT h.contact_at AS at, h.channel, h.direction, h.subject, h.summary, c.name AS customer_name, h.customer_id
    FROM contacts h JOIN customers c ON c.customer_id = h.customer_id
    WHERE h.address_id = ?`).all(addressId);
  const tickets = db.prepare(`
    SELECT t.created_at AS at, 'ticket' AS channel, NULL AS direction, t.ticket_id || ': ' || t.title AS subject,
           t.description || ' (status: ' || t.status || ')' AS summary, c.name AS customer_name, t.customer_id
    FROM tickets t JOIN customers c ON c.customer_id = t.customer_id
    WHERE c.address_id = ?`).all(addressId);
  return [...contacts, ...tickets].sort((a, b) => b.at.localeCompare(a.at));
}

export function getNetworkMapEntry(db, addressId) {
  return db.prepare('SELECT * FROM network_map WHERE address_id = ?').get(addressId);
}

/**
 * What the "Modem controleren" button shows. It only reads stored data:
 * the fake world has no real modems, and no AI calls this function.
 */
export function getModemCheck(db, customerId) {
  const modem = db.prepare('SELECT * FROM modems WHERE customer_id = ?').get(customerId);
  if (!modem) return null;
  const measurement = db.prepare(
    'SELECT * FROM modem_measurements WHERE modem_id = ? ORDER BY measured_at DESC LIMIT 1').get(modem.modem_id);
  const restart = db.prepare(
    'SELECT * FROM remote_restarts WHERE modem_id = ? ORDER BY requested_at DESC LIMIT 1').get(modem.modem_id);
  const customer = db.prepare('SELECT address_id FROM customers WHERE customer_id = ?').get(customerId);
  const segment = db.prepare('SELECT network_segment FROM addresses WHERE address_id = ?').get(customer.address_id);
  const area = db.prepare('SELECT * FROM area_status WHERE network_segment = ?').get(segment.network_segment);
  const contract = db.prepare('SELECT * FROM contracts WHERE customer_id = ? AND end_date IS NULL').get(customerId);
  // Other connections on the same street cable whose latest measurement is offline:
  // tells "only this customer" apart from "the whole street".
  const { offlineNeighbours } = db.prepare(`
    SELECT COUNT(*) AS offlineNeighbours
    FROM modems mo
    JOIN customers c ON c.customer_id = mo.customer_id
    JOIN addresses a ON a.address_id = c.address_id
    JOIN modem_measurements mm ON mm.modem_id = mo.modem_id
    WHERE a.network_segment = ? AND mo.modem_id <> ? AND mm.status = 'offline'
      AND mm.measured_at = (SELECT MAX(measured_at) FROM modem_measurements WHERE modem_id = mo.modem_id)`)
    .get(segment.network_segment, modem.modem_id);
  return {
    offlineNeighbours,
    checkedAt: now,
    modem,
    firmwareLatest: world.latestFirmware,
    measurement,
    measurementAgeMinutes: measurement ? minutesAgo(measurement.measured_at) : null,
    restart,
    area,
    contract,
  };
}
