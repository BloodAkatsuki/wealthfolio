# 06 – Wallet-Import: Anforderungen

Status: **Nur Anforderungen.** Design erst nach Abschluss von 03 (Swap) und 04
(CoinGecko), weil der Import ohne Swap-Typ und Token-Auflösung über
Contract-Adresse die Hälfte der Transaktionen nicht abbilden könnte.

## Problem

Self-Custody-Wallets (Solana, EVM) müssen komplett manuell erfasst werden.

## User Stories

- **US-1** Als Nutzer möchte ich eine öffentliche Wallet-Adresse einem Konto
  zuordnen und Transaktionen schreibgeschützt importieren.
- **US-2** Ich möchte vor dem Speichern prüfen, wie jede Transaktion eingeordnet
  wurde, und es korrigieren können.
- **US-3** Ich möchte, dass meine Wallet-Adressen und Daten nur an die von mir
  gewählten Dienste gehen.

## Akzeptanzkriterien

### Datenschutz & Sicherheit

- **R6.1** Die Funktion SOLL opt-in sein; ohne Aktivierung keine Anfragen.
- **R6.2** Das System SOLL nur öffentliche Adressen annehmen und niemals
  Seed-Phrasen oder Private Keys abfragen oder speichern. Eingaben, die wie
  Seed/Private Key aussehen, SOLLEN abgewiesen werden.
- **R6.3** API-Keys von Indexern (z. B. Helius, Etherscan) SOLLEN im
  `SecretStore` liegen.
- **R6.4** Der Nutzer SOLL den Indexer pro Chain wählen können, inklusive
  eigenem RPC-/Indexer-Endpunkt.

### Import

- **R6.5** Das System SOLL Transaktionen seit einem wählbaren Datum abrufen und
  inkrementell fortsetzen (nur neue Transaktionen).
- **R6.6** Jede Transaktion SOLL auf bestehende Typen abgebildet werden:
  Eingang/Ausgang (TRANSFER_IN/OUT), Tausch (Spec 03), Staking-Reward
  (INTEREST/STAKING_REWARD), Gebühr (in Token, Spec 03).
- **R6.7** Nicht eindeutig klassifizierbare Transaktionen SOLLEN mit
  `needs_review = true` importiert werden – nie verworfen, nie geraten.
- **R6.8** Transaktionen zwischen zwei eigenen, importierten Wallets SOLLEN als
  internes Transferpaar verknüpft werden.
- **R6.9** Der Import SOLL idempotent sein (`idempotency_key` aus Chain +
  Signatur/Hash + Log-Index).
- **R6.10** Vom Nutzer bearbeitete Aktivitäten SOLLEN bei erneutem Import nicht
  überschrieben werden (`is_user_modified`, bestehende Regel).

### Abgleich

- **R6.11** Das System SOLL nach dem Import den berechneten Bestand je Token mit
  dem On-Chain-Saldo vergleichen und Abweichungen anzeigen (Grundlage für
  Rebasing-Tokens wie stETH).

## Offene Fragen

- Welche Indexer erlauben Nutzung ohne Key / mit Free-Tier, und unter welchen
  Bedingungen?
- Abbildung von LP-Ein-/Auszahlungen (außerhalb v1 von Spec 03).
- Spam-Token-Airdrops: automatisch ausblenden oder als Review markieren?
