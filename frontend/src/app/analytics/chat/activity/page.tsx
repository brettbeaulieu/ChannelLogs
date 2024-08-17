"use client";

import React, { useEffect, useState } from 'react';
import { InteractiveAreaChart, NavbarNested, DateMenu } from "@/components";
import { initiallyOpenedStates } from '../opened_states';
import { Center, Divider, Group, Paper, Loader, SegmentedControl } from "@mantine/core";
import { getData } from "@/api/apiHelpers";
import { IconMessage, IconUser } from '@tabler/icons-react';
import styles from "./page.module.css";

interface GraphItem {
  date: string;
  value: string;
}

const icons = [IconMessage, IconUser];

const formatDate = (date: Date | null): string | null => {
  if (!date) return null;
  return date.toISOString().split('T')[0];
};

const fetchGraphData = async (granularity: string, startDate: string, endDate: string) => {
  try {

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
        value: uniqueUsers ? totalMessages / uniqueUsers : 0
      };
    });

    return { messageData, userData, ratioData };
  } catch (error) {
    console.error('Error fetching graph data:', error);
    return { messageData: [], userData: [], ratioData: [] };
  }
};

export default function Page() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const [granularity, setGranularity] = useState<string | undefined>('Day');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([yesterday, today]);
  const [msgGraphData, setMsgGraphData] = useState<GraphItem[]>([]);
  const [userGraphData, setUserGraphData] = useState<GraphItem[]>([]);
  const [ratioGraphData, setRatioGraphData] = useState<GraphItem[]>([]);
  const [isLoadingGraph, setIsLoadingGraph] = useState<boolean>(true);

  useEffect(() => {
    const updateGraph = async () => {
      setIsLoadingGraph(true);
      const gran = granularity ? granularity.toLowerCase().replace(/\s+/g, '') : 'day';
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
              <Group className={styles.paramsGroup}>
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
                    <InteractiveAreaChart
                      data={ratioGraphData}
                      series={[{ label: "Message : User", name: 'value', color: 'indigo.6' }]}
                      dataKey="date"
                      granularity={granularity}
                      title={"Message to User Ratio"}
                      unit={' Msgs/user'}
                    />
                    <InteractiveAreaChart
                      data={msgGraphData}
                      series={[{ label: "Messages", name: 'value', color: 'teal.6' }]}
                      dataKey="date"
                      granularity={granularity}
                      title={"Messages"}
                      unit={' Msgs'}
                    />
                    <InteractiveAreaChart
                      data={userGraphData}
                      series={[{ label: "Users", name: 'value', color: 'indigo.6' }]}
                      dataKey="date"
                      granularity={granularity}
                      title={"Unique Users"}
                      unit={' Users'}
                    />
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
