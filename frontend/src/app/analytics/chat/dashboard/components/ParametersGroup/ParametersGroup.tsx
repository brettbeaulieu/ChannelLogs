import React, { ReactElement } from 'react'
import {
  Checkbox,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Stack,
  Text,
} from '@mantine/core'
import styles from './ParametersGroup.module.css'
import { Channel } from '@/api'

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
  granularity,
  setGranularity,
  chartStyle,
  setChartStyle,
  useMA,
  setUseMA,
  maPeriod,
  setMAPeriod,
}: ParametersGroupProps) {


  const buildOption = (text: string, element: ReactElement): ReactElement => {
    return (
      <Paper withBorder className={styles.innerPaper} shadow='md'>
        <Stack>
          <Text ta="center" className={styles.textLabel}>
            {text}
          </Text>
          {element}
        </Stack>
      </Paper>
    )
  }


  return (
    <Paper className={styles.paramsPaper}>
      <Group className={styles.paramsGroup}>
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
