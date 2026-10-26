# 02 – Realisierte Gewinne & Haltedauer: Design

## Grundsatz

Nur Read-Model + Darstellung. Keine neue Berechnung in der Engine, keine
Migration, kein neuer Hintergrundjob. Alles kommt aus den bestehenden Tabellen
`lot_disposals` und `lots`.

## Datenfluss

```
lot_disposals ─┐ JOIN lots ON lot_id → open_date
               ├ JOIN activities ON disposal_activity_id → activity_type (Filter R2.3)
               └ JOIN assets → Anzeige-Symbol
        │
crates/core: RealizedGainsService::report(range, account_ids, threshold)
        │   (Decimal-Summen, Haltedauer = disposal_date − open_date)
        ├── Tauri: apps/tauri/src/commands/… get_realized_gains_report
        └── Axum:  apps/server/src/api/… GET /api/v1/realized-gains
        │
Frontend: adapters/shared/realized-gains.ts → Seite /reports/realized-gains
```

## Backend

### Storage (`crates/storage-sqlite/src/lots.rs`)
Neue Methode im `LotRepositoryTrait`:

```rust
async fn get_realized_disposal_rows(
    &self,
    account_ids: &[String],
    start_inclusive: NaiveDate,
    end_inclusive: NaiveDate,
) -> Result<Vec<RealizedDisposalRow>>;
```

`RealizedDisposalRow` = `LotDisposal` + `open_date: String` +
`disposal_activity_type: String` + `asset_display_code: Option<String>`.
Eine Diesel-Query mit zwei Inner Joins und einem Left Join. Bestehende
Methode `…_in_date_range` hat exklusiven Start; die neue nimmt inklusive
Grenzen, um Off-by-one am 1.1. zu vermeiden.

### Core (`crates/core/src/lots/realized_report.rs`, neu)
- `RealizedGainsReport { rows, totals, totals_by_holding_bucket }`.
- Filter R2.3: Ausschluss von `TRANSFER_OUT`, wenn das Disposal zu einem
  gültigen internen Transferpaar gehört (Entscheidung nach Q1; Zuordnung über
  `TransferPairResolution`, die es schon gibt).
- Haltedauer: `(disposal_date - open_date).num_days()`. Unparsebares Datum →
  Zeile mit `holding_days: None` + Warn-Log (Lot-ID), nicht stilles
  `Utc::now()` (vgl. `lots/mod.rs:349`).
- Summen mit `Decimal`; Strings via `Decimal::from_str`, Fehler → Zeile mit
  Diagnose markieren statt 0 (Lehre aus Spec 01).
- Läuft über `blocking` im Coordinator-Muster, da potenziell ganze Historie
  (AGENTS.md: history-sized reads).

### Offene Lots (R2.7)
`AssetLotView` hat `acquisition_date`. Erweiterung um
`holding_days: Option<i64>` und `threshold_reached_on: Option<String>` im
Mapping (`lots/mod.rs:~346`), Schwellwert aus Settings.

### Settings
Neuer Key `holding_period_threshold_days` (Integer, `0` = aus) in den
bestehenden App-Settings; kein Schema-Wechsel (Key/Value-Tabelle).

### Wiring (beide Runtimes, laut AGENTS.md)
- Tauri-Command registrieren in `apps/tauri/src/lib.rs`.
- Axum-Route in `apps/server/src/api.rs` + Handler.
- Web-Mapping in `apps/frontend/src/adapters/web/core.ts`.
- Paritätstest `adapter-command-parity.test.ts` muss grün sein.

## Frontend
- Seite unter bestehender Navigation „Reports/Insights“ (Ort mit Maintainer
  abstimmen), Route in `routes.tsx`.
- Jahr-Auswahl, Konten-Filter, Tabelle über `@wealthfolio/ui` Data-Grid,
  KPI-Zeile mit Summen, Spalte Haltedauer mit Badge „≥ Schwellwert“.
- CSV-Export clientseitig aus den String-Werten des Backends (keine
  Float-Konvertierung).
- Lots-Tabelle auf Asset-Seite: zwei neue Spalten (R2.7).
- Logische CSS-Klassen, Formatierung über Formatting-Hooks (RTL).
- i18n-Keys in allen 11 Locales.

## Architecture impact

Unverändert: Engine-Logik, Persistenzschema, Events, Netzwerk, Sync/Async der
Engine-Läufe. Hinzugefügt: lesende Query, Service, ein Command/Endpoint je
Runtime, ein Settings-Key. Keine Migration.

## Verworfene Alternativen
- **Berechnung im Frontend aus Activities**: dupliziert Engine-Regeln,
  verletzt „engine owns rules“ und R2.5.
- **Neue Tabelle für Reports**: redundant zu `lot_disposals`.
