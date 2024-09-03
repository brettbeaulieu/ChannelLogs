"use client";

import React from 'react';
import { Text } from '@mantine/core';
import { AppFrame } from '@/components/AppFrame/AppFrame';


export default function Page() {
  return (
    <AppFrame main={<Text>Welcome to the home page.</Text>} />
  );
}
