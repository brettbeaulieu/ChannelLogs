// pages/page.js
'use client';

import { useState, useEffect } from 'react';
import { Group, Button, Loader, Text, Paper, TextInput, Stack, Table } from '@mantine/core';
import { NavbarNested, EmoteSetTable } from '@/components';
import { EmoteSetData } from '@/components/EmoteSetTable/EmoteSetTable';
import { initiallyOpenedStates } from '../opened_states';
import styles from './page.module.css';
import { getData, postData, deleteData, patchData } from '@/api/apiHelpers'

export default function Page() {
  const [emoteSets, setEmoteSets] = useState<EmoteSetData[]>([]);
  const [inputURL, setInputURL] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await getData('chat/emote-sets');

      const data = await response.json();
      console.log(data);
      // Check if response.files is defined before setting state
      if (data) {
        setEmoteSets(data);
      } else {
        console.error('Response does not contain files:', response);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleDelete = async (fileId: string) => {
    await deleteData(`chat/emote-sets/${fileId}/`);
    await fetchFiles();
  };

  const handleEdit = async (fileId: string, newName: string) => {

    const formData = new FormData();
    formData.append('name', newName);

    await patchData(`chat/emote-sets/${fileId}/`, formData);
    await fetchFiles();
  }

  // Step 2: Handle input changes
  const handleInputChange = (event) => {
    setInputURL(event.target.value);
  };

  const handleSubmit = async () => {

    var submitted_url = inputURL;
    if (submitted_url.includes('/')) {
      submitted_url = inputURL.substring(inputURL.lastIndexOf('/') + 1, inputURL.length);
    }
    console.log(inputURL);

    const formData = new FormData();
    formData.append('id', inputURL);

    await postData("chat/emote-sets/", formData);
    await fetchFiles();

  }


  const handleDeleteAll = async () => {
    if (window.confirm('Are you sure you want to delete all files?')) {
      try {
        const response = await deleteData('chat/emote-sets/delete_all/');
        console.log(`Status: ${response.status}`);
        if (response.status != 204) {
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
      <NavbarNested initiallyOpenedStates={initiallyOpenedStates} />
      <div className={styles.container}>
        <Paper className={styles.top_paper} shadow="xs">
          <Group justify={'center'}>
            <Paper className={styles.inner_paper}>
              <Stack className={styles.inner_paper_stack}>
                <Text className={styles.centered_header}>
                  Import Emote Set URL
                </Text>
                <TextInput
                  label={"Emote Set ID/URL"}
                  value={inputURL}
                  onChange={handleInputChange}
                  placeholder={"https://7tv.app/emote-sets/<x>"}
                />
                <Button onClick={handleSubmit}>
                  Submit
                </Button>
              </Stack>
            </Paper>
          </Group>
        </Paper>

        <Paper shadow="xs" className={styles.paper}>
          <Group>
            <Text size="lg" style={{ margin: '1rem' }}>
              Emote Sets ({emoteSets.length})
            </Text>
            <Button color="red" onClick={handleDeleteAll}>Delete All</Button>
          </Group>
          <EmoteSetTable emoteSets={emoteSets} onDelete={handleDelete} onEdit={handleEdit} />
        </Paper>
      </div>
    </main>
  );
}
