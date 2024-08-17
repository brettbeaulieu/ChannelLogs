"use client";

import styles from "./page.module.css";
import { NavbarNested, DateMenu } from "@/components";
import { initiallyOpenedStates } from '../opened_states';
import { getData } from "@/api/apiHelpers";
import { Group, Paper, SegmentedControl } from "@mantine/core";
import { useEffect, useState } from "react";
import { AreaChart } from "@mantine/charts";

interface GraphItem {
  date: string;
  value: string;
}

const formatDate = (date: Date | null): string | null => {
  if (!date) return null;
  return date.toISOString().split('T')[0];
};

export default function Page() {

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 3);

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([yesterday, today]);
  const [granularity, setGranularity] = useState<string | undefined>('Day');
  const [sentGraphData, setSentimentGraphData] = useState<GraphItem[]>([]);
  const [isLoadingGraph, setIsLoadingGraph] = useState<boolean>(true);



  const fetchGraphData = async (granularity: string, startDate: string, endDate: string) => {
    try {
      const sentimentData = await getData('chat/messages/sentiment_aggregate', { granularity, start_date: startDate, end_date: endDate })
      return sentimentData;
    } catch (error) {
      console.error('Error fetching graph data:', error);
      return { sentimentData: [] };
    }
  };

  useEffect(() => {
    const updateGraph = async () => {
      setIsLoadingGraph(true);
      // convert to lowercase, remove spaces
      const gran = granularity ? granularity.toLowerCase().replace(/\s+/g, '') : 'day';
      const startDate = formatDate(dateRange[0]);
      const endDate = formatDate(dateRange[1]);

      if (!startDate || !endDate) {
        console.error('Both start date and end date must be selected.');
        setIsLoadingGraph(false);
        return;
      }

      const sentimentData = await fetchGraphData(gran, startDate, endDate);
      setSentimentGraphData(sentimentData);
      console.log(sentimentData);
      setIsLoadingGraph(false);
    };

    updateGraph();
  }, [granularity, dateRange]);

  const formatXAxis = (tickItem: any) => {
    const date = new Date(tickItem);
    switch (granularity) {
      case '1 Minute':
        return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      case '1 Hour':
        return `${date.getUTCHours().toString().padStart(2, '0')}:00`;
      case '1 Day':
        return `${(date.getUTCMonth() + 1).toString().padStart(2, '0')}/${date.getUTCDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
      case '1 Week':
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getUTCDate() - date.getUTCDay() + 1); // Set to start of the week
        return `Week of ${startOfWeek.toLocaleDateString()}`;
      case '1 Month':
        return `${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`;
      default:
        return date.toLocaleDateString();
    }
  };

  return (
    <main className={styles.main}>
      <NavbarNested initiallyOpenedStates={initiallyOpenedStates}></NavbarNested>

      <div className={styles.container}>
        <Paper className={styles.mainPaper}>
          {
            <>
              <Group>
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
            </>
          }
          <AreaChart
            h={400}
            data={sentGraphData}
            type="split"
            series={[{ label: "Sentiment", name: 'value', color: 'bright' }]}
            dataKey={"date"}
            withDots={false}
            yAxisProps={{ domain: [-1, 1] }}
            xAxisProps={{ dataKey: "date", tickFormatter: formatXAxis }}
            splitColors={['green', 'red']}
            withLegend
          />
        </Paper>
      </div>
    </main>
  );
}