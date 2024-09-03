import React from 'react'
import { Button, Popover } from '@mantine/core'
import styles from './DateMenu.module.css'
import { DatePicker, DateValue } from '@mantine/dates'
import { toIsoDateString } from '@/api/apiHelpers'

export interface DataStruct {
  title: string
  value: number
  diff: number
}

export interface DateMenuProps {
  dateRange: [DateValue, DateValue]
  dateChange: React.Dispatch<React.SetStateAction<[Date | null, Date | null]>>
}

export function DateMenu({ dateRange, dateChange }: DateMenuProps) {
  return (
    <div className={styles.root}>
      <Popover withArrow>
        <Popover.Target>
          <Button
            classNames={{ root: styles.button, label: styles.textLabel }}
          >{`${toIsoDateString(dateRange[0])} - ${toIsoDateString(dateRange[1])}`}</Button>
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
  )
}
