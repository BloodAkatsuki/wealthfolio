# 03 – Asset-Swap: Design

## Leitidee

Keine neue Tabelle, kein neuer Aktivitätstyp. Ein Swap ist ein **Paar
bestehender Aktivitätstypen**, verknüpft über das vorhandene
`source_group_id`, unterschieden durch einen Subtyp. Das entspricht dem
Muster, mit dem Transferpaare und Cash-FX-Konvertierungen heute schon
gepaart werden (`normalize.rs::resolve_transfer_pairs`).

| Modus | Leg „aus“ (A) | Leg „ein“ (B) | Subtyp |
| --- | --- | --- | --- |
| REALIZE | `SELL` | `BUY` | `SWAP` |
| CARRYOVER | `TRANSFER_OUT` | `TRANSFER_IN` | `ASSET_CONVERSION` |

## Modus REALIZE – keine Engine-Änderung

Beispiel: 10 SOL (davon 0,01 Gas) → 9,2 JitoSOL, SOL-Kurs 150 USD.

`amount` ist bei Trades der **finale Cash-Betrag** nach Gebühren (SELL:
Menge × Preis − Gebühr, BUY: Menge × Preis + Gebühr; siehe
`mark_trade_amount_confidence` in `activities_service.rs`).

| Leg | Typ | Menge | unit_price | fee | amount (final) |
| --- | --- | --- | --- | --- | --- |
| A | SELL | 10 | 150 | 1,50 | 1498,50 |
| B | BUY | 9,2 | 1498,50 / 9,2 = 162,8804… | 0 | 1498,50 |

Cash: +1498,50 − 1498,50 = 0 (R3.6). SELL und BUY sind bestehende
Engine-Pfade → R3.4, R3.5, R3.7 ohne Engine-Code. R3.8: Beide Legs sind
interne Trades, keine externen Flows.

Der Service berechnet `amount_B = amount_A` in `Decimal` und leitet
`unit_price_B = amount_B / qty_B` ab (`arith::div`). Weil der Writer einen
Betrag innerhalb ½ Minor-Unit durch `Menge × Preis` ersetzt, bleibt ein
Rundungsrest in der Größenordnung der Decimal-Präzision (≈ 10⁻²⁵). Er ist
in keiner Anzeige sichtbar; der Test prüft `|Cash-Saldo| < 10⁻²⁰`, nicht
exakt 0.

## Modus CARRYOVER – Engine-Erweiterung

### `normalize.rs::build_pair`
Neuer Zweig vor den bestehenden Regeln:

```rust
if is_asset_conversion(transfer_in) && is_asset_conversion(transfer_out) {
    // gleiches Konto, verschiedene Assets, beide Mengen > 0
    return Ok(TransferPair { kind: PairKind::AssetConversion { ratio }, .. });
}
```

`ratio = qty_in / (qty_out − fee_qty)` mit `arith::div` (Overflow-sicher).
`TransferPair` erhält ein Feld `kind` (`Move` | `FxConversion` |
`AssetConversion`); bestehende Felder bleiben. Ungleiche Subtypen in einer
Gruppe → bestehende Diagnose `InvalidTransferGroup`.

### `project.rs` (Transfer-Out/-In)
Heute: TRANSFER_OUT legt die konsumierten Lots im Pair-Cache unter der
Gruppen-ID ab; TRANSFER_IN bucht sie (`add_transferred_lots`, ~1641) und
entfernt den Cache-Eintrag.

Erweiterung nur für `AssetConversion`:
1. Out-Leg konsumiert `qty_out` von A, inklusive `fee_qty`. Für den
   Gebührenanteil entsteht **kein** Disposal: seine Basis wird kapitalisiert
   (R3.10, R3.11). Die gesamte konsumierte Basis inkl. Gebührenanteil geht in
   den Cache.
2. In-Leg bucht die gecachten Lots auf Asset **B** statt A: Menge je Lot ×
   `ratio`, Kostenbasis unverändert, `acquisition_date` unverändert, Basis
   des Gebührenanteils proportional auf die B-Lots verteilt.
3. Währungsprüfung: Positionswährung A ≠ B → Diagnose, Pair ungültig (R3.12).

Die Regel „was ist eine Asset-Conversion“ gehört laut AGENTS.md in
`crates/core` und wird der Engine als Fakt geliefert
(`coordinator/facts.rs`), analog `contract_multiplier`. Die Engine liest nur
den Pair-Kind.

