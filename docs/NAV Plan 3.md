# NAV Plan 3

Where do we stand with this plan??

Implementation Plan

I've created a detailed plan with 19 phases to implement the NAV frontend dashboard. Here's what I'll be working on:

**1. Verify the NAV API and calculators - First, I'll check all available endpoints and calculator details**

**2. Set up the frontend domain structure - Create the necessary folders with index files**

**3. Ensure proper environment configuration - Verify URLs and CORS settings**

**4. Build the NAV API service - Implement the frontend service to connect to the backend**

**5. Define domain-specific types - Create TypeScript types for all NAV data**

**6. Implement calculator registry - Create a config for dynamic calculator loading**

**7. Build shared UI components - Create reusable NAV interface components**

**8. Develop data fetching hooks - Create hooks for API interaction**

**9. Set up page structure and routes - Build the main dashboard pages**

**10. Create calculator-specific components - Implement all 22 calculator interfaces**

11. Support sync and async calculations - Handle both immediate and job-based calculations

12. Integrate history and audit features - Connect to backend history tracking

13. Implement permissions - Add proper access control

14. Polish the UX - Add loading states, error handling, and accessibility

15. Add validation and formatting - Ensure proper input validation and data formatting

16. Test thoroughly - Verify everything works against the real backend

17. Document the implementation - Create comprehensive documentation

18. Check dependencies - Ensure all required packages are installed

19. Final integration and QA - Complete end-to-end testing

Since you mentioned your dislike for mock data, I'll ensure all components work with real data from your backend services. I'll maintain your domain-specific organization philosophy and follow your naming conventions: kebab-case for files, PascalCase for components, and camelCase for variables.

**NAV PLAN 3**

**1. Phase 0: Verify backend NAV API and calculators (no assumptions)**

- Open Swagger: http://localhost:3002/docs and identify NAV endpoints, response shapes, and the list of all 22 calculators.
- Confirm each calculator’s id/slug, title, description, input schema (fields, types, units), output schema, sync vs async (job) behavior, and permissions required.
- Record findings in docs/phase-8-9-nav-frontend.md (include endpoint table, request/response payloads, and calculator catalog).
- If Swagger isn’t enabled, scan backend/src/routes and backend/src/services for nav-related files to extract the same details.

**2. Phase 1: Frontend domain scaffold (nav) with index files**

**2b. I want any nav related additions to the sidebar or new app routes to work in harmony/integration with the dynamic sidebar: /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/src/components/layout**

**and I perhaps all NAV files even pages to be self contained with within /Users/neilbatchelor/silver-garbanzo-chain-capital/frontend/src/components/nav**

- Create folders (add index.ts to each):

- frontend/src/components/nav/

- frontend/src/components/nav/calculators/

- frontend/src/hooks/nav/

- frontend/src/components/nav/pages

- frontend/src/services/nav/

- frontend/src/utils/nav/

- frontend/src/types/nav/

- Add README: docs/phase-8-9-nav-frontend.md (progress + decisions).
- Follow naming: kebab-case files, PascalCase components, camelCase variables.

3. Phase 2: Environment and configuration checks

