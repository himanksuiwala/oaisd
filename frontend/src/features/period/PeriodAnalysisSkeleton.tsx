import { Badge, Box, Flex, Grid, Skeleton, Stack, Text } from '@chakra-ui/react'
import type { RangeScenario } from '../../domain/windAnalysis.ts'
import { formatDate } from '../../lib/windFormatters.ts'

function MetricSkeletons() {
  return (
    <Grid templateColumns={{ base: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' }} gap="2">
      {Array.from({ length: 3 }, (_, index) => (
        <Box
          key={index}
          bg="surface.raised"
          rounded="md"
          px="3"
          py="2"
          gridColumn={{ base: index === 2 ? '1 / -1' : 'auto', sm: 'auto' }}
        >
          <Skeleton height="2.5" width="10" mb="2" />
          <Skeleton height="5" width="24" maxW="full" />
        </Box>
      ))}
    </Grid>
  )
}

function MasterSkeleton() {
  return (
    <Stack gap="4" minH="0" bg="surface.panel" borderWidth="1px" borderColor="border.subtle" rounded="panel" p="3">
      <Flex justify="space-between" align="center" gap="3">
        <Skeleton height="5" width="32" />
        <Skeleton height="5" width="28" rounded="full" />
      </Flex>
      <Stack gap="2">
        <Skeleton height="3" width="80%" />
        <Skeleton height="3" width="64%" />
      </Stack>
      <MetricSkeletons />
      <Flex gap="4">
        <Skeleton height="3" width="24" />
        <Skeleton height="3" width="20" />
      </Flex>
      <Box borderTopWidth="1px" borderColor="border.subtle" pt="3">
        <Skeleton height="5" width="28" mb="2" />
        <Skeleton height="3" width="56" mb="3" />
        <Stack gap="1.5">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} height="9" rounded="sm" />
          ))}
        </Stack>
      </Box>
    </Stack>
  )
}

function DetailSkeleton() {
  return (
    <Stack gap="3" minW="0" aria-hidden="true">
      <Skeleton height="6" width="44" />
      <Skeleton height="3" width="32" />
      <Box bg="surface.panel" borderWidth="1px" borderColor="border.subtle" rounded="panel" p="3">
        <MetricSkeletons />
      </Box>
      <Flex justify="space-between" align="center" gap="3">
        <Skeleton height="5" width="48" />
        <Skeleton height="9" width="48" rounded="md" />
      </Flex>
      <Skeleton height={{ base: '260px', md: '340px' }} rounded="panel" />
    </Stack>
  )
}

export function PeriodAnalysisSkeleton({ scenario, splitLayout }: { scenario: RangeScenario; splitLayout: boolean }) {
  return (
    <Stack role="status" aria-live="polite" aria-label="Period analysis is loading" gap="3">
      <Flex
        bg="brand.subtle"
        borderWidth="1px"
        borderColor="brand.emphasized"
        rounded="panel"
        px={{ base: 3, md: 4 }}
        py="2.5"
        justify="space-between"
        align={{ base: 'flex-start', sm: 'center' }}
        direction={{ base: 'column', sm: 'row' }}
        gap="2"
      >
        <Box>
          <Text fontSize="sm" fontWeight="semibold">Analyzing period</Text>
          <Text color="text.secondary" fontSize="xs" fontVariantNumeric="tabular-nums">
            {formatDate(scenario.decisionDateFrom)} – {formatDate(scenario.decisionDateTo)} · Cutoff {scenario.cutoffTime}
          </Text>
        </Box>
        <Badge colorPalette="brand" variant="surface">Loading</Badge>
      </Flex>
      <Grid
        templateColumns={splitLayout ? 'minmax(0, 2fr) minmax(0, 3fr)' : 'minmax(0, 1fr)'}
        gap="4"
        minW="0"
      >
        <MasterSkeleton />
        <DetailSkeleton />
      </Grid>
    </Stack>
  )
}
