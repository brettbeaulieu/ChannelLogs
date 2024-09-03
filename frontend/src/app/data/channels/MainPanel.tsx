// pages/page.js
'use client';

import { getData } from '@/api/apiHelpers';
import { Group, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useState } from 'react';
import { ChannelTable, CreateChannelModal } from './components';
import styles from './MainPanel.module.css';
import { Channel, CHANNELS_URL } from '@/api';

export default function MainPanel() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [ticketID, setTicketID] = useState<string>('');
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const fetchChannels = useCallback(async () => {
    try {
      const response = await getData(CHANNELS_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`);
      }
      const data = await response.json();

      // Check if response.files is defined before setting state
      if (data) {
        setChannels(data);
      } else {
        console.error('Response does not contain files:', data);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  },[fetchChannels]);


  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isPolling && ticketID) {
      interval = setInterval(async () => {
        try {
          const response = await getData(`task_status?ticket=${ticketID}`);
          const data = await response.json();

          if (data.status == 'COMPLETED' || data.status == 'FAILED') {
            setIsPolling(false); // Stop polling
            await fetchChannels(); // Fetch updated files after the task completes or fails
            notifications.show({
              title: 'Task Complete',
              message: `Status: ${data.status}`,
            })
          }
        } catch (error) {
          console.error('Error polling task status:', error);
          setIsPolling(false); // Stop polling on error
        }
      }, 3000); // Poll every 3 seconds
    }

    // Cleanup function to clear the interval
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPolling, ticketID, fetchChannels]);


  return (
    <Stack className={styles.mainStack}>
      <CreateChannelModal fetchChannels={fetchChannels} setTicketID={setTicketID} setIsPolling={setIsPolling} />
      <Group className={styles.topGroup}>
      </Group>

      <Group className={styles.botGroup}>
        <ChannelTable
          channels={channels}
          fetchChannels={fetchChannels}
          setTicketID={setTicketID}
          setIsPolling={setIsPolling}
        />
      </Group>

    </Stack>
  );
}
