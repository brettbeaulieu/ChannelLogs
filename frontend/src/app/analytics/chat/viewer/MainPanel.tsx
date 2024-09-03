import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { Paper, Table, Text, Pagination, Image, Tooltip, Stack } from "@mantine/core";
import styles from "./MainPanel.module.css";
import { ParametersGroup } from './components';
import { createMessageFromData, getData, parseFormatDateTime, toIsoDateString } from '@/api/apiHelpers';
import { Channel, Emote, Message, MESSAGES_URL } from '@/api';



const PAGE_SIZE = 25;

export default function MainPanel() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const [channel, setChannel] = useState<Channel | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([yesterday, today]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [emotes, setEmotes] = useState<Emote[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchMessages = async (page: number) => {

      if (!dateRange[0] || !dateRange[1] || !channel) {
        return;
      }
      const startDate = toIsoDateString(dateRange[0]);
      const endDate = toIsoDateString(dateRange[1]);

      const response = await getData(MESSAGES_URL, {
        channel: channel.id,
        start_date: startDate,
        end_date: endDate,
        page: page,
        page_size: PAGE_SIZE, // Adjust page size as needed
      });
      const data = (await response.json()).results;
      setMessages(data.map(createMessageFromData)); // Assuming API returns a `results` field
      setTotalPages(Math.ceil(data.count / PAGE_SIZE)); // Assuming API returns a `count` field
    };
    fetchMessages(page);
  }, [dateRange, channel, page, emotes]);

  const buildMessage = (message: string, emotes: Emote[]): ReactElement => {
    // Create a mapping of emote names to image URLs
    const emoteMap = new Map(emotes.map(emote => [emote.name, emote.emote_id]));

    // Split message into words and preserve spaces
    const parts = message.split(/(\s+)/).map((part, index) => {
      const emoteSrc = emoteMap.get(part.trim());
      if (emoteSrc) {
        // Return an image element for the emote
        return <Tooltip key={index} label={part.trim()}>
          <Image key={index} className={styles.image} src={`https://cdn.7tv.app/emote/${emoteSrc}/4x.webp`} alt={part} fit={"contain"} />
        </Tooltip>;
      }
      // Return the part as a text element
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });

    return <>{parts}</>;
  };

  const buildItem = useCallback((message: Message): ReactElement => {
    return (
      <Table.Tr key={message.id}>
        <Table.Td><Text>{toIsoDateString(message.timestamp)}</Text></Table.Td>
        <Table.Td><Text>{message.username}</Text></Table.Td>
        <Table.Td>{buildMessage(message.message, emotes)}</Table.Td>
      </Table.Tr>
    );
  }, [emotes]);

  return (
    <main className={styles.main}>
      <Paper className={styles.mainPaper}>
        <ParametersGroup channel={channel} setChannel={setChannel} dateRange={dateRange} setDateRange={setDateRange} emotes={emotes} setEmotes={setEmotes} />
        <Stack align="center" mt="md" className={styles.mainStack}>
        <Table className={styles.table}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Timestamp</Table.Th>
              <Table.Th>Username</Table.Th>
              <Table.Th>Message</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{messages.map(buildItem)}</Table.Tbody>
        </Table>
          <Pagination
            onChange={(newPage) => setPage(newPage)}
            total={totalPages}
          />
        </Stack>
      </Paper>
    </main>
  );
}
