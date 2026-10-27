# Progress

Last updated: 27 October 2026

## Period Analysis design audit

- [x] Audited the live Period Analysis success state against the approved Day Analysis experience.
- [x] Inspected the Period Analysis React composition, shared analytical components, product rules, theme, decisions, and completed UI/UX plans.
- [x] Verified one representative desktop success layout and one `375 × 812` narrow layout.
- [x] Recorded the audit and phased implementation handoff in [`PERIOD_ANALYSIS_REDESIGN_PLAN.md`](./PERIOD_ANALYSIS_REDESIGN_PLAN.md).
- [x] Approved the Period Analysis redesign plan.
- [x] Phase 1 — Critical hierarchy, scroll ownership, and responsive consistency.
- [x] Phase 2 — Metric, table, chart, and visual-system refinement.
- [x] Phase 3 — Loading/error/partial states, interaction polish, and accessibility hardening.

All three Period Analysis phases are implemented and verified. The workstream is awaiting final visual and interaction approval. Do not alter the completed Day Analysis behavior except where a deliberately shared component requires one consistent implementation.

### Period Analysis Phase 1 — implemented and verified

- [x] Pooled Period accuracy and trust/coverage context now precede daily navigation.
- [x] Applied range/cutoff context is integrated into the overview; the redundant full-width applied bar is removed.
- [x] Retrospective context uses a badge plus `InfoPopover` instead of a permanent full-width banner.
- [x] Wide layouts use a fixed overview plus one bounded daily-list scroller and one detail-pane scroller.
- [x] Short windows fall back to a single stacked page flow instead of forcing the split layout.
- [x] Selected-day hourly rows moved to the shared on-demand Chakra drawer; the main detail canvas stays chart-first.
- [x] Hourly drawer scrolling has one owner, does not resize table rows, and returns focus to its trigger.
- [x] Shared navigation and date/time controls no longer clip at 320 or 375 px.
- [x] The idle state contains one primary `Analyze period` action.
- [x] Request contracts, calculations, partial/missing/conflict handling, abort/request-ID safeguards, retry behavior, and in-memory selection remain unchanged.

Phase 1 checks: frontend lint passed; TypeScript/Vite production build passed; browser review passed at wide desktop, `1280 × 600`, `375 × 812`, and `320 × 1024`. The existing bundle-size advisory remains.

### Period Analysis Phase 2 — implemented and verified

- [x] Added a compact `PeriodAccuracyStrip` containing applied range/cutoff, MAE, bias, RMSE, hourly/day coverage, and overall status.
- [x] Replaced permanent metric/methodology descriptions with accessible `InfoPopover` controls.
- [x] Tightened daily-row density, established delivery-day-first hierarchy, added tabular numerals, and reserved visual status emphasis for exceptions.
- [x] Retained selected/focus states plus Enter and Space activation without issuing additional API requests.
- [x] Aligned selected-day title, chart heading, chart information, and hourly-breakdown action with the approved Day Analysis grammar.
- [x] Flattened unnecessary nested surfaces in the detail pane.
- [x] Reduced chart tooltips to concise decision data while retaining persistent Source Inspector access for detailed provenance.
- [x] Corrected shared mobile metric layouts so MAE/Bias occupy two columns and RMSE spans the full row without clipping.
- [x] Kept API contracts, pooled calculations, provenance, partial/missing/conflict behavior, and request-race safeguards unchanged.

Phase 2 checks: frontend lint passed; TypeScript/Vite production build passed; desktop mouse and keyboard selection passed; compact tooltip passed; `1280 × 600` stacked fallback passed; `375 × 812` period and selected-day metric layouts passed; mobile detail dismissal restored list position and focus. The existing bundle-size advisory remains.

### Period Analysis Phase 3 — implemented and verified

- [x] Added a structural loading state that mirrors the period master/detail result layout and retains applied range/cutoff context.
- [x] Scoped result motion to selected-day detail only and retained reduced-motion behavior.
- [x] Tightened partial-period warning presentation while preserving failed-day counts, exclusions, and retry.
- [x] Added distinct empty-detail guidance for an unselected successful day versus no successful days.
- [x] Polished the error surface without changing stable service messages or retry behavior.
- [x] Standardized explicit drawer focus return with `preventScroll: true`.
- [x] Reverified desktop keyboard selection, stationary master-list scrolling, hourly drawer Escape/focus return, mobile detail/list restoration, structural loading, and responsive error presentation.
- [x] Kept API contracts, request ownership, request-race protection, calculations, provenance, and exception handling unchanged.

