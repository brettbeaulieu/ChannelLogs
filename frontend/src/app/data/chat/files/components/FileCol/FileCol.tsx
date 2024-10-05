import { Group, Paper, Stack } from "@mantine/core";
import { FileUpload } from "../FileUpload/FileUpload";
import { RustlogImport } from "../RustlogImport/RustlogImport";
import styles from "./FileCol.module.css";
import { useCallback, useEffect, useState } from "react";
import { Channel, CHANNELS_URL, ChatFile, CHATFILES_URL, getData } from "@/api";
import { FileTable } from "../FileTable/FileTable";
import { notifications } from "@mantine/notifications";

export function FileCol() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [chatFiles, setChatFiles] = useState<ChatFile[]>([])
  const [ticketIDs, setTicketIDs] = useState<string[]>([])
  const [isPolling, setIsPolling] = useState<boolean>(false)

  const fetchChannels = useCallback(async () => {
    try {
      const response = await getData(CHANNELS_URL)
      if (!response.ok) {
        throw new Error(`Failed to fetch channels: ${response.status}`)
      }
      const data = await response.json()
      setChannels(data)
    } catch (error) {
      console.error('Error fetching channels:', error)
    }
  }, [])

  const fetchFiles = useCallback(async () => {
    try {
      const response = await getData(CHATFILES_URL)
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`)
      }
      const data = await response.json()
      setChatFiles(data)
    } catch (error) {
      console.error('Error fetching files:', error)
    }
  }, [])
  
  const checkTicket = useCallback(
    async (ticketID: string) => {
      try {
        const response = await getData(`task_status?ticket=${ticketID}`)
        const data = await response.json()

        if (data.status == 'COMPLETED' || data.status == 'FAILED') {
          setTicketIDs(ticketIDs.filter((item) => item !== ticketID))
          if (!ticketIDs) {
            setIsPolling(false) // Stop polling if final task is done.
          }

          // Update channels and files
          await fetchChannels()
          await fetchFiles()

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
    [ticketIDs, setTicketIDs, fetchChannels, fetchFiles],
  )

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

  // get channels and files on mount
  useEffect(() => {
    fetchChannels()
    fetchFiles()
  }, [fetchChannels, fetchFiles])


  return (
    <Stack className={styles.subStack}>
      <Paper withBorder shadow="md">
        <Group className={styles.botGroup}>
        <FileUpload fetchChannels={fetchChannels} fetchFiles={fetchFiles} />
        <RustlogImport
          ticketIDs={ticketIDs}
          setTicketIDs={setTicketIDs}
          setIsPolling={setIsPolling}
        />
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
      </Paper>
    </Stack>
  )
}