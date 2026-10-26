# 03 – Asset-Swap (Krypto-Tausch): Anforderungen

## Problem

Ein Tausch Asset A → Asset B im selben Konto (z. B. SOL → JitoSOL,
ETH → WETH, Token-Migration) ist nicht abbildbar:

- Jede Aktivität hat genau ein Asset (`activities_model.rs:153`).
- Es gibt keinen Tausch-Typ/-Subtyp (`activities_constants.rs`).
- Transferpaare im selben Konto sind nur als Cash-FX-Konvertierung erlaubt;
  Wertpapier-Legs müssen dasselbe Asset haben
  (`portfolio-engine/src/normalize.rs:750-775`).
- Workaround SELL + BUY: zwei unverknüpfte Buchungen, Cash-Umweg,
  Gas-Gebühr im Token nicht abbildbar, kein Modus ohne Gewinnrealisierung.

## Begriffe

- **Realisierender Swap**: A wird zum Marktwert veräußert, B zum selben Wert
  angeschafft. Gewinn/Verlust auf A wird realisiert, B startet mit neuem
  Kaufdatum.
- **Basis-übertragender Swap (Conversion)**: Kostenbasis und Kaufdaten der
  Lots von A gehen auf B über; nichts wird realisiert.

Welcher Modus fachlich/steuerlich richtig ist, entscheidet der Nutzer; die App
erzwingt keinen.

## User Stories

- **US-1** Als Krypto-Anleger möchte ich einen Tausch als **eine** Aktion
  erfassen (gebe X von A, erhalte Y von B), statt zwei Buchungen manuell zu
  pflegen.
- **US-2** Ich möchte wählen, ob der Tausch Gewinne realisiert oder die
  Kostenbasis überträgt.
- **US-3** Ich möchte eine Netzwerkgebühr im abgegebenen Token erfassen,
  damit mein Bestand mit der Wallet übereinstimmt.
- **US-4** Bearbeite oder lösche ich den Tausch, soll das immer beide Seiten
  betreffen.

## Akzeptanzkriterien

### Erfassung
- **R3.1** Das System SOLL eine Swap-Aktion mit: Konto, Datum, Asset A, Menge
  A (abgegeben, inkl. Gebühr), Asset B, Menge B (erhalten), Modus
  (`REALIZE` | `CARRYOVER`), optional Gebührenmenge in A, Marktwert
  (Pflicht bei `REALIZE`) annehmen.
- **R3.2** WENN A = B oder Mengen ≤ 0 oder Gebührenmenge ≥ Menge A, DANN SOLL
  die Erfassung abgelehnt werden.
- **R3.3** Beide Seiten SOLLEN atomar gespeichert werden (beide oder keine).

### Modus REALIZE
- **R3.4** Das System SOLL A um Menge A reduzieren und den G/V auf A mit der
  Kostenbasis-Methode des Kontos realisieren.
- **R3.5** Das System SOLL B um Menge B mit Kostenbasis = Marktwert des
  getauschten Anteils (ohne Gebühr) und Kaufdatum = Swap-Datum anlegen.
- **R3.6** Der Cash-Saldo des Kontos SOLL sich durch den Swap nicht ändern.
- **R3.7** Die Gebühr (Gebührenmenge × Marktpreis A) SOLL als Gebühr des
  Veräußerungs-Legs verbucht werden.
- **R3.8** Der Swap SOLL keine externe Ein-/Auszahlung sein (Net Contribution
  und TWR-Flows unverändert).

### Modus CARRYOVER
- **R3.9** Das System SOLL die konsumierten Lots von A (nach Kostenbasis-
  Methode) entfernen und als Lots von B mit **unveränderter** Kostenbasis und
  **unverändertem** Kaufdatum anlegen; Menge je Lot × (Menge B / (Menge A −
  Gebühr)).
- **R3.10** Es SOLL kein G/V realisiert und kein Disposal geschrieben werden
  (außer für die Gebühr, siehe R3.11).
- **R3.11** Die Gebührenmenge SOLL als Abgang von A ohne Erlös verbucht werden;
  ihre Kostenbasis erhöht die Kostenbasis der B-Lots (kapitalisierte Gebühr,
  analog Transfer-Fees in `project.rs`).
- **R3.12** WENN A und B unterschiedliche Kurswährungen haben, DANN SOLL v1 den
  Modus CARRYOVER ablehnen (Begründung: Basisumrechnung undefiniert).
- **R3.13** WENN nicht genug Bestand von A vorhanden ist (und das Konto keine
  negativen Lots erlaubt), DANN SOLL die Engine den Swap wie andere ungültige
  Ereignisse diagnostizieren und nicht teilweise buchen.

### Pflege
- **R3.14** Bearbeiten eines Legs SOLL den Swap-Dialog mit beiden Seiten öffnen.
- **R3.15** Löschen eines Legs SOLL beide Legs löschen (nach Bestätigung).
- **R3.16** WENN eine Swap-Gruppe inkonsistent ist (≠ 2 Legs, abweichende
  Konten, falsche Typen), DANN SOLL ein Health-Check-Hinweis erscheinen.

### Import
- **R3.17** Der CSV-Import SOLL zwei Zeilen mit gleichem Gruppenwert und
  Subtyp `SWAP`/`ASSET_CONVERSION` zu einem Swap verknüpfen (Wiederverwendung
  der vorhandenen Transfer-Verknüpfung beim Import).

### Plattformen
- **R3.18** Desktop und Web identisch; Formular RTL-tauglich; alle Locales.

## Außerhalb des Scopes (v1)
- Gebühr in einem dritten Token.
- Ein Swap mit mehreren Ausgangs-/Ziel-Assets (LP-Einlagen).
- Konto-übergreifende Swaps (Bridge mit Wechsel des Kontos) – möglich als
  späterer Ausbau von CARRYOVER.
- Automatische Swap-Erkennung aus Wallet-Daten (Spec 06).
