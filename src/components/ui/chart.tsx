"use client"

import * as React from "react"
import { ResponsiveContainer, Tooltip } from "recharts"
import { cn } from "../../lib/utils"

interface ChartProps extends React.ComponentProps<typeof ResponsiveContainer> {
  config: Record<
    string,
    {
      label: string
      color: string
    }
  >
}

const Chart = React.forwardRef<React.ElementRef<typeof ResponsiveContainer>, ChartProps>(
  ({ className, children, config, ...props }, ref) => {
    return (
      <div
        className={cn("space-y-3", className)}
        style={
          config
            ? ({
                "--chart-1": config[Object.keys(config)[0]]?.color,
                "--chart-2": config[Object.keys(config)[1]]?.color,
                "--chart-3": config[Object.keys(config)[2]]?.color,
                "--chart-4": config[Object.keys(config)[3]]?.color,
                "--chart-5": config[Object.keys(config)[4]]?.color,
              } as React.CSSProperties)
            : undefined
        }
      >
        {config && (
          <div className="flex items-center gap-4 text-sm">
            {Object.entries(config).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ background: value.color }} />
                <span>{value.label}</span>
              </div>
            ))}
          </div>
        )}
        {children}
      </div>
    )
  },
)
Chart.displayName = "Chart"

const ChartTooltip = React.forwardRef<
  React.ElementRef<typeof Tooltip>, 
  React.ComponentPropsWithoutRef<typeof Tooltip>
>(
  ({ ...props }, ref) => <Tooltip ref={ref} content={<ChartTooltipContent />} {...props} />,
)


const ChartTooltipContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg border bg-background p-2 shadow-md", className)} {...props} />
  ),
)
ChartTooltipContent.displayName = "ChartTooltipContent"

interface ChartContainerProps extends ChartProps {
  children: React.ReactElement // Ensure children is a valid ReactElement
}

function ChartContainer({ className, children, config, ...props }: ChartContainerProps) {
  return (
    <Chart className={className} config={config} {...props}>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Chart>
  )
}

export { Chart, ChartContainer, ChartTooltip, ChartTooltipContent }

