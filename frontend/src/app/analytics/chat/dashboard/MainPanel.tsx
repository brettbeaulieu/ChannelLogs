"use client";

import React, { useEffect, useState } from 'react';
import { InteractiveAreaChart, StatsGrid } from "@/components";
import { Group, Paper, Stack } from "@mantine/core";
import { EmoteList, ParametersGroup } from './components';
import styles from "./MainPanel.module.css";

const formatDate = (date: Date | null): string | null => {
  if (!date) return null;
  return date.toISOString().split('T')[0];
};

export default function MainPanel() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const [chartStyle, setChartStyle] = useState<string>("Area");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([yesterday, today]);
  const [granularity, setGranularity] = useState<string | undefined>('Day');
  const [useMA, setUseMA] = useState<boolean>(false);
  const [maPeriod, setMAPeriod] = useState<string | number>(1);

  useEffect(() => {
    const updateDate = async () => {
      const startDate = formatDate(dateRange[0]);
      const endDate = formatDate(dateRange[1]);

      if (!startDate || !endDate) {
        console.error('Both start date and end date must be selected.');
        return;
      }
    };
    updateDate();
  }, [dateRange]);

  return (
    <main className={styles.main}>
      <Paper className={styles.mainPaper}>
        <Stack className={styles.mainStack}>

          <ParametersGroup
            granularity={granularity}
            setGranularity={setGranularity}
            chartStyle={chartStyle}
            setChartStyle={setChartStyle}
            useMA={useMA}
            setUseMA={setUseMA}
            maPeriod={maPeriod}
            setMAPeriod={setMAPeriod}
            dateRange={dateRange}
            setDateRange={setDateRange}
          />

          <Group className={styles.mainGroup}>

            <Stack className={styles.mainstack1} justify='flex-start'>
              <StatsGrid dateRange={dateRange} />
              <InteractiveAreaChart
                fetchURL={'chat/messages/message_count_aggregate'}
                useMA={useMA}
                maPeriod={maPeriod}
                granularity={granularity}
                dateRange={dateRange}
                series={[{ label: "Messages", name: 'value', color: 'bright' }]}
                dataKey={"date"}
                unit={' Msgs'}
                style={chartStyle}
                title={"Messages"}
              />
              <InteractiveAreaChart
                fetchURL={'chat/messages/unique_users_aggregate'}
                useMA={useMA}
                maPeriod={maPeriod}
                granularity={granularity}
                dateRange={dateRange}
                series={[{ label: "Users", name: 'value', color: 'bright' }]}
                dataKey="date"
                unit={' Users'}
                style={chartStyle}
                title={"Unique Users"}
              />
            </Stack>

            <Stack className={styles.mainstack2} justify='flex-start'>
              <InteractiveAreaChart
                fetchURL={'chat/messages/sentiment_aggregate'}
                useMA={useMA}
                maPeriod={maPeriod}
                granularity={granularity}
                dateRange={dateRange}
                series={[{ label: "Sentiment", name: 'value', color: 'bright' }]}
                dataKey={"date"}
                type={"split"}
                style={chartStyle}
                title={"Sentiment"}
                yAxisRange={[-1, 1]}
              />
              <EmoteList dateRange={dateRange}/>
            </Stack >

          </Group>

        </Stack>
      </Paper>
    </main >
  );
}
