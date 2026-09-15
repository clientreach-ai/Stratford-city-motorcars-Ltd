# Stratford City Motorcars

Website for Stratford City Motorcars Ltd, a small
family-owned business trading in sports and luxury cars at 21–25 Romford Road,
Stratford, London E15 4LJ.

| Document | For |
| --- | --- |
| [apps/web/README.md](apps/web/README.md) | Running, configuring and deploying the app |
| [docs/STRATFORD_ARCHITECTURE.md](docs/STRATFORD_ARCHITECTURE.md) | How inventory, media, enquiries and SEO work |
| [docs/STRATFORD_BUILD_STATUS.md](docs/STRATFORD_BUILD_STATUS.md) | What is done, what the client must confirm, external setup, launch blockers, test results |
| [docs/STRATFORD_MIGRATION_AUDIT.md](docs/STRATFORD_MIGRATION_AUDIT.md) | Client intake and legacy-site audit behind the content decisions |
| [apps/web/PHOTOGRAPHY.md](apps/web/PHOTOGRAPHY.md) | Photographing and uploading stock |

## Repository

```text
apps/
  web/        Next.js 16 — public site, media delivery, enquiries
  server/     Hono — Better-T-Stack template API; not used by the site
packages/
  db/         Drizzle schema and migrations (vehicle, lead, auth tables)
  auth/       Better-T-Stack template auth config (used only by apps/server)
  env/        Typed environment validation
  ui/         Design tokens and shared primitives
  config/     Shared TypeScript configuration
```

pnpm workspaces with Turborepo. Node 22.18+ (the inventory check uses built-in
TypeScript stripping; developed on Node 26), pnpm 11,
Bun for the maintenance scripts.

## Common commands

```bash
pnpm install
pnpm dev:web                                        # http://localhost:3001
pnpm build
pnpm check-types
pnpm --filter web check-content
pnpm --filter web check-inventory
pnpm --filter @Stratford-city-motorcars-Ltd/db db:migrate
```

The staff dashboard has been removed and is to be rebuilt; see
[docs/STRATFORD_BUILD_STATUS.md](docs/STRATFORD_BUILD_STATUS.md).

See [apps/web/README.md](apps/web/README.md) for environment variables and the
full setup.