Phase 3 checks: frontend lint passed; TypeScript/Vite production build passed; `git diff --check` passed; desktop success/loading/error and keyboard paths passed; hourly drawer dismissal/focus return passed; `375 × 812` loading, error, selected-day drawer, focus, and list-position behavior passed. The existing bundle-size advisory remains.

### Post-redesign correction — analysis state lifetime

- [x] Diagnosed Period Analysis state loss as a component-lifetime issue: switching tabs conditionally unmounted the entire workflow.
- [x] Kept Day Analysis and Period Analysis mounted for the lifetime of the page while applying the native `hidden` state to the inactive workflow.
- [x] Preserved period draft parameters, applied response, selected delivery day, selected hour, and overlay-local state across analysis-tab switches.
- [x] Kept persistence intentionally memory-only; a full page refresh still restores the initial application state.
- [x] Confirmed the hidden workflow is removed from the accessibility tree and cannot expose duplicate keyboard controls.

State-lifetime correction checks: frontend lint passed; TypeScript/Vite production build passed; browser regression passed for Period → Day → Period with the same one-day metrics and selected day; browser refresh reset Period Analysis to its idle defaults; `git diff --check` passed.

## Current handoff status

The active implementation plan is
[`PERIOD_ANALYSIS_REDESIGN_PLAN.md`](./PERIOD_ANALYSIS_REDESIGN_PLAN.md).
The completed Day Analysis work is recorded in
[`SINGLE_DAY_WORKSPACE_REDESIGN_PLAN.md`](./SINGLE_DAY_WORKSPACE_REDESIGN_PLAN.md),
with the broader product-redesign history in
[`UI_UX_REFINEMENT_PLAN.md`](./UI_UX_REFINEMENT_PLAN.md).

The frontend currently builds and runs with the API contracts, calculations,
provenance rules, missing/conflict handling, caching, and request-race
protection unchanged.

| Workstream | Status | Review state |
| --- | --- | --- |
| Day Analysis redesign, Phases 1–6 | Implemented and verified | Complete |
| Period Analysis Phase 1 — Critical | Implemented and verified | Approved |
| Period Analysis Phase 2 — Refinement | Implemented and verified | Approved |
| Period Analysis Phase 3 — Polish | Implemented and verified | Awaiting final approval |

## Active-plan implementation record

### Phase 1 — Characterization and React architecture

- [x] Preserved the existing API endpoints, parameters, response types, calculations, and request lifecycle behavior.
- [x] Reduced `App.tsx` to application-shell and shared-overlay coordination responsibilities.
- [x] Extracted domain contracts to `frontend/src/domain/`.
- [x] Extracted request serialization and API calls to `frontend/src/api/`.
- [x] Extracted pure UTC, MW, error, and metric formatting to `frontend/src/lib/`.
- [x] Extracted the single-day and period workflows to `frontend/src/features/`.
- [x] Extracted shared analysis, application, feedback, and overlay components to `frontend/src/components/`.
- [x] Retained independent forecast/comparison abort controllers, request IDs, applied-scenario version checks, and stale-response rejection.
- [x] Retained period-day selection from the embedded range response without issuing another request.
- [x] Verified initial forecast loading, analysis-mode switching, and retrospective comparison in the browser.

### Phase 2 — Header and primary navigation

- [x] Renamed the modes to **Day analysis** and **Period analysis**.
- [x] Kept Chakra UI v3 `SegmentGroup` semantics and keyboard behavior.
- [x] Prevented labels from wrapping and gave both navigation choices stable, equal space.
- [x] Kept Methodology visually separate from primary navigation.
- [x] Removed the unintended Chakra inset root shadow, elevated indicator shadow, divider seam, and duplicate focus treatment.
- [x] Retained one flat selected surface and a visible inset keyboard-focus ring.
- [x] Verified mouse selection, arrow-key switching, selected accessibility state, and a 375 px layout.
- [x] User approved the corrected navigation treatment.

### Phase 3 — Forecast-only single-day workspace

