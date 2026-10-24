# GridBricks

Minimal full-stack setup with a **FastAPI** backend and a **React TypeScript (Vite)** frontend.

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
