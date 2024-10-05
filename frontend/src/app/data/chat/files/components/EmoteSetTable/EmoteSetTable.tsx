import { Table, Button, TextInput, Group, Tooltip, Box, Paper, Text } from '@mantine/core'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import styles from './EmoteSetTable.module.css'
import Link from 'next/link'
import { deleteData, EmoteSet, patchData } from '@/api'


interface EmoteSetTableProps {
  emoteSets: EmoteSet[]
  fetchEmoteSets: () => Promise<void>;
}

export function EmoteSetTable({emoteSets, fetchEmoteSets}: EmoteSetTableProps) {

  const [editingRecordID, setEditingRecordID] = useState<number | null>(null)
  const [newName, setNewName] = useState<string>('')

  const handleEdit = async (fileId: number, newName: string) => {
    const formData = new FormData()
    formData.append('name', newName)

    await patchData(`chat/emotesets/${fileId}/`, formData)
    await fetchEmoteSets()
  }


  const handleDelete = async (fileId: number) => {
    await deleteData(`chat/emotesets/${fileId}/`)
    await fetchEmoteSets()
  }


  const handleEditClick = (fileId: number, filename: string) => {
    setEditingRecordID(fileId)
    setNewName(filename)
  }

  const handleSave = (recordID: number) => {
    if (
      newName &&
      newName !== emoteSets.find((file) => file.id === recordID)?.name
    ) {
      handleEdit(recordID, newName)
    }
    setEditingRecordID(null)
    setNewName('')
  }

  const handleCancel = () => {
    setEditingRecordID(null)
    setNewName('')
  }

  const rows = emoteSets.map((emoteSet) => (
    <Table.Tr key={emoteSet.id}>
      <Table.Td className={styles.fileCell}>
        {editingRecordID === emoteSet.id ? (
          <Group align="center">
            <TextInput
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => handleSave(emoteSet.id)}
              autoFocus
              style={{ marginRight: 8 }}
            />
            <Button
              onClick={() => handleSave(emoteSet.id)}
              color="green"
              size="xs"
            >
              Save
            </Button>
            <Button onClick={handleCancel} color="gray" size="xs">
              Cancel
            </Button>
          </Group>
        ) : (
          <Group align="center">
            <span>{emoteSet.name}</span>
            <Tooltip label="Edit Name">
              <Button
                color="gray"
                onClick={() => handleEditClick(emoteSet.id, emoteSet.name)}
                variant="subtle"
                size="xs"
              >
                <IconPencil size={16} />
              </Button>
            </Tooltip>
          </Group>
        )}
      </Table.Td>
      <Table.Td className={styles.fileCell}>
        <Link
          href={`https://7tv.app/emote-sets/${emoteSet.set_id}`}
        >{`https://7tv.app/emote-sets/${emoteSet.set_id}`}</Link>
      </Table.Td>
      <Table.Td className={styles.actionCell}>
        <Box className={styles.actionGroup}>
          <Tooltip label="Delete File">
            <Button
              color="red"
              onClick={() => handleDelete(emoteSet.id)}
              variant="subtle"
              size="xs"
            >
              <IconTrash size={20} />
            </Button>
          </Tooltip>
        </Box>
      </Table.Td>
    </Table.Tr>
  ))

  return (
    <Paper withBorder shadow="md" className={styles.mainPaper}>
      <Group>
        <Text size="lg" style={{ margin: '1rem' }}>
          Emote Sets ({emoteSets.length})
        </Text>
      </Group>
      <Table.ScrollContainer minWidth={400}>
        <Table className={styles.table}>
          <Table.Thead className={styles.thead}>
            <Table.Tr className={styles.tr}>
              <Table.Th className={styles.fileHeader}>Name</Table.Th>
              <Table.Th className={styles.fileHeader}>ID</Table.Th>
              <Table.Th className={styles.fileHeader}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody className={styles.tbody}>{rows}</Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  )
}
