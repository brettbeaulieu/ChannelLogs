import React, { useState } from 'react';
import { ActionIcon, Group, Paper, rem, Text } from '@mantine/core';
import { IconChartArea, IconChartBar } from '@tabler/icons-react';
import styles from './InteractiveAreaChart.module.css';
import { AreaChart, AreaChartCurveType, AreaChartType, BarChart } from '@mantine/charts';


export interface DataStruct {
    date: string;
    value: any;
}

export interface SeriesStruct {
    label?: string;
    name: string;
    color: string;
}


export interface ChartProps {
    data: DataStruct[];
    series: any[];
    dataKey: string;
    granularity?: string;
    title?: string;
    unit?: string;
    type?: string;
}




// Provide default values for data and icons
const defaultData: DataStruct[] = [];
const defaultSeries: SeriesStruct[] = [];
const defaultKey: string = 'date';
const defaultGran: string = 'day';
const defaultTitle: string = '';
const defaultUnit: string = '';
const defaultType: AreaChartType = 'default';

export function InteractiveAreaChart({ data = defaultData, series = defaultSeries, dataKey = defaultKey, granularity = defaultGran, title = defaultTitle, unit = defaultUnit, type = defaultType }: ChartProps) {
    const [smoothing, setSmoothing] = useState<AreaChartCurveType | undefined>("linear");
    const [chartType, setChartType] = useState<AreaChartType>("default");

    const handleChartTypeChange = (type: AreaChartType) => {
        setChartType(type);
    };

    const handleSmoothingChange = (value: string | null) => {
        if (value) {
            setSmoothing(value as AreaChartCurveType);
        } else {
            setSmoothing(undefined); // Handle the case where value is null
        }
    };

    const formatXAxis = (tickItem: any) => {
        const date = new Date(tickItem);
        console.log(granularity)
        switch (granularity) {
            case 'Minute':
                return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
            case 'Hour':
                return `${date.getUTCHours().toString().padStart(2, '0')}:00`;
            case 'Day':
                return `${(date.getUTCMonth() + 1).toString().padStart(2, '0')}/${date.getUTCDate().toString().padStart(2, '0')}/${date.getUTCFullYear()}`;
            case 'Week':
                const startOfWeek = new Date(date);
                startOfWeek.setDate(date.getDate() - date.getDay()); // Set to start of the week
                return `Week of ${startOfWeek.toLocaleDateString()}`;
            case 'Month':
                return `${date.getMonth() + 1}/${date.getFullYear()}`;
            default:
                return date.toLocaleDateString();
        }
    };

    return (
        <div className={styles.root}>
            <Paper shadow='xs'>
                {
                    <Group className={styles.mainWidget}>
                        <Group className={styles.headerGroup}>
                            <Group className={styles.actionGroup}>
                                <ActionIcon className={styles.icon} variant="default" size="lg" aria-label="Area Chart" onClick={() => handleChartTypeChange('area')}
                                >
                                    <IconChartArea style={{ width: rem(25) }} stroke={1.5}>
                                    </IconChartArea>
                                </ActionIcon>
                                <ActionIcon className={styles.icon} variant="default" size="lg" aria-label="Gallery" onClick={() => handleChartTypeChange('bar')}>
                                    <IconChartBar style={{ width: rem(25) }} stroke={1.5} />
                                </ActionIcon>
                            </Group>
                            <Group justify='center' align='center' className={styles.headerTextGroup}>
                                <Text size="xl" fw={300} fz={'h2'}>{title}</Text>
                            </Group>
                        </Group>
                        {chartType == 'default' ? (<AreaChart data={data} dataKey={dataKey} series={series} valueFormatter={(value) => new Intl.NumberFormat('en-US').format(value)}
                            className={styles.chart} curveType={smoothing} withDots={false} gridAxis='xy' tickLine='xy' unit={unit} type={type} xAxisProps={{ dataKey: "date", tickFormatter: formatXAxis }} areaChartProps={{ syncId: 'msgs' }}
                        />) :
                            (<BarChart data={data} dataKey={dataKey} series={series} valueFormatter={(value) => new Intl.NumberFormat('en-US').format(value)} xAxisProps={{ dataKey: "date", tickFormatter: formatXAxis }} className={styles.chart} unit={unit} barChartProps={{ syncId: 'msgs' }} />)}
                    </Group>


                }
            </Paper>
        </div>
    );
}
