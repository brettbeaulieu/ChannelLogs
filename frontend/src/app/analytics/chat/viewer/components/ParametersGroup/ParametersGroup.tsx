import React, { useEffect, useState } from 'react';
import { Checkbox, Select, Stack, Text, Paper, Loader, Group } from '@mantine/core';
import styles from './ParametersGroup.module.css';
import { DateMenu } from '@/components';
import { getData } from '@/api/apiHelpers';

type SetStateAction<T> = React.Dispatch<React.SetStateAction<T>>;

export interface EmoteSetData {
    id: number;
    name: string;
    set_id: string;
    counts: Record<string, any>;
}

interface EmoteObject {
    parent_set: string;
    name: string;
    emote_id: string;
}

interface ParametersGroupProps {
    channel: string | null;
    setChannel: SetStateAction<string | null>;

    dateRange: [Date | null, Date | null];
    setDateRange: SetStateAction<[Date | null, Date | null]>;

    emotes: EmoteObject[];
    setEmotes: Function;
}

export function ParametersGroup({
    channel,
    setChannel,
    dateRange,
    setDateRange,
    emotes,
    setEmotes,
}: ParametersGroupProps) {

    const [channelList, setChannelList] = useState<string[]>([]);
    const [comboBoxLoading, setComboBoxLoading] = useState(false);
    const [emoteSets, setEmoteSets] = useState<EmoteSetData[]>([]);
    const [emoteSetName, setEmoteSetName] = useState<string | null>(null);

    // Fetch channel list when component mounts
    useEffect(() => {
        async function fetchChannelList() {
            try {
                const response = await getData('chat/files/get_all_channels');
                const data = await response.json();
                setChannelList(data.names);
            } catch (error) {
                console.error('Failed to fetch channel list', error);
            }
        }

        fetchChannelList();
    }, []); // Empty dependency array means this runs only once

    // Handle emote set selection
    useEffect(() => {
        if (emoteSetName) {
            const selectedSet = emoteSets.find(set => set.name === emoteSetName);
            if (selectedSet) {
                const fetchEmotesForSet = async (setId: string) => {
                    try {
                        const response = await getData(`chat/emotes`, { parent_set__set_id: setId });
                        const data: EmoteObject[] = await response.json();
                        setEmotes(data);
                    } catch (error) {
                        console.error('Failed to fetch emotes for set', error);
                    }
                };
                fetchEmotesForSet(selectedSet.set_id);
            }
        }
    }, [emoteSetName, emoteSets, setEmotes]);

    // Fetch emote sets
    useEffect(() => {
        const fetchEmoteSets = async () => {
            setComboBoxLoading(true);
            try {
                const response = await getData('chat/emotesets');
                const data: EmoteSetData[] = await response.json();
                setEmoteSets(data);
            } catch (error) {
                console.error('Failed to fetch emote sets', error);
            } finally {
                setComboBoxLoading(false);
            }
        };
        fetchEmoteSets();
    }, []); // Empty dependency array means this runs only once

    return (
        <Paper className={styles.paramsPaper}>
            <Group className={styles.paramsGroup}>
                <Paper withBorder className={styles.innerPaper}>
                    <Stack>
                        <Text ta="center" className={styles.textLabel}>Emote Set</Text>
                        <Select
                            data={emoteSets.map(set => ({ value: set.name, label: set.name }))}
                            value={emoteSetName || ''}
                            onChange={(value) => setEmoteSetName(value)}
                            placeholder="Pick value"
                            rightSection={comboBoxLoading ? <Loader size={18} /> : null}
                        />
                    </Stack>
                </Paper>
                <Paper withBorder className={styles.innerPaper}>
                    <Stack>
                        <Text ta="center" className={styles.textLabel}>Channel</Text>
                        <Select
                            classNames={{ label: styles.innerTextLabel }}
                            data={channelList.map(channel => ({ value: channel, label: channel }))}
                            value={channel || ''}
                            onChange={setChannel}
                            searchable
                        />
                    </Stack>
                </Paper>
                <Paper withBorder className={styles.innerPaper}>
                    <Stack>
                        <Text ta="center" className={styles.textLabel}>Date Range</Text>
                        <DateMenu
                            dateRange={dateRange}
                            dateChange={setDateRange}
                        />
                    </Stack>
                </Paper>
            </Group>
        </Paper>
    );
};
