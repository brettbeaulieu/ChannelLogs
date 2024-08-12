import React, { ForwardRefExoticComponent, RefAttributes } from 'react';
import { Group, Loader, Paper, SimpleGrid, Text } from '@mantine/core';
import { IconArrowUpRight, IconArrowDownRight, IconProps, Icon } from '@tabler/icons-react'; // Adjust imports if necessary
import styles from './StatsGrid.module.css';

type IconType = ForwardRefExoticComponent<IconProps & RefAttributes<Icon>>;

export interface DataStruct {
    title: string;
    value: any;
    diff: number;
}

export interface StatsGridProps {
    data?: DataStruct[];
    icons?: IconType[];
    period?: string;
    isLoading?: boolean;
}

// Provide default values for data and icons
const defaultData: DataStruct[] = [];
const defaultIcons: IconType[] = [IconArrowDownRight]; // At least one icon should be available

export function StatsGrid({ data = defaultData, icons = defaultIcons, period = 'day', isLoading = true }: StatsGridProps) {
    // Default icon to use if none are provided
    const DefaultIcon = IconArrowDownRight;

    // Fallback values
    const defaultTitle = 'N/A';
    const defaultValue = 'N/A';
    const defaultDiff = 0;

    // Handle case where there might be fewer icons than data items
    const iconList = icons.length > 0 ? icons : defaultIcons;

    const stats = data.map((stat, index) => {
        // Use provided data or fallback values
        const title = stat.title || defaultTitle;
        const value = stat.value !== undefined ? stat.value : defaultValue;
        const diff = stat.diff !== undefined ? stat.diff : defaultDiff;

        // Use provided icon or fallback icon
        const Icon = iconList[index] || defaultIcons[0];
        const DiffIcon = diff > 0 ? IconArrowUpRight : IconArrowDownRight;

        return (
            <Paper withBorder p="md" radius="md" key={index} className={styles.box}>
                {isLoading ? (<Loader type='dots' />) :
                    (
                        <>
                            <Group justify="space-between">
                                <Text size="xs" c="dimmed" className={styles.title}>
                                    {title}
                                </Text>
                                <Icon className={styles.icon} size="1.4rem" stroke={1.5} />
                            </Group>

                            <Group align="flex-end" gap="xs" mt={15}>
                                <Text className={styles.value}>{value}</Text>
                                <Text c={diff > 0 ? 'teal' : 'red'} fz="sm" fw={500} className={styles.diff}>
                                    <span>{diff}%</span>
                                    <DiffIcon size="1rem" stroke={1.5} />
                                </Text>
                            </Group>
                            <Text fz="xs" c="dimmed" mt={7}>
                                Compared to previous {period}
                            </Text>
                        </>
                    )}
            </Paper>
        );
    });

    return (
        <div className={styles.root}>
            <SimpleGrid cols={2} spacing="md">
                {stats}
            </SimpleGrid>
        </div>
    );
}
