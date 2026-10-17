// The decision tree the service desk uses when a customer says "my internet
// doesn't work". Documented for participants in docs/decision-tree.md.
//
// Working rule behind it: a technician only goes out when the modem
// demonstrably does not work. A technician costs money and half a day of the
// customer's time, so every cheaper explanation is ruled out first.
//
// This module only decides; it is not shown in the screens. The Klantbeeld
// deliberately leaves the reasoning to the employee (and their prompt).
import { world } from './world.js';

export const OUTCOMES = {
  LINK_TO_AREA_TICKET: 'Geen monteur. Koppel het gesprek aan het bestaande storingsticket.',
  NEW_MEASUREMENT_FIRST: 'Eerst een nieuwe meting doen. De laatste meting is te oud om op te beslissen.',
  CUSTOMER_EQUIPMENT: 'Geen monteur. Waarschijnlijk ligt het aan de wifi of de router van de klant.',
  REMOTE_RESTART_FIRST: 'Eerst het modem op afstand herstarten. Daarna pas een monteur.',
  SEND_TECHNICIAN: 'Monteur inplannen. Het modem werkt aantoonbaar niet.',
  ESCALATE_NETWORK_MANAGEMENT: `Escaleren naar ${world.networkManagementContact}. Het past niet in de beslisboom.`,
};

/**
 * Turns the data behind "Modem controleren" into the facts the tree needs.
 * Kept separate from decide() so testers can feed decide() edge cases directly.
 */
export function factsFromCheck(check) {
  const m = check.measurement;
  const restart = check.restart;
  return {
    areaOutage: check.area?.status === 'storing',
    measurementAgeMinutes: check.measurementAgeMinutes,
    status: m?.status ?? null,
    sessionActive: m?.session === 'actief',
    speedRatio: m && check.contract ? m.download_mbps / check.contract.download_mbps : 0,
    offlineNeighbours: check.offlineNeighbours ?? 0,
    // A restart only counts when it happened before the latest measurement:
    // only then does the measurement show the result of the restart.
    restartFailedBeforeMeasurement: Boolean(restart && m && restart.result === 'mislukt' && restart.requested_at <= m.measured_at),
  };
}

/** Walks the tree top to bottom and returns the key of the first outcome that applies. */
export function decide(facts) {
  // 1. A known outage in the area explains it; a technician cannot fix the street cable.
  if (facts.areaOutage) return 'LINK_TO_AREA_TICKET';

  // 2. An old measurement says nothing about now. "Older than 15 minutes" means
  //    strictly more than the limit: exactly 15 minutes is still fresh enough.
  if (facts.measurementAgeMinutes === null || facts.measurementAgeMinutes > world.measurementMaxAgeMinutes) {
    return 'NEW_MEASUREMENT_FIRST';
  }

  // 3. Online, with a session and normal speed: the connection up to the modem works.
  if (facts.status === 'online' && facts.sessionActive && facts.speedRatio >= world.normalSpeedRatio) {
    return 'CUSTOMER_EQUIPMENT';
  }

  // 4. Offline at this customer only: restart remotely first, technician only if that failed.
  if (facts.status === 'offline' && facts.offlineNeighbours === 0) {
    return facts.restartFailedBeforeMeasurement ? 'SEND_TECHNICIAN' : 'REMOTE_RESTART_FIRST';
  }

  // 5. Everything else (unstable, slow, several neighbours down without a known outage).
  return 'ESCALATE_NETWORK_MANAGEMENT';
}
