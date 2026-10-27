import { Box, Flex, Stack, Text } from '@chakra-ui/react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'

const CHART_COLORS = {
  forecast: '#185B67',
  actual: '#0B776F',
  exception: '#B8750D',
  axis: '#52646B',
  grid: '#DDE5E7',
  panel: '#FFFFFF',
} as const

export type ForecastChartHour = {
  target_time: string
  generation_mw: number | null
  publish_time: string | null
  status: 'available' | 'missing' | 'conflict'
}

export type ComparisonChartHour = {
  target_time: string
  forecast_mw: number | null
  forecast_publish_time: string | null
  forecast_status: 'available' | 'missing' | 'conflict'
  actual_readings: Array<{
    target_time: string
    generation_mw: number | null
    status: 'available' | 'missing' | 'conflict'
  }>
  actual_mw: number | null
  actual_status: 'available' | 'missing' | 'conflict'
}

type ChartPoint = {
  targetTime: string
  targetHour: string
  forecastMw: number | null
  forecastPublishTime: string | null
  forecastStatus: 'available' | 'missing' | 'conflict'
  actualMw: number | null
  actualStatus: 'available' | 'missing' | 'conflict' | null
  actualReadings: ComparisonChartHour['actual_readings']
}

const detailFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

function formatDetail(value: string) {
  return detailFormatter.format(new Date(value))
}

function formatMw(value: number | null) {
  return value === null ? 'Unavailable' : `${value.toLocaleString('en-GB')} MW`
}

function formatSignedMw(value: number) {
  const normalized = Object.is(value, -0) ? 0 : value
  const sign = normalized > 0 ? '+' : normalized < 0 ? '−' : ''
  return `${sign}${Math.abs(normalized).toLocaleString('en-GB')} MW`
}

function ForecastTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as ChartPoint
  const error = point.forecastMw !== null && point.actualMw !== null
    ? point.forecastMw - point.actualMw
    : null

  return (
    <Stack gap="1.5" bg="surface.panel" borderWidth="1px" borderColor="border.strong" rounded="panel" p="2.5" shadow="panel" width="260px" maxW="calc(100vw - 32px)">
      <Text fontSize="sm" fontWeight="semibold">{formatDetail(point.targetTime)}</Text>
      <Flex justify="space-between" align="baseline" gap="4">
        <Flex align="center" gap="2">
          <Box width="2" height="2" rounded="full" bg="data.forecast" />
          <Text color="text.secondary" fontSize="xs">Forecast</Text>
        </Flex>
        <Text fontSize="sm" fontWeight="semibold" fontVariantNumeric="tabular-nums">{formatMw(point.forecastMw)}</Text>
      </Flex>
      {point.actualStatus && (
        <Flex justify="space-between" align="baseline" gap="4">
          <Flex align="center" gap="2">
            <Box width="2" height="2" rounded="full" bg="data.actual" />
            <Text color="text.secondary" fontSize="xs">Actual</Text>
          </Flex>
          <Text fontSize="sm" fontWeight="semibold" fontVariantNumeric="tabular-nums">{formatMw(point.actualMw)}</Text>
        </Flex>
      )}
      {point.actualStatus && (
        <Flex justify="space-between" align="baseline" gap="4" pt="1" borderTopWidth="1px" borderColor="border.subtle">
          <Text color="text.secondary" fontSize="xs">Error</Text>
          <Text fontSize="sm" fontWeight="semibold" fontVariantNumeric="tabular-nums">{error === null ? 'Unavailable' : formatSignedMw(error)}</Text>
        </Flex>
      )}
      <Text color="text.secondary" fontSize="2xs" lineClamp="1" title={point.forecastPublishTime ? formatDetail(point.forecastPublishTime) : 'Not available'}>
        Forecast published {point.forecastPublishTime ? formatDetail(point.forecastPublishTime) : 'not available'}
      </Text>
    </Stack>
  )
}

