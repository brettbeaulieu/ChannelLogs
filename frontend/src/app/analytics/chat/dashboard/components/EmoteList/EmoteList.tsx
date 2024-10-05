import { getData, toIsoDateString } from '@/api/apiHelpers'
import { Paper, Table, Image, Skeleton, Text } from '@mantine/core'
import { ReactElement, useCallback, useEffect, useState } from 'react'
import styles from './EmoteList.module.css'
import { Channel } from '@/api'

const api_string = 'https://cdn.7tv.app/emote/'

interface Element {
  id: string
  name: string
  value: number
}

interface EmoteListProps {
  channel: Channel | undefined
  dateRange: [Date | null, Date | null]
}

export function EmoteList({ channel, dateRange }: EmoteListProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [rows, setRows] = useState<ReactElement[]>([])

  const buildItem = useCallback(
    (element: Element, idx: number): ReactElement => {
      const image_link = api_string + element.id + '/4x.webp'
      return (
        <Table.Tr key={element.name}>
          <Table.Td>
            {
              <Text fw={400} ta={'center'} size={'xl'}>
                {idx + 1}
              </Text>
            }
          </Table.Td>
          <Table.Td align={'center'}>
            {
              <Image
                alt={element.name}
                src={image_link}
                h={48}
                w={48}
                radius={'md'}
                fit={'contain'}
              />
            }
          </Table.Td>
          <Table.Td>{element.name}</Table.Td>
          <Table.Td>
            {new Intl.NumberFormat('en-US').format(element.value)}
          </Table.Td>
        </Table.Tr>
      )
    },
    [],
  )

  const buildItems = useCallback(
    (elements: Element[]): ReactElement[] => {
      return elements.map(buildItem)
    },
    [buildItem],
  )

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      if (!dateRange[0] || !dateRange[1] || !channel) {
        setRows([])
        setIsLoading(false)
        return
      }
      const startDate = toIsoDateString(dateRange[0])
      const endDate = toIsoDateString(dateRange[1])

      const response = await getData('chat/messages/popular_emotes', {
        channel: channel.id,
        start_date: startDate,
        end_date: endDate,
      })
      const data: Element[] = await response.json()
      const temp_rows: ReactElement[] = buildItems(data)
      setRows(temp_rows)
      setIsLoading(false)
    }
    fetchData()
  }, [dateRange, buildItems, channel])

  return (
    <Skeleton visible={isLoading} className={styles.skeleton}>
      <Paper withBorder className={styles.rootPaper} shadow='md'>
        <Table.ScrollContainer
          minWidth={200}
          type="scrollarea"
          className={styles.scrollContainer}
        >
          <Table classNames={{ table: styles.table, tbody: styles.tbody }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th ta={'center'}>Rank</Table.Th>
                <Table.Th ta={'center'}>Image</Table.Th>
                <Table.Th>Emote Name</Table.Th>
                <Table.Th>Count</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>            {rows.length > 0 ? (
              rows
            ) : (
              <Table.Tr>
                <Table.Td colSpan={4} ta={'center'}>
                  <Text p={"md"}>No emotes found.</Text>
                </Table.Td>
              </Table.Tr>
            )}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
    </Skeleton>
  )
}
