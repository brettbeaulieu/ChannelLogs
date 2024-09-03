import { AppShell, Burger, Group, Stack, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import styles from './AppFrame.module.css';
import { ReactElement } from 'react';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';

interface AppFrameProps {
  main: ReactElement;
}

export function AppFrame({ main }: AppFrameProps) {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { desktop: true, mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header className={styles.header}>
        <Group h="100%" w="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="md" />
          <Group visibleFrom="sm" justify="space-between" style={{ flex: 1 }}>
            <Group className={styles.headerGroup}>
              <Group>
                <UnstyledButton component='a' href='/analytics/chat/dashboard' className={styles.control}>Chat Dashboard</UnstyledButton>
                <UnstyledButton component='a' href='/analytics/chat/viewer' className={styles.control}>Chat Viewer</UnstyledButton>
                <UnstyledButton component='a' href='/data/chat/files' className={styles.control}>Chatlog Data</UnstyledButton>
                <UnstyledButton component='a' href='/data/chat/emotes' className={styles.control}>Emoteset Data</UnstyledButton>
                <UnstyledButton component='a' href='/data/channels' className={styles.control}>Channel Data</UnstyledButton>
              </Group>
              <ThemeToggle />
            </Group>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar py="lg" className={`${styles.navbar} ${opened ? styles.opened : styles.closed}`}>
        <Stack>
          <UnstyledButton component='a' href='/analytics/chat/dashboard' className={styles.control}>Chat Dashboard</UnstyledButton>
          <UnstyledButton component='a' href='/analytics/chat/viewer' className={styles.control}>Chat Viewer</UnstyledButton>
          <UnstyledButton component='a' href='/data/chat/files' className={styles.control}>Chatlog Data</UnstyledButton>
          <UnstyledButton component='a' href='/data/chat/emotes' className={styles.control}>Emoteset Data</UnstyledButton>
          <UnstyledButton component='a' href='/data/channels' className={styles.control}>Channel Data</UnstyledButton>
        </Stack>
        <ThemeToggle />
      </AppShell.Navbar>

      <AppShell.Main>
        {main}
      </AppShell.Main>
    </AppShell>
  );
}