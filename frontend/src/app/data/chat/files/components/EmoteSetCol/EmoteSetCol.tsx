import { Paper, Stack } from "@mantine/core";
import styles from "./EmoteSetCol.module.css";
import { EmoteSetUpload } from "../EmoteSetUpload/EmoteSetUpload";
import { EmoteSetTable } from "../EmoteSetTable/EmoteSetTable";
import { useCallback, useEffect, useState } from "react";
import { EmoteSet, EMOTESETS_URL, getData } from "@/api";
import { notifications } from "@mantine/notifications";

export function EmoteSetCol() {
    const [ticketIDs, setTicketIDs] = useState<string[]>([])
    const [isPolling, setIsPolling] = useState<boolean>(false)
    const [emoteSets, setEmoteSets] = useState<EmoteSet[]>([])

    const fetchEmoteSets = useCallback(async () => {
        try {
            const response = await getData(EMOTESETS_URL)
            if (!response.ok) {
                throw new Error(`Failed to fetch files: ${response.status}`)
            }
            const data = await response.json()
            setEmoteSets(data)
        } catch (error) {
            console.error('Error fetching files:', error)
        }
    }, [])


    const checkTicket = useCallback(
        async (ticketID: string) => {
            try {
                const response = await getData(`task_status?ticket=${ticketID}`)
                const data = await response.json()

                if (['COMPLETED', 'FAILED'].includes(data.status)) {
                    setTicketIDs((prev) => prev.filter((id) => id !== ticketID));
                    if (!ticketIDs) {
                        setIsPolling(false) // Stop polling if final task is done.
                    }

                    // Update Emote sets
                    await fetchEmoteSets()

                    // Show task complete notification
                    notifications.show({
                        title: 'Task Complete',
                        message: `Status: ${data.status}`,
                    })
                }
            } catch (error) {
                console.error('Error polling task status:', error)
                setIsPolling(false) // Stop polling on error
            }
        },
        [ticketIDs, setTicketIDs],
    )

    // polling logic
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null

        if (isPolling && ticketIDs) {
            interval = setInterval(async () => {
                ticketIDs.forEach(checkTicket)
            }, 3000) // Poll every 3 seconds
        }

        // Cleanup function to clear the interval
        return () => {
            if (interval) {
                clearInterval(interval)
            }
        }
    }, [isPolling, ticketIDs, checkTicket])

    // find emote sets on mount
    useEffect(() => {
        fetchEmoteSets()
    }, [fetchEmoteSets])



    return (
        <Stack className={styles.subStack}>
            <Paper withBorder shadow="md">
                <EmoteSetUpload ticketIDs={ticketIDs} setTicketIDs={setTicketIDs} setIsPolling={setIsPolling} />
                <EmoteSetTable emoteSets={emoteSets} fetchEmoteSets={fetchEmoteSets} />
            </Paper>
        </Stack>
    )
}