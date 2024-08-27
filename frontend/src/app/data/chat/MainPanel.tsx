// pages/page.js
'use client';

import { deleteData, getData, patchData } from '@/api/apiHelpers';
import { FileData } from '@/app/data/chat/components/FileTable/FileTable';
import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import { FileTable, FileUpload, RustlogImport } from './components';
import styles from './MainPanel.module.css';

export default function MainPanel() {
  const [files, setFiles] = useState<FileData[]>([]);

  
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


  const handleDeleteAll = async () => {
    if (window.confirm('Are you sure you want to delete all files?')) {
      try {
        const response = await deleteData('chat/files/delete_all')

        if (!response.ok) {
          throw new Error(`Failed to delete all files: ${response.status}`);
        }

        await fetchFiles();
      } catch (error) {
        console.error('Error deleting all files:', error);
        alert('Error deleting all files. Please try again.');
      }
    }
  };

  return (
    <div className={styles.container}>
      <Stack>
        <Paper className={styles.top_paper} shadow="xs">
          <Group justify={'center'}>
            <FileUpload fetchFiles={fetchFiles} />
            <RustlogImport />
          </Group>
        </Paper>

        <Paper shadow="xs" className={styles.paper}>
          <Group>
            <Text size="lg" style={{ margin: '1rem' }}>
              Uploaded Files ({files.length})
            </Text>
            <Button color="red" onClick={handleDeleteAll}>Delete All</Button>
          </Group>
          <FileTable
            files={files}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onBulkDelete={() => { }}
            onBulkPreprocess={() => { }}
          />
        </Paper>
      </Stack>
    </div>
  );
}
