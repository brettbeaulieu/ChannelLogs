import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import { Burger, Button, Group, HoverCard, UnstyledButton, Text } from "@mantine/core";
import styles from './Header.module.css';
import { IconChevronCompactDown, IconChevronDown } from "@tabler/icons-react";

interface HeaderProps {
    opened: boolean;
    toggle: () => void;
}


export function Header({ opened, toggle }: HeaderProps) {


    return (<Group h="100%" w="100%" px="md">
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="md" />
        <Group visibleFrom="sm" justify="space-between" style={{ flex: 1 }}>
            <Group className={styles.headerGroup}>
                <Group>

                    <Group justify="center">
                        <HoverCard width={280} shadow="md">
                            <HoverCard.Target>
                                <UnstyledButton className={styles.control}><Group>Chat <IconChevronDown /></Group></UnstyledButton>
                            </HoverCard.Target>
                            <HoverCard.Dropdown className={styles.hoverCard}>
                                <UnstyledButton
                                    component="a"
                                    href="/analytics/chat/dashboard"
                                    className={styles.control}
                                >
                                    Chat Dashboard
                                </UnstyledButton>
                                <UnstyledButton
                                    component="a"
                                    href="/analytics/chat/viewer"
                                    className={styles.control}
                                >
                                    Chat Viewer
                                </UnstyledButton>
                            </HoverCard.Dropdown>
                        </HoverCard>
                    </Group>

                    <Group justify="center">
                        <HoverCard width={280} shadow="md">
                            <HoverCard.Target>
                                <UnstyledButton className={styles.control}><Group>Upload Data <IconChevronDown /></Group></UnstyledButton>
                            </HoverCard.Target>
                            <HoverCard.Dropdown className={styles.hoverCard}>
                                <UnstyledButton
                                    component="a"
                                    href="/data/chat/files"
                                    className={styles.control}
                                >
                                    Chatlog Data
                                </UnstyledButton>
                                <UnstyledButton
                                    component="a"
                                    href="/data/channels"
                                    className={styles.control}
                                >
                                    Channel Data
                                </UnstyledButton>
                            </HoverCard.Dropdown>
                        </HoverCard>
                    </Group>
                </Group>
                <ThemeToggle />
            </Group>
        </Group>
    </Group>)
}