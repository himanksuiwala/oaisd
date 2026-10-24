# Progress

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

## Phase 3 handoff

Introduce actual wind generation from Elexon `FUELHH`, define the hourly alignment/aggregation policy for half-hourly outturn, and calculate forecast error only after those domain decisions are documented and tested. Preserve the selected forecast publication timestamp as provenance for every comparison.
