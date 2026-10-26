# 05 – Supply-Chain-Härtung: Tasks

- [x] **T1 – Alpine-Upgrade + Digest** (R5.8) – `alpine:3.24.3@sha256:be26…`.
  - Verifikation: `docker build .` und Container-Start, `GET /api/v1/healthz`
    → 200. **Noch offen** (im Entwicklungscontainer nicht ausgeführt).
- [x] **T2 – SHA-Pinning aller Actions** (R5.1) – 90 Referenzen, jeweils auf den
      Commit, auf den der bisherige Tag zeigte (kein Versionssprung).
  - Verifikation: Grep auf ungepinnte `uses:` liefert nichts ✓; Testlauf
    `pr-check` grün – **noch offen** (läuft erst im PR).
- [ ] **T3 – zizmor-Job** (R5.2, R5.3); Findings beheben oder begründet
      unterdrücken.
- [ ] **T4 – Release-Cache-Härtung** (R5.3).
- [ ] **T5 – `deny.toml` + cargo-deny-Job** (R5.4, R5.9)
  - Erst lokal `cargo deny check` ausführen, bestehende Findings einzeln
    eintragen.
- [ ] **T6 – pnpm-audit-Job** (R5.5).
- [ ] **T7 – `security-audit.yml` wöchentlich** (R5.6).
- [ ] **T8 – `.github/dependabot.yml`** (R5.7).
- [ ] **T9 – `docs/ci-checks.md` ergänzen**.

Reihenfolge: T1 und T2 als eigener, kleiner PR zuerst (höchster Nutzen, kein
Diskussionsbedarf), T3–T9 als zweiter PR.
