"use client";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import type { InsightsMetrics } from "@/lib/meta-business/marketing/types";
import {
  formatChartDate,
  formatCurrency,
  formatNumber,
} from "../utils/formatters";

type InsightsChartProps = {
  data: InsightsMetrics[];
  isLoading?: boolean;
  metric?: "spend" | "impressions" | "clicks" | "cpc" | "cpm";
};

// Explicit colors that work in both light and dark modes
const metricColors: Record<string, string> = {
  spend: "#4C49BE", // hsl(241, 45%, 52%) - chart-1
  impressions: "#5C5CCC", // hsl(240, 50%, 58%) - chart-2
  clicks: "#7A7ADB", // hsl(240, 55%, 67%) - chart-3
  cpc: "#9696EA", // hsl(240, 66%, 75%) - chart-4
  cpm: "#B3B3B3", // hsl(0, 0%, 70%) - chart-5
};

const chartConfig = {
  spend: {
    label: "Gasto",
    color: metricColors.spend,
  },
  impressions: {
    label: "Impressões",
    color: metricColors.impressions,
  },
  clicks: {
    label: "Cliques",
    color: metricColors.clicks,
  },
  cpc: {
    label: "CPC",
    color: metricColors.cpc,
  },
  cpm: {
    label: "CPM",
    color: metricColors.cpm,
  },
} satisfies ChartConfig;

// Simple function to get color for a metric - uses explicit colors
function getMetricColor(metric: string): string {
  return metricColors[metric] || metricColors.spend;
}

export function InsightsChart({
  data,
  isLoading = false,
  metric = "spend",
}: InsightsChartProps) {
  const metricColor = getMetricColor(metric);

  if (isLoading) {
    return (
      <div className="w-full h-[250px] sm:h-[300px] flex items-center justify-center">
        <Skeleton className="w-full h-full rounded-lg" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[250px] sm:h-[300px] flex items-center justify-center border rounded-lg bg-muted/30">
        <p className="text-muted-foreground text-sm">Sem dados para exibir</p>
      </div>
    );
  }

  // Transform data for chart
  const chartData = data.map((item) => ({
    date: formatChartDate(item.dateStart),
    rawDate: item.dateStart,
    spend: parseFloat(item.spend ?? "0"),
    impressions: parseInt(item.impressions ?? "0"),
    clicks: parseInt(item.clicks ?? "0"),
    cpc: parseFloat(item.cpc ?? "0"),
    cpm: parseFloat(item.cpm ?? "0"),
  }));

  const formatValue = (value: number) => {
    if (metric === "spend" || metric === "cpc" || metric === "cpm") {
      return formatCurrency(value);
    }
    return formatNumber(value);
  };

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full h-[250px] sm:h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tickMargin={8}
            tickFormatter={(value) => {
              if (metric === "spend" || metric === "cpc" || metric === "cpm") {
                return `R$${
                  value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                }`;
              }
              return value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value;
            }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => {
                  const formattedValue = formatValue(value as number);
                  return (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label ??
                          name}
                      </span>
                      <span className="font-medium">{formattedValue}</span>
                    </div>
                  );
                }}
              />
            }
          />
          <Line
            type="monotone"
            dataKey={metric}
            stroke={metricColor}
            strokeWidth={2}
            dot={false}
            activeDot={{
              r: 5,
              fill: metricColor,
              stroke: "hsl(var(--card))",
              strokeWidth: 2,
              className: "drop-shadow-sm",
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// Multi-metric chart for comparing different metrics
type MultiMetricInsightsChartProps = {
  data: InsightsMetrics[];
  isLoading?: boolean;
  metrics?: ("spend" | "impressions" | "clicks")[];
};

export function MultiMetricInsightsChart({
  data,
  isLoading = false,
  metrics = ["spend", "clicks"],
}: MultiMetricInsightsChartProps) {
  const spendColor = getMetricColor("spend");
  const clicksColor = getMetricColor("clicks");
  const impressionsColor = getMetricColor("impressions");

  if (isLoading) {
    return (
      <div className="w-full h-[250px] sm:h-[300px] flex items-center justify-center">
        <Skeleton className="w-full h-full rounded-lg" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[250px] sm:h-[300px] flex items-center justify-center border rounded-lg bg-muted/30">
        <p className="text-muted-foreground text-sm">Sem dados para exibir</p>
      </div>
    );
  }

  // Transform data for chart
  const chartData = data.map((item) => ({
    date: formatChartDate(item.dateStart),
    rawDate: item.dateStart,
    spend: parseFloat(item.spend ?? "0"),
    impressions: parseInt(item.impressions ?? "0"),
    clicks: parseInt(item.clicks ?? "0"),
  }));

  return (
    <ChartContainer
      config={chartConfig}
      className="w-full h-[250px] sm:h-[300px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tickMargin={8}
          />
          <YAxis
            yAxisId="left"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tickMargin={8}
            tickFormatter={(value) =>
              value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
            }
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tickMargin={8}
            tickFormatter={(value) =>
              `R$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`
            }
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => {
                  const isCurrency = name === "spend";
                  const formattedValue = isCurrency
                    ? formatCurrency(value as number)
                    : formatNumber(value as number);
                  return (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label ??
                          name}
                      </span>
                      <span className="font-medium">{formattedValue}</span>
                    </div>
                  );
                }}
              />
            }
          />
          {metrics.includes("spend") && (
            <Line
              type="monotone"
              dataKey="spend"
              stroke={spendColor}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                fill: spendColor,
                stroke: "hsl(var(--card))",
                strokeWidth: 2,
                className: "drop-shadow-sm",
              }}
              yAxisId="right"
            />
          )}
          {metrics.includes("clicks") && (
            <Line
              type="monotone"
              dataKey="clicks"
              stroke={clicksColor}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                fill: clicksColor,
                stroke: "hsl(var(--card))",
                strokeWidth: 2,
                className: "drop-shadow-sm",
              }}
              yAxisId="left"
            />
          )}
          {metrics.includes("impressions") && (
            <Line
              type="monotone"
              dataKey="impressions"
              stroke={impressionsColor}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                fill: impressionsColor,
                stroke: "hsl(var(--card))",
                strokeWidth: 2,
                className: "drop-shadow-sm",
              }}
              yAxisId="left"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
