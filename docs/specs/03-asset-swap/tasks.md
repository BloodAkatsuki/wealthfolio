# 03 – Asset-Swap: Tasks

Vor Beginn: Issue upstream mit `requirements.md` + `design.md`, Freigabe der
Engine-Änderung (CARRYOVER) einholen. REALIZE kann unabhängig davon starten.

## Phase 1 – REALIZE (ohne Engine-Änderung)

- [x] **T1 – Subtyp-Konstanten + Kanonisierung** (R3.1)
  - Test: `canonicalize_subtype_for_activity("BUY", Some("swap"))` →
    `Some("SWAP")`; dito SELL.
- [x] **T2 – `NewSwap` + Validierung** (R3.2)
  - Tests: A = B, Menge 0, Gebühr ≥ Menge A, fehlender Marktwert bei REALIZE →
    Fehler.
- [x] **T3 – Leg-Berechnung REALIZE** (R3.5–R3.7)
  - Test mit Beispiel aus `design.md`: SELL `amount = 1498,50`, BUY
    `amount = 1498,50`; nach dem Writer `|Cash-Saldo| < 10⁻²⁰`; SELL-Disposal
    realisiert G/V.
- [x] **T4 – `create_swap`/`update_swap`/`delete_swap` atomar** (R3.3, R3.14,
      R3.15)
  - Umgesetzt als `save_swap` (Anlegen + atomares Ersetzen über
    `bulk_mutate_activities`, das vor dem Anlegen löscht). Ein eigenes
    `delete_swap` ist unnötig: Das Repository löscht beim Löschen einer
    Aktivität alle mit derselben `source_group_id` mit (R3.15 bereits erfüllt).
    Beim Ersetzen bekommen die neuen Legs eindeutige Idempotency-Keys, sonst
    würde der Duplikat-Check die noch vorhandenen alten Legs treffen.
- [x] **T5 – Wiring Tauri/Axum/Web + Paritätstest** (R3.18) – Wiring erledigt;
      Paritätstest und Tauri-Kompilierung noch nicht ausgeführt (siehe Status).
- [x] **T6 – UI-Formular + Listenanzeige + i18n** (R3.1, R3.18) – Formular
      „Tausch“ (Desktop) mit Live-Anzeige von Tauschwert und Einstand, Typ in
      der Auswahl, Speichern über `save_swap`, Subtyp-Name, 11 Sprachen.
      Bearbeiten eines Swap-Legs zeigt auf Desktop und Mobil einen Hinweis
      (löschen und neu erfassen) statt eines Einzel-Editors. Offen: Erfassen auf
      Mobil, Bearbeiten als Ganzes, Sperre der Inline-Bearbeitung im
      Aktivitäts-Grid.
- [ ] **T7 – Import-Verknüpfung REALIZE** (R3.17)

## Phase 2 – CARRYOVER (Engine)

- [ ] **T8 – Fakt in core** (`coordinator/facts.rs`): Leg ist Asset-Conversion.
- [ ] **T9 – `build_pair` + `PairKind`** (R3.9, R3.12)
  - Tests: gültiges Paar; verschiedene Konten → ungültig; Währungen verschieden
    → Diagnose; bestehende Transfer- und FX-Tests unverändert grün.
- [ ] **T10 – `project.rs` Lot-Übertrag** (R3.9–R3.11, R3.13)
  - Unit-Tests: 2 Lots (verschiedene Kaufdaten) → 2 B-Lots, Basis gleich, Daten
    gleich, Mengen × ratio; Gebühr kapitalisiert; Bestand zu klein → Diagnose,
    nichts gebucht.
  - Proptests I-C1 … I-C4.
- [ ] **T11 – Service/UI/Import für CARRYOVER** freischalten.
- [ ] **T12 – Health-Regel** (R3.16).
- [ ] **T13 – Doku** `docs/activities/activity-types.md` ergänzen.

## Verifikation

```bash
cargo test --locked -p wealthfolio-portfolio-engine
cargo test --locked -p wealthfolio-core activities
CONNECT_API_URL=http://test.local cargo test --locked -p wealthfolio-storage-sqlite
cargo clippy --locked --workspace --all-targets --all-features -- -D warnings
cargo fmt --all -- --check
cargo check --locked -p wealthfolio-app -p wealthfolio-server
pnpm --filter frontend exec vitest run src/adapters/adapter-command-parity.test.ts
pnpm --filter frontend exec vitest run src/pages/activity
pnpm --filter frontend i18n:check && pnpm type-check
pnpm build && pnpm build:tauri
pnpm test:e2e   # Aktivitäts-Flows
```
