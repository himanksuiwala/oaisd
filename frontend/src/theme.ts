import { createSystem, defaultConfig, defineConfig, defineSlotRecipe } from '@chakra-ui/react'

const metricCard = defineSlotRecipe({
  slots: ['root', 'label', 'value', 'help'],
  base: {
    root: {
      borderInlineStartWidth: '2px',
      borderColor: 'brand.emphasized',
      px: { base: '4', md: '5' },
      py: '4',
    },
    label: {
      color: 'text.secondary',
      fontSize: 'sm',
      fontWeight: 'medium',
      letterSpacing: 'wide',
      textTransform: 'uppercase',
    },
    value: {
      color: 'text.primary',
      fontSize: { base: '2xl', md: '3xl' },
      fontWeight: 'semibold',
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: 'tight',
      lineHeight: '1.1',
    },
    help: {
      color: 'text.secondary',
      fontSize: 'sm',
      lineHeight: '1.5',
    },
  },
})

const config = defineConfig({
  globalCss: {
    'html, body, #root': {
      minHeight: '100%',
    },
    body: {
      bg: 'surface.page',
      color: 'text.primary',
      fontFamily: 'body',
    },
    '::selection': {
      bg: 'brand.muted',
      color: 'brand.fg',
    },
  },
  theme: {
    keyframes: {
      resultIn: {
        from: { opacity: 0, transform: 'translateY(4px)' },
        to: { opacity: 1, transform: 'translateY(0)' },
      },
    },
    tokens: {
      colors: {
        brand: {
          50: { value: '#F1F7F8' },
          100: { value: '#DCECEF' },
          200: { value: '#B7D6DB' },
          300: { value: '#82B5BE' },
          400: { value: '#4B929E' },
          500: { value: '#267480' },
          600: { value: '#185B67' },
          700: { value: '#124854' },
          800: { value: '#0E3540' },
          900: { value: '#092630' },
          950: { value: '#051A22' },
        },
        signal: {
          50: { value: '#ECFAF8' },
          100: { value: '#CCF3ED' },
          200: { value: '#99E5DA' },
          300: { value: '#5FD0C2' },
          400: { value: '#2CB5A7' },
          500: { value: '#139589' },
          600: { value: '#0B776F' },
          700: { value: '#0A5F5A' },
          800: { value: '#0B4C49' },
          900: { value: '#0A3F3D' },
          950: { value: '#042625' },
        },
        caution: {
          50: { value: '#FFF8E8' },
          100: { value: '#FCECC0' },
          200: { value: '#F7D77F' },
          300: { value: '#EFBA3F' },
          400: { value: '#DB951A' },
          500: { value: '#B8750D' },
          600: { value: '#93580B' },
          700: { value: '#74420D' },
          800: { value: '#603612' },
          900: { value: '#512F13' },
          950: { value: '#2E1807' },
        },
      },
      fonts: {
        heading: { value: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
        body: { value: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
      },
      radii: {
        panel: { value: '0.75rem' },
      },
      shadows: {
        panel: { value: '0 1px 2px rgba(5, 26, 34, 0.06)' },
      },
    },
    semanticTokens: {
      colors: {
        'brand.solid': { value: { base: '{colors.brand.700}', _dark: '{colors.brand.300}' } },
        'brand.contrast': { value: { base: 'white', _dark: '{colors.brand.950}' } },
        'brand.fg': { value: { base: '{colors.brand.800}', _dark: '{colors.brand.100}' } },
        'brand.muted': { value: { base: '{colors.brand.100}', _dark: '{colors.brand.900}' } },
        'brand.subtle': { value: { base: '{colors.brand.50}', _dark: '{colors.brand.950}' } },
        'brand.emphasized': { value: { base: '{colors.brand.200}', _dark: '{colors.brand.800}' } },
        'brand.focusRing': { value: { base: '{colors.brand.500}', _dark: '{colors.brand.300}' } },
        'data.forecast': { value: { base: '{colors.brand.600}', _dark: '{colors.brand.300}' } },
        'data.actual': { value: { base: '{colors.signal.600}', _dark: '{colors.signal.300}' } },
        'status.complete': { value: { base: '{colors.signal.700}', _dark: '{colors.signal.300}' } },
        'status.caution': { value: { base: '{colors.caution.600}', _dark: '{colors.caution.300}' } },
        'status.unavailable': { value: { base: '#66777D', _dark: '#AFC0C5' } },
        'surface.page': { value: { base: '#F5F7F7', _dark: '{colors.brand.950}' } },
        'surface.panel': { value: { base: 'white', _dark: '{colors.brand.900}' } },
        'surface.raised': { value: { base: '#FBFCFC', _dark: '{colors.brand.800}' } },
        'text.primary': { value: { base: '{colors.brand.950}', _dark: '#F5FAFA' } },
        'text.secondary': { value: { base: '#52646B', _dark: '#B7C9CE' } },
        'border.subtle': { value: { base: '#DDE5E7', _dark: '{colors.brand.800}' } },
        'border.strong': { value: { base: '#AFC0C5', _dark: '{colors.brand.600}' } },
        'focus.ring': { value: { base: '{colors.brand.500}', _dark: '{colors.brand.300}' } },
      },
    },
    slotRecipes: {
      metricCard,
    },
  },
})

export const system = createSystem(defaultConfig, config)
