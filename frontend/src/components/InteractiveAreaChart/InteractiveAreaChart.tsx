import React, { ForwardRefExoticComponent, RefAttributes, useState } from 'react';
import { Group, Loader, Paper, Select, SimpleGrid, Text } from '@mantine/core';
import { IconArrowUpRight, IconArrowDownRight, IconProps, Icon } from '@tabler/icons-react'; // Adjust imports if necessary
import styles from './InteractiveAreaChart.module.css';
import { AreaChart, AreaChartCurveType, AreaChartSeries } from '@mantine/charts';


export interface DataStruct {
    date: string;
    value: any;
}

export interface ChartProps {
    data: DataStruct[];
    series: AreaChartSeries[];
    dataKey: string;
}

// Provide default values for data and icons
const defaultData: DataStruct[] = [];
const defaultSeries: AreaChartSeries[] = [];
const defaultKey: string = 'date';

export function InteractiveAreaChart({ data = defaultData, series = defaultSeries, dataKey = defaultKey }: ChartProps) {
    const [smoothing, setSmoothing] = useState<AreaChartCurveType | undefined>("linear");

    const handleSmoothingChange = (value: string | null) => {
        if (value) {
            setSmoothing(value as AreaChartCurveType); // Ensure the value is of type AreaChartCurveType, not string
        } else {
            setSmoothing(undefined); // Handle the case where value is null
        }
    };

    return (
        <div className={styles.root}>
            <Paper>
                {<Group>
                    <Select
                        className={styles.selectSmooth}
                        label={"Smoothing"}
                        defaultValue={smoothing}
                        onChange={handleSmoothingChange}
                        data={['bump', 'linear', 'natural', 'monotone', 'step', 'stepBefore', 'stepAfter']}
                        allowDeselect={false}
                        
                    />

                    <AreaChart data={data} dataKey={dataKey} series={series} className={styles.chart} curveType={smoothing} withDots={false} />
                </Group>}
            </Paper>
        </div>
    );
}
