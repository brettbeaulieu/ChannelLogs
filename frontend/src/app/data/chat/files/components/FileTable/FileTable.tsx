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
  Paper,
  Select
} from '@mantine/core';
import {
  IconPencil,
  IconTrash,
  IconCircleCheck,
  IconCircleX,
  IconSortAscending,
  IconSortDescending
} from '@tabler/icons-react';
import { useState, useEffect, ReactElement, ReactNode } from 'react';
import { deleteData, getData, parseFormatDateTime, patchData } from '@/api/apiHelpers';
import styles from './FileTable.module.css';
import { PreprocessModal, VisibilityMenu } from './components';
import { Channel, CHANNELS_URL, ChatFile, CHATFILES_URL } from '@/api';



interface FileTableProps {
  channels: Channel[];
  fetchChannels: () => void;
  chatFiles: ChatFile[];
  fetchFiles: () => void;
  ticketIDs: string[];
  setTicketIDs: (ticketIDs: string[]) => void;
  setIsPolling: (polling: boolean) => void;
}

export function FileTable({
  channels,
  fetchChannels,
  chatFiles,
  fetchFiles,
  ticketIDs,
  setTicketIDs,
  setIsPolling
}: FileTableProps) {
  const [newFilename, setNewFilename] = useState<string | null>(null);
  const [editingFilenameID, setEditingFilenameID] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    filename: true,
    is_preprocessed: true,
    channel: true,
    uploaded_at: true,
    metadata: true,
    actions: true,
  });
  const [sortConfig, setSortConfig] = useState<{ key: keyof ChatFile | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  useEffect(() => {
    setDrawerOpened(selectedFiles.size > 0);
  }, [selectedFiles]);

  const handleEditFilenameClick = (fileID: number, value: string) => {
    setEditingFilenameID(fileID);
    setNewFilename(value);
  }

  const handleSaveFilename = async () => {
    if (editingFilenameID && newFilename) {
      const formData = new FormData();
      formData.append('filename', newFilename);

      const response = await patchData(`${CHATFILES_URL}${editingFilenameID}/update_channel/`, formData);
      if (!response.ok) throw new Error(`Failed to edit file with ID ${editingFilenameID}, Status ${response.status}`);
      fetchFiles();
      setEditingFilenameID(null);
    }
  }

  const handleSaveNewChannel = async (newChannelName: string | null, chatfileID: number) => {
    
    const newChannelObj = channels.find(channel => channel.name === newChannelName);
    const oldChannelObj = channels.find(channel => channel.id === chatfileID);
    if (newChannelObj) {
      const formData = new FormData();
      formData.append('channel', JSON.stringify(newChannelObj));

      const response = await patchData(`${CHATFILES_URL}${chatfileID}/`, formData);
      if (!response.ok) throw new Error(`Failed to edit file with ID ${oldChannelObj?.id}, Status ${response.status}`);
      fetchChannels();
      fetchFiles();
    }
  }

  const sortIcon = (isAsc: string) => {
    return isAsc == "asc" ? <IconSortAscending className={styles.sortIcon} /> : <IconSortDescending className={styles.sortIcon} />;
  }

  const handleCancelFilename = () => {
    setEditingFilenameID(null);
    setNewFilename(null);
  }

  const handleColumnVisibilityChange = (column: string, isVisible: boolean) => {
    setVisibleColumns(prev => ({ ...prev, [column]: isVisible }));
  };

  const handleSelectChange = (fileId: number) => {
    setSelectedFiles(prev => {
      const newSelection = new Set(prev);
      newSelection.has(fileId) ? newSelection.delete(fileId) : newSelection.add(fileId);
      return newSelection;
    });
  };

  const handleBulkPreprocess = () => {
    setSelectedFiles(new Set());
  };

  const handleDelete = async (fileId: number) => {
    const response = await deleteData(`chat/files/${fileId}/`);
    if (!response.ok) throw new Error(`Failed to edit file with ID ${fileId}, Status ${response.status}`);
    fetchFiles();
  };

  const handleBulkDelete = () => {
    setSelectedFiles(new Set());
  };

  const handleSort = (key: keyof ChatFile) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc',
    }));
  };

  const toggleAll = () => {
    setSelectedFiles(selectedFiles.size === 0 ? new Set(chatFiles.map(file => file.id)) : new Set());
  };

  // Sorting function
  const sortFiles = (a: ChatFile, b: ChatFile): number => {
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
  }

  const buildTableRow = (chatfile: ChatFile) => {

    return (<Table.Tr key={chatfile.id} className={cx({ [styles.rowSelected]: selectedFiles.has(chatfile.id) })}>
      <Table.Td>
        <Checkbox
          checked={selectedFiles.has(chatfile.id)}
          onChange={() => handleSelectChange(chatfile.id)}
        />
      </Table.Td>
      <Table.Td hidden={!visibleColumns.filename} className={styles.fileCell}>
        {editingFilenameID === chatfile.id ? (
          <Group align="center">
            <TextInput
              value={newFilename ? newFilename : ''}
              onChange={(e) => { setNewFilename(e.target.value) }}
              autoFocus
              style={{ marginRight: 8 }}
            />
            <Button onClick={handleSaveFilename} color="green" size="xs">Save</Button>
            <Button onClick={handleCancelFilename} color="gray" size="xs">Cancel</Button>
          </Group>
        ) : (
          <Group align="center">
            <span>{chatfile.filename}</span>
            <Tooltip label="Edit Name">
              <Button color="gray" onClick={() => handleEditFilenameClick(chatfile.id, chatfile.filename)} variant="subtle" size="xs">
                <IconPencil size={20} />
              </Button>
            </Tooltip>
          </Group>
        )}
      </Table.Td>
      <Table.Td hidden={!visibleColumns.channel} className={styles.propCell}>
        <Group align="center">
          <Select
            classNames={{ label: styles.innerTextLabel }}
            data={channels.map((elem) => elem.name)}
            defaultValue={chatfile.channel.name}
            onChange={(e) => handleSaveNewChannel(e, chatfile.id)}
            searchable
            spellCheck={false}
            allowDeselect={false}
          />
        </Group>
      </Table.Td>
      <Table.Td hidden={!visibleColumns.actions} className={styles.fileCell}>
        {chatfile.is_preprocessed ? (
          <IconCircleCheck className={styles.iconCheck} />
        ) : (
          <IconCircleX className={styles.iconX} />
        )}
      </Table.Td>
      <Table.Td hidden={!visibleColumns.actions} className={styles.fileCell}>{parseFormatDateTime(chatfile.uploaded_at)}</Table.Td>
      <Table.Td hidden={!visibleColumns.actions} className={styles.fileCell}>{JSON.stringify(chatfile.metadata)}</Table.Td>
      <Table.Td hidden={!visibleColumns.actions} className={styles.actionCell}>
        <Box className={styles.actionGroup}>
          {!chatfile.is_preprocessed && (
            <PreprocessModal
              parent_ids={new Set([chatfile.id])}
              ticketIDs={ticketIDs}
              setTicketIDs={setTicketIDs}
              setIsPolling={setIsPolling}
            />
          )}
          <Tooltip label="Delete File">
            <Button color="red" onClick={() => handleDelete(chatfile.id)} variant="subtle" size="xs">
              <IconTrash size={20} />
            </Button>
          </Tooltip>
        </Box>
      </Table.Td>

    </Table.Tr>)

  }

  const sortedFiles = [...chatFiles].sort((a, b) => sortFiles(a, b));
  const rows = sortedFiles.map(buildTableRow);
  return (
    <Paper className={styles.mainPaper} withBorder>
      <Group mb="md">
        <Text className={styles.filesHeader}>Uploaded Files ({chatFiles.length})</Text>
        <VisibilityMenu visibleColumns={visibleColumns} handleVisibilityChange={handleColumnVisibilityChange} />
      </Group>
      <Table.ScrollContainer minWidth={400}>
        <Table className={styles.table}>
          <Table.Thead className={styles.thead}>
            <Table.Tr className={styles.tr}>
              <Table.Th className={styles.fileHeader}>
                <Checkbox
                  onChange={toggleAll}
                  checked={selectedFiles.size === chatFiles.length}
                  indeterminate={selectedFiles.size > 0 && selectedFiles.size !== chatFiles.length}
                />
              </Table.Th>

              <Table.Th hidden={!visibleColumns.filename} className={styles.fileHeader} onClick={() => handleSort('filename')}>
                File Name
                {sortConfig.key === 'filename' && sortIcon(sortConfig.direction)}
              </Table.Th>

              <Table.Th hidden={!visibleColumns.channel} className={styles.fileHeader} onClick={() => handleSort('channel')}>
                Channel
                {sortConfig.key === 'channel' && sortIcon(sortConfig.direction)}
              </Table.Th>

              <Table.Th hidden={!visibleColumns.is_preprocessed} className={styles.fileHeader} onClick={() => handleSort('is_preprocessed')}>
                Preprocessed
                {sortConfig.key === 'is_preprocessed' && sortIcon(sortConfig.direction)}
              </Table.Th>

              <Table.Th hidden={!visibleColumns.uploaded_at} className={styles.fileHeader} onClick={() => handleSort('uploaded_at')}>
                Upload Date
                {sortConfig.key === 'uploaded_at' && sortIcon(sortConfig.direction)}
              </Table.Th>

              <Table.Th hidden={!visibleColumns.metadata} className={styles.fileCell}>Metadata</Table.Th>

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
        <Text>Total Files: {selectedFiles.size}</Text>
        <Group>
          <Button onClick={handleBulkPreprocess} color="green" disabled={selectedFiles.size === 0}>
            Bulk Preprocess
          </Button>
          <Button onClick={handleBulkDelete} color="red" disabled={selectedFiles.size === 0}>
            Bulk Delete
          </Button>
        </Group>
      </Drawer>
    </Paper>
  );
}
