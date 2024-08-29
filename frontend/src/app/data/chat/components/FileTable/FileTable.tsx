import cx from 'clsx';
import { Table, Button, TextInput, Group, Tooltip, Box, Drawer, Text, Checkbox } from '@mantine/core';
import { IconPencil, IconTrash, IconCircleCheck, IconCircleX } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { deleteData, parseFormatDateTime, patchData } from '@/api/apiHelpers';
import styles from './FileTable.module.css';
import { PreprocessModal } from './components';
import { VisibilityMenu } from './components';


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
  fetchFiles: any;
  setTicketID: any;
  setIsPolling: any;
}

export function FileTable({ files, fetchFiles, setTicketID, setIsPolling }: FileTableProps) {
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingChannelFileID, setEditingChannelFileID] = useState<string | null>(null);
  const [newFileName, setNewFilename] = useState<string>('');
  const [newChannel, setNewChannel] = useState<string>('');
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

  useEffect(() => {
    setDrawerOpened(selectedFiles.size > 0);
  }, [selectedFiles]);


  const handleEditFilenameClick = (fileId: string, filename: string) => {
    setEditingFileId(fileId);
    setNewFilename(filename);
  };

  const handleEditChannelClick = (fileId: string, name: string) => {
    setEditingChannelFileID(fileId);
    setNewChannel(name);
  }


  const handleSaveFilename = async (fileId: string) => {
    if (newFileName && newFileName !== files.find(file => file.id === fileId)?.filename) {
      try {
        const formData = new FormData();
        formData.append('filename', newFileName);
        const response = await patchData(`chat/files/${fileId}/`, formData);
        if (!response.ok) {
          throw new Error(`Failed to edit file ${fileId}: ${response.status}`);
        }
        await fetchFiles();
      } catch (error) {
        console.error(`Error editing file ${fileId}:`, error);
      }
    }
    setEditingFileId(null);
    setNewFilename('');
  };

  const handleSaveChannel = async (fileId: string) => {
    if (newChannel) {
      try {
        const formData = new FormData();
        formData.append('channel', newChannel);
        const response = await patchData(`chat/files/${fileId}/`, formData);
        if (!response.ok) {
          throw new Error(`Failed to edit file ${fileId}: ${response.status}`);
        }
        await fetchFiles();
      } catch (error) {
        console.error(`Error editing file ${fileId}:`, error);
      }
    }
    setEditingChannelFileID(null);
    setNewFilename('');
  };



  const handleCancelFilename = () => {
    setEditingFileId(null);
    setNewFilename('');
  };

  const handleCancelChannel = () => {
    setEditingChannelFileID(null);
    setNewFilename('');
  };

  const handleColumnVisibilityChange = (column: string, isVisible: boolean) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: isVisible,
    }));
  };

  const handleSelectChange = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(fileId)) {
        newSelection.delete(fileId);
      } else {
        newSelection.add(fileId);
      }
      return newSelection;
    });
  };

  const handleBulkPreprocess = () => {
    //onBulkPreprocess(Array.from(selectedFiles));
    setSelectedFiles(new Set());
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    try {
      await deleteData(`chat/files/${fileId}/`);
      await fetchFiles();
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error);
    }
  };

  const handleBulkDelete = () => {
    //onBulkDelete(Array.from(selectedFiles));
    setSelectedFiles(new Set());
  };

  const toggleAll = () => {
    setSelectedFiles(selectedFiles.size == 0 ? new Set(files.map((item) => item.id)) : new Set());
  };


  const rows = files.map(file => (
    <Table.Tr key={file.id} className={cx({ [styles.rowSelected]: selectedFiles.has(file.id) })}>
      {
        <Table.Td>
          <Checkbox
            checked={selectedFiles.has(file.id)}
            onChange={() => handleSelectChange(file.id)}
          />
        </Table.Td>
      }
      {visibleColumns.filename && (
        <Table.Td className={styles.fileCell}>
          {editingFileId === file.id ? (
            <Group align="center">
              <TextInput
                value={newFileName}
                onChange={(e) => setNewFilename(e.target.value)}
                onBlur={() => handleCancelFilename}
                autoFocus
                style={{ marginRight: 8 }}
              />
              <Button onClick={() => handleSaveFilename(file.id)} color="green" size="xs">
                Save
              </Button>
              <Button onClick={handleCancelFilename} color="gray" size="xs">
                Cancel
              </Button>
            </Group>
          ) : (
            <Group align="center">
              <span>{file.filename}</span>
              <Tooltip label="Edit Name">
                <Button color="gray" onClick={() => handleEditFilenameClick(file.id, file.filename)} variant="subtle" size="xs">
                  <IconPencil size={16} />
                </Button>
              </Tooltip>
            </Group>
          )}
        </Table.Td>
      )}
      {visibleColumns.channel && (
        <Table.Td className={styles.propCell}>
          {editingChannelFileID === file.id ? (
            <Group align="center">
              <TextInput
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                onBlur={() => handleCancelChannel}
                autoFocus
                style={{ marginRight: 8 }}
              />
              <Button onClick={() => handleSaveChannel(file.id)} color="green" size="xs">
                Save
              </Button>
              <Button onClick={handleCancelChannel} color="gray" size="xs">
                Cancel
              </Button>
            </Group>
          ) : (
            <Group align="center">
              <span>{file.channel}</span>
              <Tooltip label="Edit Name">
                <Button color="gray" onClick={() => handleEditChannelClick(file.id, file.channel)} variant="subtle" size="xs">
                  <IconPencil size={16} />
                </Button>
              </Tooltip>
            </Group>
          )}
        </Table.Td>
      )}
      {visibleColumns.is_preprocessed && (
        <Table.Td className={styles.propCell}>
          {file.is_preprocessed ? (
            <IconCircleCheck className={styles.iconCheck} />
          ) : (
            <IconCircleX className={styles.iconX} />
          )}
        </Table.Td>
      )}
      {visibleColumns.uploaded_at && (
        <Table.Td className={styles.propCell}>{parseFormatDateTime(file.uploaded_at)}</Table.Td>
      )}
      {visibleColumns.metadata && (
        <Table.Td className={styles.propCell}>{JSON.stringify(file.metadata)}</Table.Td>
      )}
      {visibleColumns.actions && (
        <Table.Td className={styles.actionCell}>
          <Box className={styles.actionGroup}>
            {file.is_preprocessed ? null : (
              <PreprocessModal parent_ids={new Set<string>([file.id])} setTicketID={setTicketID} setIsPolling={setIsPolling} />
            )}
            <Tooltip label="Delete File">
              <Button color="red" onClick={() => handleDelete(file.id, file.filename)} variant="subtle" size="xs">
                <IconTrash size={20} />
              </Button>
            </Tooltip>
          </Box>
        </Table.Td>
      )}
    </Table.Tr>
  ));

  return (
    <Box style={{ position: 'relative' }}>
      <Group mb="md">
        <VisibilityMenu visibleColumns={visibleColumns} handleVisibilityChange={handleColumnVisibilityChange} />
      </Group>
      <Table.ScrollContainer minWidth={400}>
        <Table className={styles.table}>
          <Table.Thead className={styles.thead}>
            <Table.Tr className={styles.tr}>
              {<Table.Th className={styles.fileHeader}>
                <Checkbox
                  onChange={toggleAll}
                  checked={selectedFiles.size === files.length}
                  indeterminate={selectedFiles.size > 0 && selectedFiles.size !== files.length}
                /></Table.Th>}
              {visibleColumns.filename && <Table.Th className={styles.fileHeader}>File Name</Table.Th>}
              {visibleColumns.channel && <Table.Th className={styles.fileHeader}>Channel</Table.Th>}
              {visibleColumns.is_preprocessed && <Table.Th className={styles.actionHeader}>Preprocessed</Table.Th>}
              {visibleColumns.uploaded_at && <Table.Th className={styles.actionHeader}>Upload Date</Table.Th>}
              {visibleColumns.metadata && <Table.Th className={styles.actionHeader}>Metadata</Table.Th>}
              {visibleColumns.actions && <Table.Th className={styles.actionHeader}>Actions</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody className={styles.tbody}>{rows}</Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {/* Sliding Drawer for Bulk Actions */}
      <Drawer
        trapFocus={false}
        lockScroll={false}
        zIndex={1}
        closeOnClickOutside={false}
        opened={drawerOpened}
        size={'10rem'}
        withinPortal={false}
        onClose={() => setDrawerOpened(false)}
        classNames={{ 'root': styles.drawer, 'overlay': styles.drawer_root }}
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
        {/* Add visual progress indication here if needed */}
      </Drawer>
    </Box>
  );
}
