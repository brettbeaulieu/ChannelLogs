import React, { ForwardRefExoticComponent, RefAttributes } from 'react';
import { Button, Center, Group, Loader, Menu, Paper, Popover, SimpleGrid, Text } from '@mantine/core';
import { IconArrowUpRight, IconArrowDownRight, IconProps, Icon } from '@tabler/icons-react'; // Adjust imports if necessary
import styles from './DateMenu.module.css';
import { DatePicker, DateValue } from '@mantine/dates';

export interface DataStruct {
    title: string;
    value: any;
    diff: number;
}

export interface DateMenuProps {
    dateRange: [DateValue, DateValue];
    dateChange: React.Dispatch<React.SetStateAction<[Date | null, Date | null]>>;
}

const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
};


export function DateMenu({ dateRange, dateChange }: DateMenuProps) {
    return (
        <div className={styles.root}>
            <Popover withArrow>
                <Popover.Target>
                    <Button className={styles.button}>{`${formatDate(dateRange[0])} - ${formatDate(dateRange[1])}`}</Button>
                </Popover.Target>
                <Popover.Dropdown className={styles.dropdown}>
                        <DatePicker
                        type="range"
                        value={dateRange}
                        onChange={dateChange}
                        allowSingleDateInRange={false}
                        />
                </Popover.Dropdown>
            </Popover>
        </div>
    );
}
