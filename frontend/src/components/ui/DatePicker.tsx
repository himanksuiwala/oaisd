import {
  Box,
  DatePicker as ChakraDatePicker,
  Flex,
  IconButton,
  Portal,
  Text,
  parseDate,
} from '@chakra-ui/react'
import { useCallback, useId, useMemo } from 'react'

function CalendarGlyph() {
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
      <path d="M8 2v4M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}

function ChevronLeftGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function ChevronRightGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export interface JanuaryDatePickerProps {
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  id?: string
  name?: string
  disabled?: boolean
  required?: boolean
  'aria-label'?: string
}

const JAN_MIN = parseDate('2026-01-01')
const JAN_MAX = parseDate('2026-01-31')

export function JanuaryDatePicker({
  value,
  onChange,
  min = '2026-01-01',
  max = '2026-01-31',
  id,
  name,
  disabled,
  'aria-label': ariaLabel,
}: JanuaryDatePickerProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  const parsedValue = useMemo(() => {
    try {
      if (value && value.startsWith('2026-01-')) {
        return [parseDate(value)]
      }
    } catch {
      // Fallback if parsing fails
    }
    return [parseDate('2026-01-15')]
  }, [value])

  const effectiveMin = useMemo(() => {
    try {
      const parsed = parseDate(min)
      if (parsed.compare(JAN_MIN) > 0 && parsed.compare(JAN_MAX) <= 0) return parsed
    } catch {
      // Ignore
    }
    return JAN_MIN
  }, [min])

  const effectiveMax = useMemo(() => {
    try {
      const parsed = parseDate(max)
      if (parsed.compare(JAN_MIN) >= 0 && parsed.compare(JAN_MAX) < 0) return parsed
    } catch {
      // Ignore
    }
    return JAN_MAX
  }, [max])

  const handleValueChange = useCallback(
    (details: { value: Array<{ toString: () => string; year: number; month: number }> }) => {
      const selected = details.value[0]
      if (selected && selected.year === 2026 && selected.month === 1) {
        const str = selected.toString()
        if (str >= min && str <= max) {
          onChange(str)
        }
      }
    },
    [onChange, min, max]
  )

  return (
    <ChakraDatePicker.Root
      id={inputId}
      name={name}
      disabled={disabled}
      value={parsedValue}
      onValueChange={handleValueChange}
      min={effectiveMin}
      max={effectiveMax}
      isDateUnavailable={(date) => date.year !== 2026 || date.month !== 1 || date.toString() < min || date.toString() > max}
      numOfMonths={1}
      selectionMode="single"
      colorPalette="brand"
      w="full"
      minW="0"
    >
      <ChakraDatePicker.Control
        display="flex"
        alignItems="center"
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
        <ChakraDatePicker.Input
          h="11"
          px="3"
          bg="transparent"
          borderWidth="0"
          rounded="md"
          w="full"
          minW="0"
          fontSize="sm"
          fontVariantNumeric="tabular-nums"
          aria-label={ariaLabel ?? 'Select January 2026 decision date'}
          _focus={{ outline: 'none' }}
        />
        <ChakraDatePicker.Trigger asChild>
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Open January 2026 calendar"
            minH="11"
            minW="11"
            rounded="none"
            borderEndRadius="md"
            color="text.secondary"
            _hover={{ color: 'fg', bg: 'surface.raised' }}
          >
            <CalendarGlyph />
          </IconButton>
        </ChakraDatePicker.Trigger>
      </ChakraDatePicker.Control>

      <Portal>
        <ChakraDatePicker.Positioner zIndex="popover">
          <ChakraDatePicker.Content
            bg="surface.panel"
            borderWidth="1px"
            borderColor="border.subtle"
            rounded="panel"
            p="3"
            shadow="lg"
            zIndex="popover"
          >
            <ChakraDatePicker.View view="day">
              <ChakraDatePicker.Context>
                {(datePicker) => (
                  <Box>
                    <Flex justify="space-between" align="center" mb="2" px="1">
                      <ChakraDatePicker.PrevTrigger asChild>
                        <IconButton
                          variant="ghost"
                          size="xs"
                          aria-label="Previous month (disabled outside January 2026)"
                          disabled
                          opacity="0.3"
                          cursor="not-allowed"
                        >
                          <ChevronLeftGlyph />
                        </IconButton>
                      </ChakraDatePicker.PrevTrigger>
                      <Flex direction="column" align="center">
                        <Text fontWeight="semibold" fontSize="sm">
                          January 2026
                        </Text>
                        <Text fontSize="2xs" color="text.secondary" letterSpacing="wide" textTransform="uppercase">
                          Restricted dataset
                        </Text>
                      </Flex>
                      <ChakraDatePicker.NextTrigger asChild>
                        <IconButton
                          variant="ghost"
                          size="xs"
                          aria-label="Next month (disabled outside January 2026)"
                          disabled
                          opacity="0.3"
                          cursor="not-allowed"
                        >
                          <ChevronRightGlyph />
                        </IconButton>
                      </ChakraDatePicker.NextTrigger>
                    </Flex>

                    <ChakraDatePicker.Table>
                      <ChakraDatePicker.TableHead>
                        <ChakraDatePicker.TableRow>
                          {datePicker.weekDays.map((weekDay, id) => (
                            <ChakraDatePicker.TableHeader
                              key={id}
                              fontSize="xs"
                              color="text.secondary"
                              fontWeight="medium"
                              textAlign="center"
                              py="1"
                              width="8"
                            >
                              {weekDay.narrow}
                            </ChakraDatePicker.TableHeader>
                          ))}
                        </ChakraDatePicker.TableRow>
                      </ChakraDatePicker.TableHead>
                      <ChakraDatePicker.TableBody>
                        {datePicker.weeks.map((week, weekIndex) => (
                          <ChakraDatePicker.TableRow key={weekIndex}>
                            {week.map((day, dayIndex) => {
                              const isJan = day.year === 2026 && day.month === 1
                              const inRange = isJan && day.toString() >= min && day.toString() <= max
                              return (
                                <ChakraDatePicker.TableCell
                                  key={dayIndex}
                                  value={day}
                                  textAlign="center"
                                  p="0.5"
                                >
                                  <ChakraDatePicker.TableCellTrigger
                                    disabled={!inRange}
                                    w="8"
                                    h="8"
                                    fontSize="xs"
                                    fontWeight={day.toString() === value ? 'bold' : 'normal'}
                                    rounded="md"
                                    bg={day.toString() === value ? 'brand.solid' : 'transparent'}
                                    color={
                                      day.toString() === value
                                        ? 'white'
                                        : inRange
                                          ? 'fg'
                                          : 'text.muted'
                                    }
                                    opacity={inRange ? 1 : 0.3}
                                    cursor={inRange ? 'pointer' : 'not-allowed'}
                                    _hover={
                                      inRange && day.toString() !== value
                                        ? { bg: 'brand.subtle', color: 'brand.fg' }
                                        : undefined
                                    }
                                  >
                                    {day.day}
                                  </ChakraDatePicker.TableCellTrigger>
                                </ChakraDatePicker.TableCell>
                              )
                            })}
                          </ChakraDatePicker.TableRow>
                        ))}
                      </ChakraDatePicker.TableBody>
                    </ChakraDatePicker.Table>
                  </Box>
                )}
              </ChakraDatePicker.Context>
            </ChakraDatePicker.View>
          </ChakraDatePicker.Content>
        </ChakraDatePicker.Positioner>
      </Portal>
    </ChakraDatePicker.Root>
  )
}
