import React, { useCallback, useEffect, useState } from 'react';
import { Group, NumberFormatter, Paper, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core';
import { IconArrowDownRight, IconMessage, IconUser } from '@tabler/icons-react'; // Adjust imports if necessary
import styles from './StatsGrid.module.css';
import { getData } from '@/api/apiHelpers';

export interface DataStruct {
    title: string;
    value: number;
}

export interface StatsGridProps {
    dateRange: [Date | null, Date | null];
}

export function StatsGrid({ dateRange }: StatsGridProps) {
    const [userData, setUserData] = useState<DataStruct>({ title: "N/A", value: 0 });
    const [msgsData, setMsgsData] = useState<DataStruct>({ title: "N/A", value: 0 });
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Default icon to use if none are provided
    const DefaultIcon = IconArrowDownRight;

    // Fallback values
    const defaultTitle = 'N/A';
    const defaultValue = 'N/A';
    const defaultDiff = 0;
    const formatDate = (date: Date | null): string | null => {
        return date ? date.toISOString().split('T')[0] : null;
    };


    const fetchUserData = useCallback(async (startDate: string, endDate: string) => {
        try {
            const response = await getData('chat/messages/unique_users', { start_date: startDate, end_date: endDate });
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
    }, []);

    const fetchMessageData = useCallback(async (startDate: string, endDate: string) => {
        try {
            const response = await getData('chat/messages/message_count', { start_date: startDate, end_date: endDate });
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
    }, []);

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

            const userResponse = await fetchUserData(startDate, endDate);
            const msgsResponse = await fetchMessageData(startDate, endDate);
            setUserData(userResponse);
            setMsgsData(msgsResponse);
            setIsLoading(false);
        }
        updateStats();
    }
        , [fetchUserData, fetchMessageData, dateRange]);

    return (
        <div className={styles.root}>
            <SimpleGrid cols={2} spacing="md">
                <Paper withBorder>
                    <Skeleton visible={isLoading}>
                        <Stack className={styles.stack}>
                            <Group justify='space-between'>
                                <Text size="xs" c="dimmed" className={styles.title}>
                                    {msgsData.title}
                                </Text>
                                <IconMessage className={styles.icon} size="1.4rem" stroke={1.5} />
                            </Group>
                            <Text className={styles.value}>
                                {<NumberFormatter thousandSeparator value={msgsData.value} />}
                            </Text>
                        </Stack>
                    </Skeleton>
                </Paper>
                <Paper withBorder>
                    <Skeleton visible={isLoading}>
                        <Stack className={styles.stack}>
                            <Group justify='space-between'>
                                <Text size="xs" c="dimmed" className={styles.title}>
                                    {userData.title}
                                </Text>
                                <IconUser className={styles.icon} size="1.4rem" stroke={1.5} />
                            </Group>
                            <Text className={styles.value}>
                                {<NumberFormatter thousandSeparator value={userData.value} />}
                            </Text>
                        </Stack>
                    </Skeleton>
                </Paper>
            </SimpleGrid>
        </div>
    );
}
