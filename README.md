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
npm install @nestjs/common @nestjs/core reflect-metadata rxjs express
```

`@neoma/features` requires `express` as a peer dependency — the per-request resolver receives the express `Request`. Fastify is not supported at this signature.

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

### 4. Compute Flags Per Request

Static `flags` are the same for every request. For flags that vary per user, tenant, or request context, provide a `resolve` function. The guard invokes it on every gated request and unions the result with the static `flags` map.

```typescript
FeaturesModule.forRoot({
  flags: { CHECKOUT_V2: true },
  resolve: (req) => req.user?.features ?? {},
})
```

Resolvers can be async and can pull from any service via `forRootAsync`:

```typescript
FeaturesModule.forRootAsync({
  imports: [UsersModule],
  inject: [UserService],
  useFactory: (users: UserService) => ({
    flags: { CHECKOUT_V2: true },
    resolve: async (req) => users.featuresFor(req.user.id),
  }),
})
```

**Union semantics.** A request is admitted for `@Feature(name)` when:

```
flags[name] === true || (await resolve(req))[name] === true
```

**Static wins.** A resolver returning `{ name: false }` does NOT override a static `flags[name] === true`. Use static flags for hard on/off; use the resolver to grant additional access per request.

**When to use which.** Reach for static `flags` when a feature is on or off for everyone (env-driven rollout, kill switch). Reach for `resolve` when availability depends on the request itself (user entitlements, tenant plans, A/B cohort).

### 5. Customising the Deny Response

By default, a denied request returns `HTTP 404` via `NotFoundException`. For some routes — webhook receivers in particular — a 404 is the wrong signal, because most providers (Resend, Svix, Stripe) retry indefinitely on 404. Supply an `onDeny` factory on the decorator to control what is thrown on the deny path:

```typescript
import { Controller, ForbiddenException, Post, Req } from "@nestjs/common"
import { Feature } from "@neoma/features"

@Controller("webhooks")
export class WebhooksController {
  @Post("resend")
  @Feature("RESEND_WEBHOOK", {
    onDeny: (req) =>
      new ForbiddenException({
        message: "Webhook receiver disabled",
        requestId: req.headers["svix-id"],
      }),
  })
  async resend() {
    // Handle the webhook
  }
}
```

The factory receives the live express `Request` — the same one the resolver would see — so you can read headers, `req.user`, or anything else bound to the current request.

**Admit path is untouched.** `onDeny` is only invoked when the guard denies. A request admitted by either the static `flags` or the `resolve` function never calls `onDeny`.

**Handler-level `@Feature` fully overrides class-level.** When a handler re-declares `@Feature` without options, the class-level `onDeny` is discarded — the handler falls back to the default `NotFoundException`. There is no field-level inheritance; each `@Feature` stands on its own.

**Return type is `unknown`.** You may return any value — `HttpException` subclasses are formatted by Nest's default exception filter. If you return a plain `Error` or an arbitrary object, it is your responsibility to install an `ExceptionFilter` that handles it.

## How It Works

- A global `APP_GUARD` reads `@Feature` metadata from the handler and controller.
- Handler-level metadata is checked first; if absent, controller-level metadata is used.
- The flag name is looked up in the static `flags` record and, if provided, in the result of `resolve(req)`. The request is admitted when either source yields `=== true`.
- If neither source yields `true`, the guard throws `NotFoundException` (HTTP 404).
- Routes without any `@Feature` decorator are always accessible — the resolver is not invoked for ungated routes.

### Fail-Closed Semantics

A flag that is not present in the `flags` record — and not returned as `true` by the resolver — is treated as disabled. You must explicitly set a flag to `true` (statically or via the resolver) to enable a route. This prevents accidentally exposing routes when a flag name is misspelled or forgotten.

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
  /**
   * Static feature flag map. Missing flags are treated as disabled.
   * Optional — a consumer may configure only `resolve`.
   */
  flags?: Record<string, boolean>

  /**
   * Per-request resolver. Unioned with `flags` under strict `=== true`
   * semantics; a resolver returning `false` does NOT override static `true`.
   */
  resolve?: FeatureResolver
}
```

### `FeatureResolver`

```typescript
type FeatureResolver = (
  req: Request,
) => Record<string, boolean> | Promise<Record<string, boolean>>
```

The `Request` is the express request type (`import type { Request } from "express"`). Import `FeatureResolver` when you need to annotate a `useFactory` return or extract the resolver to its own function:

```typescript
import type { FeatureResolver } from "@neoma/features"

const resolve: FeatureResolver = async (req) => {
  return req.user?.features ?? {}
}
```

### `@Feature(flag: string, options?: FeatureOptions)`

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

// With a custom deny response
@Feature("MY_FLAG", {
  onDeny: (req) => new ForbiddenException("disabled"),
})
@Get()
myWebhook() {}
```

### `FeatureOptions`

```typescript
interface FeatureOptions {
  /**
   * Factory invoked on the deny path to construct the value to throw. When
   * omitted, the guard throws `NotFoundException`.
   */
  onDeny?: FeatureOnDeny
}
```

### `FeatureOnDeny`

```typescript
type FeatureOnDeny = (req: Request) => unknown
```

Invoked only on deny. Receives the live express `Request`. Returns the value to throw — typically an `HttpException` subclass. Plain `Error`s or arbitrary objects require a custom `ExceptionFilter` to format the response.

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
