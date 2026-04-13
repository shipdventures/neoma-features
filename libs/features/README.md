# @neoma/features

> Feature flag gating for NestJS applications

Gate routes and controllers behind feature flags with a single decorator. Disabled or missing flags return HTTP 404 as if the route does not exist (fail-closed).

## Motivation

Feature flags let you ship code to production behind a toggle. Without a framework-level solution, every controller ends up with manual `if (flag)` checks that are easy to forget and hard to audit. `@neoma/features` moves gating into the framework layer so your controllers stay clean.

## The Problem

**Without this package:**

```typescript
@Controller("bank-statements")
export class BankStatementsController {
  @Post("upload")
  async upload(@Body() dto: UploadDto) {
    if (!this.config.get("FEATURE_UPLOAD_BANK_STATEMENT")) {
      throw new NotFoundException()
    }
    // actual logic...
  }
}
```

Every route needs its own guard logic. Miss one and a half-built feature leaks to production.

## The Solution

**With this package:**

```typescript
@Controller("bank-statements")
export class BankStatementsController {
  @Post("upload")
  @Feature("UPLOAD_BANK_STATEMENT")
  async upload(@Body() dto: UploadDto) {
    // Only reachable when UPLOAD_BANK_STATEMENT is true
  }
}
```

The `@Feature` decorator and a global guard handle gating automatically. No boilerplate, no forgotten checks.

## Installation

```bash
npm install @neoma/features
```

### Peer Dependencies

```bash
npm install @nestjs/common @nestjs/core reflect-metadata rxjs
```

## Basic Usage

### 1. Import the Module

**Static configuration:**

```typescript
import { Module } from "@nestjs/common"
import { FeaturesModule } from "@neoma/features"

@Module({
  imports: [
    FeaturesModule.forRoot({
      flags: {
        UPLOAD_BANK_STATEMENT: true,
        NEW_DASHBOARD: false,
      },
    }),
  ],
})
export class AppModule {}
```

**Async configuration via DI:**

```typescript
import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { FeaturesModule } from "@neoma/features"

@Module({
  imports: [
    FeaturesModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        flags: {
          UPLOAD_BANK_STATEMENT: config.get("FEATURE_UPLOAD") === "true",
          NEW_DASHBOARD: config.get("FEATURE_DASHBOARD") === "true",
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

The module registers globally by default so you only need to import it once in your root module.

### 2. Decorate Routes

```typescript
import { Controller, Get, Post, Body } from "@nestjs/common"
import { Feature } from "@neoma/features"

@Controller("bank-statements")
export class BankStatementsController {
  @Post("upload")
  @Feature("UPLOAD_BANK_STATEMENT")
  async upload(@Body() dto: UploadDto) {
    // Only reachable when UPLOAD_BANK_STATEMENT is true
    // Returns 404 when the flag is false or missing
  }

  @Get()
  async list() {
    // No @Feature -- always accessible
  }
}
```

### 3. Gate an Entire Controller

Apply `@Feature` at the class level to gate all routes on a controller:

```typescript
import { Controller, Get } from "@nestjs/common"
import { Feature } from "@neoma/features"

@Controller("dashboard")
@Feature("NEW_DASHBOARD")
export class DashboardController {
  @Get()
  index() {
    // Gated behind NEW_DASHBOARD
  }

  @Get("stats")
  @Feature("DASHBOARD_STATS")
  stats() {
    // Handler-level @Feature overrides the controller-level flag.
    // This route checks DASHBOARD_STATS, not NEW_DASHBOARD.
  }
}
```

When both the controller and a handler have `@Feature`, the handler-level flag takes priority (most specific wins).

## How It Works

- A global `APP_GUARD` reads `@Feature` metadata from the handler and controller.
- Handler-level metadata is checked first; if absent, controller-level metadata is used.
- The flag name is looked up in the `flags` record provided via `forRoot` or `forRootAsync`.
- If the flag is `true`, the request proceeds normally.
- If the flag is `false` or absent from the record, the guard throws `NotFoundException` (HTTP 404).
- Routes without any `@Feature` decorator are always accessible.

### Fail-Closed Semantics

A flag that is not present in the `flags` record is treated as disabled. This means you must explicitly set a flag to `true` to enable a route. This prevents accidentally exposing routes when a flag name is misspelled or forgotten.

## API Reference

### `FeaturesModule`

NestJS module that registers the feature guard globally.

| Method | Description |
|--------|-------------|
| `FeaturesModule.forRoot(options)` | Static configuration with a flags record |
| `FeaturesModule.forRootAsync(options)` | Async configuration via factory, class, or existing provider |

### `FeaturesModuleOptions`

```typescript
interface FeaturesModuleOptions {
  /** A record of feature flag names to their enabled/disabled state. */
  flags: Record<string, boolean>
}
```

### `@Feature(flag: string)`

Decorator that marks a controller or route handler as gated behind a feature flag. Can be applied to both classes and methods.

```typescript
// On a method
@Feature("MY_FLAG")
@Get()
myRoute() {}

// On a controller
@Feature("MY_FLAG")
@Controller("my")
class MyController {}
```

## License

MIT

## Links

- [GitHub repository](https://github.com/shipdventures/neoma-features)
- [Issue tracker](https://github.com/shipdventures/neoma-features/issues)

## Part of the Neoma Ecosystem

This package is part of the Neoma ecosystem of Laravel-inspired NestJS packages:

- [@neoma/config](https://github.com/shipdventures/neoma-config) - Type-safe environment configuration
- [@neoma/logger](https://github.com/shipdventures/neoma-logger) - Request and application logging
- [@neoma/exception-handling](https://github.com/shipdventures/neoma-exception-handling) - Global exception handling
- **@neoma/features** - Feature flag gating (you are here)
- More coming soon...
