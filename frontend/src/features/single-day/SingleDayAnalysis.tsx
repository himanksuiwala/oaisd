import {
  Alert,
  Badge,
  Box,
  Button,
  Field,
  Flex,
  Grid,
  HStack,
  Heading,
  Stack,
  Switch,
  Text,
} from '@chakra-ui/react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { ForecastChart } from '../../ForecastChart.tsx'
import { AnalysisToolbar, AppliedScenarioBar } from '../../components/analysis/AnalysisShell.tsx'
import {
  ForecastCoverage,
  SelectedHourSummary,
} from '../../components/analysis/AnalysisResults.tsx'
import { AnalysisSkeleton } from '../../components/feedback/AnalysisSkeleton.tsx'
import { InfoPopover } from '../../components/overlays/InfoPopover.tsx'
import type { MethodologySection } from '../../components/overlays/MethodologyDialog.tsx'
import type { ComparisonHour, ForecastResponse } from '../../domain/windAnalysis.ts'
import { AccuracyStrip } from '../shared-analysis/AccuracyStrip.tsx'
import { HourlyBreakdownDrawer, TableGlyph } from '../shared-analysis/HourlyBreakdownDrawer.tsx'
import { formatDate, formatTimestamp } from '../../lib/windFormatters.ts'
import { useWorkspaceSplitLayout } from '../../lib/useWorkspaceSplitLayout.ts'
import { JanuaryDatePicker } from '../../components/ui/DatePicker.tsx'
import { TimePicker } from '../../components/ui/TimePicker.tsx'
import { useSingleDayAnalysis } from './useSingleDayAnalysis.ts'

type SingleDayController = ReturnType<typeof useSingleDayAnalysis>

type SingleDayAnalysisProps = {
  analysis: SingleDayController
  onOpenMethodology: (section: MethodologySection) => void
  onInspectSources: (hour: ComparisonHour, trigger: HTMLButtonElement) => void
}

