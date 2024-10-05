import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Group, Paper, Skeleton, Stack, Text } from '@mantine/core'
import styles from './InteractiveAreaChart.module.css'
import { AreaChart, AreaChartType, BarChart } from '@mantine/charts'
import { getData, toIsoDateString } from '@/api/apiHelpers'
import { Channel } from '@/api'

interface GraphItem {
  date: string
  value: number
}

export interface SeriesStruct {
  label?: string
  name: string
  color: string
}

export interface ChartProps {
  dateRange: [Date | null, Date | null]
  fetchURL: string
  channel: Channel | undefined
  dataKey: string
  series: SeriesStruct[]
  useMA: boolean
  maPeriod?: string | number
  granularity?: string
  unit?: string
  type?: AreaChartType
  style?: string
  title?: string
  yAxisRange?: [number, number]
}

const calculateYAxisRange = (data: GraphItem[]): [number, number] => {
  if (data.length === 0) return [0, 100] // Default range if no data

  const values = data.map((item) => item.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)

  // Expand the max range by 10%
  const rangePadding = Math.round((maxValue - minValue) * 0.1)
  return [minValue, maxValue + rangePadding]
}

const smoothLineChartData = (
  data: GraphItem[],
  windowSize: number,
): GraphItem[] => {
  if (windowSize < 1) {
    throw new Error('Window size must be at least 1')
  }

  const smoothedData = data.map((_, i) => {
    const start = Math.max(0, i - Math.floor(windowSize / 2))
    const end = Math.min(data.length, i + Math.ceil(windowSize / 2))
    const window = data.slice(start, end)
    const average =
      window.reduce((sum, item) => sum + item.value, 0) / window.length

    return {
      date: data[i].date,
      value: average,
    }
  })

  return smoothedData
}

const formatXAxis = (tickItem: string, granularity: string): string => {
  const date = new Date(tickItem)
  const startOfWeek = new Date(date)
  startOfWeek.setDate(date.getDate() - date.getDay())
  switch (granularity) {
    case 'Minute':
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    case 'Hour':
      return `${date.getHours().toString().padStart(2, '0')}:00`
    case 'Day':
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`
    case 'Week':
      return `Week of ${startOfWeek.toLocaleDateString()}`
    case 'Month':
      return `${date.getMonth() + 1}/${date.getFullYear()}`
    default:
      return date.toLocaleDateString()
  }
}

const defaultGran = 'day'
const defaultUnit = ''
const defaultType = 'default'
const defaultStyle = 'Area'
const defaultPeriod = 1
const defaultTitle = 'Untitled'

export function InteractiveAreaChart({
  dateRange,
  fetchURL,
  channel,
  dataKey,
  series,
  useMA,
  maPeriod = defaultPeriod,
  granularity = defaultGran,
  unit = defaultUnit,
  style = defaultStyle,
  type = defaultType,
  title = defaultTitle,
  yAxisRange,
}: ChartProps) {
  const [graphData, setGraphData] = useState<GraphItem[]>([])
  const [isLoadingGraph, setIsLoadingGraph] = useState<boolean>(false)

  console.log()

  const fetchGraphData = useCallback(
    async (
      channel: Channel,
      granularity: string,
      startDate: string,
      endDate: string,
    ) => {
      granularity = granularity.toLowerCase().replace(/\s+/g, '') || 'day'
      try {
        const response = await getData(fetchURL, {
          channel: channel.id,
          granularity,
          start_date: startDate,
          end_date: endDate,
        })
        const data = await response.json()
        return data
      } catch (error) {
        console.error('Error fetching graph data:', error)
        return []
      }
    },
    [fetchURL],
  )

  useEffect(() => {
    const updateGraph = async () => {
      setIsLoadingGraph(true)

      if (!dateRange[0] || !dateRange[1] || !channel) {
        setGraphData([])
        setIsLoadingGraph(false)
        return
      }

      const startDate = toIsoDateString(dateRange[0])
      const endDate = toIsoDateString(dateRange[1])

      const data = await fetchGraphData(
        channel,
        granularity,
        startDate,
        endDate,
      )
      setGraphData(data)
      setIsLoadingGraph(false)
    }
    updateGraph()
  }, [fetchGraphData, granularity, dateRange, channel])

  const smoothedData = useMemo(() => {
    if (useMA) {
      return smoothLineChartData(graphData, Number(maPeriod))
    }
    return graphData
  }, [graphData, useMA, maPeriod])

  const [yMin, yMax] = yAxisRange ?? calculateYAxisRange(graphData)

  return (
    <div className={styles.root}>
      <Paper withBorder className={styles.mainPaper} shadow='md'>
        {
          <Group className={styles.mainWidget}>
            <Skeleton visible={isLoadingGraph}>
              <Stack className={styles.innerGroup} gap="xs">
                <Text size="sm" ta="left" className={styles.title}>
                  {' '}
                  {granularity ? title + ' / ' + granularity : title}{' '}
                </Text>
                {style == 'Area' ? (
                  <AreaChart
                    data={smoothedData}
                    dataKey={dataKey}
                    series={series}
                    valueFormatter={(value) =>
                      new Intl.NumberFormat('en-US').format(value)
                    }
                    classNames={{
                      root: styles.chart,
                      legend: styles.textLabel,
                    }}
                    withLegend
                    withDots={false}
                    unit={unit}
                    type={type}
                    xAxisProps={{
                      dataKey: 'date',
                      tickFormatter: (tick: string) =>
                        formatXAxis(tick, granularity),
                    }}
                    yAxisProps={{ domain: [yMin, yMax] }}
                    areaChartProps={{ syncId: 'msgs' }}
                  />
                ) : (
                  <BarChart
                    data={smoothedData}
                    dataKey={dataKey}
                    series={series}
                    withLegend
                    valueFormatter={(value) =>
                      new Intl.NumberFormat('en-US').format(value)
                    }
                    xAxisProps={{
                      dataKey: 'date',
                      tickFormatter: (tick) => formatXAxis(tick, granularity),
                    }}
                    yAxisProps={{ domain: [yMin, yMax] }}
                    className={styles.chart}
                    unit={unit}
                    barChartProps={{ syncId: 'msgs' }}
                  />
                )}
              </Stack>
            </Skeleton>
          </Group>
        }
      </Paper>
    </div>
  )
}
