import { Table, Button, TextInput, Group, Tooltip, Box } from '@mantine/core';
import { IconPencil, IconTrash, IconCircleCheck, IconCircleX, IconEdit, IconScanEye } from '@tabler/icons-react';
import { useState } from 'react';
import { parseFormatDateTime } from '@/api/apiHelpers';
import styles from './FileTable.module.css';

export interface FileData {
  id: string;
  file: string
  filename: string;
  is_preprocessed: boolean;
  uploaded_at: string;
  metadata: Record<string, any>;
}

interface FileTableProps {
  files: FileData[];
  onDelete: (fileId: string, fileName: string) => void;
  onEdit: (fileId: string, newFileName: string) => void;
  onPreprocess: (fileId: string) => void;
}

export function FileTable({ files, onDelete, onEdit, onPreprocess }: FileTableProps) {
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState<string>('');

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

  const rows = files.map(file => (
    <Table.Tr key={file.id}>
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
              <Button color="blue" onClick={() => handleEditClick(file.id, file.filename)} variant="subtle" size="xs">
                <IconPencil size={16} />
              </Button>
            </Tooltip>
          </Group>
        )}
      </Table.Td>
      <Table.Td className={styles.propCell}>
        {file.is_preprocessed ? (
          <IconCircleCheck className={styles.iconCheck} />
        ) : (
          <IconCircleX className={styles.iconX} />
        )}
      </Table.Td>
      <Table.Td className={styles.propCell}>{parseFormatDateTime(file.uploaded_at)}</Table.Td>
      <Table.Td className={styles.propCell}>{JSON.stringify(file.metadata)}</Table.Td>
      <Table.Td className={styles.actionCell}>
        <Box className={styles.actionGroup}>
          {file.is_preprocessed ? null : <Tooltip label="Preprocess File">
            <Button color="green" onClick={() => onPreprocess(file.id)} variant="subtle" size="xs">
              <IconScanEye size={20} />
            </Button>
          </Tooltip>
          }
          <Tooltip label="Edit File">
            <Button color="blue" onClick={() => { }} variant="subtle" size="xs">
              <IconEdit size={20} />
            </Button>
          </Tooltip>
          <Tooltip label="Delete File">
            <Button color="red" onClick={() => onDelete(file.id, file.filename)} variant="subtle" size="xs">
              <IconTrash size={20} />
            </Button>
          </Tooltip>
        </Box>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Table className={styles.table}>
      <Table.Thead className={styles.thead}>
        <Table.Tr className={styles.tr}>
          <Table.Th className={styles.fileHeader}>File Name</Table.Th>
          <Table.Th className={styles.actionHeader}>Preprocessed</Table.Th>
          <Table.Th className={styles.actionHeader}>Upload Date</Table.Th>
          <Table.Th className={styles.actionHeader}>Metadata</Table.Th>
          <Table.Th className={styles.actionHeader}>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody className={styles.tbody}>{rows}</Table.Tbody>
    </Table>
  );
}
