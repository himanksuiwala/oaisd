import { Badge, Box, Button, CloseButton, Drawer, Flex, Heading, Portal, SimpleGrid, Stack, Stat, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import type { ComparisonHour, ComparisonResponse, Coverage, ForecastHour, RangeAccuracy } from '../../domain/windAnalysis.ts'
import { formatError, formatMetric, formatMw, formatTimestamp } from '../../lib/windFormatters.ts'
import { MethodologyButton, type MethodologySection } from '../overlays/MethodologyDialog.tsx'
import { AccuracyStrip } from '../../features/shared-analysis/AccuracyStrip.tsx'
import { ComparisonTable, ForecastTable, StatusBadge } from '../../features/shared-analysis/HourlyResults.tsx'

export { AccuracyStrip, ComparisonTable, ForecastTable, StatusBadge }

export function SourceInspector({ payload, onOpenChange }: { payload: { hour: ComparisonHour; trigger: HTMLButtonElement } | null; onOpenChange: (open: boolean) => void }) {
  const hour = payload?.hour ?? null
  return (
    <Drawer.Root
      open={Boolean(payload)}
      onOpenChange={(details) => onOpenChange(details.open)}
      placement="end"
      size={{ base: 'full', md: 'sm' }}
      lazyMount
      unmountOnExit
      restoreFocus
    >
      <Portal>
        <Drawer.Backdrop zIndex={1599} />
        <Drawer.Positioner zIndex={1600}>
          <Drawer.Content zIndex={1600}>
            <Drawer.Header borderBottomWidth="1px" borderColor="border.subtle" py="4">
              <Flex justify="space-between" align="flex-start" width="full">
                <Box>
                  <Drawer.Title>Source readings</Drawer.Title>
                  {hour && <Text color="text.secondary" fontSize="sm" mt="1">Delivery hour {formatTimestamp(hour.target_time)}</Text>}
                </Box>
                <Drawer.CloseTrigger asChild>
                  <CloseButton size="sm" aria-label="Close drawer" />
                </Drawer.CloseTrigger>
              </Flex>
            </Drawer.Header>
            <Drawer.Body py="5" overflowY="auto">
              {hour && (
                <Stack gap="6">
                  <Box>
                    <Text color="text.secondary" fontSize="xs" fontWeight="semibold" letterSpacing="wide" textTransform="uppercase">Decision forecast · WINDFOR</Text>
                    <Text fontSize="2xl" fontWeight="semibold" fontVariantNumeric="tabular-nums" mt="1">
                      {hour.forecast_status === 'available' ? `${formatMw(hour.forecast_mw)} MW` : hour.forecast_status}
                    </Text>
                    <Text color="text.secondary" fontSize="sm" mt="1">Published {hour.forecast_publish_time ? formatTimestamp(hour.forecast_publish_time) : 'not available'}</Text>
                  </Box>
                  <Box>
                    <Text color="text.secondary" fontSize="xs" fontWeight="semibold" letterSpacing="wide" textTransform="uppercase">Hourly actual · FUELHH</Text>
                    <Text fontSize="2xl" fontWeight="semibold" fontVariantNumeric="tabular-nums" mt="1">
                      {hour.actual_status === 'available' ? `${formatMw(hour.actual_mw)} MW` : hour.actual_status}
                    </Text>
                    <Text color="text.secondary" fontSize="sm" mt="1">Arithmetic mean of both half-hour averages. Both readings are required.</Text>
                  </Box>
                  <Stack gap="3">
                    <Heading as="h3" size="sm">Contributing half-hour readings</Heading>
                    {hour.actual_readings.map((reading) => (
                      <Box key={reading.target_time} borderWidth="1px" borderColor="border.subtle" rounded="md" p="3">
                        <Flex justify="space-between" gap="3" align="start">
                          <Box>
                            <Text fontWeight="semibold">{formatTimestamp(reading.target_time)}</Text>
                            <Text color="text.secondary" fontSize="xs" mt="1">Published {reading.publish_time ? formatTimestamp(reading.publish_time) : 'not available'}</Text>
                          </Box>
                          {reading.status === 'available'
                            ? <Text fontWeight="semibold" fontVariantNumeric="tabular-nums" whiteSpace="nowrap">{formatMw(reading.generation_mw)} MW</Text>
                            : <StatusBadge status={reading.status} />}
                        </Flex>
                      </Box>
                    ))}
                  </Stack>
                  <Box bg="surface.raised" rounded="md" p="3">
                    <Text color="text.secondary" fontSize="sm">Forecast error</Text>
                    <Text fontWeight="semibold" fontVariantNumeric="tabular-nums">{hour.error_mw === null ? 'Unavailable' : `${formatError(hour.error_mw)} MW`}</Text>
                  </Box>
                </Stack>
              )}
            </Drawer.Body>
            <Drawer.Footer borderTopWidth="1px" borderColor="border.subtle">
              <Drawer.ActionTrigger asChild><Button colorPalette="brand" minH="11">Close</Button></Drawer.ActionTrigger>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}


export function SelectedHourSummary({ forecast, comparison, onInspectSources }: { forecast: ForecastHour; comparison?: ComparisonHour; onInspectSources?: (hour: ComparisonHour, trigger: HTMLButtonElement) => void }) {
  return (
    <Flex
      as="section"
      aria-label="Selected delivery hour"
      direction={{ base: 'column', md: 'row' }}
      gap={{ base: 3, md: 5 }}
      align={{ md: 'center' }}
      justify="space-between"
      bg="surface.panel"
      borderWidth="1px"
      borderColor="border.subtle"
      rounded="panel"
      px="4"
      py="3"
      minW="0"
      maxW="100%"
      w="full"
    >
      <Box minW={{ md: '44' }} flexShrink="0">
        <Text color="text.secondary" fontSize="xs" fontWeight="semibold" letterSpacing="wide" textTransform="uppercase">Selected hour</Text>
        <Text fontWeight="semibold">{formatTimestamp(forecast.target_time)}</Text>
      </Box>
      <SimpleGrid columns={{ base: 2, sm: comparison ? 3 : 2 }} gap={{ base: 3, md: 6 }} flex="1" minW="0" width="full">
        <Box>
          <Text color="text.secondary" fontSize="xs">Forecast</Text>
          <Text fontWeight="semibold" fontVariantNumeric="tabular-nums">{forecast.status === 'available' ? `${formatMw(forecast.generation_mw)} MW` : forecast.status}</Text>
        </Box>
        {comparison && (
          <Box>
            <Text color="text.secondary" fontSize="xs">Actual</Text>
            <Text fontWeight="semibold" fontVariantNumeric="tabular-nums">{comparison.actual_status === 'available' ? `${formatMw(comparison.actual_mw)} MW` : comparison.actual_status}</Text>
          </Box>
        )}
        <Box>
          <Text color="text.secondary" fontSize="xs">{comparison ? 'Error' : 'Published'}</Text>
          <Text fontWeight="semibold" fontVariantNumeric="tabular-nums">{comparison ? (comparison.error_mw === null ? 'Unavailable' : `${formatError(comparison.error_mw)} MW`) : (forecast.publish_time ? formatTimestamp(forecast.publish_time) : 'Not available')}</Text>
        </Box>
      </SimpleGrid>
      {comparison && onInspectSources && <Button variant="outline" colorPalette="brand" minH="11" flexShrink="0" onClick={(event) => onInspectSources(comparison, event.currentTarget)}>Inspect sources</Button>}
    </Flex>
  )
}

export function CoverageSummary({ title, summary, complete, details }: { title: string; summary: string; complete: boolean; details: ReactNode }) {
  return (
    <Flex as="section" aria-label={title} direction={{ base: 'column', sm: 'row' }} gap="2" align={{ sm: 'center' }} justify="space-between" bg="surface.panel" borderWidth="1px" borderColor="border.subtle" rounded="panel" px="4" py="3">
      <Box>
        <Text fontSize="sm" fontWeight="semibold">{title}</Text>
        <Text color="text.secondary" fontSize="xs">{summary}</Text>
      </Box>
      <Flex gap="2" align="center" wrap="wrap">
        <Badge colorPalette={complete ? 'signal' : 'caution'}>{complete ? 'Complete' : 'Partial'}</Badge>
        {details}
      </Flex>
    </Flex>
  )
}

export function ForecastCoverage({ coverage, compact = false }: { coverage: Coverage; compact?: boolean }) {
  const complete = coverage.available_hours === coverage.expected_hours
  if (compact) {
    return (
      <Stack as="section" aria-label="Forecast coverage" gap="2">
        <Flex align="center" justify="space-between" gap="3">
          <Text fontSize="sm" fontWeight="semibold">Forecast coverage</Text>
          <Badge colorPalette={complete ? 'signal' : 'caution'}>{complete ? 'Complete' : 'Partial'}</Badge>
        </Flex>
        <Text color="text.secondary" fontSize="sm">{coverage.available_hours} of {coverage.expected_hours} delivery hours available</Text>
        {(coverage.missing_hours > 0 || coverage.conflicting_hours > 0) && (
          <Flex gap="2" wrap="wrap">
            {coverage.missing_hours > 0 && <Badge variant="outline">{coverage.missing_hours} missing</Badge>}
            {coverage.conflicting_hours > 0 && <Badge colorPalette="caution" variant="outline">{coverage.conflicting_hours} conflicting</Badge>}
          </Flex>
        )}
      </Stack>
    )
  }
  return (
    <CoverageSummary title="Forecast coverage" summary={`${coverage.available_hours} of ${coverage.expected_hours} delivery hours available`} complete={complete} details={<>
        {coverage.missing_hours > 0 && <Badge variant="outline">{coverage.missing_hours} missing</Badge>}
        {coverage.conflicting_hours > 0 && <Badge colorPalette="caution" variant="outline">{coverage.conflicting_hours} conflicting</Badge>}
    </>} />
  )
}

export function ComparisonCoverage({ data }: { data: ComparisonResponse }) {
  const complete = data.coverage.matched.matched_hours === data.coverage.matched.expected_hours
  return (
    <CoverageSummary title="Comparison coverage" summary={`${data.coverage.matched.matched_hours} of ${data.coverage.matched.expected_hours} forecast–actual pairs matched`} complete={complete} details={<>
        <Badge variant="outline">Forecast {data.coverage.forecast.available_hours}/24</Badge>
        <Badge variant="outline">Actual {data.coverage.actual.available_hours}/24</Badge>
        {data.coverage.matched.unmatched_hours > 0 && <Badge colorPalette="caution" variant="outline">{data.coverage.matched.unmatched_hours} unmatched</Badge>}
    </>} />
  )
}

export function MetricStrip({ metrics }: { metrics: Array<{ label: string; value: string; description: string }> }) {
  return (
    <SimpleGrid columns={{ base: 2, md: metrics.length }} bg="surface.panel" borderWidth="1px" borderColor="border.subtle" rounded="panel" overflow="hidden">
      {metrics.map((metric, index) => (
        <Stat.Root
          key={metric.label}
          px={{ base: 3, md: 4 }}
          py="3"
          borderInlineStartWidth={{
            base: index % 2 === 0 ? '0' : '1px',
            md: index === 0 ? '0' : '1px',
          }}
          borderTopWidth={{ base: index >= 2 ? '1px' : '0', md: '0' }}
          borderColor="border.subtle"
        >
          <Stat.Label color="text.secondary" fontSize="xs" fontWeight="semibold" letterSpacing="wide" textTransform="uppercase">{metric.label}</Stat.Label>
          <Stat.ValueText fontSize={{ base: 'lg', md: 'xl' }} fontWeight="semibold" fontVariantNumeric="tabular-nums">{metric.value}</Stat.ValueText>
          <Stat.HelpText color="text.secondary" fontSize="xs" lineClamp="1" title={metric.description}>{metric.description}</Stat.HelpText>
        </Stat.Root>
      ))}
    </SimpleGrid>
  )
}

export function AccuracySummary({
  accuracy,
  coverage,
  onOpenMethodology,
}: {
  accuracy: ComparisonResponse['accuracy']
  coverage?: ComparisonResponse['coverage']
  onOpenMethodology: (section: MethodologySection) => void
}) {
  return (
    <AccuracyStrip
      accuracy={accuracy}
      coverage={coverage}
      onOpenMethodology={onOpenMethodology}
    />
  )
}

export function PeriodAccuracySummary({ accuracy, onOpenMethodology }: { accuracy: RangeAccuracy; onOpenMethodology: (section: MethodologySection) => void }) {
  const metrics = [
    { label: 'Overall MAE', value: accuracy.mae_mw, description: 'Average absolute error across pooled matched hours.', signed: false },
    { label: 'Overall bias', value: accuracy.bias_mw, description: 'Average pooled overestimate (+) or underestimate (−).', signed: true },
    { label: 'Overall RMSE', value: accuracy.rmse_mw, description: 'Gives larger pooled hourly errors more weight.', signed: false },
  ]
  return (
    <Stack as="section" aria-labelledby="period-accuracy-title" gap="3">
      <Box>
        <Heading as="h2" id="period-accuracy-title" size="xl">Period accuracy</Heading>
        <Text color="fg.muted" mt="1">Based on {accuracy.matched_hours} of {accuracy.expected_hours} expected hours.</Text>
      </Box>
      <MetricStrip metrics={metrics.map((metric) => ({ ...metric, value: formatMetric(metric.value, metric.signed) }))} />
      <Flex gap="2" align="center" wrap="wrap">
        <Badge colorPalette={accuracy.coverage_status === 'complete' ? 'signal' : accuracy.coverage_status === 'partial' ? 'caution' : 'gray'}>{accuracy.coverage_status === 'complete' ? 'Complete coverage' : accuracy.coverage_status === 'partial' ? 'Partial coverage' : 'Unavailable'}</Badge>
        <Text color="text.secondary" fontSize="sm">{accuracy.successful_day_unmatched_hours} observations excluded · {accuracy.failed_day_hours} hours lost to retrieval failures.</Text>
      </Flex>
      <MethodologyButton onOpen={onOpenMethodology} section="period" label="How period metrics are calculated" />
    </Stack>
  )
}

