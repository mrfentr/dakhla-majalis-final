'use client';

import {
  DateRangePicker as AriaDateRangePicker,
  Dialog,
  Group,
  Label,
  Popover,
  RangeCalendar,
  CalendarGrid,
  CalendarCell,
  Heading,
  Button as AriaButton,
  type DateValue
} from 'react-aria-components';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { type DateRange } from 'react-aria-components';

interface DateRangePickerProps {
  label?: string;
  value?: DateRange | null;
  onChange?: (value: DateRange | null) => void;
}

export function DateRangePicker({ label, value, onChange }: DateRangePickerProps) {
  const formatDate = (date: DateValue | null | undefined) => {
    if (!date) return 'Sélectionner';
    return new Date(date.year, date.month - 1, date.day).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <AriaDateRangePicker
      value={value}
      onChange={onChange}
      className="flex flex-col gap-2"
    >
      {label && (
        <Label className="text-sm font-bold text-neutral-900">
          {label}
        </Label>
      )}

      <Group className="relative inline-flex w-full cursor-pointer items-center rounded-lg border border-neutral-300 bg-white px-4 py-3 shadow-sm transition-all hover:border-[#BD7C48] hover:shadow-md focus-within:border-[#BD7C48] focus-within:ring-2 focus-within:ring-[#BD7C48]/20">
        <AriaButton className="flex flex-1 items-center gap-3 text-left">
          <Calendar className="h-5 w-5 text-[#BD7C48]" />

          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="text-neutral-900">
              {formatDate(value?.start)}
            </span>
            <span className="text-neutral-400">→</span>
            <span className="text-neutral-900">
              {formatDate(value?.end)}
            </span>
          </div>
        </AriaButton>

        <ChevronRight className="ml-auto h-4 w-4 text-neutral-400" />
      </Group>

      <Popover
        className="rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl"
        offset={8}
      >
        <Dialog className="outline-none">
          <RangeCalendar className="w-full">
            <header className="mb-4 flex items-center justify-between pb-2 border-b border-neutral-200">
              <AriaButton
                slot="previous"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-700 transition-colors hover:bg-[#BD7C48]/10 hover:text-[#BD7C48]"
              >
                <ChevronLeft className="h-5 w-5" />
              </AriaButton>

              <Heading className="text-base font-black text-neutral-900" />

              <AriaButton
                slot="next"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-700 transition-colors hover:bg-[#BD7C48]/10 hover:text-[#BD7C48]"
              >
                <ChevronRight className="h-5 w-5" />
              </AriaButton>
            </header>

            <CalendarGrid className="w-full border-collapse mt-4">
              {(date) => (
                <CalendarCell
                  date={date}
                  className="relative flex h-10 w-10 cursor-pointer items-center justify-center text-sm font-semibold text-neutral-900 outline-none rounded-lg
                    hover:bg-[#BD7C48]/10 hover:text-[#BD7C48]
                    data-[selected]:bg-[#BD7C48] data-[selected]:text-white
                    data-[selection-start]:rounded-lg data-[selection-end]:rounded-lg
                    data-[focused]:ring-2 data-[focused]:ring-[#BD7C48] data-[focused]:ring-offset-2
                    data-[outside-month]:text-neutral-300
                    data-[disabled]:text-neutral-200 data-[disabled]:cursor-not-allowed data-[disabled]:hover:bg-transparent
                    data-[unavailable]:text-red-300 data-[unavailable]:line-through"
                />
              )}
            </CalendarGrid>
          </RangeCalendar>
        </Dialog>
      </Popover>
    </AriaDateRangePicker>
  );
}
