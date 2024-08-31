"use client";

import React, { useEffect, useState } from 'react';
import { Paper } from "@mantine/core";
import styles from "./MainPanel.module.css";

export default function MainPanel() {


  return (
    <main className={styles.main}>
      <Paper className={styles.mainPaper}>
      </Paper>
    </main >
  );
}
