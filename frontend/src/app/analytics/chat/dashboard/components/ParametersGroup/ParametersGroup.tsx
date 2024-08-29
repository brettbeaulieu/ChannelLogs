import React, { useEffect, useState } from 'react';
import { Checkbox, Group, NumberInput, Paper, SegmentedControl, Select, Stack, Text } from '@mantine/core';
import styles from './ParametersGroup.module.css';
import { DateMenu } from '@/components';
import { getData } from '@/api/apiHelpers';

type SetStateAction<T> = React.Dispatch<React.SetStateAction<T>>;

interface ParametersGroupProps {
    channel: string | null;
    setChannel: SetStateAction<string | null>;

    granularity: string | undefined;
    setGranularity: SetStateAction<string | undefined>;

    chartStyle: string;
    setChartStyle: SetStateAction<string>;

    useMA: boolean;
    setUseMA: SetStateAction<boolean>;

    maPeriod: string | number;
    setMAPeriod: SetStateAction<string | number>;

    dateRange: [Date | null, Date | null];
    setDateRange: SetStateAction<[Date | null, Date | null]>;
}


export function ParametersGroup({
    channel,
    setChannel,
    granularity,
    setGranularity,
    chartStyle,
    setChartStyle,
    useMA,
    setUseMA,
    maPeriod,
    setMAPeriod,
    dateRange,
    setDateRange
}: ParametersGroupProps) {


    const [channelList, setChannelList] = useState<string[]>([]);

    // Fetch channel list when component mounts
    useEffect(() => {
        async function fetchChannelList() {
            try {
                const response = await getData('chat/files/get_all_channels');
                const data = await response.json();
                setChannelList(data.names);
            } catch (error) {
                console.error('Failed to fetch channel list', error);
            }
        }

        fetchChannelList();
    }, []); // Empty dependency array means this runs only once



    return (
        <Paper className={styles.paramsPaper}>
            <Group className={styles.paramsGroup}>
                <Stack>
                    <Text ta="center">Channel</Text>
                    <Select
                        data={channelList}
                        value={channel}
                        onChange={setChannel}
                        searchable
                    />

                </Stack>


                <Stack>
                    <Text ta="center">Date Range</Text>
                    <DateMenu
                        dateRange={dateRange}
                        dateChange={setDateRange}
                    />
                </Stack>
                <Stack>
                    <Text ta="center">Granularity</Text>
                    <SegmentedControl
                        value={granularity}
                        onChange={setGranularity}
                        data={['Minute', 'Hour', 'Day', 'Week', 'Month']}
                        className={styles.select}
                        fullWidth
                    />
                </Stack>
                <Stack>
                    <Text ta="center">Chart Type</Text>
                    <SegmentedControl
                        value={chartStyle}
                        onChange={setChartStyle}
                        data={['Area', 'Bar']}
                        className={styles.select}
                        fullWidth
                    />
                </Stack>


                <Stack>
                    <Text ta="center">Use MA</Text>
                    <Checkbox
                        checked={useMA}
                        onChange={(event) => setUseMA(event.currentTarget.checked)}
                        className={styles.checkbox}
                        data-testid="enable-ma-checkbox"
                    />
                </Stack>

                <Stack>
                    <Text ta="center">MA Period</Text>
                    <NumberInput
                        value={maPeriod}
                        onChange={(value) => setMAPeriod(value)}
                        min={1}
                        max={1000}
                        step={1}
                        className={styles.numberInput}
                        data-testid="ma-period-input"
                    />
                </Stack>
            </Group>
        </Paper>
    );
};
