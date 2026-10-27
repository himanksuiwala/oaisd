export type DataStatus = 'available' | 'missing' | 'conflict'

export type ForecastHour = {
  target_time: string
  generation_mw: number | null
  publish_time: string | null
  status: DataStatus
}

export type Coverage = {
  expected_hours: 24
  available_hours: number
  missing_hours: number
  conflicting_hours: number
}

export type ForecastResponse = {
  decision_time: string
  delivery_date: string
  unit: 'MW'
  source: 'Elexon WINDFOR'
  source_record_count: number
  retrieval_lookback_hours: 24
  coverage: Coverage
  hours: ForecastHour[]
}

export type ActualReading = {
  target_time: string
  generation_mw: number | null
  publish_time: string | null
  status: DataStatus
}

export type ComparisonHour = {
  target_time: string
  forecast_mw: number | null
  forecast_publish_time: string | null
  forecast_status: DataStatus
  actual_readings: ActualReading[]
  actual_mw: number | null
  actual_status: DataStatus
  error_mw: number | null
}

export type ComparisonResponse = {
  decision_time: string
  delivery_date: string
  unit: 'MW'
  forecast_source: 'Elexon WINDFOR'
  actual_source: 'Elexon FUELHH'
  forecast_source_record_count: number
  actual_source_record_count: number
  retrieval_lookback_hours: 24
  actual_retrieved_at: string
  alignment_policy: 'mean_of_two_half_hourly_average_mw'
  coverage: {
    forecast: Coverage
    actual: Coverage
    matched: {
      expected_hours: 24
      matched_hours: number
      unmatched_hours: number
    }
  }
  accuracy: {
    mae_mw: number | null
    bias_mw: number | null
    rmse_mw: number | null
    matched_hours: number
    expected_hours: 24
    unmatched_hours: number
    coverage_status: 'complete' | 'partial' | 'unavailable'
  }
  hours: ComparisonHour[]
}

export type RangeAccuracy = {
  mae_mw: number | null
  bias_mw: number | null
  rmse_mw: number | null
  expected_hours: number
  matched_hours: number
  unmatched_hours: number
  successful_day_unmatched_hours: number
  failed_day_hours: number
  coverage_status: 'complete' | 'partial' | 'unavailable'
}

export type DailyRangeResult = {
  decision_date: string
  decision_time: string
  delivery_date: string
  retrieval_status: 'success' | 'failed'
  failed_source: 'forecast' | 'actual' | null
  failure_message: string | null
  comparison: ComparisonResponse | null
}

export type RangeResponse = {
  decision_date_from: string
  decision_date_to: string
  cutoff_time: string
  first_delivery_date: string
  last_delivery_date: string
  unit: 'MW'
  retrieval_lookback_hours: 24
  alignment_policy: 'mean_of_two_half_hourly_average_mw'
  analysis_completed_at: string
  day_counts: {
    expected_days: number
    successful_days: number
    failed_days: number
  }
  overall_accuracy: RangeAccuracy
  days: DailyRangeResult[]
}

export type Scenario = {
  decisionDate: string
  cutoffTime: string
}

export type ForecastState =
  | { status: 'loading'; scenario: Scenario }
  | { status: 'error'; scenario: Scenario; message: string }
  | { status: 'success'; data: ForecastResponse }

export type ComparisonState =
  | { status: 'off' }
  | { status: 'loading'; scenario: Scenario }
  | { status: 'error'; scenario: Scenario; message: string }
  | { status: 'success'; data: ComparisonResponse }

export type RangeScenario = {
  decisionDateFrom: string
  decisionDateTo: string
  cutoffTime: string
}

export type RangeState =
  | { status: 'idle' }
  | { status: 'loading'; scenario: RangeScenario }
  | { status: 'error'; scenario: RangeScenario; message: string }
  | { status: 'success'; data: RangeResponse; scenario: RangeScenario }

export const DEFAULT_SCENARIO: Scenario = {
  decisionDate: '2026-01-15',
  cutoffTime: '10:00',
}

export const DEFAULT_RANGE: RangeScenario = {
  decisionDateFrom: '2026-01-01',
  decisionDateTo: '2026-01-31',
  cutoffTime: '10:00',
}
