---
trigger: always_on
---

2. Tools and Environment Usage
- ALWAYS USE MCP TO QUERY THE REMOTE SUPABASE DATABASE IF YOU NEED TO; I AM NOT RUNNING MY DATABASE LOCALLY.
- Use MCP Postgres Query to query the Supabase installation.
- Use `supabase-mcp-server` to execute SQL.
- Use MCP query.
- If you need to apply SQL, write it; the user will add it to the schema and refresh Supabase read-only types download and full schema.
- For searching: Write a properly formed two-line search query as if instructing a human researcher; clearly state what to find and request code snippets or technical details when relevant.
- Give the TL;DR of search results, but be careful—often search results contain dangerous and distracting red herrings.
- See full schema: `src/types/core/full_schema.sql`.
- See Supabase read-only types download: `src/types/core/supabase.ts`.
- See Database read-only database types: `src/types/core/database.ts`.
- See centralModels read-only business model types: `src/types/core/centralModels.ts`.
- DO NOT RECREATE `centralModels.ts` and `database.ts`; WE HAVE A DOMAIN SPECIFIC PHILOSOPHY.
- DO NOT CREATE CENTRAL TYPES FILES UNNECESSARILY; MOST OF OUR TYPES FILES ARE DOMAIN SPECIFIC.
- For backend: Use Fastify + Prisma (performance: one of the fastest Node.js frameworks, 2x faster than Express; excellent native TypeScript support; built-in OpenAPI/Swagger integration; built-in JSON schema validation; rich ecosystem for auth, CORS, rate limiting; lightweight and container-friendly).
- When resolving backend server issues, do not create new server files; enhance existing files, and if in doubt, amend the test server to test different approaches.
- Create new backend services with separation of duties to the main frontend.