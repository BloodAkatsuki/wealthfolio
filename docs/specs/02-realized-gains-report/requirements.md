# 02 – Realisierte Gewinne & Haltedauer: Anforderungen

## Problem

Die Engine erzeugt pro Verkauf deterministische Disposal-Slices
(`lot_disposals`: Menge, Erlös, Kostenbasis, realisierter G/V, jeweils auch in
Basiswährung) und persistiert sie. Es gibt eine Abfrage nach Zeitraum
(`LotRepositoryTrait::get_lot_disposals_for_accounts_in_date_range`), aber
keinen API-Endpunkt und keine Oberfläche. Nutzer sehen realisierte Gewinne nur
aggregiert pro Asset, nicht pro Jahr und nicht pro Lot; die Haltedauer offener
Lots ist nirgends sichtbar.

## User Stories

- **US-1** Als Anleger möchte ich alle Veräußerungen eines Kalenderjahres mit
  Kaufdatum, Verkaufsdatum, Haltedauer, Erlös, Kostenbasis und Gewinn sehen.
- **US-2** Als Anleger möchte ich für offene Lots sehen, wie lange ich sie halte
  und ab wann eine von mir gewählte Haltedauer erreicht ist.
- **US-3** Als Anleger möchte ich den Report als CSV exportieren, um ihn
  weiterzuverarbeiten.

## Akzeptanzkriterien

### Report realisierter Gewinne

- **R2.1** WENN der Nutzer einen Zeitraum (Standard: aktuelles Kalenderjahr) und
  optional Konten wählt, DANN SOLL das System alle Disposal-Slices mit
  `disposal_date` im Zeitraum liefern.
- **R2.2** Jede Zeile SOLL enthalten: Asset, Konto, Kaufdatum des Lots,
  Veräußerungsdatum, Haltedauer in Tagen, Menge, Erlös, Kostenbasis,
  realisierter G/V – in Positionswährung und Basiswährung – sowie die
  Kostenbasis-Methode.
- **R2.3** Das System SOLL nur realisierende Ereignisse aufnehmen. Interne
  Transfers zwischen eigenen Konten SOLLEN NICHT als Veräußerung erscheinen.
- **R2.4** Das System SOLL Summen liefern: Erlös, Kostenbasis, G/V gesamt sowie
  getrennt nach Gewinnen und Verlusten, und getrennt nach Haltedauer ≤ / >
  Schwellwert (R2.6).
- **R2.5** Werte SOLLEN exakt aus den gespeicherten Decimal-Strings stammen;
  Summen werden im Backend mit `Decimal` gebildet, nicht im Frontend.

### Haltedauer

- **R2.6** Der Nutzer SOLL einen Haltedauer-Schwellwert in Tagen einstellen
  können (Standard: 365, deaktivierbar). Das System macht keine Aussage über
  steuerliche Folgen; der Wert ist rein informativ.
- **R2.7** Für jedes offene Lot SOLL das System Kaufdatum, Haltedauer in Tagen
  und – bei aktivem Schwellwert – das Datum anzeigen, an dem er erreicht ist.
- **R2.8** WENN ein Lot per Transfer verschoben wurde, DANN SOLL das
  ursprüngliche Kaufdatum gelten (die Engine erhält es bereits).

### Export

- **R2.9** Der Nutzer SOLL den Report als CSV exportieren können (UTF-8,
  Decimal-Werte ungerundet als String, ISO-Datumsformat).

### Plattformen

- **R2.10** Die Funktion SOLL in Desktop (Tauri) und Web (Axum) identisch
  verfügbar sein und RTL-tauglich sein.

## Außerhalb des Scopes

- Länderspezifische Steuerlogik, Freigrenzen, Steuerformulare.
- Spezifische Lot-Auswahl beim Verkauf.
- Neuberechnung mit anderer Kostenbasis-Methode als der des Kontos.

## Offene Fragen

- **Q1** Welche Engine-Ereignisse erzeugen heute Disposals? Laut `state.rs:279`
  „sold/transferred/expired“. Zu klären, ob gepaarte interne Transfers Disposals
  schreiben (dann Filter nötig, R2.3) oder nicht.
- **Q2** Option-Expiry und Short-Cover: im Report als realisierend anzeigen?
  Vorschlag: ja, mit Ereignistyp-Spalte.
