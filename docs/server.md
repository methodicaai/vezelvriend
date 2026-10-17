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

## Veiligheid

- De systemen kunnen alleen lezen; een herstart zet alle data terug.
- Het SQL-scherm heeft een tijdslimiet, een rijlimiet en een rem op het aantal verzoeken per bezoeker (nginx `limit_req`).
- De systemen vragen zoekmachines ze niet te indexeren (`X-Robots-Tag: noindex`).
- Containers draaien alleen-lezen en met een geheugenlimiet.
- Er zijn geen geheimen nodig: geen `.env`, geen sleutels.
