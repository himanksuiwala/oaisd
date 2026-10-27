import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Drawer,
  EmptyState,
  Field,
  Flex,
  Grid,
  Heading,
  Portal,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { ForecastChart } from '../../ForecastChart.tsx'
import { fetchPeriodAccuracy } from '../../api/windAnalysisApi.ts'
import { AnalysisToolbar } from '../../components/analysis/AnalysisShell.tsx'
import { AccuracySummary, SelectedHourSummary } from '../../components/analysis/AnalysisResults.tsx'
import { InfoPopover } from '../../components/overlays/InfoPopover.tsx'
import type { MethodologySection } from '../../components/overlays/MethodologyDialog.tsx'
import { JanuaryDatePicker } from '../../components/ui/DatePicker.tsx'
import { TimePicker } from '../../components/ui/TimePicker.tsx'
import {
  DEFAULT_RANGE,
  type ComparisonHour,
  type DailyRangeResult,
  type RangeResponse,
  type RangeScenario,
  type RangeState,
} from '../../domain/windAnalysis.ts'
import { formatDate, formatMetric, formatTimestamp } from '../../lib/windFormatters.ts'
import { useWorkspaceSplitLayout } from '../../lib/useWorkspaceSplitLayout.ts'
import { HourlyBreakdownDrawer, TableGlyph } from '../shared-analysis/HourlyBreakdownDrawer.tsx'
import { PeriodAccuracyStrip } from '../shared-analysis/PeriodAccuracyStrip.tsx'
import { PeriodAnalysisSkeleton } from './PeriodAnalysisSkeleton.tsx'

type DailyResultsPaneProps = {
  days: DailyRangeResult[]
  selectedDay: DailyRangeResult | null
  splitLayout: boolean
  onSelectDay: (day: DailyRangeResult, trigger: HTMLElement) => void
}

