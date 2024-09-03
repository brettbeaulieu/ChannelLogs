"use client";

import React from 'react';
import { AppFrame } from '@/components/AppFrame/AppFrame';
import MainPanel from './MainPanel';


export default function Page() {
  return (
    <AppFrame main={<MainPanel />} />
  );
}