export function ForecastChart({
  hours,
  comparisonHours,
  compact = false,
  height,
}: {
  hours: ForecastChartHour[]
  comparisonHours?: ComparisonChartHour[]
  compact?: boolean
  height?: string | { base: string; md: string }
}) {
  const tickFontSize = compact ? 8 : 12
  const labelFontSize = compact ? 7 : 11
  // Keep the vertical title in a separate visual column from five-digit ticks.
  // The compact chart uses an abbreviated unit label and does not need the extra gutter.
  const yAxisWidth = compact ? 56 : 96
  const chartMargin = compact
    ? { top: 8, right: 12, bottom: 28, left: 4 }
    : { top: 8, right: 18, bottom: 30, left: 8 }

  const data: ChartPoint[] = comparisonHours
    ? comparisonHours.map((hour) => ({
        targetTime: hour.target_time,
        targetHour: new Date(hour.target_time).toISOString().slice(11, 16),
        forecastMw: hour.forecast_status === 'available' ? hour.forecast_mw : null,
        forecastPublishTime: hour.forecast_publish_time,
        forecastStatus: hour.forecast_status,
        actualMw: hour.actual_status === 'available' ? hour.actual_mw : null,
        actualStatus: hour.actual_status,
        actualReadings: hour.actual_readings,
      }))
    : hours.map((hour) => ({
        targetTime: hour.target_time,
        targetHour: new Date(hour.target_time).toISOString().slice(11, 16),
        forecastMw: hour.status === 'available' ? hour.generation_mw : null,
        forecastPublishTime: hour.publish_time,
        forecastStatus: hour.status,
        actualMw: null,
        actualStatus: null,
        actualReadings: [],
      }))

  return (
    <Stack
      role="img"
      aria-label={comparisonHours
        ? 'Line chart comparing hourly forecast and actual wind generation in megawatts. Missing and conflicting hours appear as gaps.'
        : 'Line chart of hourly forecast generation in megawatts. Missing and conflicting hours appear as gaps.'}
      gap="3"
      bg="surface.panel"
      borderWidth="1px"
      borderColor="border.strong"
      rounded="panel"
      shadow="panel"
      p={compact ? '3' : { base: 3, md: 5 }}
    >
      <Flex gap={{ base: 4, md: 6 }} align="center" wrap="wrap" px={{ md: 2 }}>
        <Flex gap="2" align="center">
          <Box width="7" borderTopWidth="3px" borderColor="data.forecast" />
          <Text fontSize="sm" fontWeight="semibold">Forecast</Text>
        </Flex>
        {comparisonHours && (
          <Flex gap="2" align="center">
            <Box width="7" borderTopWidth="3px" borderStyle="dashed" borderColor="data.actual" />
            <Text fontSize="sm" fontWeight="semibold">Actual</Text>
          </Flex>
        )}
        <Flex gap="2" align="center">
          <Box width="2.5" height="2.5" rounded="full" bg="caution.500" />
          <Text color="text.secondary" fontSize="sm">Missing or conflicting data appears as a gap</Text>
        </Flex>
      </Flex>
      <Box h={height ?? (compact ? (comparisonHours ? '220px' : '240px') : { base: '300px', md: '360px' })}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={chartMargin} accessibilityLayer>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeWidth={1} strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="targetHour"
            tick={{ fill: CHART_COLORS.axis, fontSize: tickFontSize }}
            tickLine={{ stroke: CHART_COLORS.axis }}
            axisLine={{ stroke: CHART_COLORS.axis }}
            tickMargin={compact ? 4 : 6}
            minTickGap={compact ? 36 : 28}
            interval="preserveStartEnd"
            label={{ value: compact ? 'Hour' : 'Delivery hour', position: 'insideBottom', offset: -18, fill: CHART_COLORS.axis, fontSize: labelFontSize, fontWeight: compact ? 400 : 500 }}
          />
          <YAxis
            tick={{ fill: CHART_COLORS.axis, fontSize: tickFontSize }}
            tickLine={{ stroke: CHART_COLORS.axis }}
            axisLine={{ stroke: CHART_COLORS.axis }}
            tickMargin={compact ? 4 : 6}
            width={yAxisWidth}
            tickCount={compact ? 5 : 6}
            tickFormatter={(value: number) => (
              compact && Math.abs(value) >= 1000
                ? `${value / 1000}k`
                : value.toLocaleString('en-GB')
            )}
            label={{ value: compact ? 'MW' : 'Generation (MW)', angle: -90, position: 'insideLeft', offset: compact ? 8 : 4, fill: CHART_COLORS.axis, fontSize: labelFontSize, fontWeight: compact ? 400 : 500 }}
          />
          <Tooltip content={ForecastTooltip} cursor={{ stroke: CHART_COLORS.exception, strokeWidth: 1.5, strokeDasharray: '4 4' }} />
          <Line
            type="linear"
            dataKey="forecastMw"
            name="Forecast"
            stroke={CHART_COLORS.forecast}
            strokeWidth={3}
            dot={{ r: 3, fill: CHART_COLORS.panel, stroke: CHART_COLORS.forecast, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: CHART_COLORS.panel, stroke: CHART_COLORS.forecast, strokeWidth: 3 }}
            connectNulls={false}
          />
          {comparisonHours && (
            <Line
              type="linear"
              dataKey="actualMw"
              name="Actual"
              stroke={CHART_COLORS.actual}
              strokeWidth={3}
              strokeDasharray="8 5"
              dot={{ r: 3, fill: CHART_COLORS.panel, stroke: CHART_COLORS.actual, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: CHART_COLORS.panel, stroke: CHART_COLORS.actual, strokeWidth: 3 }}
              connectNulls={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      </Box>
    </Stack>
  )
}
