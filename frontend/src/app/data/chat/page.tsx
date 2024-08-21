// pages/page.js
'use client';

import { deleteData, getData, patchData, postData } from '@/api/apiHelpers';
import { FileTable, NavbarNested } from '@/components';
import { FileData } from '@/components/FileTable/FileTable';
import { Button, Group, Paper, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { initiallyOpenedStates } from '../opened_states';
import { FileUpload, RustlogImport } from './components';
import styles from './page.module.css';

export default function Page() {
  const [files, setFiles] = useState<FileData[]>([]);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await getData('chat/files/');
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
  };



  const handleDelete = async (fileId: string, fileName: string) => {
    await deleteData(`chat/files/${fileId}/`);
    await fetchFiles();
  };

  const handleEdit = async (fileId: string, newFileName: string) => {

    const formData = new FormData();
    formData.append('filename', newFileName);

    await patchData(`chat/files/${fileId}/`, formData);
    await fetchFiles();
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
    <main className={styles.main}>
      <div className={styles.navbar_container}>
        <NavbarNested initiallyOpenedStates={initiallyOpenedStates} />
      </div>
      <div className={styles.container}>
        <Paper className={styles.top_paper} shadow="xs">
          <Group justify={'center'}>
            <FileUpload fetchFiles={fetchFiles}/>
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
          <FileTable files={files} onDelete={handleDelete} onEdit={handleEdit} onBulkDelete={() => { }} onBulkPreprocess={() => { }} />
        </Paper>
      </div>
    </main>
  );
}
