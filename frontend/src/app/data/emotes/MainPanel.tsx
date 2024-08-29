// pages/page.js
'use client';

import { useState, useEffect } from 'react';
import { Group, Button, Text, Paper, TextInput, Stack, Skeleton, Loader } from '@mantine/core';
import { EmoteSetTable } from '@/components';
import { EmoteSetData } from '@/components/EmoteSetTable/EmoteSetTable';
import styles from './MainPanel.module.css';
import { getData, postData, deleteData, patchData } from '@/api/apiHelpers'
import { notifications } from '@mantine/notifications';



export default function MainPanel() {
    const [ticketID, setTicketID] = useState<string>('');
    const [isPolling, setIsPolling] = useState<boolean>(false);
    const [emoteSets, setEmoteSets] = useState<EmoteSetData[]>([]);
    const [inputURL, setInputURL] = useState('');
    const [loading, setLoading] = useState(false);

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
                            title: 'Emote Set Task Complete',
                            message: `Status: ${data.status}`,
                        })
                    }
                } catch (error) {
                    console.error('Error polling task status:', error);
                    setIsPolling(false); // Stop polling on error
                }
            }, 100); // Poll every 0.1 seconds
        }

        // Cleanup function to clear the interval
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [isPolling, ticketID]); // Ensure to only depend on isPolling and ticketID


    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            const response = await getData('chat/emotesets');

            const data = await response.json();
            // Check if response.files is defined before setting state
            if (data) {
                setEmoteSets(data);
                setLoading(false);
            } else {
                console.error('Response does not contain files:', response);
            }
        } catch (error) {
            console.error('Error fetching files:', error);
        }
    };

    const handleDelete = async (fileId: string) => {
        await deleteData(`chat/emotesets/${fileId}/`);
        await fetchFiles();
    };

    const handleEdit = async (fileId: string, newName: string) => {

        const formData = new FormData();
        formData.append('name', newName);

        await patchData(`chat/emotesets/${fileId}/`, formData);
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

        const formData = new FormData();
        formData.append('id', submitted_url);

        const response = await postData("chat/emotesets/", formData);
        if (response.status == 200) {
            const data = await response.json();
            setTicketID(data.ticket)
            setIsPolling(true);
            setLoading(true);
            notifications.show({
                title: 'Emote Set Task Sent',
                message: `Ticket: ${data.ticket}`,
            })
        }

    }


    const handleDeleteAll = async () => {
        if (window.confirm('Are you sure you want to delete all files?')) {
            try {
                const response = await deleteData('chat/emotesets/delete_all/');
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
                <Skeleton visible={loading}>
                    <EmoteSetTable emoteSets={emoteSets} onDelete={handleDelete} onEdit={handleEdit} />
                </Skeleton>
            </Paper>
        </div>
    );
}