- Ensure frontend/.env contains VITE_BACKEND_URL (e.g., http://localhost:3002).
- Verify backend CORS ALLOWED_ORIGINS includes Vite dev origin.
- Confirm tsconfig baseUrl and paths alias '@/' are set and working.

**4. Phase 3: NAV API service integration (NavService)**

- File: frontend/src/services/nav/NavService.ts
- Implement typed methods (adapt names/paths to real API):

- getOverview()

- listCalculators()

- getCalculatorSchema(calculatorId: string)

- calculate(calculatorId: string, payload: unknown)

- getCalculationById(id: string)

- listHistory(params)

- listValuations(params)

- createValuation(payload)

- deleteValuation(id: string)

- listAudit(params)

- Reuse existing common HTTP client if present (e.g., services/shared/HttpClient). If missing, create a minimal wrapper within nav domain only (no central database.ts).
- Strong error handling: map HTTP statuses to domain errors.
- Add index.ts to export NavService.

**5. Phase 4: Types for NAV (domain-specific)**

- Files: frontend/src/types/nav/nav.ts and index.ts
- Define minimal domain types driven by Swagger (no guessed fields):

- NavKpi, Calculator, CalculatorSchema (inputs/outputs), CalculationResult, NavHistoryRow, NavValuation, NavAuditEvent

- If OpenAPI is available, optionally add openapi-typescript as devDependency and generate types to frontend/src/types/nav/generated.d.ts. Otherwise, write types matching Swagger exactly.

**6. Phase 5: Calculator registry and dynamic loader**

- File: frontend/src/components/nav/calculators/calculators.config.ts
- Build a registry mapping: { id/slug, title, description, component: React.LazyExoticComponent, permissions }.
- Export a getCalculatorComponent(slug) helper and list for UI menus.
- Keep each calculator component under 400 LOC (split shared bits into base components).

**7. Phase 6: Shared NAV UI building blocks (shadcn/ui + Radix only)**

- Files (examples):

- frontend/src/components/nav/nav-dashboard-header.tsx

- frontend/src/components/nav/nav-kpi-cards.tsx

- frontend/src/components/nav/nav-history-table.tsx

- frontend/src/components/nav/nav-valuation-table.tsx

- frontend/src/components/nav/nav-audit-table.tsx

- frontend/src/components/nav/calculators/calculator-shell.tsx (header, description, form slot, run/reset buttons)

- frontend/src/components/nav/calculators/schema-form.tsx (dynamic form from backend schema using react-hook-form + zod if available)

- Use existing shadcn components (Card, Table, Tabs, Skeleton, Button, Input, Select, DatePicker, Dialog, Toast).

**8. Phase 7: Hooks for data fetching and mutations (no mock data)**

- Files:

- frontend/src/hooks/nav/useNavOverview.ts

- frontend/src/hooks/nav/useCalculators.ts

- frontend/src/hooks/nav/useCalculatorSchema.ts

**- frontend/src/hooks/nav/useCalculateNav.ts**

- frontend/src/hooks/nav/useNavHistory.ts

- frontend/src/hooks/nav/useNavValuations.ts

- frontend/src/hooks/nav/useNavAudit.ts

- Prefer @tanstack/react-query if already in project. If not, implement minimal hooks using fetch + AbortController and simple state (keep code small).
- Caching: overview (30-60s), calculators list (5m), schemas (10m), history/valuations/audit (pagination + 30-60s).
- Robust error states, retries (1-2 max), and cancellation.

**9. Phase 8: Pages and route structure**

- Files:

- frontend/src/pages/nav/nav-dashboard-page.tsx (KPIs, quick actions, recent history)

- frontend/src/pages/nav/nav-calculators-page.tsx (catalog of 22 calculators from registry)

- frontend/src/pages/nav/calculator-detail-page.tsx (dynamic component mount by slug)

- frontend/src/pages/nav/nav-valuations-page.tsx

- frontend/src/pages/nav/nav-audit-page.tsx

- Update frontend/src/App.tsx to register routes:

- /nav

- /nav/calculators

- /nav/calculators/:slug

- /nav/valuations

- /nav/audit

- Wrap with PermissionGuard (usePermissions) aligned to permissions_rows.csv.

**10. Phase 9: Implement the 22 calculator-specific components**

- For each calculator:

- Create components/nav/calculators/[calculator-slug]-form.tsx

- Fetch schema via useCalculatorSchema(slug)

- Render SchemaForm (dynamic inputs) inside CalculatorShell

- Submit via useCalculateNav(slug), display results (charts/tables as appropriate)

- Add unit labels, validation, and domain-specific tooltips

- Register each component in calculators.config.ts.
- Keep each file under 400 LOC; extract shared field widgets to schema-form.

**11. Phase 10: Support sync and async calculation flows**

- If POST /calculate returns result: display immediately, allow "Save as valuation".
- If POST returns jobId: implement polling (GET /calculations/:id) with exponential backoff and cancel.
- Show progress UI, allow cancellation if API supports it.
- Persist successful results with createValuation() when user confirms.

**12. Phase 11: History, valuations, and audit integration**

- History page: server-side pagination, sorting, and filtering (date range, calculator).
- Valuations page: list, view, delete valuation entries (confirm dialog).
- Audit page: list events related to NAV actions; link to entities (calculationId, valuationId).
- All data strictly from backend; no placeholders.

**13. Phase 12: Permissions and access control**

- Use existing useAuth/usePermissions hooks to gate:

- nav:view_dashboard, nav:view_calculators, nav:run_calculation, nav:view_history, nav:manage_valuations, nav:view_audit (align exact keys to permissions_rows.csv).

- Hide or disable UI for unauthorized actions; show friendly permission notices.

**14. Phase 13: UX polish and accessibility**

- Add loading skeletons, empty states, and error toasts.
- Keyboard and screen-reader support: proper labels, roles, aria-* attributes.
- Persist last-used calculator and inputs per user (localStorage) as non-source-of-truth convenience only.

**15. Phase 14: Validation, formatting, and units**

- Use zod + react-hook-form (if present) to build schemas from backend definitions; show inline errors mapped from server responses.
- Currency/percentage/date formatting utilities in utils/nav (use existing shared utils if available).
- Enforce input masks for numeric fields where appropriate.

**16. Phase 15: Testing and quality gates (no mock data in app code)**

- Type-level tests: pnpm type-check must pass.
- Lint: pnpm lint clean.
- Integration smoke in dev against real backend:

- Load dashboard

- Open calculator

- Run calculation

- Save valuation

- Verify history and audit update

- If test framework requires mocks, limit them to isolated unit tests for pure utilities only; do not introduce mock data into app runtime paths.

**17. Phase 16: Documentation and progress tracking**

- Create docs/phase-8-9-nav-frontend.md:

- Overview, endpoints, routes, components, hooks, services, permissions, envs

- Completed / Partial / Remaining checklist

- Known risks and follow-ups

- Add fix notes if needed under fix/ with specific filenames.

**18. Phase 17: Dependencies check and installation (only if missing)**

- Verify and install only if absent:

- react-router-dom

- react-hook-form, zod, @hookform/resolvers

- @tanstack/react-query

- openapi-typescript (dev) if we generate types

- Commands:

- pnpm add react-hook-form zod @hookform/resolvers @tanstack/react-query

- pnpm add -D openapi-typescript

**19. Phase 18: Final integration, QA, and delivery**

- Ensure index.ts exists in every new folder; exports are consistent.
- Update App.tsx and verify routes render without errors.
- Run: pnpm dev, pnpm type-check, pnpm lint, pnpm test (if applicable).
- Validate end-to-end with real data:

- KPIs load

- All 22 calculators visible and run

- History/Valuations/Audit pages display live data

- No build-blocking errors; commit observations to MCP memory.