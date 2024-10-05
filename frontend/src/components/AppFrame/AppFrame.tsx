import { AppShell } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import styles from './AppFrame.module.css'
import { ReactElement } from 'react'
import { Header } from './components/Header/Header'
import { Navbar } from './components/Navbar/Navbar'

interface AppFrameProps {
  main: ReactElement
}

export function AppFrame({ main }: AppFrameProps) {
  const [opened, { toggle }] = useDisclosure()

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { desktop: true, mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header className={styles.header}>
        <Header opened={opened} toggle={toggle} />
      </AppShell.Header>

      <AppShell.Navbar
        py="lg"
        className={`${styles.navbar} ${opened ? styles.opened : styles.closed}`}
      >
        <Navbar />
      </AppShell.Navbar>

      <AppShell.Main>{main}</AppShell.Main>
    </AppShell>
  )
}
