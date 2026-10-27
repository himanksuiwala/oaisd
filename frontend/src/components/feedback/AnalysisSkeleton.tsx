import { Box, SimpleGrid, Skeleton, SkeletonText, Stack, Text } from '@chakra-ui/react'

export function AnalysisSkeleton({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <Stack role="status" aria-live="polite" aria-label={label} gap="4" py={compact ? '2' : { base: 5, md: 7 }}>
      <Text color="text.secondary" fontSize="sm">{label}</Text>
      <SimpleGrid columns={{ base: 1, sm: compact ? 2 : 3 }} gap="3">
        {Array.from({ length: compact ? 2 : 3 }, (_, index) => (
          <Box key={index} borderInlineStartWidth="2px" borderColor="border.subtle" px="4" py="3">
            <Skeleton height="3" width="20" mb="3" />
            <Skeleton height="7" width={{ base: '36', md: '44' }} mb="3" />
            <SkeletonText noOfLines={2} gap="2" />
          </Box>
        ))}
      </SimpleGrid>
      {!compact && <Skeleton height={{ base: '220px', md: '300px' }} rounded="panel" />}
    </Stack>
  )
}
