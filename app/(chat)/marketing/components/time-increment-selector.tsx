"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TimeIncrement } from "@/lib/meta-business/marketing/types";

type TimeIncrementSelectorProps = {
  value: TimeIncrement;
  onChange: (value: TimeIncrement) => void;
  disabled?: boolean;
};

const timeIncrements: { value: TimeIncrement; label: string; shortLabel: string }[] = [
  { value: "day", label: "Diário", shortLabel: "Dia" },
  { value: "week", label: "Semanal", shortLabel: "Semana" },
  { value: "month", label: "Mensal", shortLabel: "Mês" },
  { value: "quarterly", label: "Trimestral", shortLabel: "Trim." },
];

export function TimeIncrementSelector({
  value,
  onChange,
  disabled = false,
}: TimeIncrementSelectorProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as TimeIncrement)}
      className="w-full sm:w-auto"
    >
      <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-flex">
        {timeIncrements.map((increment) => (
          <TabsTrigger
            key={increment.value}
            value={increment.value}
            disabled={disabled}
            className="text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">{increment.label}</span>
            <span className="sm:hidden">{increment.shortLabel}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

