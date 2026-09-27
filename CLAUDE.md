# AquaGuard — Engineering Rules

## Product and architecture
- AquaGuard manages water-pollution reports, water-quality observations, review workflows, and public follow-up. Do not describe it as a household water-consumption product unless that scope is explicitly implemented.
- Keep domain logic, persistence, and route handling separate. A route handler should authenticate, authorize, validate input, call a service, and return a typed response.
- Use one canonical persistence model for reports and workflow state. Avoid in-memory state for data that must survive serverless restarts.
- Use the Firebase Admin SDK only in server-only modules for privileged Firestore access. Never expose Admin credentials or import Admin modules into client components.
- Treat Firestore Security Rules as a second boundary for Firebase client access; Admin SDK calls bypass those rules and must enforce equivalent authorization in server code.

## Code quality
- Keep TypeScript strict and use explicit domain and API types. Avoid `any`, unsafe type assertions, and silent success-shaped fallbacks.
- Validate all external data at runtime, including request bodies, JWT claims, and Firestore documents.
- Keep public registration self-service-only: the server always assigns the `halk` role. Privileged roles may only be assigned by an authorized administrator.
- Use shared session and role authorization helpers in API route handlers. Client-side visibility checks are not authorization.
- Return appropriate `401` for missing or invalid sessions and `403` for authenticated users without permission. Do not leak secrets or personal data in logs or error responses.
- Keep changes focused, update directly related documentation, and run the smallest applicable lint, typecheck, and test commands.

## Next.js and repository conventions
- This repository uses Next.js 16 App Router. Follow the installed `node_modules/next/dist/docs/` guides; use `proxy.ts` for the request interception convention rather than adding a second middleware entry point.
- Keep server-only code out of client components and follow existing import aliases, formatting, and Turkish user-facing copy.
