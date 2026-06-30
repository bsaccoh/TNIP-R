# TNIP-R — Telecom Network Intelligence Platform (Regulatory Edition)

AI-assisted, multi-operator, multi-vendor OSS analytics & QoS-compliance platform
for a national telecommunications regulator. Phase 1 ingests **Huawei PM CSV** for
**Orange, Africell, Qcell, SierraTel** (Sierra Leone).

> **Status — Phase 1, Slice 1 (foundation).** This repo currently contains a
> **runnable backend + MySQL schema + seed data + Docker**, with the core
> regulatory pipeline working end to end:
> **login → register operator → upload Huawei PM CSV → parse → calculate KPIs →
> evaluate compliance → rank operators → national dashboard JSON + AI assistant.**
> The React dashboard UI is the next slice (see [Roadmap](#roadmap)).

---

## What works today

| Capability | Endpoint(s) | Notes |
|---|---|---|
| JWT auth + refresh + RBAC | `POST /api/v1/auth/login`, `/refresh`, `/me` | 4 roles, operator data isolation |
| Operator management | `GET/POST/PUT/DELETE /api/v1/operators` | profile + summary KPIs |
| Huawei PM ingestion | `POST /api/v1/ingestion/upload` | **two formats**: real Huawei U2020/PRS `pmresult` (numeric counter IDs, 3G/UMTS, units row, Object-Name decode, Reliable-only) and named-counter CSV. Operator-aware, dup detection, auto-creates sites/cells, unknown-counter capture |
| Counter Dictionary | `GET /api/v1/counters`, `POST /counters/import` | bind numeric counter IDs → names; lists unmapped counters first |
| Network Inventory | `POST /api/v1/inventory/import`, `GET /inventory/sites`, `/map`, `/stats`, `/reference` | imports the Geo-Dimension workbook (649 sites, 12.8k cells w/ coords, CGI, region); populates `network_reference` cell/site/location mapping; powers coverage map. PM binds to inventory at **site level (99%)** |
| SFTP ingestion | `POST /api/v1/sftp`, `/sftp/:id/test`, `/sftp/:id/pull` | pull raw PM data on-demand (batch) or **real-time polling**; handles `.gz`/`.tar.gz`; idempotent via `ingestion_jobs` |
| Batch archive upload | `POST /api/v1/ingestion/batch` | upload a `.tar.gz`/`.gz`; each CSV ingested independently |
| DEMO 3G KPIs | `db/seed_demo.sql` | illustrative counter dictionary + 6 UMTS KPIs so the **real Orange `pmresult` file computes KPIs/compliance** (verified: PASS×4/WARNING×1/FAIL×1). **Not authoritative** — replace via `/counters/import` |
| KPI calculation engine | auto on upload · `POST /api/v1/kpis/recalculate` | metadata-driven formulas, safe evaluator (no `eval`) |
| KPI comparison / time-series | `GET /api/v1/kpis/comparison`, `/timeseries` | cross-operator |
| Compliance / threshold engine | `GET /api/v1/compliance/matrix`, `POST /evaluate` | PASS / WARNING / FAIL |
| Operator ranking | `GET /api/v1/rankings`, `POST /compute` | weighted composite QoS score |
| National executive dashboard | `GET /api/v1/dashboards/national` | aggregate JSON for the UI |
| AI assistant + anomaly detection | `POST /api/v1/ai/ask`, `GET /ai/anomalies` | heuristic now, Claude-API-ready seam |
| OpenAPI / Swagger UI | `GET /docs`, `/openapi.json` | |

Core parsing & KPI/compliance logic is covered by tests:
`cd backend && node --test test/logic.test.mjs` (6 passing, no DB needed).

## Phase 1 data reality (Orange) — open decisions

The real Orange export is the Huawei **U2020/PRS `pmresult`** format (3G/UMTS).
Two items must be resolved before compliance verdicts are trustworthy at scale:

1. **Counter dictionary.** Files contain only numeric counter IDs (e.g. `50331655`),
   no names. KPIs/compliance stay empty until an authoritative ID→name mapping is
   loaded via `POST /api/v1/counters/import`. Mappings are **not** guessed —
   wrong mapping ⇒ wrong PASS/FAIL against an operator.
2. **Volume.** One hourly file ≈ **403k** counter rows (315 sites, 3 161 cells, 128
   counters); ~**19 500 files/day** (1 GB tar.gz). Storing every raw counter does
   not scale in MySQL. Recommended: ingest only KPI-referenced counters and/or keep
   only daily aggregates (`calculated_kpis`), purging raw after KPI calc. A batch
   tar.gz/folder ingestion job (vs single-file UI) is needed for production.

## Stack

Backend: Node 20 · Express · MySQL 8 (mysql2) · JWT · Multer · csv-parse · xlsx · ssh2-sftp-client · Winston · Zod · Helmet.
Frontend: React 18 · Vite · Material UI · Recharts · React-Leaflet (builds clean; login/shell verified rendering).
Deploy: Docker · Docker Compose · Nginx reverse proxy.

### Frontend pages
Login · National Dashboard (KPI cards, ranking, compliance bars, tech pie, uploads, AI recs) ·
KPI Comparison (operator matrix + QoS radar) · Compliance Matrix (operators × KPIs, PASS/WARN/FAIL,
alerts) · Operator Ranking · National Coverage Map (React-Leaflet, operator/tech layers) ·
Network Inventory · Data Ingestion (CSV + archive upload) · Operators · AI Assistant (chat).
Dev: `cd frontend && npm install && npm run dev` (proxies `/api` → backend on :4000).

## Quick start (Docker)

```bash
cp .env.example .env          # then edit secrets
docker compose up --build
```

- API: `http://localhost:8080/api/v1`  ·  Swagger: `http://localhost:8080/docs`
- MySQL schema + seed load automatically on first DB init.
- Default admin (created on backend boot): **admin@tnipr.gov / Admin@12345**
  (override via `ADMIN_EMAIL` / `ADMIN_PASSWORD`). **Change in production.**

## Try the pipeline

```bash
# 1. login
TOKEN=$(curl -s localhost:8080/api/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@tnipr.gov","password":"Admin@12345"}' | jq -r .data.accessToken)

# 2. upload a Huawei PM CSV for Orange (operator_id=1) — auto KPI + compliance
curl -s localhost:8080/api/v1/ingestion/upload -H "Authorization: Bearer $TOKEN" \
  -F operator_id=1 -F file=@db/samples/huawei_lte_sample.csv | jq

# 3. see results
curl -s localhost:8080/api/v1/kpis/comparison      -H "Authorization: Bearer $TOKEN" | jq
curl -s localhost:8080/api/v1/compliance/matrix     -H "Authorization: Bearer $TOKEN" | jq
curl -s localhost:8080/api/v1/dashboards/national   -H "Authorization: Bearer $TOKEN" | jq
curl -s localhost:8080/api/v1/ai/ask -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"question":"Which operator has the highest availability?"}' | jq
```

## Local dev (without Docker)

Requires a local MySQL 8. Load `db/schema.sql` then `db/seed.sql`, then:

```bash
cd backend && npm install
DB_HOST=localhost DB_USER=tnipr DB_PASSWORD=... DB_NAME=tnipr npm run dev
```

## AI module

Defaults to a **deterministic intent router** (no API key needed) that answers
KPI/compliance/congestion/comparison questions with real data. To enable the
LLM, set in `.env`: `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY=...`,
`ANTHROPIC_MODEL=claude-opus-4-8`. The seam is in
`backend/src/modules/ai/ai.provider.js` — no other code changes required.

## Layout

```
NTNIP/
├─ docker-compose.yml · nginx/nginx.conf · .env.example
├─ db/      schema.sql · seed.sql · samples/huawei_lte_sample.csv
├─ backend/ src/{config,middleware,utils,routes,modules,seed}  +  test/
│   modules/: auth · operators · ingestion · kpi · compliance · ranking · dashboard · ai
└─ docs/    ARCHITECTURE.md
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design, data model, and
extension points (new operators / vendors / technologies without redesign).

## Roadmap

Next slices, in priority order:
1. ~~React frontend~~ ✅ built (login, dashboard, comparison, compliance, ranking, map, inventory, ingestion, AI chat).
2. Counter Dictionary & KPI Formula Builder admin UIs.
3. National Coverage Map (React Leaflet) + regional QoS scoring.
4. Reports module (PDF/Excel/CSV) + scheduled reports.
5. Additional vendors (Nokia/Ericsson/ZTE) & technologies (2G/3G/5G), XML/ZIP ingestion.
6. Real-time/streaming ingestion, forecasting, automated regulatory notices.
