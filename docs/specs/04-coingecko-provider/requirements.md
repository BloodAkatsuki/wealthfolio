# 04 – CoinGecko-Kursanbieter: Anforderungen

## Problem

Krypto-Kurse kommen heute über Yahoo/Finnhub (Ticker-basiert) oder über einen
selbst konfigurierten `CUSTOM_SCRAPER` (`quotes/client.rs:991`). Viele Tokens –
Liquid-Staking-Tokens (JitoSOL, mSOL, stETH), Long-Tail-Tokens, LP-Tokens –
fehlen bei Yahoo oder sind mehrdeutig (gleicher Ticker, verschiedene Chains).
Ohne lückenlose Kurse sind Bewertung und Performance falsch; bei
Liquid-Staking-Tokens steckt die gesamte Staking-Rendite im Kurs.

## User Stories

- **US-1** Als Krypto-Anleger möchte ich Tokens über CoinGecko finden – nach
  Name, Symbol oder Contract-Adresse – und eindeutig zuordnen.
- **US-2** Ich möchte aktuelle und historische Tageskurse automatisch
  erhalten.
- **US-3** Ich möchte CoinGecko ohne API-Key nutzen können und optional einen
  Key hinterlegen.
- **US-4** Ich möchte, dass ohne meine Zustimmung keine Anfragen an CoinGecko
  gehen.

## Akzeptanzkriterien

### Aktivierung & Datenschutz
- **R4.1** Der Provider SOLL standardmäßig **deaktiviert** sein und erst nach
  Aktivierung in den Einstellungen Anfragen senden (Opt-in, wie Finnhub).
- **R4.2** WENN der Provider deaktiviert ist, DANN SOLL er keine einzige
  Netzwerkanfrage erhalten (Testpflicht laut AGENTS.md).
- **R4.3** Ein optionaler API-Key (Demo oder Pro) SOLL über den bestehenden
  `SecretStore` gespeichert werden; nie in Logs, Settings-JSON oder
  localStorage.
- **R4.4** Anfragen SOLLEN nur Token-IDs und Datumsbereiche enthalten, keine
  Mengen oder Portfoliodaten.

### Suche & Zuordnung
- **R4.5** Die Symbolsuche SOLL CoinGecko-Treffer mit Name, Symbol,
  CoinGecko-ID und – falls vorhanden – Chain + Contract-Adresse anzeigen.
- **R4.6** WENN der Nutzer eine Contract-Adresse (EVM `0x…` oder Solana
  Base58) eingibt, DANN SOLL das System den Token über die Plattform-Abfrage
  auflösen.
- **R4.7** Die gewählte CoinGecko-ID SOLL je Asset gespeichert werden und
  Vorrang vor Ticker-Heuristiken haben.

### Kurse
- **R4.8** Der Provider SOLL den aktuellen Kurs und historische Tageskurse
  (Schlusskurs UTC) in der Kurswährung des Assets liefern.
- **R4.9** Kurse ≤ 0 oder nicht parsebar SOLLEN verworfen werden (konsistent
  mit Spec 01 und `quotes/import.rs:494`).
- **R4.10** Preise SOLLEN ohne Float-Zwischenschritt als `Decimal`
  übernommen werden (JSON-Zahl als String parsen).

### Limits & Robustheit
- **R4.11** Der Provider SOLL die Rate-Limits über `RateLimit` deklarieren
  (ohne Key konservativ, mit Key höher) und HTTP 429 als
  `MarketDataError::RateLimited` melden; das Backoff übernimmt die bestehende
  Sync-Logik, kein eigener Retry-Mechanismus.
- **R4.12** Historische Abfragen SOLLEN in Blöcke zerlegt werden, die das
  Limit der Free-API einhalten; fehlende Tage SOLLEN als Lücke bleiben, nicht
  interpoliert werden.
- **R4.13** Fehler des Providers SOLLEN isoliert bleiben: Andere Provider und
  andere Assets werden weiter synchronisiert.

## Außerhalb des Scopes
- Intraday-Kurse, OHLC-Kerzen über Tagesbasis hinaus.
- Marktkapitalisierung/Profil-Daten über Name und Logo hinaus.
- Automatische Umstellung bestehender Krypto-Assets auf CoinGecko.

## Offene Fragen
- **Q1** Aktuelle Limits und Historientiefe der CoinGecko Free/Demo-API vor
  Umsetzung gegen die offizielle Doku prüfen (ändern sich regelmäßig).
- **Q2** Nutzungsbedingungen: Ist die Nutzung in einer Desktop-App ohne
  Key/Attribution zulässig? Ggf. Attribution in der UI (R-Ergänzung).