- [x] Added the dimension-aware desktop split layout for usable workspaces at or above `1180 × 720` CSS pixels.
- [x] Added a compact scenario rail containing draft controls, the applied/current analysis, and forecast coverage.
- [x] Kept the chart and selected-hour summary stationary in the right analytical canvas.
- [x] Made the hourly-results viewport the only vertical scroller in the desktop right canvas.
- [x] Added a stable bounded table height, sticky header, bottom scroll padding, and fully visible final `23:00` row.
- [x] Kept stacked layouts for narrow or short windows to avoid cramped split panes and nested vertical scrolling.
- [x] Made row selection update the persistent selected-hour summary without a new request.
- [x] Preserved forecast-only, comparison-loading, comparison-success, missing, and conflict behavior.
- [x] Corrected the Recharts presentation with explicit series colors, null gaps, grid lines, a persistent legend, and compact informational tooltips.
- [x] Reduced compact tick typography to `8px` and axis-title typography to `7px`.
- [x] Abbreviated compact Y ticks to `3k`, `6k`, `9k`, and `12k`.
- [x] Shortened compact axis titles to **MW** and **Hour (UTC)** and tightened the Y gutter so neither title overflows the plot bounds.
- [x] Verified the final axis treatment in the live Safari application at the desktop split layout.
- [x] Visual approval granted.

### Phase 4 — Retrospective comparison and information density

- [x] Renamed the switch to **Compare with actuals** and added contextual `InfoPopover`.
- [x] Created reusable Chakra-composed `InfoPopover` component with accessible trigger, 40px interaction target, keyboard support (Enter/Space to open, Escape to dismiss, focus return), and optional methodology navigation.
- [x] Removed the full-width retrospective comparison banner.
- [x] Added compact **Retrospective actuals** badge with informational popover in Current analysis (and in stacked scenario bar).
- [x] Created compact `AccuracyStrip` (~100px high) consolidating MAE, bias, RMSE, and matched coverage into a single block with InfoPopover explaining metrics, context, coverage breakdown, and link to daily methodology.
- [x] Removed permanent helper text from metric cards and removed standalone methodology button row.
- [x] Removed the redundant full-width comparison coverage card.
- [x] Preserved visible loading skeletons, actual retrieval failure alerts with retry, and partial coverage warnings for missing/conflicting readings.
- [x] Extended `ComparisonTable` with sticky headers and bounded scrolling, enabling full desktop split workspace functionality during retrospective comparison.
- [x] Resolved right-edge canvas clipping: replaced fixed `1050px` table minimum width with responsive `680px` compact sizing, added container `overflowX="auto"`, and enforced `minW="0"` / `maxW="100%"` on all right-canvas grid ancestors.
- [x] Verified mouse, keyboard, touch emulation, and responsive layouts across desktop (1440x950, 1440x850, 1280x800) and mobile (375x812).
- [x] Condensed static title helper lines into interactive title `InfoPopover` triggers, reclaiming ~95px of vertical space.
- [x] User approved Phase 4 retrospective comparison workspace and information density.

### Phase 5 — Table, selection, and source-inspection refinement

- [x] Created normalized `HourlyResults.tsx` module containing `HourlyTableShell`, `ForecastTable`, `ComparisonTable`, and semantic `StatusBadge`.
- [x] Preserved explicit `View` and `Inspect sources` button actions on all applicable comparison rows.
- [x] Confirmed Recharts profile tooltip remains strictly informational without side-effects.
- [x] Kept source inspection in Chakra `Drawer` and prevented table row expansion.
- [x] Added dedicated header `CloseButton` (`Drawer.CloseTrigger`) and `restoreFocus` to `SourceInspector`.
- [x] Enhanced focus return in `App.tsx` with `{ preventScroll: true }` to guarantee exact focus restoration to the originating `Inspect sources` button without viewport or table scroll jumping.
- [x] Guaranteed table scroll position is preserved when selecting hours or opening/closing the source inspector drawer.
- [x] Distinct visual treatments for selected row (`3px` left brand indicator, `brand.subtle` fill), hover (`brand.muted` or `surface.raised`), focus-visible ring, missing data (`Unavailable`), and conflict badges (`Data conflict`).
- [x] Added dedicated bottom scroll clearance buffer (`24px`) ensuring row `23:00` and its action buttons are never obscured by panel boundaries or scrollbars.
- [x] Constrained split workspace right canvas to full height (`calc(100dvh - 88px)`) ensuring zero window scroll while keeping the table container as the sole internal vertical scroller.
- [x] User approved Phase 5 table, selection, and source inspection implementation.

### Phase 6 — Responsive, accessibility, and regression hardening

