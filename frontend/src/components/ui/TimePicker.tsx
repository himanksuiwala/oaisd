import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  Popover,
  Portal,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useCallback, useId, useState } from 'react'

function ClockGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  id?: string
  name?: string
  disabled?: boolean
  required?: boolean
  placeholder?: string
  'aria-label'?: string
}

const PRESET_CUTOFFS = [
  { label: '09:00', desc: 'Morning' },
  { label: '11:00', desc: 'Standard' },
  { label: '12:00', desc: 'Noon' },
  { label: '14:00', desc: 'Afternoon' },
  { label: '16:00', desc: 'Pre-close' },
  { label: '17:00', desc: 'Day-ahead' },
  { label: '22:00', desc: 'Evening' },
  { label: '23:00', desc: 'Late' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

export function TimePicker({
  value,
  onChange,
  id,
  name,
  disabled,
  required,
  placeholder = 'HH:mm',
  'aria-label': ariaLabel,
}: TimePickerProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const [open, setOpen] = useState(false)

  // Parse current hour and minute
  const [currentHour = '11', currentMinute = '00'] = (value || '11:00').split(':')

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
    },
    [onChange]
  )

  const handleSelectHour = useCallback(
    (hour: string) => {
      const nextTime = `${hour}:${currentMinute}`
      onChange(nextTime)
    },
    [currentMinute, onChange]
  )

  const handleSelectMinute = useCallback(
    (minute: string) => {
      const nextTime = `${currentHour}:${minute}`
      onChange(nextTime)
    },
    [currentHour, onChange]
  )

  const handleSelectPreset = useCallback(
    (presetTime: string) => {
      onChange(presetTime)
      setOpen(false)
    },
    [onChange]
  )

  return (
    <Popover.Root open={open} onOpenChange={(details) => setOpen(details.open)} positioning={{ placement: 'bottom-start' }}>
      <Flex
        align="center"
        position="relative"
        w="full"
        minW="0"
        borderWidth="1px"
        borderColor="border.subtle"
        rounded="md"
        bg="surface.panel"
        _focusWithin={{
          borderColor: 'brand.solid',
          outline: '2px solid',
          outlineColor: 'focus.ring',
          outlineOffset: '-1px',
        }}
      >
        <Input
          id={inputId}
          name={name}
          disabled={disabled}
          required={required}
          h="11"
          px="3"
          bg="transparent"
          borderWidth="0"
          rounded="md"
          w="full"
          minW="0"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]"
          title="Enter time in 24-hour HH:mm format"
          maxLength={5}
          value={value}
          onChange={handleInputChange}
          fontSize="sm"
          fontVariantNumeric="tabular-nums"
          aria-label={ariaLabel ?? 'Cutoff time in HH:mm'}
          _focus={{ outline: 'none' }}
        />
        <Popover.Trigger asChild>
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Open cutoff time picker"
            minH="11"
            minW="11"
            rounded="none"
            borderEndRadius="md"
            color="text.secondary"
            _hover={{ color: 'fg', bg: 'surface.raised' }}
          >
            <ClockGlyph />
          </IconButton>
        </Popover.Trigger>
      </Flex>

      <Portal>
        <Popover.Positioner zIndex="popover">
          <Popover.Content
            bg="surface.panel"
            borderWidth="1px"
            borderColor="border.subtle"
            rounded="panel"
            p="4"
            shadow="lg"
            w="290px"
            maxW="calc(100vw - 32px)"
            zIndex="popover"
            _focus={{ outline: 'none' }}
          >
            <Stack gap="4">
              <Flex justify="space-between" align="center">
                <Box>
                  <Text fontWeight="semibold" fontSize="sm">
                    Select cutoff time
                  </Text>
                  <Text color="text.secondary" fontSize="xs">
                    Evaluated strictly in UTC
                  </Text>
                </Box>
                <Badge colorPalette="brand" size="sm" variant="surface">
                  UTC
                </Badge>
              </Flex>

              {/* Quick Presets */}
              <Box>
                <Text color="text.secondary" fontSize="xs" fontWeight="semibold" mb="1.5">
                  Common cutoffs
                </Text>
                <SimpleGrid columns={4} gap="1.5">
                  {PRESET_CUTOFFS.map((preset) => {
                    const isSelected = value === preset.label
                    return (
                      <Button
                        key={preset.label}
                        size="xs"
                        variant={isSelected ? 'solid' : 'outline'}
                        colorPalette={isSelected ? 'brand' : 'gray'}
                        onClick={() => handleSelectPreset(preset.label)}
                        h="7"
                        fontSize="xs"
                        fontVariantNumeric="tabular-nums"
                      >
                        {preset.label}
                      </Button>
                    )
                  })}
                </SimpleGrid>
              </Box>

              {/* Hour & Minute Picker */}
              <Box pt="2" borderTopWidth="1px" borderColor="border.subtle">
                <HStack justify="space-between" mb="1.5">
                  <Text color="text.secondary" fontSize="xs" fontWeight="semibold">
                    Hour (00–23)
                  </Text>
                  <Text color="text.secondary" fontSize="xs" fontWeight="semibold">
                    Minute (:00–:55)
                  </Text>
                </HStack>

                <Flex gap="2" h="140px">
                  {/* Hours scroll column */}
                  <Box
                    flex="1"
                    h="full"
                    overflowY="auto"
                    borderWidth="1px"
                    borderColor="border.subtle"
                    rounded="md"
                    p="1"
                  >
                    <Stack gap="1">
                      {HOURS.map((hour) => {
                        const isSelected = currentHour === hour
                        return (
                          <Button
                            key={hour}
                            size="xs"
                            variant={isSelected ? 'solid' : 'ghost'}
                            colorPalette={isSelected ? 'brand' : 'gray'}
                            w="full"
                            h="6"
                            fontSize="xs"
                            fontVariantNumeric="tabular-nums"
                            onClick={() => handleSelectHour(hour)}
                          >
                            {hour}
                          </Button>
                        )
                      })}
                    </Stack>
                  </Box>

                  {/* Minutes scroll column */}
                  <Box
                    flex="1"
                    h="full"
                    overflowY="auto"
                    borderWidth="1px"
                    borderColor="border.subtle"
                    rounded="md"
                    p="1"
                  >
                    <Stack gap="1">
                      {MINUTES.map((min) => {
                        const isSelected = currentMinute === min
                        return (
                          <Button
                            key={min}
                            size="xs"
                            variant={isSelected ? 'solid' : 'ghost'}
                            colorPalette={isSelected ? 'brand' : 'gray'}
                            w="full"
                            h="6"
                            fontSize="xs"
                            fontVariantNumeric="tabular-nums"
                            onClick={() => handleSelectMinute(min)}
                          >
                            :{min}
                          </Button>
                        )
                      })}
                    </Stack>
                  </Box>
                </Flex>
              </Box>

              {/* Footer action */}
              <Flex justify="space-between" align="center" pt="1" borderTopWidth="1px" borderColor="border.subtle">
                <Text fontSize="sm" fontWeight="semibold" fontVariantNumeric="tabular-nums">
                  {value || '11:00'}
                </Text>
                <Button size="xs" colorPalette="brand" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </Flex>
            </Stack>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
