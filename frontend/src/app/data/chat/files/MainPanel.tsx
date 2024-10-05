// pages/page.js


import { Accordion, Paper } from '@mantine/core'
import { FileCol } from './components/FileCol/FileCol'
import { EmoteSetCol } from './components/EmoteSetCol/EmoteSetCol'
import { IconFile, IconMoodSmile } from '@tabler/icons-react'

export default function MainPanel() {
  return (
    <Paper withBorder shadow='md'>
      <Accordion multiple defaultValue={['files', 'emoteSets']}>
        <Accordion.Item value="files">
          <Accordion.Control icon={<IconFile />}>Chat Files</Accordion.Control>
          <Accordion.Panel>{<FileCol />}</Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="emoteSets">
          <Accordion.Control icon={<IconMoodSmile />}>Emote Sets</Accordion.Control>
          <Accordion.Panel>{<EmoteSetCol />}</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Paper>
  )
}
