import { Badge, Box, Button, Flex, Grid, Heading, Stack, Text } from '@chakra-ui/react'
import { InfoPopover } from '../../components/overlays/InfoPopover.tsx'
import type { MethodologySection } from '../../components/overlays/MethodologyDialog.tsx'
import type { RangeResponse } from '../../domain/windAnalysis.ts'
import { formatDate, formatMetric } from '../../lib/windFormatters.ts'

export function PeriodAccuracyStrip({
  data,
  onOpenMethodology,
}: {
  data: RangeResponse
  onOpenMethodology: (section: MethodologySection) => void
}) {
  const accuracy = data.overall_accuracy
  const complete = accuracy.coverage_status === 'complete' && data.day_counts.failed_days === 0
  const unavailable = accuracy.coverage_status === 'unavailable'
  const coveragePalette = complete ? 'signal' : unavailable ? 'gray' : 'caution'
  const coverageLabel = complete ? 'Complete' : unavailable ? 'Unavailable' : 'Partial'

  const metrics = [
    { label: 'MAE', value: formatMetric(accuracy.mae_mw) },
    { label: 'Bias', value: formatMetric(accuracy.bias_mw, true) },
    { label: 'RMSE', value: formatMetric(accuracy.rmse_mw) },
  ]

  return (
    <Stack as="section" aria-labelledby="period-overview-title" gap="2.5" flexShrink="0">
      <Flex justify="space-between" align="center" gap="3" wrap="wrap">
        <Flex align="center" gap="1" minW="0">
          <Heading as="h2" id="period-overview-title" size="sm">Period accuracy</Heading>
          <InfoPopover
            title="Period accuracy"
            ariaLabel="About period accuracy"
            footer={
              <Button
                size="xs"
                variant="plain"
                colorPalette="brand"
                px="0"
                onClick={() => onOpenMethodology('period')}
              >
                Open full methodology →
              </Button>
            }
          >
            <Stack gap="2">
              <Text>Metrics pool every matched hourly error across successful days. They are not averages of daily metrics.</Text>
              <Text color="text.secondary">Missing and conflicting pairs are excluded; failed-day hours remain in the expected coverage denominator.</Text>
            </Stack>
          </InfoPopover>
        </Flex>
        <Flex align="center" gap="1" flexShrink="0">
          <Badge colorPalette="brand" size="sm" variant="surface">Retrospective actuals</Badge>
          <InfoPopover title="Retrospective actuals" ariaLabel="About retrospective period analysis">
            <Text>Actual generation was unavailable at the historical decision cutoffs. The range is evaluated retrospectively.</Text>
          </InfoPopover>
        </Flex>
      </Flex>

      <Grid
        templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }}
        gapX="4"
        gapY="1"
        color="text.secondary"
        fontSize="xs"
      >
        <Box minW="0">
          <Text as="span" fontWeight="semibold" color="text.primary">Decision </Text>
          <Text as="span" fontVariantNumeric="tabular-nums">{formatDate(data.decision_date_from)} – {formatDate(data.decision_date_to)}</Text>
        </Box>
        <Box minW="0">
          <Text as="span" fontWeight="semibold" color="text.primary">Delivery </Text>
          <Text as="span" fontVariantNumeric="tabular-nums">{formatDate(data.first_delivery_date)} – {formatDate(data.last_delivery_date)}</Text>
        </Box>
        <Box minW="0">
          <Text as="span" fontWeight="semibold" color="text.primary">Cutoff </Text>
          <Text as="span" fontVariantNumeric="tabular-nums">{data.cutoff_time}</Text>
        </Box>
      </Grid>

      <Grid templateColumns={{ base: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' }} gap="2">
        {metrics.map((metric, index) => (
          <Box
            key={metric.label}
            bg="surface.raised"
            px="3"
            py="2"
            rounded="md"
            minW="0"
            gridColumn={{ base: index === 2 ? '1 / -1' : 'auto', sm: 'auto' }}
          >
            <Text color="text.secondary" fontSize="2xs" fontWeight="semibold" letterSpacing="wide" textTransform="uppercase">
              {metric.label}
            </Text>
            <Text
              fontSize={{ base: 'sm', sm: 'md', md: 'lg' }}
              fontWeight="bold"
              fontVariantNumeric="tabular-nums"
              lineHeight="short"
              mt="0.5"
              truncate
              title={metric.value}
            >
              {metric.value}
            </Text>
          </Box>
        ))}
      </Grid>

      <Flex justify="space-between" align="center" gap="2" wrap="wrap">
        <Flex gap={{ base: 2, sm: 4 }} align="center" wrap="wrap" color="text.secondary" fontSize="xs" fontVariantNumeric="tabular-nums">
          <Text><Text as="span" color="text.primary" fontWeight="semibold">Hours </Text>{accuracy.matched_hours} / {accuracy.expected_hours}</Text>
          <Text><Text as="span" color="text.primary" fontWeight="semibold">Days </Text>{data.day_counts.successful_days} / {data.day_counts.expected_days}</Text>
        </Flex>
        <Badge size="sm" colorPalette={coveragePalette}>{coverageLabel}</Badge>
      </Flex>
    </Stack>
  )
}
