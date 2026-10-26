# 05 – Supply-Chain-Härtung: Anforderungen

## Problem

- Release-Jobs (`release.yml`) haben Zugriff auf Apple-Signing-Zertifikate und
  den **Tauri-Updater-Signing-Key**, binden aber Drittanbieter-Actions über
  verschiebbare Tags ein (`tauri-apps/tauri-action@v0`,
  `swatinem/rust-cache@v2`, `softprops/action-gh-release@v2`,
  `dtolnay/rust-toolchain@stable`, `pnpm/action-setup@v4`). Ein
  kompromittiertes Tag kann signierte Updates an alle Nutzer ausliefern.
- Kein automatisiertes Dependency-Audit (Rust oder JS), kein
  Dependabot/Renovate.
- Laufzeit-Image `alpine:3.19` (`Dockerfile:100`) ist End-of-Life und erhält
  keine Sicherheitsupdates.

## Akzeptanzkriterien

- **R5.1** Jede `uses:`-Referenz auf eine Action außerhalb dieses Repos SOLL
  auf einen vollständigen Commit-SHA gepinnt sein, mit Versionskommentar
  (`# v4.2.2`).
- **R5.2** Ein CI-Check SOLL PRs ablehnen, die eine nicht gepinnte
  Drittanbieter-Action einführen.
- **R5.3** Jobs mit Zugriff auf Signing-Secrets SOLLEN `permissions` auf das
  Minimum setzen und keine Caches aus PR-Kontexten wiederherstellen.
- **R5.4** Ein CI-Job SOLL bei PRs, die `Cargo.lock` ändern, `cargo deny check
  advisories licenses sources bans` ausführen und bei neuen Advisories
  fehlschlagen.
- **R5.5** Ein CI-Job SOLL bei PRs, die `pnpm-lock.yaml` ändern,
  `pnpm audit --audit-level high --prod` ausführen.
- **R5.6** Ein wöchentlicher Lauf SOLL R5.4/R5.5 gegen `main` ausführen, um
  neue Advisories für unveränderte Abhängigkeiten zu erkennen.
- **R5.7** Dependabot SOLL für `github-actions` (wöchentlich), `cargo` und
  `npm` (monatlich, gruppiert) konfiguriert sein, damit SHA-Pins aktuell
  bleiben.
- **R5.8** Das Laufzeit-Image SOLL eine unterstützte Alpine-Version nutzen und
  per Digest gepinnt sein; Dependabot `docker` hält es aktuell.
- **R5.9** Bestehende Advisories zum Zeitpunkt der Einführung SOLLEN einzeln in
  `deny.toml` mit Begründung und Ablaufdatum ignoriert werden – kein globales
  Abschalten.

## Außerhalb des Scopes
- SLSA-Provenance/Sigstore-Signaturen für Release-Artefakte (sinnvoller
  Folge-Spec).
- Reproduzierbare Builds.