- [x] Verified full responsive matrix across viewports: `1440x900` (desktop split workspace), `1024x768` (desktop stacked), `768x1024` (tablet stacked), `375x812` (mobile with card view and full-screen drawer), and `320x600` (smallest mobile, verified `scrollWidth <= innerWidth` with zero horizontal overflow).
- [x] Verified primary navigation labels (`Day analysis` / `Period analysis`) never wrap or clip across any supported width.
- [x] Verified Period analysis cross-workflow integrity: date range form, overall accuracy summary, daily results pane with independent scroll, in-memory day selection, and hourly detail drilldown.
- [x] Verified global Methodology dialog accessible from header across desktop, tablet, and mobile views.
- [x] Verified accessibility: semantic heading order, overlay titles, visible focus rings across all surface types, full keyboard interactivity (`Tab`, `Enter`, `Space`, `Escape`, arrow keys), and reduced-motion safety (`_motionReduce={{ animation: 'none' }}`).
- [x] Verified all analytical states: forecast loading, success, missing values, conflict badges, comparison off/on, loading, accuracy strip, and source inspection.
- [x] Updated `docs/decisions.md` with single-day workspace scroll rules, boundary conditions, and information-disclosure principles.
- [x] Updated `docs/UI_UX_REFINEMENT_PLAN.md` with cross-reference notice and marked the Definition of Done checklist 100% complete.
- [x] All 6 phases of `SINGLE_DAY_WORKSPACE_REDESIGN_PLAN.md` are now fully implemented and verified.

## Latest verification

- Frontend Oxlint: passed on 27 October 2026 (0 warnings, 0 errors).
- TypeScript and Vite production build: passed on 27 October 2026.
- Backend pytest: passed 42 of 42 tests on 27 October 2026.
- `git diff --check`: passed on 27 October 2026.
- Browser: Responsive matrix verified across 1440px, 1024px, 768px, 375px, and 320px viewports.
- Browser: Methodology dialog verified with clean modal presentation and keyboard dismiss.
- Browser: Period analysis range analysis verified with daily results pane and hourly detail view.
- Screenshots recorded:
  - `viewport_1440_day_1793099627815.png`
  - `viewport_1440_period_1793099657590.png`
  - `viewport_1024_1793099672696.png`
  - `viewport_768_1793099678120.png`
  - `viewport_375_1793099684517.png`
  - `viewport_375_hourly_cards_1793099697599.png`
  - `viewport_375_drawer_1793099710692.png`
  - `viewport_320_1793099728205.png`
  - `methodology_dialog_1793099747835.png`
  - `table_scrolled_fullscreen_4_1793098764273.png`
  - `source_readings_drawer_open_1793098805248.png`
  - `focus_returned_1793098817664.png`

## Status

All six phases of the Single-Day Workspace Redesign Plan are complete, tested, and verified end-to-end.

## Previously completed compact-product stages

These stages predate the active single-day refinement plan and remain implemented:

- [x] Compact application header, shared primary navigation, aligned 44 px filter toolbars, and applied-scenario summaries.
- [x] Shared metric strip, coverage summary, and global methodology dialog.
- [x] Bounded single-day workspace, persistent selected-hour summary, sticky hourly tables, and source-inspector drawer.
- [x] Viewport-aware period master-detail layout with independent pane scrolling and in-memory day selection.
- [x] Adaptive toolbars, stacked tablet workflow, mobile detail drawer, nested source inspection, and list-position/focus restoration.
- [x] Final cross-workflow responsive/accessibility approval completed in Phase 6.

## Earlier UI/UX refinement record

- [x] Audited the original interface and created the phased UI/UX handoff.
- [x] Approved the “trustworthy energy-market intelligence” visual direction.
- [x] Completed the responsive workflow structure, Chakra-first controls, mobile result cards, decision-first ordering, and unambiguous UTC entry.
- [x] Completed the semantic visual system, consolidated coverage, metric hierarchy, and chart integration.
- [x] Implemented structural skeletons, intentional empty states, table interaction, comparison guidance, and reduced-motion-safe transitions.
- [x] Corrected chart colors, axes, ticks, grid intervals, legend cues, tooltip hierarchy, and the chart surface.
- [x] The remaining final UI/UX approval is covered and completed across Phases 1–6.

## Phase 1

