import { Stack, UnstyledButton } from "@mantine/core";
import styles from './Navbar.module.css';
import { ThemeToggle } from "@/components";

export function Navbar() {


    return (
        <>
        <Stack>
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
      </Stack>
      <ThemeToggle />
      </>)

}