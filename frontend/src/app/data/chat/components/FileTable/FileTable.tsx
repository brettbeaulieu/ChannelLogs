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
  IconTrash,
  IconCircleCheck,
  IconCircleX,
  IconSortAscending,
  IconSortDescending
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { deleteData, parseFormatDateTime, patchData } from '@/api/apiHelpers';
import styles from './FileTable.module.css';
import { PreprocessModal, VisibilityMenu } from './components';

export interface FileData {
  id: string;
  file: string;
  filename: string;
  channel: string;
  is_preprocessed: boolean;
  uploaded_at: string;
  metadata: Record<string, any>;
}

interface FileTableProps {
  files: FileData[];
  fetchFiles: () => void;
  setTicketID: (id: string) => void;
  setIsPolling: (polling: boolean) => void;
}

export function FileTable({
  files,
  fetchFiles,
  setTicketID,
  setIsPolling
}: FileTableProps) {
  const [editing, setEditing] = useState<{ id: string | null; field: 'filename' | 'channel' | null }>({ id: null, field: null });
  const [newValues, setNewValues] = useState<{ filename: string; channel: string }>({ filename: '', channel: '' });
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    filename: true,
    is_preprocessed: true,
    channel: true,
    uploaded_at: true,
    metadata: true,
    actions: true,
  });
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: keyof FileData | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  useEffect(() => {
    setDrawerOpened(selectedFiles.size > 0);
  }, [selectedFiles]);

  const handleEditClick = (fileId: string, field: 'filename' | 'channel', value: string) => {
    setEditing({ id: fileId, field });
    setNewValues(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const { id, field } = editing;
    const value = newValues[field!];
    if (id && value) {
      try {
        const formData = new FormData();
        formData.append(field!, value);
        const response = await patchData(`chat/files/${id}/`, formData);
        if (!response.ok) throw new Error(`Failed to edit file ${id}: ${response.status}`);
        fetchFiles();
      } catch (error) {
        console.error(`Error editing file ${id}:`, error);
      }
      setEditing({ id: null, field: null });
      setNewValues({ filename: '', channel: '' });
    }
  };

  const sortIcon = (isAsc: string) => {
    return isAsc == "asc" ? <IconSortAscending className={styles.sortIcon} /> : <IconSortDescending className={styles.sortIcon} />;
  }

  const handleCancel = () => {
    setEditing({ id: null, field: null });
    setNewValues({ filename: '', channel: '' });
  };

  const handleColumnVisibilityChange = (column: string, isVisible: boolean) => {
    setVisibleColumns(prev => ({ ...prev, [column]: isVisible }));
  };

  const handleSelectChange = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSelection = new Set(prev);
      newSelection.has(fileId) ? newSelection.delete(fileId) : newSelection.add(fileId);
      return newSelection;
    });
  };

  const handleBulkPreprocess = () => {
    setSelectedFiles(new Set());
  };

  const handleDelete = async (fileId: string) => {
    try {
      await deleteData(`chat/files/${fileId}/`);
      fetchFiles();
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error);
    }
  };

  const handleBulkDelete = () => {
    setSelectedFiles(new Set());
  };

  const toggleAll = () => {
    setSelectedFiles(selectedFiles.size === 0 ? new Set(files.map(file => file.id)) : new Set());
  };

  // Sorting function
  const sortedFiles = [...files].sort((a, b) => {
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

  const handleSort = (key: keyof FileData) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc',
    }));
  };

  const rows = sortedFiles.map(file => (
    <Table.Tr key={file.id} className={cx({ [styles.rowSelected]: selectedFiles.has(file.id) })}>
      <Table.Td>
        <Checkbox
          checked={selectedFiles.has(file.id)}
          onChange={() => handleSelectChange(file.id)}
        />
      </Table.Td>
      <Table.Td hidden={!visibleColumns.filename} className={styles.fileCell}>
        {editing.id === file.id && editing.field === 'filename' ? (
          <Group align="center">
            <TextInput
              value={newValues.filename}
              onChange={(e) => setNewValues(prev => ({ ...prev, filename: e.target.value }))}
              autoFocus
              style={{ marginRight: 8 }}
            />
            <Button onClick={handleSave} color="green" size="xs">Save</Button>
            <Button onClick={handleCancel} color="gray" size="xs">Cancel</Button>
          </Group>
        ) : (
          <Group align="center">
            <span>{file.filename}</span>
            <Tooltip label="Edit Name">
              <Button color="gray" onClick={() => handleEditClick(file.id, 'filename', file.filename)} variant="subtle" size="xs">
                <IconPencil size={20} />
              </Button>
            </Tooltip>
          </Group>
        )}
      </Table.Td>
      <Table.Td hidden={!visibleColumns.channel} className={styles.propCell}>
        {editing.id === file.id && editing.field === 'channel' ? (
          <Group align="center">
            <TextInput
              value={newValues.channel}
              onChange={(e) => setNewValues(prev => ({ ...prev, channel: e.target.value }))}
              autoFocus
              style={{ marginRight: 8 }}
            />
            <Button onClick={handleSave} color="green" size="xs">Save</Button>
            <Button onClick={handleCancel} color="gray" size="xs">Cancel</Button>
          </Group>
        ) : (
          <Group align="center">
            <span>{file.channel}</span>
            <Tooltip label="Edit Channel">
              <Button color="gray" onClick={() => handleEditClick(file.id, 'channel', file.channel)} variant="subtle" size="xs">
                <IconPencil size={20} />
              </Button>
            </Tooltip>
          </Group>
        )}
      </Table.Td>
      <Table.Td hidden={!visibleColumns.actions} className={styles.fileCell}>
        {file.is_preprocessed ? (
          <IconCircleCheck className={styles.iconCheck} />
        ) : (
          <IconCircleX className={styles.iconX} />
        )}
      </Table.Td>
      <Table.Td hidden={!visibleColumns.actions} className={styles.fileCell}>{parseFormatDateTime(file.uploaded_at)}</Table.Td>
      <Table.Td hidden={!visibleColumns.actions} className={styles.fileCell}>{JSON.stringify(file.metadata)}</Table.Td>
      <Table.Td hidden={!visibleColumns.actions} className={styles.actionCell}>
        <Box className={styles.actionGroup}>
          {!file.is_preprocessed && (
            <PreprocessModal
              parent_ids={new Set([file.id])}
              setTicketID={setTicketID}
              setIsPolling={setIsPolling}
            />
          )}
          <Tooltip label="Delete File">
            <Button color="red" onClick={() => handleDelete(file.id)} variant="subtle" size="xs">
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
        <Text className={styles.filesHeader}>Uploaded Files ({files.length})</Text>
        <VisibilityMenu visibleColumns={visibleColumns} handleVisibilityChange={handleColumnVisibilityChange} />
      </Group>
      <Table.ScrollContainer minWidth={400}>
        <Table className={styles.table}>
          <Table.Thead className={styles.thead}>
            <Table.Tr className={styles.tr}>
              <Table.Th className={styles.fileHeader}>
                <Checkbox
                  onChange={toggleAll}
                  checked={selectedFiles.size === files.length}
                  indeterminate={selectedFiles.size > 0 && selectedFiles.size !== files.length}
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
