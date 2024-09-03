import React, { ReactElement, useEffect, useState } from 'react'
import {
  Checkbox,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
} from '@mantine/core'
import styles from './ParametersGroup.module.css'
import { DateMenu } from '@/components'
import { getData } from '@/api/apiHelpers'
import { Channel, CHANNELS_URL } from '@/api'

type SetStateAction<T> = React.Dispatch<React.SetStateAction<T>>

interface ParametersGroupProps {
  channel: Channel | undefined
  setChannel: SetStateAction<Channel | undefined>

  granularity: string | undefined
  setGranularity: SetStateAction<string | undefined>

  chartStyle: string
  setChartStyle: SetStateAction<string>

  useMA: boolean
  setUseMA: SetStateAction<boolean>

  maPeriod: string | number
  setMAPeriod: SetStateAction<string | number>

  dateRange: [Date | null, Date | null]
  setDateRange: SetStateAction<[Date | null, Date | null]>
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
  setDateRange,
}: ParametersGroupProps) {
  const [channelList, setChannelList] = useState<Channel[]>([])

  // Fetch channel list when component mounts
  useEffect(() => {
    async function fetchChannelList() {
      try {
        const response = await getData(CHANNELS_URL)
        const data: Channel[] = await response.json()
        setChannelList(data)
      } catch (error) {
        console.error('Failed to fetch channel list', error)
      }
    }

    fetchChannelList()
  }, []) // Empty dependency array means this runs only once

  const buildOption = (text: string, element: ReactElement): ReactElement => {
    return (
      <Paper withBorder className={styles.innerPaper}>
        <Stack>
          <Text ta="center" className={styles.textLabel}>
            {text}
          </Text>
          {element}
        </Stack>
      </Paper>
    )
  }

  const handleChannelOnChange = (newName: string | null): void => {
    if (newName) {
      const obj = channelList.find((x) => x.name == newName)
      setChannel(obj)
    }
  }

  return (
    <Paper className={styles.paramsPaper}>
      <Group className={styles.paramsGroup}>
        {buildOption(
          'Channel',
          <Select
            classNames={{ label: styles.innerTextLabel }}
            data={channelList.map((elem: Channel) => elem.name)}
            value={channel ? channel.name : ''}
            onChange={handleChannelOnChange}
            searchable
          />,
        )}
        {buildOption(
          'Date Range',
          <DateMenu dateRange={dateRange} dateChange={setDateRange} />,
        )}
        {buildOption(
          'Granularity',
          <SegmentedControl
            value={granularity}
            onChange={setGranularity}
            data={['Minute', 'Hour', 'Day', 'Week', 'Month']}
            classNames={{ root: styles.select, label: styles.innerTextLabel }}
            fullWidth
          />,
        )}
        {buildOption(
          'Chart Type',
          <SegmentedControl
            classNames={{ label: styles.innerTextLabel }}
            value={chartStyle}
            onChange={setChartStyle}
            data={['Area', 'Bar']}
            className={styles.select}
            fullWidth
          />,
        )}
        {buildOption(
          'Use MA',
          <Checkbox
            checked={useMA}
            onChange={(event) => setUseMA(event.currentTarget.checked)}
            className={styles.checkbox}
            data-testid="enable-ma-checkbox"
          />,
        )}
        {buildOption(
          'MA Period',
          <NumberInput
            value={maPeriod}
            onChange={(value) => setMAPeriod(value)}
            min={1}
            max={1000}
            step={1}
            className={styles.numberInput}
            data-testid="ma-period-input"
          />,
        )}
      </Group>
    </Paper>
  )
}
