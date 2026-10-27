import { Box, Container, Flex, Grid, SegmentGroup, Text } from '@chakra-ui/react'
import { MethodologyButton, type MethodologySection } from '../overlays/MethodologyDialog.tsx'

export function AppHeader({ view, onViewChange, onOpenMethodology }: { view: 'single' | 'period'; onViewChange: (view: 'single' | 'period') => void; onOpenMethodology: (section: MethodologySection) => void }) {
  return (
    <Box as="header" width="full" maxW="100vw" overflowX="clip" bg="surface.panel" borderBottomWidth="1px" borderColor="border.subtle" position="sticky" top="0" zIndex="10">
      <Container maxW="8xl" width="full">
        <Grid
          minH={{ md: '52px' }}
          py={{ base: 2, md: 0 }}
          columnGap="4"
          rowGap="2"
          alignItems="center"
          templateAreas={{ base: '"brand utility" "navigation navigation"', md: '"brand navigation utility"' }}
          templateColumns={{ base: 'minmax(0, 1fr) auto', md: 'minmax(0, 1fr) 304px minmax(0, 1fr)' }}
        >
          <Flex gridArea="brand" align="baseline" gap="3" minW="0">
            <Text color="brand.fg" fontWeight="bold" letterSpacing="wide">GRIDBRICKS</Text>
            <Text color="text.secondary" fontSize="sm" display={{ base: 'none', lg: 'block' }}>Wind intelligence</Text>
          </Flex>

          <SegmentGroup.Root
            aria-label="Primary analysis navigation"
            value={view}
            onValueChange={(details) => {
              if (details.value === 'single' || details.value === 'period') onViewChange(details.value)
            }}
            colorPalette="brand"
            size="sm"
            gridArea="navigation"
            justifySelf="center"
            minH="10"
            minW="0"
            maxW="full"
            overflow="hidden"
            width="full"
            boxSizing="border-box"
            bg="surface.raised"
            boxShadow="none"
            p="1"
            rounded="lg"
            css={{
              '--segment-indicator-bg': 'var(--chakra-colors-brand-subtle)',
              '--segment-indicator-shadow': 'none',
            }}
          >
            <SegmentGroup.Indicator boxShadow="none" borderWidth="0" />
            <SegmentGroup.Item
              value="single"
              flex="1 1 0"
              width="auto"
              minW="0"
              justifyContent="center"
              whiteSpace="nowrap"
              fontSize={{ base: 'xs', sm: 'sm' }}
              _before={{ display: 'none' }}
              css={{
                '&[data-state=checked]': { color: 'brand.fg', fontWeight: 'semibold' },
                '&:has(input:focus-visible)': {
                  outline: '2px solid',
                  outlineColor: 'focus.ring',
                  outlineOffset: '-2px',
                  boxShadow: 'none',
                },
              }}
            >
              <SegmentGroup.ItemText>Day analysis</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
            <SegmentGroup.Item
              value="period"
              flex="1 1 0"
              width="auto"
              minW="0"
              justifyContent="center"
              whiteSpace="nowrap"
              fontSize={{ base: 'xs', sm: 'sm' }}
              _before={{ display: 'none' }}
              css={{
                '&[data-state=checked]': { color: 'brand.fg', fontWeight: 'semibold' },
                '&:has(input:focus-visible)': {
                  outline: '2px solid',
                  outlineColor: 'focus.ring',
                  outlineOffset: '-2px',
                  boxShadow: 'none',
                },
              }}
            >
              <SegmentGroup.ItemText>Period analysis</SegmentGroup.ItemText>
              <SegmentGroup.ItemHiddenInput />
            </SegmentGroup.Item>
          </SegmentGroup.Root>

          <Box gridArea="utility" justifySelf="end">
            <MethodologyButton onOpen={onOpenMethodology} />
          </Box>
        </Grid>
      </Container>
    </Box>
  )
}
