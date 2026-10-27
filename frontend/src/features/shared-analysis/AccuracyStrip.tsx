import { Badge, Box, Button, Flex, Grid, Heading, Stack, Text } from '@chakra-ui/react'
import { InfoPopover } from '../../components/overlays/InfoPopover.tsx'
import type { MethodologySection } from '../../components/overlays/MethodologyDialog.tsx'
import type { ComparisonResponse } from '../../domain/windAnalysis.ts'
import { formatMetric } from '../../lib/windFormatters.ts'

export type AccuracyStripProps = {
  accuracy: ComparisonResponse['accuracy']
  coverage?: ComparisonResponse['coverage']
  onOpenMethodology: (section: MethodologySection) => void
  title?: string
}

export function AccuracyStrip({
  accuracy,
  coverage,
  onOpenMethodology,
  title = 'Forecast accuracy',
}: AccuracyStripProps) {
  const isComplete = accuracy.coverage_status === 'complete'
  const isPartial = accuracy.coverage_status === 'partial'

  const coverageBadgePalette = isComplete ? 'signal' : isPartial ? 'caution' : 'gray'
  const coverageLabel = isComplete ? 'Complete' : isPartial ? 'Partial' : 'Unavailable'

  const coverageText = isComplete
    ? `${accuracy.matched_hours} / ${accuracy.expected_hours} matched`
    : `${accuracy.matched_hours} / ${accuracy.expected_hours} matched · ${accuracy.unmatched_hours} excluded`

  return (
    <Box
      as="section"
      aria-labelledby="accuracy-heading"
      bg="surface.panel"
      borderWidth="1px"
      borderColor="border.subtle"
      rounded="panel"
      px={{ base: 3, md: 4 }}
      py={{ base: 2.5, md: 3 }}
    >
      <Flex
        direction={{ base: 'column', sm: 'row' }}
        justify="space-between"
        align={{ base: 'stretch', sm: 'center' }}
        gap="2"
        mb="2"
        minW="0"
      >
        <Flex align="center" gap="1" minW="0" flexShrink="0">
          <Heading as="h2" id="accuracy-heading" size="sm" fontWeight="bold">
            {title}
          </Heading>
          <InfoPopover
            title="Forecast accuracy calculation"
            ariaLabel="About forecast accuracy metrics"
            footer={
              <Button
                size="xs"
                variant="plain"
                colorPalette="brand"
                px="0"
                onClick={() => onOpenMethodology('daily')}
              >
                Open full methodology →
              </Button>
            }
          >
            <Stack gap="2.5">
              <Box>
                <Text fontWeight="semibold" color="fg">
                  MAE (Mean Absolute Error)
                </Text>
                <Text mt="0.5">Average magnitude of hourly errors regardless of direction.</Text>
              </Box>
              <Box>
                <Text fontWeight="semibold" color="fg">
                  Bias (Mean Error)
                </Text>
                <Text mt="0.5">
                  Average signed difference (forecast − actual). Positive indicates over-forecasting,
                  negative indicates under-forecasting.
                </Text>
              </Box>
              <Box>
                <Text fontWeight="semibold" color="fg">
                  RMSE (Root Mean Square Error)
                </Text>
                <Text mt="0.5">Quadratic scoring giving more weight to larger errors.</Text>
              </Box>
              <Box pt="1" borderTopWidth="1px" borderColor="border.subtle">
                <Text color="text.secondary">
                  Calculated across matched hourly pairs where both WINDFOR forecast and FUELHH
                  actual are available. Missing and conflicting hours are excluded.
                </Text>
              </Box>
              {coverage && (
                <Box pt="1" borderTopWidth="1px" borderColor="border.subtle">
                  <Text fontWeight="semibold" color="fg" mb="1">
                    Coverage breakdown
                  </Text>
                  <Flex justify="space-between" py="0.5">
                    <Text color="text.secondary">Forecast (WINDFOR):</Text>
                    <Text fontVariantNumeric="tabular-nums">
                      {coverage.forecast.available_hours}/24 available
                    </Text>
                  </Flex>
                  <Flex justify="space-between" py="0.5">
                    <Text color="text.secondary">Actual (FUELHH):</Text>
                    <Text fontVariantNumeric="tabular-nums">
                      {coverage.actual.available_hours}/24 available
                    </Text>
                  </Flex>
                  <Flex justify="space-between" py="0.5">
                    <Text color="text.secondary">Matched pairs:</Text>
                    <Text fontVariantNumeric="tabular-nums" fontWeight="semibold">
                      {coverage.matched.matched_hours}/24 matched
                    </Text>
                  </Flex>
                </Box>
              )}
            </Stack>
          </InfoPopover>
        </Flex>

        <Flex align="center" justify={{ base: 'space-between', sm: 'flex-start' }} gap="2" flexShrink="0" minW="0">
          <Text
            fontSize="xs"
            fontWeight="medium"
            color="text.secondary"
            fontVariantNumeric="tabular-nums"
            whiteSpace={{ base: 'normal', sm: 'nowrap' }}
          >
            {coverageText}
          </Text>
          <Badge size="sm" colorPalette={coverageBadgePalette} flexShrink="0">
            {coverageLabel}
          </Badge>
        </Flex>
      </Flex>

      <Grid templateColumns={{ base: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' }} gap={{ base: 2, md: 3 }} pt="0.5">
        <Box bg="surface.raised" px="3" py="2" rounded="md" minW="0">
          <Text
            color="text.secondary"
            fontSize="2xs"
            fontWeight="semibold"
            letterSpacing="wide"
            textTransform="uppercase"
          >
            MAE
          </Text>
          <Text
            fontSize={{ base: 'md', sm: 'lg', md: 'xl' }}
            fontWeight="bold"
            fontVariantNumeric="tabular-nums"
            mt="0.5"
            lineHeight="short"
          >
            {formatMetric(accuracy.mae_mw)}
          </Text>
        </Box>
        <Box bg="surface.raised" px="3" py="2" rounded="md" minW="0">
          <Text
            color="text.secondary"
            fontSize="2xs"
            fontWeight="semibold"
            letterSpacing="wide"
            textTransform="uppercase"
          >
            Bias
          </Text>
          <Text
            fontSize={{ base: 'md', sm: 'lg', md: 'xl' }}
            fontWeight="bold"
            fontVariantNumeric="tabular-nums"
            mt="0.5"
            lineHeight="short"
          >
            {formatMetric(accuracy.bias_mw, true)}
          </Text>
        </Box>
        <Box bg="surface.raised" px="3" py="2" rounded="md" minW="0" gridColumn={{ base: '1 / -1', sm: 'auto' }}>
          <Text
            color="text.secondary"
            fontSize="2xs"
            fontWeight="semibold"
            letterSpacing="wide"
            textTransform="uppercase"
          >
            RMSE
          </Text>
          <Text
            fontSize={{ base: 'md', sm: 'lg', md: 'xl' }}
            fontWeight="bold"
            fontVariantNumeric="tabular-nums"
            mt="0.5"
            lineHeight="short"
          >
            {formatMetric(accuracy.rmse_mw)}
          </Text>
        </Box>
      </Grid>
    </Box>
  )
}
