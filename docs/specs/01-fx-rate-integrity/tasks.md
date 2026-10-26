# 01 – FX-Kurs-Integrität: Tasks

Jede Task: zuerst Test schreiben, der heute fehlschlägt, dann Fix.

- [ ] **T1 – Backend-Validierung** (R1.1)
  - Test `fx_service` Tests: `add_exchange_rate` mit `rate = 0` und `-1`
    (MANUAL) → `Err(InvalidRate)`; Repository-Mock verifiziert, dass weder
    `create_fx_asset` noch `save_exchange_rate` aufgerufen wurden.
  - Test: Nicht-MANUAL-Quelle mit Platzhalter-Rate bleibt erlaubt.
  - Fix: `FxError::InvalidRate`, Guard.
- [ ] **T2 – Panik bei Inversion** (R1.3)
  - Test: Repository-Mock liefert für `to/from` `None`, für die Inverse Rate `0`
    → `get_latest_exchange_rate(from, to)` gibt `Err`, kein Panic.
  - Fix: `checked_div` + Positivitätsprüfung.
- [ ] **T3 – Converter** (R1.6)
  - Test: `CurrencyConverter::new` mit Vorwärtsrate 0 → `convert` liefert
    Fehler „kein Kurs“ statt Ergebnis 0.
- [ ] **T4 – Repository-Parsing** (R1.4, R1.5, R1.8)
  - Test (`storage-sqlite`, mit `CONNECT_API_URL=http://test.local`): Quote mit
    `close = "abc"`, `close = "0"`, `timestamp = "kaputt"` einfügen →
    `get_exchange_rates()` enthält sie nicht; App-Start (Migrationen) läuft.
  - Fix: `parse_fx_quote`, alle fünf Stellen darauf umstellen.
- [ ] **T5 – Warn-Logs Modelle** (R1.7)
  - Test: `parse_decimal_or_zero("cost_basis", "id1", "x")` → `0`; Log-Ausgabe
    enthält `id1` und `cost_basis`, nicht `x`.
- [ ] **T6 – Frontend** (R1.2)
  - Vitest für das Schema: `0` und `-1` abgelehnt, `0.0001` akzeptiert.
  - Key `fx_err_rate_positive` in allen Locales; alten Key entfernen, falls
    ungenutzt.

## Verifikation

```bash
cargo test --locked -p wealthfolio-core fx
CONNECT_API_URL=http://test.local cargo test --locked -p wealthfolio-storage-sqlite fx
cargo clippy --locked -p wealthfolio-core -p wealthfolio-storage-sqlite --all-targets --all-features -- -D warnings
cargo fmt --all -- --check
cargo check --locked -p wealthfolio-app -p wealthfolio-server
pnpm --filter frontend exec vitest run src/pages/settings/general/exchange-rates
pnpm --filter frontend i18n:check
pnpm type-check
```