### Invarianten (Property-Tests, wie bestehende Engine-Proptests)
- I-C1: Σ Kostenbasis (A vorher) = Σ Kostenbasis (B nachher) + 0 Disposal.
- I-C2: Menge B nachher = `qty_in` (exakt, Rundungsrest im letzten Lot).
- I-C3: Net Contribution und Cash unverändert.
- I-C4: Kaufdaten der B-Lots ⊆ Kaufdaten der konsumierten A-Lots.

## Konstanten / Modell (`crates/core/src/activities`)
- `ACTIVITY_SUBTYPE_SWAP`, `ACTIVITY_SUBTYPE_ASSET_CONVERSION` in
  `activities_constants.rs`.
- `canonicalize_subtype` (`activities_model.rs`): SWAP und ASSET_CONVERSION
  auf die kanonische Schreibweise abbilden. Unbekannte Subtypen werden heute
  nicht verworfen, sondern unverändert durchgereicht – nur ohne
  Normalisierung von Groß-/Kleinschreibung.
- Gebührenmenge (CARRYOVER) in `metadata.swap.fee_quantity` des Out-Legs;
  Marktwert-Herkunft in `metadata.swap.valuation_source` (`MANUAL`|`QUOTE`).

## Service (`activities_service.rs`)
- `save_swap(SwapRequest) -> SwapResponse` (umgesetzt): validiert R3.2,
  erzeugt beide Legs mit gemeinsamer `source_group_id` in **einer**
  Transaktion über `bulk_mutate_activities` (R3.3). Mit `source_group_id`
  ersetzt es einen bestehenden Swap; der Bulk-Pfad löscht vor dem Anlegen.
- Löschen: kein eigener Pfad nötig – das Repository löscht beim Löschen einer
  Aktivität alle Aktivitäten derselben Gruppe mit (R3.15 bereits erfüllt).
- Bestehende `load_internal_transfer_pair_for_activity` (~1819) wird für
  ASSET_CONVERSION erweitert.

## Health-Check (R3.16)
Neue Regel im bestehenden Health-Service: Gruppen mit Swap-Subtyp, deren
Struktur nicht passt.

## Import (R3.17)
`link_imported_transfer_pairs` (~6568) um Swap-Subtypen erweitern; für
REALIZE zusätzlich BUY/SELL-Paare mit gleichem Gruppenwert verknüpfen.

## Frontend
- Neuer Eintrag „Tausch“ im Aktivitäts-Dialog (Desktop + Mobile-Form),
  Formular mit react-hook-form/Zod: Asset A/B (bestehende Symbolsuche),
  Mengen, Modus-Umschalter mit Erklärungstext, Gebühr, Marktwert (vorbelegt
  aus Kurs am Datum, editierbar).
- Aktivitätsliste: Swap-Paar als eine Zeile mit „A → B“.
- Adapter + Commands (Tauri/Axum) für `create_swap`, `update_swap`,
  `delete_swap`; Paritätstest.

## Architecture impact

Geändert (mit Begründung):
- Engine-Pairing: neuer Pair-Kind `AssetConversion`. Notwendig, weil das
  bestehende Pairing gleiche Assets erzwingt und es keinen anderen Weg gibt,
  Lots mit Kaufdatum auf ein anderes Asset zu übertragen.
- Ownership: Klassifikation in core, Engine erhält Fakt.

Unverändert: Netzwerk, Provider, Persistenzschema (keine Migration), Events,
Sync/Async, Vorrang von User-Edits, bestehende Transfer- und FX-Pair-Semantik
(Regressionstests decken das ab).

## Verworfene Alternativen
- **Neuer Aktivitätstyp `SWAP` mit zweitem Asset-Feld**: Migration,
  Änderungen in allen Readern, Sync, Exporten, Broker-Mapping. Viel größerer
  Blast-Radius bei gleichem Ergebnis.
- **Compiler-Expansion aus einer Zeile (wie DRIP)**: Zweites Asset müsste in
  `metadata` stehen und überall dort aufgelöst werden, wo Assets referenziert
  werden (Holdings, Sync, Health). Zwei echte Legs sind für alle Leser
  transparent.
- **CARRYOVER als SPLIT + Umbenennung**: Splits ändern kein Asset.

## Risiken
- Engine-Änderung an zentralem Pfad → Proptests + vollständige Engine-
  Testsuite Pflicht.
- Device-Sync: Paar-Legs werden einzeln synchronisiert; Zwischenzustand mit
  nur einem Leg muss die Engine als „ungepaart → Diagnose“ verkraften (tut
  sie heute für Transfers bereits).
