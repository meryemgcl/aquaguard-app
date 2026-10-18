# AquaGuard — Engineering Rules

## Product and architecture
- AquaGuard manages water-pollution reports, water-quality observations, review workflows, and public follow-up. Do not describe it as a household water-consumption product unless that scope is implemented.
- SQLite is the sole persistence layer. Access it through server-only repository modules; never import the database or `better-sqlite3` into client components.
- Keep domain logic, persistence, and route handling separate. A route handler should authenticate, authorize, validate input, call a service, and return a typed response.
- Use one canonical persistence model for reports and workflow state. Local SQLite is intended for a single-machine deployment, not serverless or multi-instance hosting.

## Code quality and security
- Keep TypeScript strict and use explicit domain and API types. Avoid `any`, unsafe type assertions, and silent success-shaped fallbacks.
- Validate all external data at runtime, including request bodies, JWT claims, and database values.
- Self-service registration always creates an active `halk` account; privileged roles may only be assigned by an authorized administrator. Requested staff roles remain pending until approval.
- Use shared session and role authorization helpers in API route handlers. Client-side visibility checks are not authorization.
- Return `401` for missing or invalid sessions and `403` for authenticated users without permission. Do not log passwords, tokens, or unnecessary personal data.
- Store passwords only as bcrypt hashes. Keep the JWT secret outside source control and require at least 32 characters.
- Keep changes focused, update directly related documentation, and run the smallest applicable lint, typecheck, and test commands.

## Next.js and repository conventions
- This repository uses Next.js 16 App Router. Follow the installed `node_modules/next/dist/docs/` guides; use `proxy.ts` rather than adding a legacy middleware entry point.
- Keep server-only code out of client components and follow existing import aliases, formatting, and Turkish user-facing copy.
