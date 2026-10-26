# 01 – FX-Kurs-Integrität: Tasks

Jede Task: zuerst Test schreiben, der heute fehlschlägt, dann Fix.

- [x] **T1 – Backend-Validierung** (R1.1)
  - Test `fx_service` Tests: `add_exchange_rate` mit `rate = 0` und `-1`
    (MANUAL) → `Err(InvalidRate)`; Repository-Mock verifiziert, dass weder
    `create_fx_asset` noch `save_exchange_rate` aufgerufen wurden.
  - Test: Nicht-MANUAL-Quelle mit Platzhalter-Rate bleibt erlaubt.
  - Fix: `FxError::InvalidRate`, Guard.
- [x] **T2 – Panik bei Inversion** (R1.3)
  - Test: Repository-Mock liefert für `to/from` `None`, für die Inverse Rate `0`
    → `get_latest_exchange_rate(from, to)` gibt `Err`, kein Panic.
  - Fix: `checked_div` + Positivitätsprüfung.
- [x] **T3 – Converter** (R1.6)
  - Test: `CurrencyConverter::new` mit Vorwärtsrate 0 → `convert` liefert Fehler
    „kein Kurs“ statt Ergebnis 0.
- [x] **T4 – Repository-Parsing** (R1.4, R1.5, R1.8)
  - Test (`storage-sqlite`, mit `CONNECT_API_URL=http://test.local`): Quote mit
    `close = "abc"`, `close = "0"`, `timestamp = "kaputt"` einfügen →
    `get_all_historical_exchange_rates()`, `get_exchange_rate()` und
    `get_exchange_rate_by_id()` liefern sie nicht; App-Start (Migrationen)
    läuft.
  - Fix: `parse_fx_quote`, die drei Lookups darauf umstellen.
- [ ] **T5 – Warn-Logs Modelle** (R1.7) – _zurückgestellt_: reines Logging über
      ~20 Felder, nicht nötig für den Bugfix; separat mit Maintainer abstimmen.
  - Test: `parse_decimal_or_zero("cost_basis", "id1", "x")` → `0`; Log-Ausgabe
    enthält `id1` und `cost_basis`, nicht `x`.
- [x] **T6 – Frontend** (R1.2) – entfällt, bereits erfüllt.

## Verifikation

```bash
cargo test --locked -p wealthfolio-core fx
CONNECT_API_URL=http://test.local cargo test --locked -p wealthfolio-storage-sqlite fx
cargo clippy --locked -p wealthfolio-core -p wealthfolio-storage-sqlite --all-targets --all-features -- -D warnings
cargo fmt --all -- --check
cargo check --locked -p wealthfolio-app -p wealthfolio-server
```
