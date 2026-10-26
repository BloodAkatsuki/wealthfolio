# 05 – Supply-Chain-Härtung: Design

## Bestand (gezählt über alle Workflows)

| Action | Vorkommen | In Release/Publish |
| --- | --- | --- |
| `actions/checkout@v4` | 23 | ja |
| `actions/setup-node@v4` | 11 | ja |
| `dtolnay/rust-toolchain@stable` | 10 | ja |
| `pnpm/action-setup@v4` | 9 | ja |
| `Swatinem/rust-cache@v2` / `swatinem/…` | 15 | ja |
| `actions/upload-artifact@v4` | 6 | ja |
| `docker/login-action@v3` | 5 | ja |
| `docker/setup-buildx-action@v3`, `metadata-action@v5`, `build-push-action@v5` | 7 | ja |
| `tauri-apps/tauri-action@v0` | 2 | **ja, mit Signing-Keys** |
| `softprops/action-gh-release@v2` | 1 | ja |
| `actions/setup-java@v4` | 1 | Android |

## Änderungen

1. **Pinning (R5.1)**: Alle Referenzen auf SHA umstellen, z. B. mit
   `pinact run` oder `ratchet pin`, manuell gegenprüfen. Gemischte
   Schreibweise `Swatinem`/`swatinem` vereinheitlichen.
   `dtolnay/rust-toolchain@stable` → SHA-Pin des Repos; die Toolchain-Version
   bestimmt weiterhin `rust-toolchain.toml` (1.98.1), daher kein
   Verhaltenswechsel.
2. **Check (R5.2)**: neuer Job in `pr-check.yml` mit `zizmor` (prüft
   Unpinned-Uses, Template-Injection, übermäßige Permissions) oder einem
   einfachen `grep -E 'uses: [^.].*@(v[0-9]|main|master|stable)'`-Gate.
   Empfehlung: `zizmor`, weil es zusätzlich R5.3 prüft.
3. **Release-Permissions (R5.3)**: `release.yml` hat `permissions` bereits auf
   Job-Ebene (Z. 11, 229) – prüfen, dass `contents: write` nur im
   Upload-Job steht; `rust-cache` in Release-Jobs mit `save-if: false` und
   Lookup nur auf `main`-Caches (Cache-Poisoning über PR-Caches).
4. **cargo-deny (R5.4, R5.9)**: `deny.toml` im Root; Job nutzt
   `EmbarkStudios/cargo-deny-action` (SHA-gepinnt). `sources`: nur
   crates.io + explizit erlaubte Git-Quellen aus `Cargo.lock`.
5. **pnpm audit (R5.5)**: Job im bestehenden JS-Teil von `pr-check.yml`.
6. **Wöchentlich (R5.6)**: neuer Workflow `security-audit.yml`
   (`schedule` + `workflow_dispatch`), `permissions: contents: read`.
7. **Dependabot (R5.7, R5.8)**: `.github/dependabot.yml` mit Ökosystemen
   `github-actions`, `cargo`, `npm`, `docker`; Gruppierung, damit es keine
   PR-Flut gibt.
8. **Docker (R5.8)**: `FROM alpine:<aktuelle unterstützte Version>@sha256:…`.
   Das Laufzeit-Image installiert keine Pakete und enthält ein statisches
   musl-Binary → Upgrade ohne Funktionsrisiko; Smoke-Test via
   `docker run … /usr/local/bin/wealthfolio-server --help` bzw. `/healthz`.

## Architecture impact
Nur CI/Build. Keine Änderung an App-Code, Laufzeitverhalten, Daten.

## Risiken
- `cargo deny` meldet beim ersten Lauf vermutlich bestehende Advisories →
  R5.9, einzeln dokumentiert.
- SHA-Pins veralten → durch Dependabot (R5.7) abgedeckt.
