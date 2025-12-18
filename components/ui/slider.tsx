"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type SliderProps = {
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
};

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      value,
      defaultValue,
      min = 0,
      max = 100,
      step = 1,
      onValueChange,
      disabled,
      className,
      id,
    },
    ref
  ) => {
    const currentValue = value?.[0] ?? defaultValue?.[0] ?? min;
    const percentage = ((currentValue - min) / (max - min)) * 100;

    return (
      <div className={cn("relative flex w-full items-center", className)}>
        <input
          ref={ref}
          className={cn(
            "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-primary/20",
            "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary/50",
            "[&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow",
            "[&::-webkit-slider-thumb]:transition-colors",
            "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
            "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-primary/50",
            "[&::-moz-range-thumb]:bg-background [&::-moz-range-thumb]:shadow",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
          disabled={disabled}
          id={id}
          max={max}
          min={min}
          onChange={(e) => {
            onValueChange?.([Number.parseFloat(e.target.value)]);
          }}
          step={step}
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) ${percentage}%, hsl(var(--primary) / 0.2) ${percentage}%)`,
          }}
          type="range"
          value={currentValue}
        />
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };

