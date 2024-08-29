import { ActionIcon, Button, Group, Paper, Select, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import styles from './RustlogImport.module.css';
import { useEffect, useState } from "react";
import { getData, postData } from "@/api/apiHelpers";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";

interface RustlogImportProps {
    setTicketID: any;
    setIsPolling: any;
}

interface RustlogUserData {
    name: string;
    userID: string;
}

const formatDate = (date: Date | null): string | null => {
    if (!date) return null;
    return date.toISOString().split('T')[0];
};

async function checkAndFetchChannels(url: string): Promise<{ valid: boolean, channels: string[] }> {
    try {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'http://' + url;
        }
        const response = await getData('chat/files/get_channels_rustlog', { 'repo_url': url });
        if (response.status >= 200 && response.status < 300) {
            const data = await response.json();
            if (data && data.data && Array.isArray(data.data.channels)) {
                const channels = data.data.channels.map((entry: { name: string }) => entry.name);
                return { valid: true, channels };
            } else {
                return { valid: false, channels: [] };
            }
        } else {
            return { valid: false, channels: [] };
        }
    } catch (error) {
        console.error('URL validation or channels fetch failed:', error);
        return { valid: false, channels: [] };
    }
}

export function RustlogImport({ setTicketID, setIsPolling }: RustlogImportProps) {
    const [repoName, setRepoName] = useState('');
    const [channelName, setChannelName] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
    const [isRepoValid, setIsRepoValid] = useState<boolean>(false);
    const [loading, setLoading] = useState(false);
    const [channels, setChannels] = useState<string[]>([]);

    const validateRepo = async () => {
        if (!repoName) return;
        setLoading(true);
        const { valid, channels } = await checkAndFetchChannels(repoName);
        setIsRepoValid(valid);
        setChannels(channels);
        setLoading(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            validateRepo();
        }
    };

    const handleRepoNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newRepoName = event.currentTarget.value;
        setRepoName(newRepoName);
        setIsRepoValid(false); // Reset validation state on change
        setChannels([]); // Clear channels on URL change
    };

    const handleClick = async () => {
        const startDate = formatDate(dateRange[0]);
        const endDate = formatDate(dateRange[1] ? dateRange[1] : dateRange[0]);

        if (!startDate || !endDate) {
            console.error('Both start date and end date must be selected.');
            return;
        }
        if (!channelName) {
            console.error('Channel name must be selected.');
            return;
        }

        const formData = new FormData();
        formData.append('repo_name', repoName);
        formData.append('channel_name', channelName);
        formData.append('start_date', startDate);
        formData.append('end_date', endDate);

        const response = await postData('chat/files/grab_logs_rustlog/', formData);
        if (response.status !== 200) {
            alert(`Error status ${response.status}`);
        } else {
            const data = await response.json();
            setTicketID(data.ticket);
            setIsPolling(true);
            notifications.show({
                title: 'Rustlog Import Task Sent',
                message: `Ticket: ${data.ticket}`,
            });
        }
    };

    return (
        <Paper className={styles.inner_paper} withBorder>
            <Stack justify={"space-between"}>
                <Text className={styles.centered_header}>
                    Import From Rustlog API
                </Text>
                <Group align={"flex-end"} className={styles.paramsGroup}>
                    <TextInput
                        label={"Repository"}
                        value={repoName}
                        onChange={handleRepoNameChange} // Use the handler that resets validation
                        onKeyDown={handleKeyDown}
                        rightSection={
                            <Tooltip label="Press enter, or click to validate">
                                <ActionIcon color={isRepoValid ? 'teal' : 'red'} onClick={validateRepo} disabled={loading}>
                                    {isRepoValid ? <IconCheck size={16} /> : <IconX size={16} />}
                                </ActionIcon>
                            </Tooltip>
                        }
                    />
                    <Select
                        label="Channel Name"
                        placeholder="Select channel"
                        value={channelName}
                        onChange={setChannelName}
                        data={channels.map(channel => ({ value: channel, label: channel }))}
                        searchable
                        nothingFoundMessage={'No channels found'}
                    />
                    <DatePickerInput
                        label={"Time Range"}
                        type={'range'}
                        value={dateRange}
                        onChange={setDateRange}
                        allowSingleDateInRange
                    />
                    <Button onClick={handleClick}>
                        Submit
                    </Button>
                </Group>
            </Stack>
        </Paper>
    );
}
