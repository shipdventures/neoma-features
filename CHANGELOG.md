# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `FeaturesModule.forRoot({ flags: { ... } })` and `forRootAsync` for registering feature flags via `ConfigurableModuleBuilder`
- `@Feature("FLAG_NAME")` decorator to gate route handlers and controllers behind a feature flag
- Internal `FeatureGuard` registered globally via `APP_GUARD` — routes with a disabled or missing flag return HTTP 404
- Handler-level `@Feature` overrides controller-level `@Feature` (most specific wins)
- Fail-closed semantics — a flag key absent from the record is treated as disabled

[Unreleased]: https://github.com/shipdventures/neoma-features/compare/main...HEAD
