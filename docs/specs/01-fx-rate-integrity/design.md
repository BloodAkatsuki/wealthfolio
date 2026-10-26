# 01 – FX-Kurs-Integrität: Design

## Betroffene Stellen

| Datei                                                                                                                              | Änderung                                                                                                                                                                                                                                            | Req        |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `crates/core/src/fx/fx_service.rs` (`add_exchange_rate`, ~187)                                                                     | Guard `rate > 0` für `DATA_SOURCE_MANUAL` vor `create_fx_asset` (kein FX-Asset-Leichnam bei Fehler)                                                                                                                                                 | R1.1       |
| `crates/core/src/fx/fx_errors.rs`                                                                                                  | neue Variante `FxError::InvalidRate(String)` + `Display`                                                                                                                                                                                            | R1.1       |
| `crates/core/src/fx/fx_service.rs:89` (`load_latest_exchange_rate`)                                                                | Kurse `<= 0` (direkt und invers) werden vor der Division als „nicht vorhanden“ verworfen → `RateNotFound`                                                                                                                                           | R1.3       |
| `crates/core/src/fx/currency_converter.rs:~45`                                                                                     | Raten `<= 0` komplett überspringen (heute nur Inverse)                                                                                                                                                                                              | R1.6       |
| `crates/storage-sqlite/src/fx/repository.rs` (`get_all_historical_exchange_rates`, `get_exchange_rate`, `get_exchange_rate_by_id`) | gemeinsame Hilfsfunktion `parse_fx_quote(&QuoteDB) -> Option<(Decimal, DateTime<Utc>)>`; `None` → `log::warn!` + skip. `get_exchange_rates` (Liste) und die aufruferlosen `get_latest_currency_rates`/`get_all_currency_quotes` bleiben unverändert | R1.4, R1.5 |
| `crates/storage-sqlite/src/portfolio/valuation/model.rs`, `snapshot/model.rs`                                                      | Hilfsfunktion `parse_decimal_or_zero(field, row_id, raw)` mit Warn-Log                                                                                                                                                                              | R1.7       |
| Frontend                                                                                                                           | keine Änderung – R1.2 ist bereits erfüllt                                                                                                                                                                                                           | R1.2       |

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

Zusätzlich behandelt `load_latest_exchange_rate` im Service einen Kurs `<= 0`
aus dem Repository wie „nicht vorhanden“ – für direkten und inversen Kurs.

Die Lookups geben für einen übersprungenen Quote `None` bzw. lassen ihn aus der
Liste – identisch zu „kein Kurs vorhanden“. Aufrufer behandeln diesen Fall
bereits (`RateNotFound`).

Logs enthalten Asset-ID und Feldname, **nie** den Wert (AGENTS.md: keine
Finanzdaten loggen).

## Architecture impact

Unverändert: Netzwerkaufrufe, Provider-Einstellungen, sync/async-Ausführung,
Events, Persistenzschema, Retry-Verhalten, Vorrang von User-Edits. Geändert:
Fehlerverhalten – ein Kurs ≤ 0 ist nun „nicht vorhanden“ statt „0“; manuelle
Eingabe ≤ 0 wird abgelehnt (vorher gespeichert).

## Verworfene Alternativen

- **Panik abfangen (`catch_unwind`)**: kaschiert die Ursache.
- **CHECK-Constraint in SQLite**: erfordert Tabellen-Neuaufbau-Migration und
  bricht bestehende DBs mit 0-Werten (verletzt R1.8).
- **0-Kurse beim Start löschen**: Datenveränderung ohne Nutzerzustimmung.

## Risiken

- Nutzer mit bewusst gespeichertem 0-Kurs (unwahrscheinlich, fachlich sinnlos)
  sehen danach „Kurs fehlt“ statt Wert 0 → gewünscht, im Changelog nennen.
