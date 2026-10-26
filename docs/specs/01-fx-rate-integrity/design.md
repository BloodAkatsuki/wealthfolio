# 01 – FX-Kurs-Integrität: Design

## Betroffene Stellen

| Datei | Änderung | Req |
| --- | --- | --- |
| `crates/core/src/fx/fx_service.rs` (`add_exchange_rate`, ~187) | Guard `rate > 0` für `DATA_SOURCE_MANUAL` vor `create_fx_asset` (kein FX-Asset-Leichnam bei Fehler) | R1.1 |
| `crates/core/src/fx/fx_errors.rs` | neue Variante `FxError::InvalidRate(String)` + `Display` | R1.1 |
| `crates/core/src/fx/fx_service.rs:89` (`load_latest_exchange_rate`) | `Decimal::ONE.checked_div(rate)` mit `rate > 0`, sonst `RateNotFound` | R1.3 |
| `crates/core/src/fx/currency_converter.rs:~45` | Raten `<= 0` komplett überspringen (heute nur Inverse) | R1.6 |
| `crates/storage-sqlite/src/fx/repository.rs:88,136,190,222,251` | gemeinsame Hilfsfunktion `parse_fx_quote(&QuoteDB) -> Option<(Decimal, DateTime<Utc>)>`; `None` → `log::warn!` + skip | R1.4, R1.5 |
| `crates/storage-sqlite/src/portfolio/valuation/model.rs`, `snapshot/model.rs` | Hilfsfunktion `parse_decimal_or_zero(field, row_id, raw)` mit Warn-Log | R1.7 |
| `apps/frontend/src/pages/settings/general/exchange-rates/add-exchange-rate-form.tsx:68` | `.min(0)` → `.positive()`, neuer Key `settings:fx_err_rate_positive` | R1.2 |
| `apps/frontend/src/i18n/locales/*/settings.json` | Key in allen 11 Locales | R1.2 |

## Verhalten

```rust
// fx_service.rs
if rate.source == DATA_SOURCE_MANUAL && new_rate.rate <= Decimal::ZERO {
    return Err(FxError::InvalidRate(format!(
        "{}/{} rate must be positive", new_rate.from_currency, new_rate.to_currency
    )).into());
}
```

Die Prüfung steht **vor** `create_fx_asset`, damit ein abgelehnter Kurs kein
FX-Asset anlegt.

`get_exchange_rates` und `get_latest_exchange_rate*` geben für einen
übersprungenen Quote `None` bzw. lassen ihn aus der Liste – identisch zu „kein
Kurs vorhanden“. Aufrufer behandeln diesen Fall bereits (`RateNotFound`).

Logs enthalten Asset-ID und Feldname, **nie** den Wert (AGENTS.md: keine
Finanzdaten loggen).

## Architecture impact

Unverändert: Netzwerkaufrufe, Provider-Einstellungen, sync/async-Ausführung,
Events, Persistenzschema, Retry-Verhalten, Vorrang von User-Edits.
Geändert: Fehlerverhalten – ein Kurs ≤ 0 ist nun „nicht vorhanden“ statt „0“;
manuelle Eingabe ≤ 0 wird abgelehnt (vorher gespeichert).

## Verworfene Alternativen

- **Panik abfangen (`catch_unwind`)**: kaschiert die Ursache.
- **CHECK-Constraint in SQLite**: erfordert Tabellen-Neuaufbau-Migration und
  bricht bestehende DBs mit 0-Werten (verletzt R1.8).
- **0-Kurse beim Start löschen**: Datenveränderung ohne Nutzerzustimmung.

## Risiken

- Nutzer mit bewusst gespeichertem 0-Kurs (unwahrscheinlich, fachlich sinnlos)
  sehen danach „Kurs fehlt“ statt Wert 0 → gewünscht, im Changelog nennen.