- [x] Inspect the existing backend and frontend structure, dependencies, API conventions, and test setup.
- [x] Verify the official Elexon `WINDFOR` contract and inspect the relevant January 2026 records.
- [x] Implement backend fetching and latest-eligible-publication selection.
- [x] Define missing-hour and deterministic duplicate behavior.
- [x] Add the fixed-scenario API and focused backend tests.
- [x] Build the Chakra UI forecast table and explicit loading/error/empty/missing states.
- [x] Complete automated checks and live end-to-end review.

## Verified source observations

- `WINDFOR` records expose `dataset`, `publishTime`, `startTime`, and `generation`.
- Forecast targets for this scenario are hourly.
- The inspected 24-hour publication window contains eight publication batches and 584 total records.
- For all 24 delivery hours on 16 January, the latest eligible publication before the 10:00 UTC cutoff is 15 January 2026 at 09:30 UTC.
- No duplicate `(startTime, publishTime)` keys occurred in the inspected records.

## Completed checks

- Backend: `4 passed` with pytest, covering cutoff selection, missing hours, identical/conflicting duplicates, the route response, and upstream failure handling.
- Frontend: TypeScript/Vite production build passed.
- Frontend: Oxlint passed without warnings.
- Live backend: Elexon returned 584 source records; the selector returned 24 of 24 hourly values.
- Browser journey: the page loaded through the existing Vite-to-FastAPI connection and displayed all 24 hours, including 7,472 MW at 00:00, 7,802 MW at 12:00, and 10,566 MW at 23:00. Each selected publication was 15 January 2026 at 09:30 UTC.

## Phase 2

- [x] Generalize the API for January decision dates and UTC cutoff times while preserving defaults.
- [x] Add strict HTTP 422 validation and next-calendar-day delivery derivation.
- [x] Return coverage and 24-hour retrieval-window metadata.
- [x] Add draft scenario controls and stale-response protection.
- [x] Add a Recharts forecast profile with gaps for missing/conflicting hours.
- [x] Preserve the detailed table and explicit loading/error/empty/partial/conflict states.
- [x] Extend backend tests for boundaries, validation, dynamic cutoff selection, coverage, and regressions.
- [x] Complete live January 1, January 15, and January 31 journey review.

## Phase 2 verification

- Backend: `8 passed` with pytest. Coverage includes default compatibility, January boundaries, exact input validation, next-day derivation, cutoff-dependent selection, 24-hour enumeration, missing/conflicting duplicates, coverage totals, and upstream HTTP 502 handling.
- Frontend: Oxlint passed without warnings.
- Frontend: TypeScript and the Vite production build passed. Vite reports that the Recharts-containing bundle is larger than its 500 kB advisory threshold.
- Live January 1 at 10:00 UTC: delivery mapped to January 2 with 24 available hours.
- Live January 15 at 10:00 UTC: delivery mapped to January 16 with 24 available hours; the default scenario remains unchanged.
- Live January 31 at 10:00 UTC: delivery mapped to February 1 with 24 available hours.
- Live cutoff comparison on January 15: 08:00 selected the 07:30 publication and 7,398 MW for the first hour; 10:00 selected the 09:30 publication and 7,472 MW. Every selected publication was at or before its applied cutoff.
- Browser: controls, applied scenario, coverage, chart, and table were reviewed for all three boundary/default dates.
- Browser request race: January 1 and January 31 were applied consecutively before the first request completed; only the January 31 cutoff and February 1 delivery result was displayed.

## Phase 3

- [x] Verify the official FUELHH contract, units, half-hour semantics, boundaries, and representative records.
- [x] Document the forecast/actual semantic limitation and explicit hourly averaging convention.
- [x] Add FUELHH retrieval, local WIND/day filtering, duplicate handling, and exact half-hour enumeration.
- [x] Add `GET /api/wind-comparison` with 24 aligned rows and separate coverage.
- [x] Preserve `GET /api/wind-forecast` behavior and forecast selection reuse.
- [x] Add the optional retrospective comparison UI, dual-series chart, source-reading details, and signed errors.
- [x] Preserve forecast usability and retry when actual retrieval fails.
- [x] Add focused backend comparison and regression tests.
- [x] Complete live comparison review for January 1, January 15, and January 31 decisions.

## Phase 3 verification

