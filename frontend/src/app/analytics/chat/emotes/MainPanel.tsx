"use client";

import React, { useEffect, useState } from 'react';
import { InteractiveAreaChart, StatsGrid } from "@/components";
import { Group, Paper, Stack } from "@mantine/core";
import styles from "./MainPanel.module.css";

const formatDate = (date: Date | null): string | null => {
  if (!date) return null;
  return date.toISOString().split('T')[0];
};

export default function MainPanel() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([yesterday, today]);

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
      </Paper>
    </main >
  );
}
