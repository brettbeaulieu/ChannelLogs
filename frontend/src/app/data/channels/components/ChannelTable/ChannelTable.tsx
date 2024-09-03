import cx from 'clsx';
import {
  Table,
  Button,
  TextInput,
  Group,
  Tooltip,
  Box,
  Drawer,
  Text,
  Checkbox,
  Paper
} from '@mantine/core';
import {
  IconPencil,
  IconSortAscending,
  IconSortDescending,
  IconTrash
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { deleteData, patchData } from '@/api/apiHelpers';
import styles from './ChannelTable.module.css';
import { VisibilityMenu } from './components';
import { Channel, CHANNELS_URL } from '@/api';

interface ChannelTableProps {
  channels: Channel[];
  fetchChannels: () => void;
  setTicketID: (id: string) => void;
  setIsPolling: (polling: boolean) => void;
}

export function ChannelTable({
  channels,
  fetchChannels,
  setTicketID,
  setIsPolling
}: ChannelTableProps) {
  const [editing, setEditing] = useState<{ id: number | null; field: 'name' | 'emotesets' | null }>({ id: null, field: null });
  const [newChannelName, setNewChannelName] = useState<string>('');
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    actions: true,
  });
  const [selectedChannelIDs, setSelectedChannelIDs] = useState<Set<number>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: keyof Channel | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  useEffect(() => {
    setDrawerOpened(selectedChannelIDs.size > 0);
  }, [selectedChannelIDs]);

  const handleEditClick = (channelID: number, field: 'name' | 'emotesets') => {
    setEditing({ id: channelID, field });
  };

  const handleSave = async () => {
    const { id, field } = editing;
    if (id && field) {
      try {
        const formData = new FormData();
        formData.append(field!, newChannelName);
        const response = await patchData(`chat/files/${id}/`, formData);
        if (!response.ok) throw new Error(`Failed to edit file ${id}: ${response.status}`);
        fetchChannels();
      } catch (error) {
        console.error(`Error editing file ${id}:`, error);
      }
      setEditing({ id: null, field: null });
      setNewChannelName('');
    }
  };

  const sortIcon = (isAsc: string) => {
    return isAsc == "asc" ? <IconSortAscending className={styles.sortIcon} /> : <IconSortDescending className={styles.sortIcon} />;
  }

  const handleCancel = () => {
    setEditing({ id: null, field: null });
    setNewChannelName('');
  };

  const handleColumnVisibilityChange = (column: string, isVisible: boolean) => {
    setVisibleColumns(prev => ({ ...prev, [column]: isVisible }));
  };

  const handleSelectChange = (channelID: number) => {
    setSelectedChannelIDs(prev => {
      const newSelection = new Set(prev);
      newSelection.has(channelID) ? newSelection.delete(channelID) : newSelection.add(channelID);
      return newSelection;
    });
  };

  const handleBulkPreprocess = () => {
    setSelectedChannelIDs(new Set());
  };

  const handleDelete = async (channelID: number) => {
    try {
      await deleteData(`${CHANNELS_URL}${channelID}/`);
      fetchChannels();
    } catch (error) {
      console.error(`Error deleting file ${channelID}:`, error);
    }
  };

  const handleBulkDelete = () => {
    setSelectedChannelIDs(new Set());
  };

  const toggleAll = () => {
    setSelectedChannelIDs(selectedChannelIDs.size === 0 ? new Set(channels.map(channel => channel.id)) : new Set());
  };

  // Sorting function
  const sortedChannels = [...channels].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (typeof aValue === 'boolean') {
      // Handle boolean sorting
      return sortConfig.direction === 'asc'
        ? (aValue === bValue ? 0 : aValue ? -1 : 1)
        : (aValue === bValue ? 0 : aValue ? 1 : -1);
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof Channel) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc',
    }));
  };

  const rows = sortedChannels.map(channel => (
    <Table.Tr key={channel.id} className={cx({ [styles.rowSelected]: selectedChannelIDs.has(channel.id) })}>
      <Table.Td>
        <Checkbox
          checked={selectedChannelIDs.has(channel.id)}
          onChange={() => handleSelectChange(channel.id)}
        />
      </Table.Td>
      <Table.Td hidden={!visibleColumns.name} className={styles.propCell}>
        {editing.id === channel.id && editing.field === 'name' ? (
          <Group align="center">
            <TextInput
              value={newChannelName}
              onChange={(event) => {setNewChannelName(event.target.value)}}
              autoFocus
              style={{ marginRight: 8 }}
            />
            <Button onClick={handleSave} color="green" size="xs">Save</Button>
            <Button onClick={handleCancel} color="gray" size="xs">Cancel</Button>
          </Group>
        ) : (
          <Group align="center">
            <span>{channel.name}</span>
            <Tooltip label="Edit Channel">
              <Button color="gray" onClick={() => handleEditClick(channel.id, 'name')} variant="subtle" size="xs">
                <IconPencil size={20} />
              </Button>
            </Tooltip>
          </Group>
        )}
      </Table.Td>
      <Table.Td hidden={!visibleColumns.actions} className={styles.actionCell}>
        <Box className={styles.actionGroup}>
          <Tooltip label="Delete File">
            <Button color="red" onClick={() => handleDelete(channel.id)} variant="subtle" size="xs">
              <IconTrash size={20} />
            </Button>
          </Tooltip>
        </Box>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper className={styles.mainPaper} withBorder>
      <Group mb="md">
        <Text className={styles.filesHeader}>Uploaded Files ({channels.length})</Text>
        <VisibilityMenu visibleColumns={visibleColumns} handleVisibilityChange={handleColumnVisibilityChange} />
      </Group>
      <Table.ScrollContainer minWidth={400}>
        <Table className={styles.table}>
          <Table.Thead className={styles.thead}>
            <Table.Tr className={styles.tr}>
              <Table.Th className={styles.fileHeader}>
                <Checkbox
                  onChange={toggleAll}
                  checked={selectedChannelIDs.size === channels.length}
                  indeterminate={selectedChannelIDs.size > 0 && selectedChannelIDs.size !== channels.length}
                />
              </Table.Th>

              <Table.Th hidden={!visibleColumns.name} className={styles.fileHeader} onClick={() => handleSort('name')}>
                Channel Name
                {sortConfig.key === 'name' && sortIcon(sortConfig.direction)}
              </Table.Th>

              <Table.Th hidden={!visibleColumns.actions} className={styles.actionHeader}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody className={styles.tbody}>{rows}</Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Drawer
        trapFocus={false}
        lockScroll={false}
        zIndex={1}
        closeOnClickOutside={false}
        opened={drawerOpened}
        size="10rem"
        withinPortal={false}
        onClose={() => setDrawerOpened(false)}
        classNames={{ root: styles.drawer, overlay: styles.drawer_root }}
        position="bottom"
        title="Bulk Actions"
      >
        <Text>Total Files: {selectedChannelIDs.size}</Text>
        <Group>
          <Button onClick={handleBulkPreprocess} color="green" disabled={selectedChannelIDs.size === 0}>
            Bulk Preprocess
          </Button>
          <Button onClick={handleBulkDelete} color="red" disabled={selectedChannelIDs.size === 0}>
            Bulk Delete
          </Button>
        </Group>
      </Drawer>
    </Paper>
  );
}
