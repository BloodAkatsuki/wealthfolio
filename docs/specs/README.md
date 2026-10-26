# Specs – Verbesserungen Wealthfolio

Spec-Driven Development: Jede Änderung durchläuft drei Dokumente, in dieser
Reihenfolge, mit einem Review-Gate dazwischen.

1. `requirements.md` – **Was** und **warum**. User Stories und
   Akzeptanzkriterien im EARS-Format (`WENN … DANN SOLL …`). Keine
   Implementierungsdetails.
2. `design.md` – **Wie**. Betroffene Dateien, Datenmodell, Ablauf,
   Architecture-Impact-Notiz (Pflicht laut `AGENTS.md`), verworfene
   Alternativen, Risiken.
3. `tasks.md` – Umsetzungsschritte, jeder mit Test **vor** dem Code
   (Red → Green) und Verifikationsbefehl. Jede Task referenziert die
   Anforderungen, die sie erfüllt.

Regel: Code wird erst geschrieben, wenn `requirements.md` und `design.md`
freigegeben sind. Ändert sich während der Umsetzung das Design, wird zuerst
das Dokument angepasst.

## Übersicht

| #  | Spec                                                     | Typ        | Priorität | Aufwand  | Status           |
| -- | -------------------------------------------------------- | ---------- | --------- | -------- | ---------------- |
| 01 | [FX-Kurs-Integrität](01-fx-rate-integrity/)              | Bugfix     | P0        | S        | Entwurf          |
| 02 | [Realisierte Gewinne & Haltedauer](02-realized-gains-report/) | Feature | P1        | M        | Entwurf          |
| 03 | [Asset-Swap (Krypto-Tausch)](03-asset-swap/)             | Feature    | P1        | M–L      | Entwurf          |
| 04 | [CoinGecko-Kursanbieter](04-coingecko-provider/)         | Feature    | P1        | M        | Entwurf          |
| 05 | [Supply-Chain-Härtung](05-supply-chain-hardening/)       | Security   | P0        | S        | Entwurf          |
| 06 | [Wallet-Import](06-wallet-import/)                       | Feature    | P2        | L        | Nur Anforderungen – blockiert durch 03, 04 |

## Abhängigkeiten

```
01 ──┐
     ├──> 03 (Swap braucht valide Kurse)
04 ──┤
     └──> 06 (Wallet-Import braucht Swap + Token-Kurse)
02  unabhängig (profitiert von 03: Swaps erzeugen Disposals)
05  unabhängig
```

## Vorgehen upstream

Wealthfolio verlangt laut `AGENTS.md` vor Migrationen, neuen Persistenz-
oder Engine-Regeln eine Begründung und Abstimmung. Für 02, 03, 04 daher zuerst
ein GitHub-Issue mit `requirements.md` + `design.md` eröffnen, Feedback
einarbeiten, dann PR aus dem Fork. 01 und 05 sind klein genug für direkte PRs.
Specs sind auf Deutsch; für Issues/PRs upstream ins Englische übersetzen.
