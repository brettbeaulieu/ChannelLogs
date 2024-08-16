"use client";

import styles from "./page.module.css";
import { NavbarNested, InteractiveAreaChart, DateMenu } from "@/components";
import { initiallyOpenedStates } from '../opened_states';
import { getData } from "@/api/apiHelpers";
import { Group, Paper, SegmentedControl } from "@mantine/core";
import { useEffect, useState } from "react";

interface GraphItem {
  date: string;
  value: string;
}

const formatDate = (date: Date | null): string | null => {
  if (!date) return null;
  return date.toISOString().split('T')[0];
};

export default function Page() {

  const today = new Date('2024-04-29T00:00:00');
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([yesterday, today]);
  const [granularity, setGranularity] = useState<string | undefined>('Day');
  const [sentGraphData, setSentimentGraphData] = useState<GraphItem[]>([]);
  const [toxicGraphData, setToxicGraphData] = useState<GraphItem[]>([]);
  const [isLoadingGraph, setIsLoadingGraph] = useState<boolean>(true);



  const fetchGraphData = async (granularity: string, startDate: string, endDate: string) => {
    try {
      granularity = granularity.toLowerCase();
      const [sentimentData, toxicityData] = await Promise.all([getData('chat/messages/sentiment_aggregate', { granularity, start_date: startDate, end_date: endDate }),
      getData('chat/messages/toxicity_aggregate', { granularity, start_date: startDate, end_date: endDate })
      ])

      return {sentimentData, toxicityData};
    } catch (error) {
      console.error('Error fetching graph data:', error);
      return { sentimentData: [], toxicityData: [] };
    }
  };

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

      const {sentimentData, toxicityData} = await fetchGraphData(gran, startDate, endDate);
      setSentimentGraphData(sentimentData);
      setToxicGraphData(toxicityData);
      setIsLoadingGraph(false);
    };

    updateGraph();
  }, [granularity, dateRange]);




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
          <InteractiveAreaChart
            data={sentGraphData}
            type="stacked"
            series={[{ label: "Anger", name: 'anger', color: 'red.6' },
            { label: "Disgust", name: 'disgust', color: 'green.6' },
            { label: "Fear", name: 'fear', color: 'blue.6' },
            { label: "Joy", name: 'joy', color: 'yellow.6' },
            { label: "Neutral", name: 'neutral', color: 'gray.6' },
            { label: "Sadness", name: 'sadness', color: 'blue.6' },
            { label: "Surprise", name: 'surprise', color: 'orange.6' },
            ]}
            dataKey={"date"}
          />
          <InteractiveAreaChart
            data={toxicGraphData}
            type="stacked"
            series={[{ label: "Toxicity", name: 'value', color: 'red.6' }
            ]}
            dataKey={"date"}
          />
        </Paper>
      </div>
    </main>
  );
}