// pages/page.js
'use client';

import { getData } from '@/api/apiHelpers';
import { Group, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useState } from 'react';
import { FileTable, FileUpload, RustlogImport } from './components';
import styles from './MainPanel.module.css';
import { Channel, CHANNELS_URL, ChatFile, CHATFILES_URL } from '@/api';

export default function MainPanel() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [chatFiles, setChatFiles] = useState<ChatFile[]>([]);
  const [ticketIDs, setTicketIDs] = useState<string[]>([]);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const fetchChannels = useCallback(async () => {
    try {
      const response = await getData(CHANNELS_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch channels: ${response.status}`);
      }
      const data = await response.json();
      setChannels(data);

    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  }, []);



  const fetchFiles = useCallback(async () => {
    try {
      const response = await getData(CHATFILES_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`);
      }
      const data = await response.json();
      setChatFiles(data);

    } catch (error) {
      console.error('Error fetching files:', error);
    }
  }, []);

  const checkTicket = useCallback(async (ticketID: string) => {
    try {
      const response = await getData(`task_status?ticket=${ticketID}`);
      const data = await response.json();

      if (data.status == 'COMPLETED' || data.status == 'FAILED') {
        setTicketIDs(ticketIDs.filter(item => item !== ticketID));
        if (!ticketIDs) {
          setIsPolling(false); // Stop polling if final task is done.
        }
        await fetchChannels();
        await fetchFiles(); // Fetch updated files after the task completes or fails
        notifications.show({
          title: 'Task Complete',
          message: `Status: ${data.status}`,
        })
      }
    } catch (error) {
      console.error('Error polling task status:', error);
      setIsPolling(false); // Stop polling on error
    }
  }, [ticketIDs, setTicketIDs, fetchChannels, fetchFiles ]);


  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isPolling && ticketIDs) {
      interval = setInterval(async () => {
        ticketIDs.forEach(checkTicket);
      }, 3000); // Poll every 3 seconds
    }

    // Cleanup function to clear the interval
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPolling, ticketIDs, checkTicket]);






  useEffect(() => {
    fetchChannels();
    fetchFiles();
  }, [fetchChannels, fetchFiles]);




  return (
    <Stack className={styles.mainStack}>


      <Group className={styles.topGroup}>
        <FileUpload fetchChannels={fetchChannels} fetchFiles={fetchFiles} />
        <RustlogImport ticketIDs={ticketIDs} setTicketIDs={setTicketIDs} setIsPolling={setIsPolling} />
      </Group>

      <Group className={styles.botGroup}>
        <FileTable
          channels={channels}
          fetchChannels={fetchChannels}
          chatFiles={chatFiles}
          fetchFiles={fetchFiles}
          ticketIDs={ticketIDs}
          setTicketIDs={setTicketIDs}
          setIsPolling={setIsPolling}
        />
      </Group>


    </Stack>
  );
}
