# Draaien op de server

De omgeving draait met dezelfde `docker-compose.yml` als lokaal. Alleen de gateway is gepubliceerd, en alleen op `127.0.0.1`.

## Stappen

1. Haal de code op de server op, bijvoorbeeld in `/root/apps/vezelvriend`.
2. Start: `docker compose up -d --build`.
3. Maak de gateway bereikbaar voor Nginx Proxy Manager. Twee mogelijkheden:
   - **Via het Docker-netwerk van Nginx Proxy Manager (aanbevolen).** Maak een bestand `docker-compose.override.yml` naast `docker-compose.yml`:
     ```yaml
     services:
       gateway:
         networks: [default, proxy]
     networks:
       proxy:
         external: true
         name: <naam van het netwerk van Nginx Proxy Manager>
     ```
     Stel in Nginx Proxy Manager een proxy host in naar `gateway` (de containernaam), poort 80.
   - **Via de host.** Laat de poort op `127.0.0.1:8080` staan en laat Nginx Proxy Manager doorsturen naar het adres van de host. Dat werkt alleen als Nginx Proxy Manager de host kan bereiken.
4. Kies een (sub)domein, zet het DNS-record en vraag in Nginx Proxy Manager een certificaat aan.

Het override-bestand bevat geen geheimen, maar is wel specifiek voor de server; zet het daarom niet in de repository.

## AI-koppeling en trainerscherm

De container `ai` beheert de deelnemerscodes, draait de chat met Claude naast de oefeningen en bewaart wat deelnemers **inleveren** uit hun eigen AI (bijvoorbeeld Copilot op het werk). Alles staat in een SQLite-database op het Docker-volume `ai-data`. Zonder API-sleutel staat de chat uit; inleveren werkt wel, zodra er een trainerwachtwoord is ingesteld.

1. Kopieer `.env.example` naar `.env` in `/root/apps/vezelvriend` en vul in:
   - `ANTHROPIC_API_KEY`: de sleutel uit console.anthropic.com (workspace "Vezelvriend", met bestedingslimiet);
   - `TRAINER_PASSWORD`: wachtwoord voor het trainerscherm;
   - `SESSION_SECRET`: een lange willekeurige reeks (`openssl rand -hex 32`).
2. `docker compose up -d --build ai`.
3. Ga naar `https://vezelvriend.nl/trainer/`, log in, maak een training aan en print de codes. Elke deelnemer logt op een oefenpagina in met een eigen code.

`.env` staat in `.gitignore` en komt nooit in de repository.

**Privacy.** De database bevat namen van deelnemers en alles wat ze verstuurd hebben. Vertel deelnemers dat vooraf (de site meldt het bij het inloggen), zet codes uit na de training, en verwijder trainingen als je ze niet meer nodig hebt (knop onderaan de trainingspagina).

**Klant per deelnemer, aantekeningen en waarschuwingen.** De container `ai` haalt de lijst met oefenklanten op bij het Klantbeeld (`KLANTBEELD_INTERNAL_URL`) en geeft elke deelnemer er willekeurig een (stap 3 en 4). Wat deelnemers in stap 1 opschrijven en plakken, en de waarschuwingen van de chat (IBAN, e-mail, klantnummer en dergelijke), staan in dezelfde database en zijn te zien en te wissen in `/trainer/`.

**Kosten.** Maximaal `AI_MAX_PER_DAY` vragen per deelnemer per dag (standaard 40) en een bestedingslimiet in de Anthropic Console. Het model staat in `AI_CHAT_MODEL` (standaard claude-sonnet-5-5).

## Beveiliging

- Alleen poort 80/443 (Nginx Proxy Manager) en 22 (SSH) staan open. De Vezelvriend-containers publiceren geen poort op de server.
- Containers draaien zonder extra rechten (`no-new-privileges`), de Node-containers als gewone gebruiker zonder Linux-capabilities, en alle containers met een alleen-lezen bestandssysteem en een geheugenlimiet.
- Geen enkele container heeft toegang tot de Docker-socket.
- Inlogpogingen en AI-vragen worden geremd (nginx `limit_req` en een teller per bezoeker).
- De nepsystemen kunnen alleen lezen; een herstart zet hun data terug. Het SQL-scherm heeft een tijdslimiet en een rijlimiet.
- Alles vraagt zoekmachines om niet te indexeren (`X-Robots-Tag: noindex`).
- Het enige geheim is `.env` (API-sleutel, trainerwachtwoord), alleen op de server.
