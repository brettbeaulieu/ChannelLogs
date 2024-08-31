import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { Group, NumberFormatter, Paper, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core';
import { IconMessage, IconUser } from '@tabler/icons-react'; // Adjust imports if necessary
import styles from './StatsGrid.module.css';
import { getData, toIsoDateString } from '@/api/apiHelpers';

export interface DataStruct {
    idx: number;
    title: string;
    value: number;
}

export interface StatsGridProps {
    channel: string | null;
    dateRange: [Date | null, Date | null];
}

// Define a mapping of titles to icons
const iconMapping: Record<string, ReactElement> = {
    'Unique Users': <IconUser className={styles.icon} size="1.4rem" stroke={1.5} />,
    'Message Count': <IconMessage className={styles.icon} size="1.4rem" stroke={1.5} />,
}


export function StatsGrid({ channel, dateRange }: StatsGridProps) {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [msgData, setMsgData] = useState<DataStruct>({idx: 0, title: "Message Count", value: 0});
    const [userData, setUserData] = useState<DataStruct>({idx: 1, title: "Unique Users", value: 0});

    const buildGrid = useCallback((data: DataStruct) => {
        // Select an icon based on data title
        const icon = iconMapping[data.title] || <IconMessage size="1.4rem" stroke={1.5} />;

        return (
            <Paper withBorder className={styles.paper}>
                <Stack className={styles.stack}>
                    <Group justify='space-between'>
                        <Text size="sm" className={styles.title}>
                            {data.title}
                        </Text>
                        {icon}
                    </Group>
                    <Text className={styles.value}>
                        {<NumberFormatter thousandSeparator value={data.value} />}
                    </Text>
                </Stack>
            </Paper>
        )
    }, []);

    const fetchUserData = useCallback(async (startDate: string, endDate: string) => {
        try {
            const response = await getData('chat/messages/unique_users', { channel: channel, start_date: startDate, end_date: endDate });
            const data = await response.json();
            // Assuming the data is { value: x }
            return {
                idx: 1,
                title: 'Unique Users', // Add appropriate title here
                value: data.value || 0,
            };
        } catch (error) {
            console.error('Error fetching stat data:', error);
            return {
                idx: 1,
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
                idx: 0,
                title: 'Message Count', // Add appropriate title here
                value: data.value || 0,
            };
        } catch (error) {
            console.error('Error fetching stat data:', error);
            return {
                idx: 0,
                title: 'Message Count', // Default title for error case
                value: 0,
            };
        }
    }, [channel]);

    useEffect(() => {
        const updateStats = async () => {
            setIsLoading(true);
            if (!dateRange[0] || !dateRange[1] || !channel) {
                setIsLoading(false);
                return;
            }
            const startDate = toIsoDateString(dateRange[0]);
            const endDate = toIsoDateString(dateRange[1]);

            try {
                const userResponse = await fetchUserData(startDate, endDate);
                const msgsResponse = await fetchMessageData(startDate, endDate);
                setMsgData(msgsResponse)
                setUserData(userResponse)
            } catch (error) {
                console.error("Error fetching stats grid data:", error)
            } finally {
                setIsLoading(false);
            }
        };
        updateStats();
    }, [channel, dateRange, fetchMessageData, fetchUserData]);

    return (
        <div className={styles.root}>
            <SimpleGrid key={1} cols={2} spacing="md">
                {msgData && userData ? ([msgData, userData].map(buildGrid)) :
                <Skeleton/>}
            </SimpleGrid>
        </div>
    );
}
