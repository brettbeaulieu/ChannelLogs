import { Paper, Stack, Text, TextInput, Button } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import styles from './EmoteSetUpload.module.css'
import { useState } from 'react'
import { postData } from '@/api/apiHelpers'

export interface EmoteSetUploadProps {
    ticketIDs: string[];
    setTicketIDs: (arr: string[]) => void
    setIsPolling: (isPolling: boolean) => void
}

export function EmoteSetUpload({ ticketIDs, setTicketIDs, setIsPolling }: EmoteSetUploadProps) {
    const [inputURL, setInputURL] = useState('')

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputURL(event.target.value)
    }

    const handleSubmit = async () => {
        let submitted_url = inputURL
        if (submitted_url.includes('/')) {
          submitted_url = inputURL.substring(
            inputURL.lastIndexOf('/') + 1,
            inputURL.length,
          )
        }
    
        const formData = new FormData()
        formData.append('id', submitted_url)
    
        const response = await postData('chat/emotesets/', formData)
        if (response.status == 200) {
          const data = await response.json()
          setTicketIDs([...ticketIDs, data.ticket])
          setIsPolling(true)
          notifications.show({
            title: 'Emote Set Task Sent',
            message: `Ticket: ${data.ticket}`,
          })
        }
      }

    return (
        <Paper className={styles.inner_paper} withBorder>
            <Stack className={styles.inner_paper_stack}>
                <Text className={styles.centered_header}>
                    Import Emote Set URL
                </Text>
                <TextInput
                    label={'Emote Set ID/URL'}
                    value={inputURL}
                    onChange={handleInputChange}
                    placeholder={'https://7tv.app/emote-sets/<x>'}
                />
                <Button onClick={handleSubmit}>Submit</Button>

            </Stack>
        </Paper>
    )
}
