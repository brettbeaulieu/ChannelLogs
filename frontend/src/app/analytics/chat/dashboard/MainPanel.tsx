"use client";

import React, { useState } from 'react';
import { InteractiveAreaChart, StatsGrid } from "@/components";
import { Group, Paper, Stack } from "@mantine/core";
import { EmoteList, ParametersGroup } from './components';
import styles from "./MainPanel.module.css";
import { Channel } from '@/api';

export default function MainPanel() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const [channel, setChannel] = useState<Channel | undefined>(undefined);
  const [chartStyle, setChartStyle] = useState<string>("Area");
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([yesterday, today]);
  const [granularity, setGranularity] = useState<string | undefined>('Day');
  const [useMA, setUseMA] = useState<boolean>(false);
  const [maPeriod, setMAPeriod] = useState<string | number>(1);

  return (
    <main className={styles.main}>
      <Paper className={styles.mainPaper}>
        <Stack className={styles.mainStack}>

          <ParametersGroup
            channel={channel}
            setChannel={setChannel}
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

            <Stack className={styles.mainstack1} justify='space-between'>
              <StatsGrid channel={channel} dateRange={dateRange} />
              <InteractiveAreaChart
                dateRange={dateRange}
                fetchURL={'chat/messages/message_count_aggregate'}
                channel={channel}
                dataKey={"date"}
                series={[{ label: "Messages", name: 'value', color: 'bright' }]}
                useMA={useMA}
                maPeriod={maPeriod}
                granularity={granularity}
                unit={' Msgs'}
                style={chartStyle}
                title={"Messages"}
              />
              <InteractiveAreaChart
                fetchURL={'chat/messages/unique_users_aggregate'}
                channel={channel}
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

            <Stack className={styles.mainstack2} justify='space-between'>
              <InteractiveAreaChart
                fetchURL={'chat/messages/sentiment_aggregate'}
                channel={channel}
                useMA={useMA}
                maPeriod={maPeriod}
                granularity={granularity}
                dateRange={dateRange}
                series={[{ label: "Normalized Sentiment", name: 'value', color: 'bright' }]}
                dataKey={"date"}
                type={"split"}
                style={chartStyle}
                title={"Normalized Sentiment"}
                yAxisRange={[-1, 1]}
              />
              <EmoteList channel={channel} dateRange={dateRange} />
            </Stack >

          </Group>

        </Stack>
      </Paper>
    </main >
  );
}