- Backend: `18 passed` with pytest, including all Phase 1/2 forecast regressions and the Phase 3 averaging, signed error, genuine-zero, missing/conflict, duplicate, filtering, 23:00 alignment, February delivery, matched coverage, and actual-upstream failure cases.
- Frontend: Oxlint passed without warnings.
- Frontend: TypeScript and Vite production build passed. The existing Recharts bundle-size advisory remains; the minified JavaScript bundle is approximately 888 kB before gzip.
- Live January 1 decision: January 2 delivery returned 24 forecast, 24 actual, and 24 matched hours. The first hourly actual was `(15,228 + 15,505) / 2 = 15,366.5 MW`; error was `18,699 − 15,366.5 = +3,332.5 MW`.
- Live January 15 decision: January 16 delivery returned 24/24/24 coverage. The first hourly actual was `(7,477 + 7,194) / 2 = 7,335.5 MW`; error was `+136.5 MW`.
- Live January 31 decision: February 1 delivery returned 24/24/24 coverage. The 23:00 row used the 23:00 and 23:30 readings, averaged to 5,216 MW, and produced `−209 MW` error.
- All three responses contained exactly 24 rows; every selected forecast publication was at or before its applied cutoff, and every non-null error matched forecast minus actual.
- Browser: forecast and actual chart series, coverage, signed errors, publication provenance, and accessible half-hour disclosures agreed with the API for all three scenarios.
- Browser race: disabling comparison immediately after applying a new scenario aborted/ignored the comparison request and displayed only the correct new forecast result.

## Phase 4

- [x] Add a reusable, network-independent daily accuracy calculator.
- [x] Extend the comparison response with MAE, bias, RMSE, matched counts, and coverage status.
- [x] Keep existing comparison retrieval, alignment, chart, table, provenance, error handling, and request-race protection unchanged.
- [x] Add comparison-only Chakra UI summaries, shared coverage, and methodology disclosure above the existing chart.
- [x] Cover complete, partial, unavailable, perfect, zero-generation, missing/conflict, and unrounded calculation behavior with focused backend tests.
- [x] Independently recalculate a live complete-day response from its hourly rows.

## Phase 4 verification

- Backend: `27 passed` with pytest, including the hand-checkable `+300`/`−100` fixture: MAE `200`, bias `+100`, and RMSE approximately `223.60679775` MW.
- Focused tests verify perfect predictions, zero and one matched rows, missing/conflicting exclusions, genuine zero generation, unrounded inputs, coverage agreement, and the additive API response.
- Frontend: Oxlint passed without warnings; TypeScript and the Vite production build passed. The existing Recharts bundle-size advisory remains (approximately 891 kB minified before gzip).
- Live default comparison: 24 matched hours produced MAE `858.7083333333334`, bias `396.625`, and RMSE `1084.8288075390822` MW. An independent reduction of the 24 response-row errors matched every reported value exactly.
- The successful complete-day response reports `complete`, 24 matched, and zero excluded hours. Controlled automated fixtures verify `partial` for one matched row and `unavailable` with null metrics for zero matched rows.
- Headless browser review confirmed the complete live summary (`858.7`, `+396.6`, and `1,084.8 MW`), retrospective label, shared coverage, and methodology disclosure.
- Temporary in-browser mocked responses, without production-data changes, confirmed partial coverage (`2 of 24`, `22 excluded`), display-only negative-zero normalization, and unavailable coverage with all metrics labeled `Unavailable`.

## Phase 5

- [x] Add strict January range parsing and the typed `GET /api/wind-accuracy` contract.
- [x] Reuse the forecast, actual-alignment, comparison, and daily-accuracy services for every requested day.
- [x] Pool unrounded hourly errors and separate successful-day exclusions from failed-day hours.
- [x] Preserve every requested day with retrieval status and stable source-specific failure details.
- [x] Add one shared four-request upstream limit and a process-local 15-minute/128-entry LRU cache.
- [x] Add an opt-in Period accuracy view with request-race protection, failure retry, daily results, and in-memory daily drilldown.
- [x] Preserve the existing single-day experience and endpoints.

## Phase 5 verification

