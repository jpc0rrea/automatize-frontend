"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
// DatePreset values as strings
import { formatDate } from "../utils/formatters";
import { DatePreset } from "@/lib/meta-business/marketing/types";

type DateFilterProps = {
  datePreset?: DatePreset;
  onDatePresetChange?: (preset: DatePreset) => void;
  customRange?: { since: string; until: string };
  onCustomRangeChange?: (range: { since: string; until: string }) => void;
};

const datePresets: { value: DatePreset; label: string }[] = [
  { value: DatePreset.TODAY, label: "Hoje" },
  { value: DatePreset.YESTERDAY, label: "Ontem" },
  { value: DatePreset.LAST_7D, label: "Últimos 7 dias" },
  { value: DatePreset.LAST_14D, label: "Últimos 14 dias" },
  { value: DatePreset.LAST_28D, label: "Últimos 28 dias" },
  { value: DatePreset.LAST_30D, label: "Últimos 30 dias" },
  { value: DatePreset.LAST_90D, label: "Últimos 90 dias" },
  { value: DatePreset.THIS_MONTH, label: "Este mês" },
  { value: DatePreset.LAST_MONTH, label: "Mês passado" },
  { value: DatePreset.THIS_QUARTER, label: "Este trimestre" },
  { value: DatePreset.LAST_YEAR, label: "Ano passado" },
  { value: DatePreset.DATA_MAXIMUM, label: "Todo período" },
];

export function DateFilter({
  datePreset = DatePreset.LAST_30D,
  onDatePresetChange,
  customRange,
  onCustomRangeChange,
}: DateFilterProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(
    customRange?.since ? new Date(customRange.since) : undefined
  );
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(
    customRange?.until ? new Date(customRange.until) : undefined
  );

  const handlePresetChange = (value: string) => {
    if (value === "custom") {
      setIsCustomOpen(true);
    } else {
      onDatePresetChange?.(value as DatePreset);
    }
  };

  const handleCustomRangeApply = () => {
    if (selectedStartDate && selectedEndDate) {
      const since = selectedStartDate.toISOString().split("T")[0];
      const until = selectedEndDate.toISOString().split("T")[0];
      onCustomRangeChange?.({ since, until });
      setIsCustomOpen(false);
    }
  };

  const selectedPreset = datePresets.find((p) => p.value === datePreset);
  const displayValue = customRange
    ? `${formatDate(customRange.since)} - ${formatDate(customRange.until)}`
    : selectedPreset?.label ?? "Selecionar período";

  return (
    <div className="flex items-center gap-2">
      <Select value={datePreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px] sm:w-[200px]">
          <CalendarIcon className="size-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Período">{displayValue}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {datePresets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">
            <span className="flex items-center gap-2">
              Período personalizado
              <ChevronDown className="size-3" />
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Custom Date Range Popover */}
      <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <PopoverTrigger asChild>
          <span className="hidden" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedStartDate
                        ? formatDate(selectedStartDate.toISOString())
                        : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedStartDate}
                      onSelect={setSelectedStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedEndDate
                        ? formatDate(selectedEndDate.toISOString())
                        : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedEndDate}
                      onSelect={setSelectedEndDate}
                      disabled={(date) =>
                        selectedStartDate ? date < selectedStartDate : false
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCustomOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleCustomRangeApply}
                disabled={!selectedStartDate || !selectedEndDate}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
