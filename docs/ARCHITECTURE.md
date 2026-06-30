# TNIP-R — Architecture

## 1. Goals & principles

TNIP-R is a national telecom regulator's OSS analytics & QoS-compliance platform.
Design priorities, in order: **operator data isolation**, **vendor independence**,
**metadata-driven KPIs/thresholds** (no code changes to add counters, formulas, or
thresholds), and **future extensibility** (operators, vendors, technologies, data
sources) without architectural redesign.

Deployed initially as a **modular monolith** (one Express process, module
boundaries enforced in code) that can be peeled into microservices later — each
`src/modules/<x>` already owns its routes → controller → service → repository.

## 2. Multi-tenancy model

Every fact table carries `operator_id`. Isolation is enforced in one place — the
`operatorScope` middleware (`backend/src/middleware/rbac.js`):

- **OPERATOR_USER** is pinned to `users.operator_id`; any attempt to read/write
  another operator's data is rejected (403).
- **REGULATOR_ADMIN / REGULATOR_ANALYST / SYSTEM_ADMIN** see all operators; an
  optional `operatorId` query/param narrows the view. `null` ⇒ cross-operator.

Services receive the resolved scope via `req.scope.operatorId` and never trust
raw client input for tenancy.

## 3. Request lifecycle

```
HTTP → nginx → Express
  → helmet/cors/json
  → /api/v1 router
    → authenticate (JWT)            attaches req.user {userId, roleKey, operatorId}
    → requireRole / operatorScope   RBAC + tenant isolation
    → controller                    validates input (Zod), shapes response
      → service                     business logic, transactions
        → repository / db.query     parameterized SQL (mysql2, named placeholders)
  → central errorHandler            ApiError / ZodError / SQL → JSON error envelope
```

Business logic never lives in routes/controllers. All DB access is parameterized.

## 4. The regulatory data pipeline (vertical slice)

```
upload (Huawei PM CSV, operator-tagged)
  → huaweiCsvParser           detect time/eNodeB/cell cols + counter columns
  → ingestion.service         sha256 dup-check → pm_files; auto-create sites/cells;
                              resolve counters (unknown → counter_definitions[status=UNKNOWN]);
                              bulk INSERT counter_values   (all tagged operator_id)
  → kpi.service.calculateForFile
                              aggregate counters per cell/day (SUM/AVG/MAX per dict);
                              evaluate active formulas (safe evaluator);
                              missing counters / div-by-zero → KPI skipped;
                              INSERT calculated_kpis
  → compliance.evaluateOperatorPeriod
                              monthly operator KPI avg vs qos_thresholds;
                              classify PASS/WARNING/FAIL; upsert compliance_results;
                              raise compliance_alerts on WARNING/FAIL
  → ranking.computeRankings   weighted composite QoS score → operator_rankings (+trend)
  → dashboards / ai           read models for the UI and the assistant
```

### Metadata-driven KPI engine
- `counter_definitions` — vendor/technology counter dictionary (Phase 1: Huawei LTE).
  Unknown counters are stored with `status='UNKNOWN'` and remain usable until mapped.
- `kpi_formulas.expression` — e.g. `100 * {L.RRC.ConnReq.Succ} / NULLIF({L.RRC.ConnReq.Att},0)`.
  Counter refs `{KEY}` are resolved from aggregated values. The evaluator
  (`formulaEvaluator.js`) is a hand-written recursive-descent parser — **no `eval`**,
  null-propagating (so a missing counter yields `null` ⇒ the KPI is skipped, never a
  wrong number). Scope precedence: operator-specific > technology > vendor > global.

### Compliance engine
`qos_thresholds(comparator, required_value, warning_margin, effective_from/to)`.
`classify()` returns PASS / WARNING (within margin) / FAIL. Thresholds are global,
per-technology, or per-operator and versioned by effective date.

## 5. AI module (LLM-ready seam)

Default `AI_PROVIDER=heuristic`: a deterministic **intent router**
(`ai.service.js`) maps NL questions to parameterized SQL — grounded, no
hallucination, zero external dependency. Anomaly detection is z-score per
operator+KPI series.

`AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` activates `llmComplete()`
(`ai.provider.js`, Claude Messages API, model `claude-opus-4-8`). Free-form
questions that no intent matches fall through to the LLM with a compact JSON
snapshot of KPI/compliance data as grounding. This is the **only** change needed
to go from heuristic to LLM — the router, endpoints, and clients are unchanged.

## 6. Data model overview

Groups (see `db/schema.sql` for full DDL, FKs, indexes, soft deletes):

- **IAM**: roles, permissions, role_permissions, users, sessions, audit_logs
- **Operators**: operators, operator_contacts, operator_licenses
- **Inventory**: vendors, technologies, regions, districts, sites, network_elements, cells
- **Ingestion**: pm_files, pm_file_logs
- **Counters**: counter_units, counter_definitions, counter_values *(high-volume fact)*
- **KPI**: kpi_definitions, kpi_formulas, kpi_formula_versions, calculated_kpis
- **Compliance**: qos_thresholds, compliance_results, compliance_alerts
- **Ranking**: ranking_configurations, ranking_weights, operator_rankings
- **AI**: anomaly_detections, ai_recommendations, forecasts
- **Alarm correlation (placeholder)**: alarms
- **Reporting / System**: reports, report_exports, application_settings, notifications

`counter_values` and `calculated_kpis` are the hot paths — indexed on
`(operator_id, …, ts)` and partition-ready by `ts` for production volumes.

## 7. Extension points (no redesign)

| Add… | How |
|---|---|
| New operator | `POST /operators` (+ optional operator-scoped users) |
| New vendor / technology | seed `vendors`/`technologies`; add a parser under `modules/ingestion`; counters live in `counter_definitions` keyed by vendor+tech |
| New KPI | insert `kpi_definitions` + `kpi_formulas` row — **no code change** |
| New / changed threshold | insert `qos_thresholds` with a new `effective_from` (versioned) |
| New file format (XML/ZIP/Nokia…) | new parser module returning the same normalized `{records, counterKeys}` shape; rest of the pipeline is unchanged |
| Microservice split | lift a `modules/<x>` directory into its own service; it already has clean route/service/repo seams |

## 8. Security

JWT access (short TTL) + rotating refresh tokens (hashed, stored in `sessions`,
revocable). RBAC by role + per-tenant isolation. Helmet headers, CORS, login rate
limiting, parameterized SQL, Zod input validation, and an `audit_logs` trail for
sensitive actions (login, operator CRUD, uploads, compliance evaluation).
