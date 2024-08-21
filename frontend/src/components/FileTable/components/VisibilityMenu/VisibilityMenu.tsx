import { Menu, Button, Group, Switch, Text } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { useState } from "react";

export interface VisibilityMenuProps {
    visibleColumns: Record<any, boolean>;
    handleVisibilityChange: Function;
}




export function VisibilityMenu({ visibleColumns, handleVisibilityChange }: VisibilityMenuProps) {

    return (<Menu>
        <Menu.Target>
            <Button color="gray" variant="subtle">
                <IconSettings size={16} />
            </Button>
        </Menu.Target>
        <Menu.Dropdown>
            <Menu.Item>
                <Group>
                    <Switch
                        checked={visibleColumns.filename}
                        onChange={(e) => handleVisibilityChange('filename', e.currentTarget.checked)}
                    />
                    <Text>File Name</Text>
                </Group>
            </Menu.Item>
            <Menu.Item>
                <Group>
                    <Switch
                        checked={visibleColumns.is_preprocessed}
                        onChange={(e) => handleVisibilityChange('is_preprocessed', e.currentTarget.checked)}
                    />
                    <Text>Preprocessed</Text>
                </Group>
            </Menu.Item>
            <Menu.Item>
                <Group>
                    <Switch
                        checked={visibleColumns.uploaded_at}
                        onChange={(e) => handleVisibilityChange('uploaded_at', e.currentTarget.checked)}
                    />
                    <Text>Upload Date</Text>
                </Group>
            </Menu.Item>
            <Menu.Item>
                <Group>
                    <Switch
                        checked={visibleColumns.metadata}
                        onChange={(e) => handleVisibilityChange('metadata', e.currentTarget.checked)}
                    />
                    <Text>Metadata</Text>
                </Group>
            </Menu.Item>
            <Menu.Item>
                <Group>
                    <Switch
                        checked={visibleColumns.actions}
                        onChange={(e) => handleVisibilityChange('actions', e.currentTarget.checked)}
                    />
                    <Text>Actions</Text>
                </Group>
            </Menu.Item>
        </Menu.Dropdown>
    </Menu>)
}

