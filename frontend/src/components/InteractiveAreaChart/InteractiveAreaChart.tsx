import React, { useCallback, useEffect, useState } from 'react';
import { Group, Paper, Skeleton, Stack, Text } from '@mantine/core';
import styles from './InteractiveAreaChart.module.css';
import { AreaChart, AreaChartType, BarChart } from '@mantine/charts';
import { getData } from '@/api/apiHelpers';

interface GraphItem {
    date: string;
    value: number;
}

export interface SeriesStruct {
    label?: string;
    name: string;
    color: string;
}


export interface ChartProps {
    dateRange: [Date | null, Date | null];
    fetchURL: string;
    dataKey: string;
    series: SeriesStruct[];
    useMA: boolean;
    maPeriod?: string | number;
    granularity?: string;
    unit?: string;
    type?: AreaChartType;
    style?: string;
    title?: string;
    yAxisRange?: [number, number];

}

const calculateYAxisRange = (data: GraphItem[]): [number, number] => {
    if (data.length === 0) return [0, 100]; // Default range if no data

    const values = data.map(item => item.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    // Example condition: expand the range by 10% if min and max are close
    const rangePadding = (maxValue - minValue) * 0.1;
    return [minValue - rangePadding, maxValue + rangePadding];
};

const smoothLineChartData = (data: GraphItem[], windowSize: number): GraphItem[] => {
    if (windowSize < 1) {
        throw new Error('Window size must be at least 1');
    }

    const smoothedData = data.map((_, i) => {
        const start = Math.max(0, i - Math.floor(windowSize / 2));
        const end = Math.min(data.length, i + Math.ceil(windowSize / 2));
        const window = data.slice(start, end);
        const average = window.reduce((sum, item) => sum + item.value, 0) / window.length;

        return {
            date: data[i].date,
            value: average,
        };
    });

    return smoothedData;
};

const formatDate = (date: Date | null): string | null => {
    return date ? date.toISOString().split('T')[0] : null;
};

const formatXAxis = (tickItem: any, granularity: string): string => {
    const date = new Date(tickItem);
    switch (granularity) {
        case 'Minute':
            return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
        case 'Hour':
            return `${date.getUTCHours().toString().padStart(2, '0')}:00`;
        case 'Day':
            return `${(date.getUTCMonth() + 1).toString().padStart(2, '0')}/${date.getUTCDate().toString().padStart(2, '0')}/${date.getUTCFullYear()}`;
        case 'Week':
            const startOfWeek = new Date(date);
            startOfWeek.setDate(date.getDate() - date.getDay());
            return `Week of ${startOfWeek.toLocaleDateString()}`;
        case 'Month':
            return `${date.getMonth() + 1}/${date.getFullYear()}`;
        default:
            return date.toLocaleDateString();
    }
};

const defaultGran = 'day';
const defaultUnit = '';
const defaultType = 'default';
const defaultStyle = 'Area';
const defaultPeriod = 1;
const defaultTitle = 'Untitled';

export function InteractiveAreaChart({ dateRange, fetchURL, dataKey, series, useMA, maPeriod = defaultPeriod, granularity = defaultGran, unit = defaultUnit, style = defaultStyle, type = defaultType, title = defaultTitle, yAxisRange }: ChartProps) {
    const [graphData, setGraphData] = useState<GraphItem[]>([]);
    const [isLoadingGraph, setIsLoadingGraph] = useState<boolean>(true);

    const fetchGraphData = useCallback(async (granularity: string, startDate: string, endDate: string) => {
        granularity = granularity.toLowerCase().replace(/\s+/g, '') || 'day';
        try {
            const response = await getData(fetchURL, { granularity, start_date: startDate, end_date: endDate });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching graph data:', error);
            return [];
        }
    }, [fetchURL]);


    useEffect(() => {
        const updateGraph = async () => {
            setIsLoadingGraph(true);
            const startDate = formatDate(dateRange[0]);
            const endDate = formatDate(dateRange[1]);

            if (!startDate || !endDate) {
                console.error('Both start date and end date must be selected.');
                setIsLoadingGraph(false);
                return;
            }

            const data = await fetchGraphData(granularity, startDate, endDate);
            const smoothedData = useMA ? smoothLineChartData(data, Number(maPeriod)) : data;
            setGraphData(smoothedData);
            setIsLoadingGraph(false);
        };

        updateGraph();
    }, [fetchGraphData, granularity, dateRange, useMA, maPeriod]);

    const [yMin, yMax] = yAxisRange ?? calculateYAxisRange(graphData);


    return (
        <div className={styles.root}>
            <Paper shadow='xs' withBorder className={styles.mainPaper}>
                {
                    <Group className={styles.mainWidget}>
                        <Skeleton visible={isLoadingGraph}>
                            <Stack className={styles.innerGroup} gap="xs">
                                <Text size="xl" ta="left" c="dimmed" className={styles.title}> {title} </Text>
                                {style == 'Area' ? (<AreaChart data={graphData} dataKey={dataKey} series={series} valueFormatter={(value) => new Intl.NumberFormat('en-US').format(value)}
                                    className={styles.chart} withLegend withDots={false} tickLine='xy' unit={unit} type={type} xAxisProps={{ dataKey: "date", tickFormatter: (tick) => formatXAxis(tick, granularity) }} yAxisProps={{ domain: [yMin, yMax] }} areaChartProps={{ syncId: 'msgs' }}
                                />) :
                                    (<BarChart data={graphData} dataKey={dataKey} series={series} withLegend valueFormatter={(value) => new Intl.NumberFormat('en-US').format(value)} xAxisProps={{ dataKey: "date", tickFormatter: (tick) => formatXAxis(tick, granularity) }} className={styles.chart} unit={unit} barChartProps={{ syncId: 'msgs' }} />)}
                            </Stack>
                        </Skeleton>
                    </Group>
                }
            </Paper>
        </div>
    );
}
