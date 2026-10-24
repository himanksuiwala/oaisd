# Decisions

## Architecture

- Keep the existing FastAPI, React, TypeScript, and Vite stack.
- Fetch Elexon data through the backend only. The frontend continues to use a relative `/api` request through the existing Vite proxy.
- Use Chakra UI v3 for accessible, responsive presentation.
- Generalize `GET /api/wind-forecast` with optional `decision_date=YYYY-MM-DD` and `cutoff_time=HH:mm` query parameters. Preserve `2026-01-15` and `10:00` as defaults.
- Preserve the existing `decision_time` response field for compatibility and add coverage plus retrieval-window metadata.
- Validate the exact input formats and January 2026 range in the backend. Invalid requests return HTTP 422.
- Use Recharts for the hourly line chart. It is the only new UI runtime dependency and supports explicit `null` gaps and custom publication details.
- Preserve `GET /api/wind-forecast` unchanged. Add `GET /api/wind-comparison` with the same inputs, defaults, and validation.
- Keep forecast and comparison requests independent in the frontend. A FUELHH failure leaves the applied forecast visible with an actual-specific retry action.

## Source query and selection

- Query the official Elexon `WINDFOR` stream over the 24 hours ending at the selected decision cutoff.
- Treat that lookback as a retrieval limit: `missing` means no eligible record was found inside the window.
- Filter locally as well as in the query: eligible records must have `publishTime <= decision_time` and `startTime` on the derived delivery date.
- For each target hour, select the greatest eligible `publishTime`. Multiple publication times for one target are normal forecast revisions.
- Enumerate all 24 expected target hours in the response.
- If no eligible record exists for an hour, return it with `generation_mw: null`, `publish_time: null`, and status `missing`.
- If duplicate records share the selected target and publication timestamps, collapse them when generation values are identical. If values conflict, return `generation_mw: null` with status `conflict`; source order is not used as a tie-breaker.

## Actual generation source findings

