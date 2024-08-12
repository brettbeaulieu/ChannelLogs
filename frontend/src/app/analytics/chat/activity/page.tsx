"use client";

import React, { useEffect, useState } from 'react';
import { InteractiveAreaChart, NavbarNested, StatsGrid, DateMenu } from "@/components";
import { initiallyOpenedStates } from '../opened_states';
import { Center, Divider, Group, Paper, Select, Loader, Menu, SegmentedControl, Text } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { getData } from "@/api/apiHelpers";
import { IconMessage, IconUser } from '@tabler/icons-react';
import { AreaChart, BarChart } from "@mantine/charts";
import styles from "./page.module.css";

interface StatsGridItem {
  title: string;
  value: any;
  diff: number;
}

interface GraphItem {
  date: string;
  value: string;
}

const icons = [IconMessage, IconUser];

const formatDate = (date: Date | null): string | null => {
  if (!date) return null;
  return date.toISOString().split('T')[0];
};

const fetchStatGridData = async (startDate: string, endDate: string) => {
  try {
    const [messages, users] = await Promise.all([
      getData('chat/messages/message_count', { start_date: startDate, end_date: endDate }),
      getData('chat/messages/unique_users', { start_date: startDate, end_date: endDate })
    ]);

    return [
      { title: 'Total Messages', value: messages.value, diff: 0 },
      { title: 'Unique Users', value: users.value, diff: 0 },
    ];
  } catch (error) {
    console.error('Error fetching stat grid data:', error);
    return [];
  }
};



const fetchGraphData = async (granularity: string, startDate: string, endDate: string) => {
  try {
    granularity = granularity.toLowerCase();
    const [messageData, userData] = await Promise.all([
      getData('chat/messages/message_count_aggregate', { granularity, start_date: startDate, end_date: endDate }),
      getData('chat/messages/unique_users_aggregate', { granularity, start_date: startDate, end_date: endDate })
    ]);

    const userMap = new Map<string, number>(userData.map((item: GraphItem) => [
      item.date,
      parseFloat(item.value) || 1 // Avoid division by zero
    ]));

    const ratioData = messageData.map((item: GraphItem) => {
      const totalMessages = parseFloat(item.value) || 0;
      const uniqueUsers = userMap.get(item.date) || 1;
      return {
        date: item.date,
        ratio: uniqueUsers ? totalMessages / uniqueUsers : 0
      };
    });

    return { messageData, userData, ratioData };
  } catch (error) {
    console.error('Error fetching graph data:', error);
    return { messageData: [], userData: [], ratioData: [] };
  }
};

export default function Page() {
  const today = new Date('July 30, 2024 00:00:00');
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const [granularity, setGranularity] = useState<string | undefined>('Day');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([yesterday, today]);
  const [statGridData, setStatGridData] = useState<StatsGridItem[]>([]);
  const [msgGraphData, setMsgGraphData] = useState<GraphItem[]>([]);
  const [userGraphData, setUserGraphData] = useState<GraphItem[]>([]);
  const [ratioGraphData, setRatioGraphData] = useState<GraphItem[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);
  const [isLoadingGraph, setIsLoadingGraph] = useState<boolean>(true);

  useEffect(() => {
    const updateStatGrid = async () => {
      setIsLoadingStats(true);
      const startDate = formatDate(dateRange[0]);
      const endDate = formatDate(dateRange[1]);

      if (!startDate || !endDate) {
        console.error('Both start date and end date must be selected.');
        setIsLoadingStats(false);
        return;
      }

      const data = await fetchStatGridData(startDate, endDate);
      setStatGridData(data);
      setIsLoadingStats(false);
    };

    updateStatGrid();
  }, [dateRange]);

  useEffect(() => {
    const updateGraph = async () => {
      setIsLoadingGraph(true);
      const gran = granularity ? granularity.toLowerCase() : 'day';
      const startDate = formatDate(dateRange[0]);
      const endDate = formatDate(dateRange[1]);

      if (!startDate || !endDate) {
        console.error('Both start date and end date must be selected.');
        setIsLoadingGraph(false);
        return;
      }

      const { messageData, userData, ratioData } = await fetchGraphData(gran, startDate, endDate);
      setMsgGraphData(messageData);
      setUserGraphData(userData);
      setRatioGraphData(ratioData);
      setIsLoadingGraph(false);
    };

    updateGraph();
  }, [granularity, dateRange]);

  return (
    <main className={styles.main}>
      <NavbarNested initiallyOpenedStates={initiallyOpenedStates} />
      <div className={styles.container}>
        <Paper className={styles.mainPaper}>
          {<>
            <Group>
              <Group className={styles.headerGroup}>
                <Text size="xl" fw={700}>
                  Activity Analysis
                </Text>
                {isLoadingStats ? (
                  <Loader variant="dots" />
                ) : (
                  <StatsGrid
                    data={statGridData}
                    icons={icons}
                    period={granularity?.toLowerCase()}
                    isLoading={isLoadingStats}
                  />
                )}
              </Group>
              <Group className={styles.paramsGroup} justify={'right'}>
                <SegmentedControl
                  value={granularity}
                  onChange={setGranularity}
                  data={['Minute', 'Hour', 'Day', 'Week', 'Month']}
                  className={styles.select}
                />
                <DateMenu dateRange={dateRange} dateChange={setDateRange} />
              </Group>
            </Group>

            <Divider my="md" />
            <Group className={styles.graphGroup}>
              <Center>
                {isLoadingGraph ? (
                  <Loader variant="dots" />
                ) : (
                  <Group>
                    <Paper shadow="xs" radius="md" className={styles.graphPaper}>
                      <InteractiveAreaChart
                        data={ratioGraphData}
                        series={[{ label: "Messages : Users", name: 'ratio', color: 'indigo.6' }]}
                        dataKey="date"
                      />

                    </Paper>
                    <Paper shadow="xs" radius="md" className={styles.graphPaper}>
                      <BarChart
                        className={styles.chart}
                        series={[{ label: "Messages", name: 'value', color: 'teal.6' }]}
                        data={msgGraphData}
                        dataKey="date"
                        withLegend
                      />
                    </Paper>
                    <Paper shadow="xs" radius="md" className={styles.graphPaper}>
                      <BarChart
                        className={styles.chart}
                        series={[{ label: "Users", name: 'value', color: 'indigo.6' }]}
                        data={userGraphData}
                        dataKey="date"
                        withLegend
                      />
                    </Paper>
                  </Group>
                )}
              </Center>
            </Group>
          </>}
        </Paper>

      </div>
    </main >
  );
}
