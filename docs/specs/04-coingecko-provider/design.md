# 04 – CoinGecko-Kursanbieter: Design

## Bausteine (alles vorhanden, wird wiederverwendet)

| Bedarf                        | Bestehender Mechanismus                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Provider-Schnittstelle        | `MarketDataProvider` (`crates/market-data/src/provider/traits.rs`)                                             |
| Fähigkeiten/Limits            | `ProviderCapabilities`, `RateLimit` (`capabilities.rs`)                                                        |
| HTTP mit TLS-Policy           | `wealthfolio_http::client_builder()` (wie Finnhub, `finnhub/mod.rs:167`); CI-Workflow `http-client-policy.yml` |
| Provider-Registry & Opt-in    | Tabelle `market_data_providers` (`enabled`), Factory in `crates/core/src/quotes/client.rs:~240-330`            |
| API-Key                       | `SecretStore` über `provider_id` (wie Finnhub, `client.rs:304`)                                                |
| Asset → Provider-ID           | `provider_config.overrides` → `ProviderOverrides` (`client.rs:455`)                                            |
| Bevorzugter Provider je Asset | `provider_config.preferred_provider`                                                                           |

## Neue Teile

### `crates/market-data/src/provider/coingecko/mod.rs`

- `CoinGeckoProvider { client, api_key: Option<String>, tier: Free|Demo|Pro }`.
- `id() = "COINGECKO"`, `capabilities`: `instrument_kinds: &[Crypto]`,
  `supports_latest`, `supports_historical`, `supports_search = true`,
  `supports_profile = true` (Name, Logo), keine Dividenden/Splits.
- `rate_limit()`: konservative Werte je Tier (Werte nach Q1 festlegen).
- Basis-URL je Tier (öffentlich vs. Pro-Host); Key im Header, nie in der URL
  (verhindert Key in Proxy-/Server-Logs).
- Endpunkte (gegen aktuelle Doku zu verifizieren, Q1):
  - Suche: `/search?query=`
  - Contract: `/coins/{platform}/contract/{address}`
  - Aktuell: `/simple/price?ids=&vs_currencies=`
  - Historie: `/coins/{id}/market_chart/range?vs_currency=&from=&to=` →
    Tagesschluss = letzter Punkt je UTC-Tag.
- Parsing (R4.10): Das Workspace-`serde_json` hat weder `arbitrary_precision`
  noch `raw_value`; Zahlen würden als `f64` gelesen. Lösung ohne
  Präzisionsverlust: `raw_value` im Crate `wealthfolio-market-data` aktivieren
  (`serde_json = { version = "1", features = ["raw_value"] }`) und Preise als
  `Box<RawValue>` → `Decimal::from_str(raw.get())` parsen. Feature-Unification
  aktiviert `raw_value` dann workspaceweit; das ist additiv und ändert kein
  bestehendes Verhalten (im PR begründen).
- `429`: bestehendes `MarketDataError::RateLimited { provider }` zurückgeben;
  die vorhandene Circuit-Breaker-/Sync-Logik übernimmt das Backoff (R4.11).
  `Retry-After` wird geloggt, aber nicht ausgewertet – die Variante zu erweitern
  wäre eine Änderung an allen Providern und ist nicht nötig.

### Asset-Zuordnung (R4.7)

CoinGecko-ID wird als Override gespeichert:

```json
{
  "preferred_provider": "COINGECKO",
  "overrides": { "COINGECKO": { "symbol": "jito-staked-sol" } }
}
```

Format an `ProviderOverrides::from_json` anpassen, falls es ein anderes Schema
erwartet (beim Implementieren lesen).

### Core-Registrierung

- Konstante `DATA_SOURCE_COINGECKO` in `crates/core/src/quotes/constants.rs` und
  in der Liste daneben.
- Factory-Zweig in `client.rs`: Key optional – ohne Key Free-Tier, mit Key
  Demo/Pro (Tier aus Key-Präfix oder eigener Einstellung, Q1).
- Ergänzung in `service.rs:~2235` (Liste der Provider mit Spezialbehandlung),
  falls zutreffend.

### Migration (neu, nie bestehende editieren)

`crates/storage-sqlite/migrations/<datum>_coingecko_provider/up.sql`:

```sql
INSERT INTO market_data_providers (id, name, description, url, priority,
  enabled, logo_filename, last_synced_at, last_sync_status, last_sync_error)
VALUES ('COINGECKO', 'CoinGecko', '…', 'https://www.coingecko.com/', 5,
  FALSE, 'coingecko.png', NULL, NULL, NULL);
```

`enabled = FALSE` erfüllt R4.1. Priorität 5 ist frei (belegt: 1–4, 10–13).
`down.sql` löscht die Zeile. Begründung der Migration (AGENTS.md):
Provider-Registry ist datenbankbasiert; ohne Zeile ist der Provider nicht
aktivierbar.

### Frontend

- Logo `coingecko.png` an den bestehenden Ort der Provider-Logos.
- Settings: Provider erscheint automatisch in der Provider-Liste; Key-Feld wie
  bei Finnhub.
- Symbolsuche: Ergebnisse mit Chain/Contract anzeigen (R4.5).
- CSP (`apps/server/src/api.rs:88`) betrifft nur den Browser; Kursabruf läuft im
  Backend → keine CSP-Änderung nötig. Logos über `img-src https:` bereits
  erlaubt.

## Architecture impact

Hinzugefügt: neuer optionaler Netzwerk-Provider (nur nach Opt-in), eine
Migration (Registry-Zeile). Unverändert: bestehende Provider, Auflösungsreihen-
folge für Assets ohne CoinGecko-Override, Sync-Ablauf, Retry/Circuit-Breaker,
Secret-Handling.

Zu testende Invarianten (AGENTS.md):

- deaktivierter Provider erhält keine Requests,
- Fehler von CoinGecko isoliert,
- lokale Auflösung ohne Override bekommt keine neue Netzwerkabhängigkeit.

## Verworfene Alternativen

- **CUSTOM_SCRAPER-Vorlage ausliefern**: keine Contract-Suche, kein
  Rate-Limit-Handling, fragil.
- **CoinMarketCap**: Key zwingend; kann später als zweiter Provider nach
  demselben Muster folgen.