function DailyResultsPane({ days, selectedDay, splitLayout, onSelectDay }: DailyResultsPaneProps) {
  return (
    <Stack as="section" aria-labelledby="daily-results-title" gap="3" minH="0" flex={splitLayout ? '1' : undefined}>
      <Box flexShrink="0">
        <Heading as="h2" id="daily-results-title" size="md">Daily results</Heading>
        <Text color="text.secondary" fontSize="xs" mt="0.5">Select an available delivery day to update the detail.</Text>
      </Box>

      <Stack display={splitLayout ? 'none' : { base: 'flex', lg: 'none' }} gap="3">
        {days.map((day) => {
          const accuracy = day.comparison?.accuracy
          const selected = selectedDay?.decision_date === day.decision_date
          const selectable = day.retrieval_status === 'success' && Boolean(day.comparison)
          return (
            <Card.Root
              key={day.decision_date}
              variant="outline"
              bg={selected ? 'brand.subtle' : 'surface.panel'}
              borderColor={selected ? 'brand.emphasized' : 'border.subtle'}
              borderInlineStartWidth={selected ? '4px' : '1px'}
            >
              <Card.Body p="4">
                <Flex justify="space-between" align="start" gap="3" mb="3">
                  <Box>
                    <Text color="text.secondary" fontSize="xs">Delivery day</Text>
                    <Text fontWeight="semibold">{formatDate(day.delivery_date)}</Text>
                    <Text color="text.secondary" fontSize="xs">Decision {formatDate(day.decision_date)}</Text>
                  </Box>
                  {day.retrieval_status === 'failed' && <Badge colorPalette="caution">Failed: {day.failed_source}</Badge>}
                </Flex>
                {accuracy ? (
                  <SimpleGrid columns={2} gap="3" mb="3">
                    <Box>
                      <Text color="text.secondary" fontSize="xs">MAE</Text>
                      <Text fontSize="lg" fontWeight="bold" fontVariantNumeric="tabular-nums">{formatMetric(accuracy.mae_mw)}</Text>
                    </Box>
                    <Box textAlign="end">
                      <Text color="text.secondary" fontSize="xs">Matched hours</Text>
                      <Text fontWeight="semibold" fontVariantNumeric="tabular-nums">{accuracy.matched_hours} / 24</Text>
                    </Box>
                  </SimpleGrid>
                ) : (
                  <Text color="text.secondary" fontSize="sm" mb="3">{day.failure_message ?? 'No daily result is available.'}</Text>
                )}
                {selectable && (
                  <Button
                    size="sm"
                    minH="11"
                    variant={selected ? 'solid' : 'outline'}
                    colorPalette="brand"
                    onClick={(event) => onSelectDay(day, event.currentTarget)}
                    width={{ base: 'full', sm: 'auto' }}
                  >
                    {selected ? 'Selected day' : 'View day detail'}
                  </Button>
                )}
              </Card.Body>
            </Card.Root>
          )
        })}
      </Stack>

      <Box
        display={splitLayout ? 'block' : { base: 'none', lg: 'block' }}
        borderWidth="1px"
        borderColor="border.subtle"
        rounded="lg"
        minH="0"
        flex={splitLayout ? '1' : undefined}
        overflowY={splitLayout ? 'auto' : 'visible'}
        overscrollBehavior={splitLayout ? 'contain' : undefined}
        scrollbarGutter={splitLayout ? 'stable' : undefined}
      >
        <Table.Root size="sm">
          <Table.Header bg="surface.raised" position="sticky" top="0" zIndex="2">
            <Table.Row>
              <Table.ColumnHeader>{splitLayout ? 'Delivery day' : 'Decision / delivery'}</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">MAE</Table.ColumnHeader>
              {!splitLayout && <Table.ColumnHeader textAlign="end">Bias</Table.ColumnHeader>}
              {!splitLayout && <Table.ColumnHeader textAlign="end">RMSE</Table.ColumnHeader>}
              <Table.ColumnHeader>Coverage</Table.ColumnHeader>
              <Table.ColumnHeader>Exception</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {days.map((day) => {
              const accuracy = day.comparison?.accuracy
              const selectable = day.retrieval_status === 'success' && Boolean(day.comparison)
              const selected = selectedDay?.decision_date === day.decision_date
              return (
                <Table.Row
                  key={day.decision_date}
                  aria-selected={selected}
                  tabIndex={selectable ? 0 : undefined}
                  cursor={selectable ? 'pointer' : 'default'}
                  bg={selected ? 'brand.subtle' : undefined}
                  color={selectable ? undefined : 'text.secondary'}
                  transition="background 140ms ease-out"
                  _hover={selectable ? { bg: selected ? 'brand.muted' : 'surface.raised' } : undefined}
                  _focusVisible={{ outline: '2px solid', outlineColor: 'focus.ring', outlineOffset: '-2px', zIndex: 1 }}
                  onClick={(event) => { if (selectable) onSelectDay(day, event.currentTarget) }}
                  onKeyDown={(event) => {
                    if (selectable && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault()
                      onSelectDay(day, event.currentTarget)
                    }
                  }}
                >
                  <Table.Cell borderInlineStartWidth="3px" borderInlineStartColor={selected ? 'brand.emphasized' : 'transparent'}>
                    <Text fontWeight="semibold">{formatDate(splitLayout ? day.delivery_date : day.decision_date)}</Text>
                    <Text color="text.secondary" fontSize="xs">{splitLayout ? `Decision ${formatDate(day.decision_date)}` : `Delivery ${formatDate(day.delivery_date)}`}</Text>
                    {day.retrieval_status === 'failed' && day.failure_message && (
                      <Text color="status.caution" fontSize="xs" lineClamp="1" title={day.failure_message}>{day.failure_message}</Text>
                    )}
                  </Table.Cell>
                  <Table.Cell textAlign="end" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">{formatMetric(accuracy?.mae_mw ?? null)}</Table.Cell>
                  {!splitLayout && <Table.Cell textAlign="end" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">{formatMetric(accuracy?.bias_mw ?? null, true)}</Table.Cell>}
                  {!splitLayout && <Table.Cell textAlign="end" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">{formatMetric(accuracy?.rmse_mw ?? null)}</Table.Cell>}
                  <Table.Cell whiteSpace="nowrap" fontVariantNumeric="tabular-nums">{accuracy ? `${accuracy.matched_hours} / 24` : '—'}</Table.Cell>
                  <Table.Cell>
                    {day.retrieval_status === 'failed'
                      ? <Badge colorPalette="caution">{day.failed_source ? `${day.failed_source} failed` : 'Failed'}</Badge>
                      : <Text color="text.secondary" fontSize="xs" aria-label="No exception">—</Text>}
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table.Root>
        {splitLayout && <Box h="6" aria-hidden="true" />}
      </Box>
    </Stack>
  )
}

function PeriodOverview({ data, onOpenMethodology, onRetry }: { data: RangeResponse; onOpenMethodology: (section: MethodologySection) => void; onRetry: () => void }) {
  const accuracy = data.overall_accuracy
  const complete = accuracy.coverage_status === 'complete' && data.day_counts.failed_days === 0

  return (
    <Stack gap="3" flexShrink="0">
      <PeriodAccuracyStrip data={data} onOpenMethodology={onOpenMethodology} />
      {!complete && (
        <Alert.Root status="warning" size="sm" py="2" px="3" alignItems="center" rounded="md">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title fontSize="sm">Partial period result</Alert.Title>
            <Alert.Description fontSize="xs">
              Metrics use matched hours only.
              {data.day_counts.failed_days > 0
                ? ` ${data.day_counts.failed_days} days failed retrieval.`
                : ' Some hourly forecast–actual pairs were excluded.'}
            </Alert.Description>
          </Alert.Content>
          {data.day_counts.failed_days > 0 && <Button size="sm" minH="10" variant="outline" onClick={onRetry}>Retry</Button>}
        </Alert.Root>
      )}
    </Stack>
  )
}

type PeriodDayDetailProps = {
  day: DailyRangeResult | null
  selectedHourTarget: string | null
  splitLayout: boolean
  hasSuccessfulDay: boolean
  onSelectHour: (targetTime: string) => void
  onOpenMethodology: (section: MethodologySection) => void
  onInspectSources: (hour: ComparisonHour, trigger: HTMLButtonElement) => void
}

function PeriodDayDetail({ day, selectedHourTarget, splitLayout, hasSuccessfulDay, onSelectHour, onOpenMethodology, onInspectSources }: PeriodDayDetailProps) {
  const [hourlyDrawerOpen, setHourlyDrawerOpen] = useState(false)
  const [hourlyDrawerTrigger, setHourlyDrawerTrigger] = useState<HTMLButtonElement | null>(null)
  const comparison = day?.retrieval_status === 'success' ? day.comparison : null

  if (!comparison || !day) {
    return (
      <EmptyState.Root minH="64" py="10">
        <EmptyState.Content>
          <EmptyState.Title>{hasSuccessfulDay ? 'Select a delivery day' : 'No successful days available'}</EmptyState.Title>
          <EmptyState.Description>
            {hasSuccessfulDay
              ? 'Choose an available day from Daily results to open its comparison.'
              : 'Every requested day failed retrieval. Review the exceptions and retry the period analysis.'}
          </EmptyState.Description>
        </EmptyState.Content>
      </EmptyState.Root>
    )
  }

  const forecastHours = comparison.hours.map((hour) => ({
    target_time: hour.target_time,
    generation_mw: hour.forecast_mw,
    publish_time: hour.forecast_publish_time,
    status: hour.forecast_status,
  }))
  const selectedForecastHour = forecastHours.find((hour) => hour.target_time === selectedHourTarget) ?? forecastHours[0]
  const selectedComparisonHour = comparison.hours.find((hour) => hour.target_time === selectedForecastHour?.target_time)

  return (
    <Stack as="section" aria-labelledby="selected-day-title" gap="3" minW="0">
      <Box>
        <Heading as="h2" id="selected-day-title" size="md">{formatDate(day.delivery_date)} comparison</Heading>
        <Text color="text.secondary" fontSize="xs" mt="0.5">Decision {formatTimestamp(day.decision_time)}</Text>
      </Box>
      <AccuracySummary accuracy={comparison.accuracy} coverage={comparison.coverage} onOpenMethodology={onOpenMethodology} />
      <Flex justify="space-between" align="center" gap="3" wrap="wrap">
        <Flex align="center" gap="1.5" minW="0">
          <Heading as="h3" size="sm">Forecast and actual profile</Heading>
          <InfoPopover title="Profile chart conventions" ariaLabel="About profile chart conventions">
            <Stack gap="2">
              <Text>Delivery hour plotted against generation in MW. Missing and conflicting readings appear as gaps.</Text>
              <Box pt="1.5" borderTopWidth="1px" borderColor="border.subtle">
                <Text fontWeight="semibold" color="fg" mb="0.5">Actual generation alignment</Text>
                <Text>The hourly actual is the arithmetic mean of the two FUELHH half-hour averages at H and H+30. Both readings are required.</Text>
                <Text color="text.secondary" mt="1">Actual retrieved {formatTimestamp(comparison.actual_retrieved_at)}.</Text>
              </Box>
            </Stack>
          </InfoPopover>
        </Flex>
        <Button
          variant="outline"
          colorPalette="brand"
          size="sm"
          onClick={(event) => {
            setHourlyDrawerTrigger(event.currentTarget)
            setHourlyDrawerOpen(true)
          }}
        >
          <TableGlyph /> Hourly comparison table (24h)
        </Button>
      </Flex>
      <ForecastChart hours={forecastHours} comparisonHours={comparison.hours} compact={splitLayout} />
      {selectedForecastHour && <SelectedHourSummary forecast={selectedForecastHour} comparison={selectedComparisonHour} onInspectSources={onInspectSources} />}
      {!splitLayout && (
        <Button
          variant="outline"
          colorPalette="brand"
          width="full"
          minH="11"
          onClick={(event) => {
            setHourlyDrawerTrigger(event.currentTarget)
            setHourlyDrawerOpen(true)
          }}
        >
          <TableGlyph /> View full 24-hour comparison breakdown
        </Button>
      )}
      <HourlyBreakdownDrawer
        open={hourlyDrawerOpen}
        onOpenChange={setHourlyDrawerOpen}
        comparisonData={comparison}
        forecastHours={forecastHours}
        selectedTargetTime={selectedForecastHour?.target_time ?? ''}
        onSelectHour={onSelectHour}
        onInspectSources={onInspectSources}
        deliveryDate={day.delivery_date}
        returnFocusTo={hourlyDrawerTrigger}
      />
    </Stack>
  )
}

function MobilePeriodDetailDrawer({ open, day, selectedHourTarget, onOpenChange, onSelectHour, onOpenMethodology, onInspectSources }: { open: boolean; day: DailyRangeResult | null; selectedHourTarget: string | null; onOpenChange: (open: boolean) => void; onSelectHour: (targetTime: string) => void; onOpenMethodology: (section: MethodologySection) => void; onInspectSources: (hour: ComparisonHour, trigger: HTMLButtonElement) => void }) {
  return (
    <Drawer.Root open={open} onOpenChange={(details) => onOpenChange(details.open)} placement="end" size="full" lazyMount unmountOnExit>
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header borderBottomWidth="1px" borderColor="border.subtle">
              <Drawer.Title>Selected-day analysis</Drawer.Title>
              <Drawer.CloseTrigger asChild><Button variant="outline" size="sm" minH="11">Back to days</Button></Drawer.CloseTrigger>
            </Drawer.Header>
            <Drawer.Body py="4" overflowY="auto">
              <PeriodDayDetail day={day} selectedHourTarget={selectedHourTarget} splitLayout={false} hasSuccessfulDay={Boolean(day)} onSelectHour={onSelectHour} onOpenMethodology={onOpenMethodology} onInspectSources={onInspectSources} />
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}

function useMobileLayout() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const update = () => setEnabled(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return enabled
}

export function PeriodAnalysis({ onOpenMethodology, onInspectSources }: { onOpenMethodology: (section: MethodologySection) => void; onInspectSources: (hour: ComparisonHour, trigger: HTMLButtonElement) => void }) {
  const splitLayout = useWorkspaceSplitLayout()
  const mobileLayout = useMobileLayout()
  const [draft, setDraft] = useState<RangeScenario>(DEFAULT_RANGE)
  const [state, setState] = useState<RangeState>({ status: 'idle' })
  const [selectedDay, setSelectedDay] = useState<DailyRangeResult | null>(null)
  const [selectedHourTarget, setSelectedHourTarget] = useState<string | null>(null)
  const [mobileDetail, setMobileDetail] = useState<{ open: boolean; trigger: HTMLElement | null; scrollY: number }>({ open: false, trigger: null, scrollY: 0 })
  const request = useRef<{ id: number; controller: AbortController } | null>(null)
  const nextRequestId = useRef(0)

  const loadAnalysis = useCallback(async (scenario: RangeScenario) => {
    request.current?.controller.abort()
    const controller = new AbortController()
    const id = ++nextRequestId.current
    request.current = { id, controller }
    setSelectedDay(null)
    setState({ status: 'loading', scenario })
    try {
      const data = await fetchPeriodAccuracy(scenario, controller.signal)
      if (request.current?.id === id) {
        setState({ status: 'success', data, scenario })
        setSelectedDay(data.days.find((day) => day.retrieval_status === 'success' && day.comparison) ?? null)
        setSelectedHourTarget(null)
      }
    } catch (error) {
      if (controller.signal.aborted || request.current?.id !== id) return
      setState({ status: 'error', scenario, message: error instanceof Error ? error.message : 'An unexpected error occurred.' })
    }
  }, [])

  useEffect(() => () => request.current?.controller.abort(), [])

  function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void loadAnalysis({ ...draft })
  }

  function selectDay(day: DailyRangeResult, trigger: HTMLElement) {
    setSelectedDay(day)
    setSelectedHourTarget(null)
    if (mobileLayout) setMobileDetail({ open: true, trigger, scrollY: window.scrollY })
  }

  function setMobileDetailOpen(open: boolean) {
    if (open) return
    const { trigger, scrollY } = mobileDetail
    setMobileDetail((current) => ({ ...current, open: false }))
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: 'auto' })
      trigger?.focus({ preventScroll: true })
    })
  }

  return (
    <Stack gap={{ base: 4, md: 5 }} minW="0">
      <form id="period-analysis-form" onSubmit={analyze}>
        <AnalysisToolbar label="Period parameters">
          <Grid templateColumns={{ base: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr)) auto' }} gap="3" alignItems="end" minW="0">
            <Field.Root required minW="0"><Field.Label fontSize="xs">Decision start</Field.Label><JanuaryDatePicker value={draft.decisionDateFrom} onChange={(date) => setDraft((current) => ({ ...current, decisionDateFrom: date }))} min="2026-01-01" max="2026-01-31" required /></Field.Root>
            <Field.Root required minW="0"><Field.Label fontSize="xs">Decision end</Field.Label><JanuaryDatePicker value={draft.decisionDateTo} onChange={(date) => setDraft((current) => ({ ...current, decisionDateTo: date }))} min="2026-01-01" max="2026-01-31" required /></Field.Root>
            <Field.Root required minW="0"><Field.Label fontSize="xs">Daily cutoff</Field.Label><TimePicker value={draft.cutoffTime} onChange={(time) => setDraft((current) => ({ ...current, cutoffTime: time }))} required /></Field.Root>
            <Button type="submit" colorPalette="brand" h="11" minW={{ xl: '32' }} width={{ base: 'full', xl: 'auto' }}>Analyze period</Button>
          </Grid>
        </AnalysisToolbar>
      </form>

      {state.status === 'idle' && (
        <EmptyState.Root borderWidth="1px" borderColor="border.subtle" rounded="panel" bg="surface.panel" py={{ base: 7, md: 9 }}>
          <EmptyState.Content><EmptyState.Title>Ready to evaluate a period</EmptyState.Title><EmptyState.Description maxW="lg">Choose a January decision range, then use Analyze period to calculate pooled accuracy and daily retrieval coverage.</EmptyState.Description></EmptyState.Content>
        </EmptyState.Root>
      )}
      {state.status === 'loading' && <PeriodAnalysisSkeleton scenario={state.scenario} splitLayout={splitLayout} />}
      {state.status === 'error' && (
        <Alert.Root status="error" alignItems="flex-start" bg="surface.panel" borderWidth="1px" borderColor="border.subtle" rounded="panel" p={{ base: 3, md: 4 }}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Period analysis unavailable</Alert.Title>
            <Alert.Description>{state.message}</Alert.Description>
            <Text color="text.secondary" fontSize="xs" mt="1">Your draft parameters remain available above.</Text>
          </Alert.Content>
          <Button size="sm" minH="10" variant="outline" onClick={() => void loadAnalysis(state.scenario)}>Retry analysis</Button>
        </Alert.Root>
      )}
      {state.status === 'success' && (
        <Grid
          templateColumns={splitLayout ? 'minmax(0, 2fr) minmax(0, 3fr)' : 'minmax(0, 1fr)'}
          gap="4"
          height={splitLayout ? 'calc(100dvh - 184px)' : 'auto'}
          minH={splitLayout ? '480px' : undefined}
          minW="0"
        >
          <Stack gap="3" minH="0" minW="0" bg="surface.panel" borderWidth="1px" borderColor="border.subtle" rounded="panel" p="3" overflow="hidden">
            <PeriodOverview data={state.data} onOpenMethodology={onOpenMethodology} onRetry={() => void loadAnalysis(state.scenario)} />
            <DailyResultsPane days={state.data.days} selectedDay={selectedDay} splitLayout={splitLayout} onSelectDay={selectDay} />
          </Stack>
          {!mobileLayout && (
            <Box minH="0" minW="0" pr={splitLayout ? '1' : '0'} overflowY={splitLayout ? 'auto' : 'visible'} overflowX="hidden" overscrollBehavior="contain" scrollbarGutter="stable">
              <Box
                key={selectedDay?.decision_date ?? 'empty-period-detail'}
                animation="resultIn 180ms ease-out"
                _motionReduce={{ animation: 'none' }}
              >
                <PeriodDayDetail
                  day={selectedDay}
                  selectedHourTarget={selectedHourTarget}
                  splitLayout={splitLayout}
                  hasSuccessfulDay={state.data.day_counts.successful_days > 0}
                  onSelectHour={setSelectedHourTarget}
                  onOpenMethodology={onOpenMethodology}
                  onInspectSources={onInspectSources}
                />
              </Box>
            </Box>
          )}
          <MobilePeriodDetailDrawer open={mobileLayout && mobileDetail.open} day={selectedDay} selectedHourTarget={selectedHourTarget} onOpenChange={setMobileDetailOpen} onSelectHour={setSelectedHourTarget} onOpenMethodology={onOpenMethodology} onInspectSources={onInspectSources} />
        </Grid>
      )}
    </Stack>
  )
}