function ScenarioControls({ analysis, rail = false }: { analysis: SingleDayController; rail?: boolean }) {
  const { compareEnabled, draft, setDraft, toggleComparison } = analysis

  function applyScenario(event: FormEvent) {
    event.preventDefault()
    analysis.applyDraft()
  }

  const fields = (
    <Grid
      templateColumns={rail ? '1fr' : { base: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(2, minmax(0, 1fr)) auto auto' }}
      gap="3"
      alignItems="end"
    >
      <Field.Root required minW="0">
        <Field.Label fontSize="xs">Decision date</Field.Label>
        <JanuaryDatePicker
          value={draft.decisionDate}
          onChange={(date) => setDraft((current) => ({ ...current, decisionDate: date }))}
          min="2026-01-01"
          max="2026-01-31"
          required
        />
      </Field.Root>
      <Field.Root required minW="0">
        <Field.Label fontSize="xs">Cutoff</Field.Label>
        <TimePicker
          value={draft.cutoffTime}
          onChange={(time) => setDraft((current) => ({ ...current, cutoffTime: time }))}
          required
        />
      </Field.Root>
      <Flex
        h="11"
        minW={{ md: '52' }}
        px="3"
        align="center"
        justify="space-between"
        gap="2"
        borderWidth="1px"
        borderColor="border.subtle"
        rounded="md"
        bg="surface.raised"
      >
        <Flex align="center" gap="1" minW="0">
          <Text fontSize="xs" fontWeight="semibold" whiteSpace="nowrap">
            Compare with actuals
          </Text>
          <InfoPopover
            title="Retrospective actuals"
            ariaLabel="About compare with actuals"
          >
            <Text fontSize="xs">
              Compares historical forecasts against recorded outturn generation (FUELHH). Actual generation
              was unavailable at the historical decision cutoff.
            </Text>
          </InfoPopover>
        </Flex>
        <Switch.Root
          checked={compareEnabled}
          onCheckedChange={(details) => toggleComparison(details.checked)}
          flexShrink="0"
          aria-label="Compare with actuals"
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Root>
      </Flex>
      <Button
        type="submit"
        colorPalette="brand"
        h="11"
        minW={{ xl: '32' }}
        width={{ base: 'full', xl: rail ? 'full' : 'auto' }}
      >
        Apply scenario
      </Button>
    </Grid>
  )

  if (rail) {
    return (
      <Box as="form" onSubmit={applyScenario}>
        <Heading as="h1" size="md" mb="3">Scenario</Heading>
        {fields}
      </Box>
    )
  }

  return (
    <Box as="form" onSubmit={applyScenario}>
      <AnalysisToolbar label="Decision scenario">{fields}</AnalysisToolbar>
    </Box>
  )
}

function RailSection({ children }: { children: ReactNode }) {
  return <Box px="4" py="4" borderTopWidth="1px" borderColor="border.subtle">{children}</Box>
}

function CurrentAnalysis({ data, compareEnabled }: { data: ForecastResponse; compareEnabled?: boolean }) {
  const items = [
    { label: 'Decision cutoff', value: formatTimestamp(data.decision_time) },
    { label: 'Delivery day', value: formatDate(data.delivery_date) },
    { label: 'Retrieval', value: `Previous ${data.retrieval_lookback_hours} hours` },
  ]

  return (
    <Stack as="section" aria-labelledby="current-analysis-title" gap="3">
      <Heading as="h2" id="current-analysis-title" size="sm">Current analysis</Heading>
      <Stack gap="2.5">
        {items.map((item) => (
          <Flex key={item.label} justify="space-between" align="baseline" gap="4">
            <Text color="text.secondary" fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wide">
              {item.label}
            </Text>
            <Text fontSize="sm" fontWeight="semibold" textAlign="end" fontVariantNumeric="tabular-nums">
              {item.value}
            </Text>
          </Flex>
        ))}
        {compareEnabled && (
          <Flex justify="space-between" align="center" gap="2" pt="2" borderTopWidth="1px" borderColor="border.subtle">
            <Flex align="center" gap="1">
              <Badge colorPalette="brand" size="sm" variant="surface">
                Retrospective actuals
              </Badge>
              <InfoPopover
                title="Retrospective actuals"
                ariaLabel="About retrospective actuals"
              >
                <Text fontSize="xs">
                  Actual generation was unavailable at the historical decision cutoff. Outturn generation
                  (FUELHH) is compared retrospectively to evaluate forecast accuracy.
                </Text>
              </InfoPopover>
            </Flex>
            <Text fontSize="xs" color="text.secondary" fontWeight="medium">
              FUELHH
            </Text>
          </Flex>
        )}
      </Stack>
    </Stack>
  )
}

function ForecastStatus({ analysis }: { analysis: SingleDayController }) {
  if (analysis.forecastState.status === 'loading') {
    return <AnalysisSkeleton label={`Loading ${analysis.forecastState.scenario.decisionDate} at ${analysis.forecastState.scenario.cutoffTime}…`} />
  }
  if (analysis.forecastState.status === 'error') {
    return (
      <Alert.Root status="error" alignItems="flex-start">
        <Alert.Indicator />
        <Box flex="1">
          <Alert.Title>Forecast unavailable</Alert.Title>
          <Alert.Description>{analysis.forecastState.message}</Alert.Description>
          <Button mt="4" size="sm" onClick={analysis.retryForecast}>Try again</Button>
        </Box>
      </Alert.Root>
    )
  }
  return null
}

function ComparisonNotices({ analysis }: { analysis: SingleDayController }) {
  const { comparisonData, comparisonState, retryComparison } = analysis
  return (
    <>
      {comparisonState.status === 'loading' && (
        <AnalysisSkeleton compact label="Loading actual generation… Forecast results remain available below." />
      )}
      {comparisonState.status === 'error' && (
        <Alert.Root status="error" alignItems="flex-start">
          <Alert.Indicator />
          <Box flex="1">
            <Alert.Title>Actual generation unavailable</Alert.Title>
            <Alert.Description>{comparisonState.message} Forecast results remain available.</Alert.Description>
            <Button mt="4" size="sm" onClick={retryComparison}>Retry actuals</Button>
          </Box>
        </Alert.Root>
      )}
      {comparisonData && (comparisonData.coverage.actual.missing_hours > 0 || comparisonData.coverage.actual.conflicting_hours > 0) && (
        <Alert.Root status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Partial actual coverage</Alert.Title>
            <Alert.Description>
              Hours require both half-hour readings. Missing and conflicting source values remain unavailable and are never filled or treated as zero.
            </Alert.Description>
          </Alert.Content>
        </Alert.Root>
      )}
    </>
  )
}

function SingleDaySplitWorkspace({
  analysis,
  onOpenMethodology,
  onInspectSources,
}: SingleDayAnalysisProps) {
  const {
    comparisonData,
    compareEnabled,
    forecastState,
    selectedComparisonHour,
    selectedForecastHour,
    setSelectedHourTarget,
  } = analysis

  const [hourlyDrawerOpen, setHourlyDrawerOpen] = useState(false)

  return (
    <Grid
      templateColumns="minmax(320px, 336px) minmax(0, 1fr)"
      gap="4"
      height="calc(100dvh - 88px)"
      minH="0"
      overflow="hidden"
    >
      <Stack
        as="aside"
        aria-label="Scenario and current analysis"
        gap="0"
        minH="0"
        bg="surface.panel"
        borderWidth="1px"
        borderColor="border.subtle"
        rounded="panel"
        overflowY="auto"
        overscrollBehavior="contain"
        scrollbarGutter="stable"
      >
        <Box px="4" py="4"><ScenarioControls analysis={analysis} rail /></Box>
        {forecastState.status === 'success' && (
          <RailSection>
            <CurrentAnalysis data={forecastState.data} compareEnabled={compareEnabled} />
          </RailSection>
        )}
        {forecastState.status === 'success' && (
          <RailSection>
            <ForecastCoverage coverage={forecastState.data.coverage} compact />
          </RailSection>
        )}
      </Stack>

      {forecastState.status !== 'success' ? (
        <Box minW="0"><ForecastStatus analysis={analysis} /></Box>
      ) : (
        <Flex
          direction="column"
          gap="3"
          minW="0"
          minH="0"
          h="full"
          overflowY="auto"
          pr="1"
        >
          {compareEnabled && <ComparisonNotices analysis={analysis} />}
          {comparisonData && (
            <AccuracyStrip
              accuracy={comparisonData.accuracy}
              coverage={comparisonData.coverage}
              onOpenMethodology={onOpenMethodology}
            />
          )}
          <Flex justify="space-between" align="center" gap="2" minW="0" wrap="wrap">
            <Flex align="center" gap="1.5" minW="0">
              <Heading as="h2" id="forecast-chart-title" size="md">
                {comparisonData ? 'Forecast and actual profile' : 'Forecast profile'}
              </Heading>
              <InfoPopover
                title="Profile chart conventions"
                ariaLabel="About profile chart conventions"
              >
                <Stack gap="2">
                  <Text>
                    Target delivery hour plotted against generation in MW. Data gaps represent unavailable or conflicting readings.
                  </Text>
                  {comparisonData && (
                    <Box pt="1.5" borderTopWidth="1px" borderColor="border.subtle">
                      <Text fontWeight="semibold" color="fg" mb="0.5">
                        Actual generation alignment
                      </Text>
                      <Text>
                        Hourly actual generation is the arithmetic mean of the two FUELHH half-hour averages at H and H+30. Both readings are required.
                      </Text>
                      <Text color="text.secondary" mt="1">
                        Actual data retrieved {formatTimestamp(comparisonData.actual_retrieved_at)}.
                      </Text>
                    </Box>
                  )}
                </Stack>
              </InfoPopover>
            </Flex>
            <HStack gap="3">
              {comparisonData && (
                <Text color="text.secondary" fontSize="xs" fontVariantNumeric="tabular-nums" whiteSpace="nowrap" display={{ base: 'none', lg: 'inline' }}>
                  Actual retrieved {formatTimestamp(comparisonData.actual_retrieved_at)}
                </Text>
              )}
              <Button
                variant="outline"
                colorPalette="brand"
                size="sm"
                onClick={() => setHourlyDrawerOpen(true)}
              >
                <TableGlyph />
                {comparisonData ? 'Hourly comparison table' : 'Hourly forecast table'} (24h)
              </Button>
            </HStack>
          </Flex>

          <ForecastChart
            hours={forecastState.data.hours}
            comparisonHours={comparisonData?.hours}
            height={{ base: '280px', md: '350px' }}
          />

          {selectedForecastHour && (
            <SelectedHourSummary
              forecast={selectedForecastHour}
              comparison={selectedComparisonHour}
              onInspectSources={onInspectSources}
            />
          )}

          <HourlyBreakdownDrawer
            open={hourlyDrawerOpen}
            onOpenChange={setHourlyDrawerOpen}
            comparisonData={comparisonData}
            forecastHours={forecastState.data.hours}
            selectedTargetTime={selectedForecastHour?.target_time ?? ''}
            onSelectHour={setSelectedHourTarget}
            onInspectSources={onInspectSources}
            deliveryDate={forecastState.data.delivery_date}
          />
        </Flex>
      )}
    </Grid>
  )
}

function StackedWorkspace({ analysis, onOpenMethodology, onInspectSources }: SingleDayAnalysisProps) {
  const {
    comparisonData,
    compareEnabled,
    forecastState,
    selectedComparisonHour,
    selectedForecastHour,
    setSelectedHourTarget,
  } = analysis

  const [hourlyDrawerOpen, setHourlyDrawerOpen] = useState(false)

  const retrospectiveBadge = compareEnabled ? (
    <Flex align="center" gap="1">
      <Badge colorPalette="brand" size="sm" variant="surface">
        Retrospective actuals
      </Badge>
      <InfoPopover
        title="Retrospective actuals"
        ariaLabel="About retrospective actuals"
      >
        <Text fontSize="xs">
          Actual generation was unavailable at the historical decision cutoff. Outturn generation
          (FUELHH) is compared retrospectively to evaluate forecast accuracy.
        </Text>
      </InfoPopover>
    </Flex>
  ) : undefined

  return (
    <Stack gap={{ base: 4, md: 5 }}>
      <ScenarioControls analysis={analysis} />
      <ForecastStatus analysis={analysis} />
      {forecastState.status === 'success' && (
        <Stack gap={{ base: 5, md: 6 }} animation="resultIn 180ms ease-out" _motionReduce={{ animation: 'none' }}>
          <AppliedScenarioBar
            items={[
              { label: 'Decision cutoff', value: formatTimestamp(forecastState.data.decision_time) },
              { label: 'Delivery day', value: formatDate(forecastState.data.delivery_date) },
              { label: 'Retrieval', value: `Previous ${forecastState.data.retrieval_lookback_hours} hours` },
            ]}
            extra={retrospectiveBadge}
          />
          {compareEnabled && <ComparisonNotices analysis={analysis} />}
          {comparisonData && (
            <AccuracyStrip
              accuracy={comparisonData.accuracy}
              coverage={comparisonData.coverage}
              onOpenMethodology={onOpenMethodology}
            />
          )}
          {!comparisonData && <ForecastCoverage coverage={forecastState.data.coverage} />}
          <Stack as="section" aria-labelledby="forecast-chart-title" gap="3">
            <Flex justify="space-between" align="center" gap="2" wrap="wrap">
              <Flex align="center" gap="1.5">
                <Heading as="h2" id="forecast-chart-title" size="xl">
                  {comparisonData ? 'Forecast and actual profile' : 'Forecast profile'}
                </Heading>
                <InfoPopover
                  title="Profile chart conventions"
                  ariaLabel="About profile chart conventions"
                >
                  <Stack gap="2">
                    <Text>
                      Target delivery hour plotted against generation in MW. Data gaps represent unavailable or conflicting readings.
                    </Text>
                    {comparisonData && (
                      <Box pt="1.5" borderTopWidth="1px" borderColor="border.subtle">
                        <Text fontWeight="semibold" color="fg" mb="0.5">
                          Actual generation alignment
                        </Text>
                        <Text>
                          Hourly actual generation is the arithmetic mean of the two FUELHH half-hour averages at H and H+30. Both readings are required.
                        </Text>
                        <Text color="text.secondary" mt="1">
                          Actual data retrieved {formatTimestamp(comparisonData.actual_retrieved_at)}.
                        </Text>
                      </Box>
                    )}
                  </Stack>
                </InfoPopover>
              </Flex>
              <HStack gap="3">
                {comparisonData && (
                  <Text color="text.secondary" fontSize="xs" fontVariantNumeric="tabular-nums">
                    Actual retrieved {formatTimestamp(comparisonData.actual_retrieved_at)}
                  </Text>
                )}
                <Button
                  variant="outline"
                  colorPalette="brand"
                  size="sm"
                  onClick={() => setHourlyDrawerOpen(true)}
                >
                  <TableGlyph />
                  {comparisonData ? 'Hourly comparison table' : 'Hourly forecast table'} (24h)
                </Button>
              </HStack>
            </Flex>
            <ForecastChart hours={forecastState.data.hours} comparisonHours={comparisonData?.hours} />
            {selectedForecastHour && (
              <SelectedHourSummary
                forecast={selectedForecastHour}
                comparison={selectedComparisonHour}
                onInspectSources={onInspectSources}
              />
            )}
            <Button
              variant="outline"
              colorPalette="brand"
              w="full"
              size="md"
              minH="11"
              onClick={() => setHourlyDrawerOpen(true)}
            >
              <TableGlyph />
              View full 24-hour {comparisonData ? 'comparison' : 'forecast'} breakdown table
            </Button>
            <HourlyBreakdownDrawer
              open={hourlyDrawerOpen}
              onOpenChange={setHourlyDrawerOpen}
              comparisonData={comparisonData}
              forecastHours={forecastState.data.hours}
              selectedTargetTime={selectedForecastHour?.target_time ?? ''}
              onSelectHour={setSelectedHourTarget}
              onInspectSources={onInspectSources}
              deliveryDate={forecastState.data.delivery_date}
            />
          </Stack>
        </Stack>
      )}
    </Stack>
  )
}

export function SingleDayAnalysis(props: SingleDayAnalysisProps) {
  const splitLayout = useWorkspaceSplitLayout()

  return splitLayout
    ? <SingleDaySplitWorkspace {...props} />
    : <StackedWorkspace {...props} />
}