- Backend: `42 passed` with pytest. Tests cover 31 days/744 hours, 1 February delivery, one-day equivalence, validation, cutoff selection, pooled arithmetic, unequal daily coverage, failure denominators, zero matches, four-request concurrency, cache reuse/expiry/key separation/eviction, and failure non-caching.
- Aggregation fixture (`+300`, `−100`, `+600`) produced MAE `333.333333…`, bias `266.666666…`, and RMSE `391.578004…` MW. Overall RMSE differs from the average of daily RMSE values.
- Frontend: Oxlint and the TypeScript/Vite production build passed. The existing Recharts bundle advisory remains; JavaScript is approximately 900 kB minified before gzip.
- Live one-day range for 15 January exactly matched the existing comparison endpoint’s 24 rows and daily accuracy.
- Live 1–31 January analysis returned 31 successful daily entries, 744/744 matched hours, 1 February as the last delivery day, MAE `2013.008064516129`, bias `1729.9314516129032`, and RMSE `2505.943149370381` MW. An independent reduction of all returned hourly errors matched exactly.
- In a clean backend process, the cold full-month service analysis took `12.85 s` and made 62 Elexon requests. An immediate cached repeat took `0.037 s` and made zero additional Elexon requests. These are observations from the verification environment, not performance guarantees.
- Headless browser review confirmed the live full-month summary, 31/31 day counts, retrospective/methodology text, and a daily drilldown without another range request.
- Temporary browser mocks confirmed partial-failure accounting and retry, zero-match `Unavailable` metrics, and rapid consecutive analyses retaining only the newer applied range.

## Remaining limitations

- The source cache is per process, in memory, and cleared by restart; multiple workers do not share entries.
- Elexon latency determines cold analysis time, and a full cold month needs up to 62 source requests.
- The hourly forecast/actual alignment remains a project convention because WINDFOR interval-average semantics are unverified.
- Phase 5 intentionally adds no accuracy percentage, confidence interval, correction, purchase recommendation, export, persistent job system, or additional chart.

## UI/UX Enhancements — Layout, Date/Time Pickers, and Information Density

- [x] **Global UTC Clarification & De-duplication**:
  - Removed repeated ` UTC` suffixes across all timestamps (`formatTimestamp`, `formatHour`), table cells, scenario chips, and chart tooltips.
  - Stated global UTC convention clearly in the application header: `Wind intelligence · January 2026 · All timestamps UTC`.
  - Added a dedicated "Timezone convention" section in `MethodologyDialog.tsx`.
- [x] **Unsquished Right-Side Canvas & On-Demand 24-Hour Table**:
  - Converted the permanent 24-row comparison table from the desktop right canvas into an on-demand slide-out `Drawer` (`HourlyBreakdownDrawer`).
  - Added an action button `Hourly comparison table (24h)` (with custom table glyph) directly in the profile header and mobile canvas.
  - Expanded `ForecastChart` height from cramped 180 px to generous 350 px with spacious curves, axes, and ticks.
  - Retained source inspection from both the `SelectedHourSummary` on the main page and from inside the `HourlyBreakdownDrawer`.
- [x] **Selected Hour Card Styling**:
  - Removed the thickened `borderInlineStartWidth="4px"` from `SelectedHourSummary` to eliminate the heavy left border.
  - Styled with subtle, uniform `borderWidth="1px"` and `borderColor="border.subtle"` matching design tokens.
- [x] **January 2026 Restricted Chakra UI DatePicker**:
  - Created `frontend/src/components/ui/DatePicker.tsx` (`JanuaryDatePicker`) using Chakra UI v3 `DatePicker` components.
  - Constrained strictly to January 2026 with `min={parseDate('2026-01-01')}`, `max={parseDate('2026-01-31')}`, and `isDateUnavailable`.
  - Disabled navigation to other months/years and prevented picking dates outside January 2026.
  - Replaced native date inputs across Single Day and Period analysis workflows.
- [x] **Chakra UI-Blended TimePicker for Cutoff Time**:
  - Created `frontend/src/components/ui/TimePicker.tsx` matching Chakra UI design tokens and typography.
  - Features 8 operational cutoff presets (`09:00`, `11:00`, `12:00`, `14:00`, `16:00`, `17:00`, `22:00`, `23:00`), scrollable hour (`00`–`23`) and minute lists, and manual entry with 24h format validation.
  - Replaced cutoff inputs across Single Day and Period analysis workflows.

### Enhancements Verification
- Automated tests: 42/42 backend tests pass in 0.39s.
- Linter & Build: `oxlint` 0 warnings, `tsc -b && vite build` succeeded without error.
- Browser test: Verified in Chrome with live Elexon data. Verified date picker restricted bounds, cutoff time selection, unsquished chart profile at 350 px, clean card styling, and slide-out 24-hour table drawer with source inspection.
