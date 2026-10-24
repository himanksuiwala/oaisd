# Decisions

## Architecture

- Keep the existing FastAPI, React, TypeScript, and Vite stack.
- Fetch Elexon data through the backend only. The frontend continues to use a relative `/api` request through the existing Vite proxy.
- Use Chakra UI v3 for accessible, responsive presentation.
- Keep the fixed Phase 1 scenario behind `GET /api/wind-forecast`; no date controls are introduced yet.

## Source query and selection

- Query the official Elexon `WINDFOR` stream over the 24 hours ending at the decision cutoff. This captures earlier publications if no decision-day update is present.
- Filter locally as well as in the query: eligible records must have `publishTime <= 2026-01-15T10:00:00Z` and `startTime` on 16 January 2026 UTC.
- For each target hour, select the greatest eligible `publishTime`. Multiple publication times for one target are normal forecast revisions.
- Enumerate all 24 expected target hours in the response.
- If no eligible record exists for an hour, return it with `generation_mw: null`, `publish_time: null`, and status `missing`.
- If duplicate records share the selected target and publication timestamps, collapse them when generation values are identical. If values conflict, return `generation_mw: null` with status `conflict`; source order is not used as a tie-breaker.

## Errors and empty data

- Translate Elexon transport failures and invalid top-level payloads to HTTP 502 with a stable public message.
- Display loading, upstream error, empty-result, per-hour missing, and duplicate-conflict states explicitly.
- Never convert missing or conflicted generation to zero.

## Verification scope

- Use unit tests for cutoff selection, missing hours, and duplicate behavior.
- Use a mocked FastAPI route test for the backend journey.
- Use frontend lint/build plus a live full-stack browser review rather than introducing a browser automation framework in Phase 1.
