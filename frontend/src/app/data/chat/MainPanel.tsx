// pages/page.js
'use client';

import { deleteData, getData, patchData } from '@/api/apiHelpers';
import { FileData } from '@/app/data/chat/components/FileTable/FileTable';
import { Group, Paper, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useCallback, useEffect, useState } from 'react';
import { FileTable, FileUpload, RustlogImport } from './components';
import styles from './MainPanel.module.css';

export default function MainPanel() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [ticketID, setTicketID] = useState<string>('');
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const fetchFiles = useCallback(async () => {
    try {
      const response = await getData('chat/files/');
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`);
      }
      const data = await response.json();

      // Check if response.files is defined before setting state
      if (data && data.files) {
        setFiles(data.files);
      } else {
        console.error('Response does not contain files:', data);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  }, []);


  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isPolling && ticketID) {
      interval = setInterval(async () => {
        try {
          const response = await getData(`task_status?ticket=${ticketID}`);
          const data = await response.json();

          if (data.status == 'COMPLETED' || data.status == 'FAILED') {
            setIsPolling(false); // Stop polling
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
      }, 2000); // Poll every 2 seconds
    }

    // Cleanup function to clear the interval
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPolling, ticketID, fetchFiles]);






  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDelete = async (fileId: string, fileName: string) => {
    try {
      await deleteData(`chat/files/${fileId}/`);
      await fetchFiles();
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error);
    }
  };

  const handleEdit = async (fileId: string, newFileName: string) => {
    try {
      const formData = new FormData();
      formData.append('filename', newFileName);
      const response = await patchData(`chat/files/${fileId}/`, formData);
      if (!response.ok) {
        throw new Error(`Failed to edit file ${fileId}: ${response.status}`);
      }
      await fetchFiles();
    } catch (error) {
      console.error(`Error editing file ${fileId}:`, error);
    }
  }

  return (
    <Stack className={styles.mainStack}>

      <Paper className={styles.top_paper} shadow="xs">
        <Group justify={'center'}>
          <FileUpload fetchFiles={fetchFiles} />
          <RustlogImport setTicketID={setTicketID} setIsPolling={setIsPolling} />
        </Group>
      </Paper>

      <Paper shadow="xs" className={styles.paper}>
        <Group>
          <Text size="lg" style={{ margin: '1rem' }}>
            Uploaded Files ({files.length})
          </Text>
        </Group>

        <FileTable
          files={files}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onBulkDelete={() => { }}
          onBulkPreprocess={() => { }}
          setTicketID={setTicketID}
          setIsPolling={setIsPolling}
        />
      </Paper>

    </Stack>
  );
}
