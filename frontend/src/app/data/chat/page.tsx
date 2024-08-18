// pages/page.js
'use client';

import { useRef, useState, useEffect } from 'react';
import { Dropzone } from '@mantine/dropzone';
import { Group, Button, Loader, Text, Paper, TextInput, Stack } from '@mantine/core';
import { NavbarNested, FileTable } from '@/components';
import { initiallyOpenedStates } from '../opened_states';
import styles from './page.module.css';
import { getData, postData, deleteData, patchData } from '@/api/apiHelpers'
import { FileData } from '@/components/FileTable/FileTable';
import { DatePickerInput } from '@mantine/dates';

export default function Page() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(false);
  const openRef = useRef<() => void>(null);

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

  const handleDrop = async (files: File[]) => {
    setLoading(true);
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await postData('chat/files/', formData);
    await fetchFiles();
    setLoading(false);

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

  const handlePreprocess = async (fileId: string) => {
    const formData = new FormData;
    formData.append('id', fileId);
    await postData(`chat/files/preprocess/`, formData);
    await fetchFiles();
  };

  return (
    <main className={styles.main}>
      <NavbarNested initiallyOpenedStates={initiallyOpenedStates} />
      <div className={styles.container}>
        <Paper className={styles.top_paper} shadow="xs">
          <Group justify={'center'}>
            <Paper className={styles.inner_paper}>
              <Stack className={styles.inner_paper_stack}>
                <Text className={styles.centered_header}>
                  Upload Your Files
                </Text>
                <Dropzone
                  openRef={openRef}
                  onDrop={handleDrop}
                  className={styles.file_upload}
                >
                  {loading ? <Loader /> : 'Drop files here or click to select'}
                </Dropzone>
                <Button style={{ marginBottom: '1rem' }} onClick={() => openRef.current?.()}>Select files</Button>
              </Stack>


            </Paper>
            <Paper className={styles.inner_paper}>
              <Stack className={styles.inner_paper_stack}>
                <Text className={styles.centered_header}>
                  Import From RustLogs
                </Text>
                <TextInput
                  label={"Channel Name"}
                />
                <DatePickerInput
                  label={"Time Range"}
                  type={'range'}
                />
                <Button>
                  Submit
                </Button>
              </Stack>
            </Paper>
          </Group>
        </Paper>

        <Paper shadow="xs" className={styles.paper}>
          <Group>
            <Text size="lg" style={{ margin: '1rem' }}>
              Uploaded Files ({files.length})
            </Text>
            <Button color="red" onClick={handleDeleteAll}>Delete All</Button>
          </Group>
          <FileTable files={files} onDelete={handleDelete} onEdit={handleEdit} onPreprocess={handlePreprocess} onBulkDelete={() => { }} onBulkPreprocess={() => { }} />
        </Paper>
      </div>
    </main>
  );
}
