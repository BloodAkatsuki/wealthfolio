# 02 – Realisierte Gewinne & Haltedauer: Tasks

- [ ] **T0 – Q1 klären** (R2.3)
  - Engine-Test: Konto A kauft 10, gepaarter Transfer 10 nach B, B verkauft 4.
    Prüfen, welche `LotDisposal`-Einträge entstehen und mit welchem
    `realized_pnl`. Ergebnis in `requirements.md` eintragen, Filter im Design
    finalisieren.
- [ ] **T1 – Storage-Query** (R2.1, R2.2)
  - Test (`CONNECT_API_URL=http://test.local`): zwei Lots, drei Disposals
    (31.12., 1.1., 15.6.) → Abfrage für Jahr X liefert genau die zwei im Jahr,
    jeweils mit `open_date` und Aktivitätstyp.
  - Impl `get_realized_disposal_rows`.
- [ ] **T2 – Report-Service** (R2.3–R2.6, R2.8)
  - Tests: Summen exakt (`dec!`), Bucketing an der Grenze (Tag 365 vs. 366),
    Transfer-Ausschluss, übertragenes Lot behält Kaufdatum, unparsebares Datum →
    `holding_days: None` + Diagnose.
- [ ] **T3 – Offene Lots** (R2.7)
  - Test Mapping: `acquisition_date` + Schwellwert → `threshold_reached_on`;
    Schwellwert 0 → `None`.
- [ ] **T4 – Settings-Key** (R2.6) inkl. Default 365.
- [ ] **T5 – Wiring Tauri + Axum + Web-Adapter** (R2.10)
  - Paritätstest erweitern; Handler-Test für Axum.
- [ ] **T6 – UI Report-Seite + CSV** (R2.1, R2.4, R2.9)
  - Vitest: CSV enthält ungerundete Strings; Summenanzeige aus Backend-Werten.
  - Manuell mit `?dir=rtl` prüfen.
- [ ] **T7 – UI Lots-Spalten** (R2.7)
- [ ] **T8 – i18n** alle Locales, `pnpm --filter frontend i18n:check`.

## Verifikation

```bash
cargo test --locked -p wealthfolio-portfolio-engine disposal
CONNECT_API_URL=http://test.local cargo test --locked -p wealthfolio-storage-sqlite lots
cargo test --locked -p wealthfolio-core realized
cargo clippy --locked -p wealthfolio-core -p wealthfolio-storage-sqlite --all-targets --all-features -- -D warnings
cargo check --locked -p wealthfolio-app -p wealthfolio-server
pnpm --filter frontend exec vitest run src/adapters/adapter-command-parity.test.ts
pnpm --filter frontend exec vitest run src/pages/reports
pnpm --filter frontend i18n:check && pnpm type-check
pnpm build && pnpm build:tauri
```
