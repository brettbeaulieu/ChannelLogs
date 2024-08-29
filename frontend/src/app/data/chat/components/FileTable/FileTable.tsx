import cx from 'clsx';
import { Table, Button, TextInput, Group, Tooltip, Box, Drawer, Text, Checkbox, Modal } from '@mantine/core';
import { IconPencil, IconTrash, IconCircleCheck, IconCircleX, IconScanEye } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { parseFormatDateTime } from '@/api/apiHelpers';
import styles from './FileTable.module.css';
import { useDisclosure } from '@mantine/hooks';
import { PreprocessModal } from './components';
import { VisibilityMenu } from './components';


export interface FileData {
  id: string;
  file: string;
  filename: string;
  is_preprocessed: boolean;
  uploaded_at: string;
  metadata: Record<string, any>;
}

interface FileTableProps {
  files: FileData[];
  onDelete: (fileId: string, fileName: string) => void;
  onEdit: (fileId: string, newFileName: string) => void;
  onBulkPreprocess: (fileIds: string[]) => void;
  onBulkDelete: (fileIds: string[]) => void;
  setTicketID: any;
  setIsPolling: any;
}

export function FileTable({ files, onDelete, onEdit, onBulkPreprocess, onBulkDelete, setTicketID, setIsPolling }: FileTableProps) {
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState<string>('');
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    filename: true,
    is_preprocessed: true,
    uploaded_at: true,
    metadata: true,
    actions: true,
  });
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDrawerOpened(selectedFiles.size > 0);
  }, [selectedFiles]);


  const handleEditClick = (fileId: string, filename: string) => {
    setEditingFileId(fileId);
    setNewFileName(filename);
  };


  const handleSave = (fileId: string) => {
    if (newFileName && newFileName !== files.find(file => file.id === fileId)?.filename) {
      onEdit(fileId, newFileName);
    }
    setEditingFileId(null);
    setNewFileName('');
  };

  const handleCancel = () => {
    setEditingFileId(null);
    setNewFileName('');
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
    onBulkPreprocess(Array.from(selectedFiles));
    setSelectedFiles(new Set());
  };

  const handleBulkDelete = () => {
    onBulkDelete(Array.from(selectedFiles));
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
                onChange={(e) => setNewFileName(e.target.value)}
                onBlur={() => handleSave(file.id)}
                autoFocus
                style={{ marginRight: 8 }}
              />
              <Button onClick={() => handleSave(file.id)} color="green" size="xs">
                Save
              </Button>
              <Button onClick={handleCancel} color="gray" size="xs">
                Cancel
              </Button>
            </Group>
          ) : (
            <Group align="center">
              <span>{file.filename}</span>
              <Tooltip label="Edit Name">
                <Button color="gray" onClick={() => handleEditClick(file.id, file.filename)} variant="subtle" size="xs">
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
              <Button color="red" onClick={() => onDelete(file.id, file.filename)} variant="subtle" size="xs">
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
            {visibleColumns.is_preprocessed && <Table.Th className={styles.actionHeader}>Preprocessed</Table.Th>}
            {visibleColumns.uploaded_at && <Table.Th className={styles.actionHeader}>Upload Date</Table.Th>}
            {visibleColumns.metadata && <Table.Th className={styles.actionHeader}>Metadata</Table.Th>}
            {visibleColumns.actions && <Table.Th className={styles.actionHeader}>Actions</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody className={styles.tbody}>{rows}</Table.Tbody>
      </Table>

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
