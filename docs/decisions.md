# Decisions

## Architecture

- Keep the existing FastAPI, React, TypeScript, and Vite stack.
- Fetch Elexon data through the backend only. The frontend continues to use a relative `/api` request through the existing Vite proxy.
- Use Chakra UI v3 for accessible, responsive presentation.
- Generalize `GET /api/wind-forecast` with optional `decision_date=YYYY-MM-DD` and `cutoff_time=HH:mm` query parameters. Preserve `2026-01-15` and `10:00` as defaults.
- Preserve the existing `decision_time` response field for compatibility and add coverage plus retrieval-window metadata.
- Validate the exact input formats and January 2026 range in the backend. Invalid requests return HTTP 422.
- Use Recharts for the hourly line chart. It is the only new UI runtime dependency and supports explicit `null` gaps and custom publication details.

## Source query and selection

- Query the official Elexon `WINDFOR` stream over the 24 hours ending at the selected decision cutoff.
- Treat that lookback as a retrieval limit: `missing` means no eligible record was found inside the window.
- Filter locally as well as in the query: eligible records must have `publishTime <= decision_time` and `startTime` on the derived delivery date.
- For each target hour, select the greatest eligible `publishTime`. Multiple publication times for one target are normal forecast revisions.
- Enumerate all 24 expected target hours in the response.
- If no eligible record exists for an hour, return it with `generation_mw: null`, `publish_time: null`, and status `missing`.
- If duplicate records share the selected target and publication timestamps, collapse them when generation values are identical. If values conflict, return `generation_mw: null` with status `conflict`; source order is not used as a tie-breaker.

## Errors and empty data

- Translate Elexon transport failures and invalid top-level payloads to HTTP 502 with a stable public message.
- Display loading, upstream error, empty-result, per-hour missing, and duplicate-conflict states explicitly.
- Never convert missing or conflicted generation to zero.
- Derive chart, table, and coverage from the same response. Recharts receives `null` for missing/conflicting points and does not connect across gaps.
- Keep draft controls distinct from applied results. Abort superseded requests and ignore their completions by request ID; clear prior results while a newly applied scenario loads.

## Verification scope

- Use unit tests for cutoff selection, missing hours, and duplicate behavior.
- Use a mocked FastAPI route test for the backend journey.
- Use frontend lint/build plus a live full-stack browser review rather than introducing a browser automation framework.
