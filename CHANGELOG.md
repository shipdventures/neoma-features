# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed
- **BREAKING:** `FeatureResolver` now receives the express `Request` directly instead of a NestJS `ExecutionContext`. Migration: `(ctx) => { const req = ctx.switchToHttp().getRequest(); ... }` becomes `(req) => { ... }`.
- `express` is now a non-optional peer dependency (mirroring `@neoma/logging`). Fastify-only apps cannot install `@neoma/features` at this signature.

### Removed
- Resolver access to WebSocket / RPC execution contexts. The resolver contract is HTTP-only by design; non-HTTP transports are foreclosed at this signature.

## [0.2.0] - 2026-04-17

### Added
- `FeaturesModule` options now accept an optional `resolve(ctx)` function for per-request feature decisions. Admit rule is pure OR with static `flags`: `flags[name] === true || (await resolve(ctx))?.[name] === true`. Sync and async resolvers both supported.
- `FeaturesModule.forRootAsync` now supports DI-injected services in `useFactory`, enabling per-request resolvers backed by application services (e.g. a user service).
- Public `FeatureResolver` type exported for consumers annotating factory return shapes.

### Changed
- `FeaturesModuleOptions.flags` is now optional. All existing `forRoot({ flags: ... })` callers continue to type-check and behave identically.

## [0.1.0] - 2026-04-13

### Added
- `FeaturesModule.forRoot({ flags: { ... } })` and `forRootAsync` for registering feature flags via `ConfigurableModuleBuilder`
- `@Feature("FLAG_NAME")` decorator to gate route handlers and controllers behind a feature flag
- Internal `FeatureGuard` registered globally via `APP_GUARD` — routes with a disabled or missing flag return HTTP 404
- Handler-level `@Feature` overrides controller-level `@Feature` (most specific wins)
- Fail-closed semantics — a flag key absent from the record is treated as disabled

[Unreleased]: https://github.com/shipdventures/neoma-features/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/shipdventures/neoma-features/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/shipdventures/neoma-features/releases/tag/v0.1.0
