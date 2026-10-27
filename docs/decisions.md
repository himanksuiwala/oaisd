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

## Single-day workspace layout and scroll boundaries

- Enable the desktop split workspace only when viewport dimensions meet or exceed `1180px` width and `720px` height. Below either threshold, switch to the natural stacked workflow to avoid cramped panes and nested scrollers.
- In the desktop split workspace, bound the workspace to `calc(100dvh - 88px)` with zero window scroll. The hourly table viewport is the sole internal vertical scroller in the right analytical canvas, preserving stationary views for the applied scenario rail, accuracy strip, profile chart, and selected-hour summary.
- Guarantee a dedicated vertical table viewport height with sticky table headers and an explicit `24px` bottom clearance buffer so that the final `23:00` row and its action buttons are never clipped or obscured by container borders or scrollbars.
- Preserve table scroll position across row selection and drawer dismissals by preventing scroll jumps during focus restoration (`preventScroll: true`).

## Information disclosure and overlay hierarchy

- Never conceal critical analytical findings, data gaps, conflict alerts, or retrieval failures behind optional disclosure controls. Warnings, exclusions, and partial coverage statuses must remain immediately visible in the primary canvas.
- Condense secondary contextual guidance, metric definitions, axis conventions, and table semantics into accessible `InfoPopover` controls (composed with Chakra UI v3 `Popover`, `IconButton`, 40px touch targets, full keyboard support, and focus return).
- Deep inspection of source readings (half-hourly FUELHH values, publication timestamps, and statuses) is presented exclusively in a slide-out Chakra `Drawer` (`SourceInspector`), avoiding table row expansion, layout shifts, or horizontal table sprawl.
- Restoring focus upon drawer or dialog dismissal must return exactly to the triggering element.

## Hourly comparison table on-demand presentation and canvas proportions

- Rather than permanently competing for vertical space against the forecast profile chart in split layouts, the 24-row hourly comparison table is presented on demand via a slide-out Chakra `Drawer` (`HourlyBreakdownDrawer`).
- This grants the `ForecastChart` a generous 350 px height with uncompressed axes and curves while providing a dedicated, spacious 24-row view with sticky headers when requested.
- Source inspection (`SourceInspector`) remains accessible both from the main canvas `SelectedHourSummary` card and from each row in the on-demand table drawer, using layered z-indices (`1400` and `1600`) for seamless stacking.

## Timezone normalization and input controls

- Remove repeated "UTC" suffix strings across individual timestamp cells, chart labels, and scenario chips. Establish the universal UTC convention in the global header and methodology dialog.
- Constrain the date picker (`JanuaryDatePicker`) exclusively to January 2026 using Chakra UI v3 `DatePicker`, blocking navigation or selection outside the verified dataset boundary.
- Integrate a Chakra-styled `TimePicker` with quick operational cutoff presets (`09:00`, `11:00`, `14:00`, etc.) and interactive hour/minute selection, maintaining full 24h format validation.

## Period analysis state presentation

- Mirror the eventual period master/detail geometry during loading so the applied range, master list, and detail canvas do not shift when results arrive.
- Apply selection motion only to the selected-day detail region. The period overview and daily master list remain stationary, and reduced-motion preferences disable the cue.
- Keep partial coverage and failed-day consequences visible beside the period overview; information popovers never replace operational warnings.
- Distinguish an unselected-but-available day from a period with no successful days so empty-detail guidance always names the next available action.
- Restore focus from mobile detail and hourly overlays with `preventScroll: true` to preserve the master-list position.

## Analysis workflow state lifetime

- Keep both primary analysis workflows mounted while the page is open and hide the inactive workflow with the native `hidden` state.
- This preserves draft and applied analysis state across Day Analysis and Period Analysis navigation without duplicating request ownership or introducing browser storage.
- The inactive workflow must remain absent from layout, keyboard navigation, and the accessibility tree.
- Do not persist analysis state to local storage, session storage, or the URL; a full page refresh intentionally resets both workflows.
