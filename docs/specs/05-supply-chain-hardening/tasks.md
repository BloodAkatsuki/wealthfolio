# 05 – Supply-Chain-Härtung: Tasks

- [ ] **T1 – Alpine-Upgrade + Digest** (R5.8)
  - Verifikation: `docker build .` und Container-Start, `GET /api/v1/healthz`
    → 200.
- [ ] **T2 – SHA-Pinning aller Actions** (R5.1)
  - Verifikation: `grep -rnE 'uses: [^.][^@]*@[^0-9a-f]' .github/workflows`
    liefert nichts; Testlauf `pr-check` grün.
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

Reihenfolge: T1 und T2 als eigener, kleiner PR zuerst (höchster Nutzen,
kein Diskussionsbedarf), T3–T9 als zweiter PR.
