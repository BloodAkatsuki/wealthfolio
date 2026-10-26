# 04 – CoinGecko-Kursanbieter: Tasks

- [ ] **T0 – Q1/Q2 klären**: Endpunkte, Limits, Historientiefe, Header-Namen,
      Nutzungsbedingungen aus offizieller Doku; Ergebnis in `design.md`.
- [ ] **T1 – Parser mit Fixtures** (R4.8–R4.10)
  - Aufgezeichnete JSON-Antworten (Suche, Contract, simple/price,
    market_chart/range) als Test-Fixtures, keine Live-Calls in Tests.
  - Tests: Preis `0.000000012345678901` bleibt exakt; `0`/negativ/`null`
    verworfen; Tagesschluss = letzter Punkt je UTC-Tag; fehlende Tage bleiben
    Lücke.
- [ ] **T2 – Provider-Struct + Trait** (R4.8, R4.11, R4.12)
  - Tests mit lokalem HTTP-Mock: Key im Header, nicht in URL; 429 →
    `RateLimited { provider: "COINGECKO" }`; Historie in korrekte Blöcke
    zerlegt.
- [ ] **T3 – Suche + Contract-Auflösung** (R4.5, R4.6)
  - Tests: `0x…` → Plattform-Abfrage; Base58 (32–44 Zeichen) → Solana; sonst
    Textsuche.
- [ ] **T4 – Core-Registrierung + Override** (R4.3, R4.7)
  - Test: Asset mit Override nutzt CoinGecko-ID; ohne Override unverändertes
    Verhalten.
- [ ] **T5 – Migration** (R4.1)
  - Test: Migrationen laufen auf leerer und auf bestehender Test-DB; `COINGECKO`
    existiert mit `enabled = 0`.
- [ ] **T6 – Invarianten-Tests** (R4.2, R4.13)
  - Deaktiviert → HTTP-Mock zählt 0 Requests über kompletten Sync.
  - CoinGecko-Fehler → andere Provider-Quotes werden gespeichert.
- [ ] **T7 – Frontend**: Logo, Suchanzeige, i18n alle Locales.

## Verifikation

```bash
cargo test --locked -p wealthfolio-market-data coingecko
cargo test --locked -p wealthfolio-core quotes
CONNECT_API_URL=http://test.local cargo test --locked -p wealthfolio-storage-sqlite migrations
cargo clippy --locked -p wealthfolio-market-data -p wealthfolio-core --all-targets --all-features -- -D warnings
cargo check --locked -p wealthfolio-app -p wealthfolio-server
pnpm --filter frontend i18n:check && pnpm type-check
```
