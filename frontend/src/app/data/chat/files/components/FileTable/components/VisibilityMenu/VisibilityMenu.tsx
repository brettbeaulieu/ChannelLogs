import { Menu, Button, Group, Switch, Text, Tooltip } from '@mantine/core'
import { IconSettings } from '@tabler/icons-react'
import styles from './VisibilityMenu.module.css'

export interface VisibilityMenuProps {
  visibleColumns: Record<string, boolean>
  handleVisibilityChange: (column: string, isVisible: boolean) => void
}

export function VisibilityMenu({
  visibleColumns,
  handleVisibilityChange,
}: VisibilityMenuProps) {
  return (
    <Menu>
      <Menu.Target>
        <Tooltip label={'Set Visible Headers'}>
          <Button color="gray" variant="subtle" className={styles.button}>
            <IconSettings height={16} width={16} />
          </Button>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item>
          <Group>
            <Switch
              checked={visibleColumns.filename}
              onChange={(e) =>
                handleVisibilityChange('filename', e.currentTarget.checked)
              }
            />
            <Text>File Name</Text>
          </Group>
        </Menu.Item>
        <Menu.Item>
          <Group>
            <Switch
              checked={visibleColumns.channel}
              onChange={(e) =>
                handleVisibilityChange('channel', e.currentTarget.checked)
              }
            />
            <Text>Channel</Text>
          </Group>
        </Menu.Item>
        <Menu.Item>
          <Group>
            <Switch
              checked={visibleColumns.is_preprocessed}
              onChange={(e) =>
                handleVisibilityChange(
                  'is_preprocessed',
                  e.currentTarget.checked,
                )
              }
            />
            <Text>Preprocessed</Text>
          </Group>
        </Menu.Item>
        <Menu.Item>
          <Group>
            <Switch
              checked={visibleColumns.uploaded_at}
              onChange={(e) =>
                handleVisibilityChange('uploaded_at', e.currentTarget.checked)
              }
            />
            <Text>Upload Date</Text>
          </Group>
        </Menu.Item>
        <Menu.Item>
          <Group>
            <Switch
              checked={visibleColumns.metadata}
              onChange={(e) =>
                handleVisibilityChange('metadata', e.currentTarget.checked)
              }
            />
            <Text>Metadata</Text>
          </Group>
        </Menu.Item>
        <Menu.Item>
          <Group>
            <Switch
              checked={visibleColumns.actions}
              onChange={(e) =>
                handleVisibilityChange('actions', e.currentTarget.checked)
              }
            />
            <Text>Actions</Text>
          </Group>
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
