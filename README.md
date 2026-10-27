# GridBricks

GridBricks is a pilot wind-forecast analysis portal for an electricity purchasing
team. It uses a **FastAPI** backend and a **React TypeScript (Vite)** frontend.

## Business Context

An electricity supplier buying power in the UK day-ahead market must make
purchasing decisions before the delivery day. Wind generation is
weather-dependent, so the team needs to understand both:

- the latest wind-generation forecast that was available when a decision was
  made; and
- how forecasts compared with actual generation historically.

This pilot reconstructs that information for decision dates in January 2026
using national-level Elexon data. A user selects a decision date and UTC cutoff,
and the application shows the latest eligible `WINDFOR` forecast for each hour
of the following delivery day. The optional retrospective comparison aligns
those forecasts with `FUELHH` actual wind generation and reports MAE, bias, and
RMSE for matched hours.

The application also includes **Period analysis**. This applies one daily cutoff
across an inclusive January decision-date range, reports pooled hourly accuracy
metrics and retrieval coverage, and lets the user investigate individual
delivery days without issuing another data request.

## Scope and Interpretation

- Forecast comparison is retrospective: actual generation and accuracy metrics
  were not available at the historical purchasing cutoff.
- The figures describe national wind generation, not the electricity available
  to a particular supplier after contracts, demand, or portfolio positions.
- Historical errors support purchasing judgment; they are not a guaranteed
  future error range.
- The pilot does not recommend purchasing quantities, predict prices, or
  execute trades.
- The default 10:00 UTC cutoff is a pilot assumption rather than a verified
  market deadline.
- Hourly actual generation is derived by averaging the two corresponding
  half-hourly `FUELHH` readings. Current Elexon documentation does not establish
  equivalent interval-average semantics for hourly `WINDFOR`, so this remains
  an explicit comparison convention.

More detailed product assumptions and analytical decisions are recorded in
[`docs/product-context.md`](docs/product-context.md) and
[`docs/decisions.md`](docs/decisions.md).

## Project Structure

```
GridBricks/
├── backend/                  # FastAPI Python backend
│   ├── .venv/                # Virtual environment
│   ├── main.py               # Minimal FastAPI app with /api/test endpoint
│   ├── requirements.txt      # Dependencies: fastapi, uvicorn
│   └── README.md
│
├── frontend/                 # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── App.tsx           # Simple React component fetching /api/test
│   │   ├── App.css           # Minimal styles
│   │   ├── index.css
│   │   └── main.tsx
│   ├── vite.config.ts        # Vite config with backend proxy
│   └── package.json
│
├── package.json              # Root runner scripts
├── run.sh                    # Startup shell script
└── README.md
```

## Running the Application

### Option 1: Start both together
```bash
npm run dev
# or
./run.sh
```

### Option 2: Start separately

**Backend**:
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Frontend**:
```bash
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://127.0.0.1:8000/api/wind-forecast

## Phase 1 checks

```bash
(cd backend && .venv/bin/pytest -q)
(cd frontend && npm run lint && npm run build)
```

Open http://localhost:5173 to review the fixed 15 January 2026 decision cutoff and the hourly forecast for delivery on 16 January 2026.

## Vercel

The project deploys as one container service configured in `vercel.json`.
`Dockerfile.vercel` builds the Vite frontend and copies it into the FastAPI
image, so the frontend and API share one domain and one container.

Build and run the same image locally:

```bash
docker build -f Dockerfile.vercel -t gridbricks .
docker run --rm -p 8000:8000 -e PORT=8000 gridbricks
```

Open http://localhost:8000 for the application or
http://localhost:8000/api/test to check the API. To run through Vercel's local
router, use `npx vercel dev -L`.

To deploy, connect this repository to Vercel or run:

```bash
npx vercel
```
