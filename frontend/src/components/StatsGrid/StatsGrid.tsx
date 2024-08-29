import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { Group, NumberFormatter, Paper, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core';
import { IconMessage, IconUser } from '@tabler/icons-react'; // Adjust imports if necessary
import styles from './StatsGrid.module.css';
import { getData } from '@/api/apiHelpers';

export interface DataStruct {
    title: string;
    value: number;
}

export interface StatsGridProps {
    channel: string | null;
    dateRange: [Date | null, Date | null];
}


export function StatsGrid({ channel, dateRange }: StatsGridProps) {
    const [grids, setGrids] = useState<ReactElement[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [data, setData] = useState<{ user: DataStruct; messages: DataStruct } | null>({user: {title:"Unique Users",value:0}, messages: {title:"Message Count",value:0}});
    const formatDate = (date: Date | null): string | null => {
        return date ? date.toISOString().split('T')[0] : null;
    };

    const buildGrid = useCallback((data: DataStruct) => {
        return (
            <Paper withBorder className={styles.paper}>
                <Stack className={styles.stack}>
                    <Group justify='space-between'>
                        <Text size="xs" className={styles.title}>
                            {data.title}
                        </Text>
                        <IconMessage className={styles.icon} size="1.4rem" stroke={1.5} />
                    </Group>
                    <Text className={styles.value}>
                        {<NumberFormatter thousandSeparator value={data.value} />}
                    </Text>
                </Stack>
            </Paper>
        )
    }, [isLoading]);

    const fetchUserData = useCallback(async (startDate: string, endDate: string) => {
        try {
            const response = await getData('chat/messages/unique_users', { channel: channel, start_date: startDate, end_date: endDate });
            const data = await response.json();
            // Assuming the data is { value: x }
            return {
                title: 'Unique Users', // Add appropriate title here
                value: data.value || 0,
            };
        } catch (error) {
            console.error('Error fetching stat data:', error);
            return {
                title: 'Unique Users', // Default title for error case
                value: 0,
            };
        }
    }, [channel]);

    const fetchMessageData = useCallback(async (startDate: string, endDate: string) => {
        try {
            const response = await getData('chat/messages/message_count', { channel: channel, start_date: startDate, end_date: endDate });
            const data = await response.json();
            // Assuming the data is { value: x }
            return {
                title: 'Message Count', // Add appropriate title here
                value: data.value || 0,
            };
        } catch (error) {
            console.error('Error fetching stat data:', error);
            return {
                title: 'Message Count', // Default title for error case
                value: 0,
            };
        }
    }, [channel]);

    useEffect(() => {
        const updateStats = async () => {
            setIsLoading(true);
            const startDate = formatDate(dateRange[0]);
            const endDate = formatDate(dateRange[1]);

            if (!startDate || !endDate) {
                console.error('Both start date and end date must be selected.');
                setIsLoading(false);
                return;
            }
            if (channel == ''){
                setIsLoading(false);
                return;
            }
            try {
                const userResponse = await fetchUserData(startDate, endDate);
                const msgsResponse = await fetchMessageData(startDate, endDate);
                setData({ user: userResponse, messages: msgsResponse });
            } catch (error) {
                console.error("Error fetching stats grid data:", error)
            } finally {
                setIsLoading(false);
            }
        };
        updateStats();
    }, [dateRange, fetchMessageData, fetchUserData]);

    return (
        <div className={styles.root}>
            <SimpleGrid cols={2} spacing="md">
                {data ? ([data.messages, data.user].map(buildGrid)) :
                <Skeleton/>}
            </SimpleGrid>
        </div>
    );
}