- Official endpoint: [FUELHH stream documentation](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream). The machine-readable contract is in the [official Elexon OpenAPI document](https://data.elexon.co.uk/swagger/v1/swagger.json).
- Semantic reference: [Elexon Half-Hourly Generation by Fuel Type glossary](https://www.elexon.co.uk/bsc/glossary/half-hourly-generation-by-fuel-type/) and the [current NETA Interface Definition and Design document](https://bscdocs.elexon.co.uk/bsc-module/interface-definition-documents/neta-interface-definition-and-design-document-part-1-interfaces-with-bsc-parties-and-their-agents/v-57-0/id-67b34bd747c7f13fbb2970f5).
- Query FUELHH with equal `settlementDateFrom` and `settlementDateTo` for the derived delivery date and `fuelType=WIND`. Settlement-date bounds are inclusive, so the backend still filters locally to `[delivery midnight, next midnight)` and to `fuelType == WIND`.
- FUELHH generation is documented in MW as average output over each 30-minute interval. `startTime` identifies the start of that half-hour; January UTC settlement periods run from 00:00/period 1 through 23:30/period 48.
- Representative live responses for 2 January, 16 January, and 1 February 2026 each contained 48 WIND rows with unique half-hour starts. The January sample contained 1,488 rows, 1,488 unique starts, and no null generation.
- FUELHH exposes `publishTime` but no documented revision number or rule stating that multiple rows are ordered revisions. The application therefore does not use publication order to resolve differing values.
- WINDFOR live records are hourly, but official documentation does not establish interval-average semantics. Hourly averaging of the two FUELHH readings is an explicit comparison convention, not a verified equivalence.

## Actual alignment and duplicates

- For target hour H, require exact FUELHH readings at H and H+30 and take their arithmetic mean. Do not sum MW values.
- Do not interpolate or fill a missing/conflicting half-hour. If either reading is unavailable, the hourly actual and error are null.
- Group actual records by exact half-hour start. Collapse identical generation duplicates and retain the latest `publishTime` only as provenance. Treat differing values as conflict regardless of publication order.
- Preserve genuine zero as an available value.
- Define signed error as `forecast_mw - actual_mw`, only when both values are valid.
- Count actual coverage at the hourly aligned level. Matched coverage counts only valid forecast/actual pairs.

## Comparison API and UI

- `GET /api/wind-comparison` returns exactly 24 rows, the forecast lookback, actual retrieval timestamp, alignment policy identifier, source counts, and nested forecast/actual/matched coverage.
- Each row carries forecast provenance, two expected half-hour actual readings with provenance/status, hourly actual status/value, and signed error.
- The local “Compare with actuals” switch defaults off. Comparison success replaces the single forecast series/table with a dual-series chart and comparison table derived from the same response.
- Half-hour source readings are available in chart tooltips and accessible table disclosure details.
- Superseded forecast and comparison requests use separate AbortControllers and request IDs tied to one applied-scenario version.

## Daily accuracy metrics

- Extend `GET /api/wind-comparison` additively with an `accuracy` object. Do not add an endpoint or make another Elexon request.
- Calculate metrics in a pure, network-independent function from non-null `error_mw` values already present in the 24 comparison rows. All metrics share that same valid-pair set.
- Define MAE as `mean(abs(forecast - actual))`, bias as `mean(forecast - actual)`, and RMSE as `sqrt(mean((forecast - actual)²))`.
- Calculate with unrounded floating-point values. Round only in the UI to one decimal place; show a plus sign for positive bias and normalize display-only negative zero to zero.
- Return `matched_hours`, `expected_hours: 24`, `unmatched_hours`, and `coverage_status` beside the metrics. `complete` means 24 matches, `partial` means 1–23, and `unavailable` means zero.
- Return null MAE, bias, and RMSE when no matched rows exist. A single match produces valid metrics with partial coverage. Genuine zero forecast or actual values remain eligible.
- Derive both the existing matched coverage and the accuracy counts from the same accuracy result so their counts cannot diverge.
- Show accuracy only for a successful current comparison. Place MAE, bias, RMSE, and shared coverage above the existing chart; hide them while comparison is off, loading, or failed.
- Keep the retrospective label and disclose that metrics use matched hours, hourly actuals average the two half-hours, WINDFOR interval-average semantics remain unverified, and missing/conflicting hours are excluded.
- Treat daily metrics as a description of one delivery day, not an accuracy percentage, confidence interval, purchase buffer, or evidence of long-term reliability.

## January range accuracy

- Add `GET /api/wind-accuracy` with required inclusive `decision_date_from` and `decision_date_to` values and optional `cutoff_time`, defaulting to `10:00` UTC. Both dates must be in January 2026 and the start must not follow the end.
- Build each day by calling the shared forecast retrieval/selection and FUELHH retrieval/alignment services directly. Never call an application HTTP endpoint from the backend.
- Return one ascending daily result for every requested decision date. A successful result embeds the existing `WindComparisonResponse`; a failed result has no comparison and carries a stable public message plus `forecast` or `actual` as the failed source.
- Keep retrieval status independent of coverage. Successful zero-match data remains a successful retrieval with unavailable metrics; an upstream failure is never fabricated as 24 missing observations.
- Pool every non-null hourly `error_mw` from successful days for overall MAE, bias, and RMSE. Do not average daily metrics or round before aggregation.
- Define total unmatched hours as successful-day unmatched hours plus 24 hours for every failed day. Complete requires every expected hour to match; any failed day therefore prevents complete coverage.
- Return HTTP 200 when at least one day retrieves successfully, including partial analyses. Return HTTP 502 with one stable public message only when every requested day fails upstream. Unexpected programming errors remain server errors.
- Limit range execution to four worker threads and guard all Elexon calls with one process-wide four-slot semaphore, so concurrent single-day and range traffic share the same upstream bound.
- Cache only successfully validated source lists in a process-local 15-minute, 128-entry least-recently-used cache. WINDFOR keys contain the exact publication bounds; FUELHH keys contain delivery date and `WIND`. Preserve the original retrieval timestamp on cache hits and never cache failures or invalid payloads.
- The cache is disposable, clears on process restart, and requires no migration. It is not shared across backend processes.
- Keep Period accuracy opt-in. Draft dates remain separate from applied results, superseded requests are aborted/ignored, and daily drilldown reuses embedded rows without another request.
- Explain that overall metrics are pooled retrospective comparisons, partial coverage may affect representativeness, actuals average two half-hours, WINDFOR interval-average semantics remain unverified, and forecast lookup retains its 24-hour limit.

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
