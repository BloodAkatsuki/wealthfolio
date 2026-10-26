# 01 – FX-Kurs-Integrität: Anforderungen

## Problem

- Manuelle Wechselkurse ≤ 0 werden vom Backend akzeptiert. Das Frontend
  blockiert sie bereits (`refine(rate > 0)` im Formular, `RateCell`), direkte
  API-/Tauri-/Addon-Aufrufe aber nicht.
- `fx_service.rs:89` bildet `Decimal::ONE / rate` ohne Nullprüfung →
  `rust_decimal` panict.
- Das Repository wandelt unparsebare `close`-Werte still in `0` und unparsebare
  Zeitstempel still in `Utc::now()` um. Ein kaputter Kurs wird so zu „0,
  aktuell“.
- Bewertungs- und Snapshot-Modelle wandeln unparsebare Decimals still in `0`.

Folge: Absturz von Tauri-Command/Axum-Handler oder plausibel aussehende, falsche
Werte.

## User Stories

- **US-1** Als Nutzer möchte ich, dass ein ungültiger Wechselkurs abgelehnt
  wird, damit meine Bewertungen nicht still auf 0 fallen.
- **US-2** Als Nutzer möchte ich, dass die App bei beschädigten Kursdaten nicht
  abstürzt, sondern mir das Problem anzeigt.
- **US-3** Als Nutzer möchte ich, dass veraltete Kurse als veraltet erkannt
  werden, auch wenn ihr Zeitstempel beschädigt ist.

## Akzeptanzkriterien

- **R1.1** WENN ein manueller Kurs `rate <= 0` über `add_exchange_rate` oder
  `update_exchange_rate` gespeichert werden soll, DANN SOLL der Service mit
  einem Validierungsfehler antworten und nichts persistieren.
- **R1.2** WENN im Formular „Wechselkurs hinzufügen“ oder in der Tabellenzelle
  ein manueller Kurs `<= 0` eingegeben wird, DANN SOLL die Eingabe abgelehnt
  werden. _Bereits erfüllt_ (`add-exchange-rate-form.tsx` `refine`,
  `rate-cell.tsx`); keine Änderung nötig.
- **R1.3** WENN ein inverser Kurs aus einem gespeicherten Kurs `0` gebildet
  werden müsste, DANN SOLL das System `FxError::RateNotFound` zurückgeben statt
  zu panicken.
- **R1.4** WENN ein gespeicherter FX-Quote einen unparsebaren oder nicht
  positiven `close` hat, DANN SOLLEN die Kurs-Lookups des Repositorys
  (`get_all_historical_exchange_rates`, `get_exchange_rate`,
  `get_exchange_rate_by_id`) diesen Quote überspringen und eine Warnung loggen
  (Quote- und Asset-ID, kein Wert), statt `0` zu liefern. Die Einstellungsliste
  (`get_exchange_rates`) behält ihr Verhalten: dort bedeutet `0` bereits „noch
  kein Kurs“ für Provider-Paare vor dem ersten Sync.
- **R1.5** WENN ein gespeicherter FX-Quote einen unparsebaren Zeitstempel hat,
  DANN SOLL das Repository ihn überspringen und warnen, statt `Utc::now()` zu
  verwenden.
- **R1.6** WENN `CurrencyConverter` mit einem Kurs `<= 0` initialisiert wird,
  DANN SOLL dieser weder vorwärts noch invers gespeichert werden.
- **R1.7** WENN Bewertungs-/Snapshot-Zeilen unparsebare Decimal-Strings
  enthalten, DANN SOLL das System eine Warnung loggen (Zeilen-ID, Feldname, kein
  Wert). Das Rückgabeverhalten (0) bleibt in diesem Spec unverändert (siehe
  „Außerhalb des Scopes“).
- **R1.8** Bestehende Datenbanken mit Kurs `0` SOLLEN weiter starten; betroffene
  Kurse werden durch R1.4/R1.6 ignoriert und über den Health-Check sichtbar.

## Außerhalb des Scopes

- Umstellung der Snapshot-/Bewertungsmodelle von `From` auf `TryFrom` mit
  Fehlerpropagation: verändert Fehlerverhalten vieler Leser; separater Spec,
  sobald R1.7-Logs zeigen, ob das in Praxis auftritt.
- Migration, die bestehende 0-Kurse löscht (Datenveränderung ohne Zustimmung).
