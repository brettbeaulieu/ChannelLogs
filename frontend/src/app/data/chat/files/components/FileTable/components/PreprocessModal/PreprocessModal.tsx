import { getData, postData } from '@/api/apiHelpers'
import {
  Accordion,
  Checkbox,
  Combobox,
  Input,
  InputBase,
  Loader,
  NumberInput,
  Stack,
  useCombobox,
  Text,
  Modal,
  Button,
  Tooltip,
  Select,
} from '@mantine/core'
import { useState } from 'react'
import styles from './PreprocessModal.module.css'
import { useDisclosure } from '@mantine/hooks'
import { IconScanEye } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { EmoteSet } from '@/api'

export interface PreprocessModalProps {
  parent_ids: Set<number>
  ticketIDs: string[]
  setTicketIDs: (ticketIDs: string[]) => void
  setIsPolling: (isPolling: boolean) => void
}

export function PreprocessModal({
  parent_ids: _parent_ids,
  ticketIDs,
  setTicketIDs,
  setIsPolling,
}: PreprocessModalProps) {
  const [useEmotes, setUseEmotes] = useState<boolean | undefined>(false)
  const [useSentiment, setUseSentiment] = useState<boolean | undefined>(false)
  const [filterEmotes, setFilterEmotes] = useState<boolean | undefined>(false)
  const [minWords, setMinWords] = useState<string | number>(1)
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [selectedSet, setSelectedSet] = useState<string | null>(null)
  const [comboBoxLoading, setComboBoxLoading] = useState(false)
  const [emoteSets, setEmoteSets] = useState<EmoteSet[]>([])
  const [opened, { open, close }] = useDisclosure(false)
  const parent_ids = _parent_ids

  const getEmoteSets = async () => {
    const response = await getData('chat/emotesets')
    const data = await response.json()
    return data
  }

  const combobox_logic = useCombobox({
    onDropdownClose: () => combobox_logic.resetSelectedOption(),
    onDropdownOpen: () => {
      if (emoteSets.length === 0 && !comboBoxLoading) {
        setComboBoxLoading(true)
        getEmoteSets().then((response) => {
          setEmoteSets(response)
          setComboBoxLoading(false)
          combobox_logic.resetSelectedOption()
        })
      }
    },
  })

  const handleSubmit = async () => {
    const formData = new FormData()
    formData.append('parentIds', JSON.stringify(Array.from(parent_ids)))
    formData.append('format', selectedFormat ? selectedFormat : '')
    formData.append('useSentiment', String(useSentiment))
    formData.append('useEmotes', String(useEmotes))
    formData.append('emoteSet', selectedSet ? selectedSet.toString() : '')
    formData.append('filterEmotes', String(useEmotes && filterEmotes))
    formData.append('minWords', minWords.toString())

    const response = await postData(`chat/files/preprocess/`, formData)
    if (response.status == 200) {
      const data = await response.json()
      setTicketIDs([...ticketIDs, data.ticket])
      setIsPolling(true)
      notifications.show({
        title: 'Preprocess Task Sent',
        message: `Ticket: ${data.ticket}`,
      })
      close()
    }
  }

  const combobox_options = emoteSets.map((item) => (
    <Combobox.Option value={item.name} key={item.id}>
      {item.name}
    </Combobox.Option>
  ))

  const isSubmitDisabled = !selectedFormat || (useEmotes && !selectedSet)

  return (
    <>
      <Modal.Root opened={opened} onClose={close} centered>
        <Modal.Overlay />
        <Modal.Content>
          <Modal.Header>
            <Modal.Title>
              <Text size="xl">Preprocess File(s)</Text>
            </Modal.Title>
            <Modal.CloseButton />
          </Modal.Header>
          <Modal.Body>
            <Stack>
              <Accordion multiple>
                <Accordion.Item key="format" value="format">
                  <Accordion.Control>
                    {<Text size="xl">Format</Text>}
                  </Accordion.Control>
                  <Accordion.Panel className={styles.accordion_panel}>
                    <Select
                      label="Log Format"
                      data={['Chatterino', 'Rustlog']}
                      value={selectedFormat}
                      onChange={(value) => setSelectedFormat(value)}
                    />
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item key="features" value="features">
                  <Accordion.Control>
                    {<Text size="xl">Features</Text>}
                  </Accordion.Control>
                  <Accordion.Panel className={styles.accordion_panel}>
                    <Stack>
                      <Checkbox
                        label={'Use Sentiment Analysis'}
                        checked={useSentiment}
                        onChange={(event) =>
                          setUseSentiment(event.currentTarget.checked)
                        }
                      />
                      <NumberInput
                        label="Minimum Words"
                        disabled={!useSentiment}
                        value={minWords}
                        onChange={setMinWords}
                      />

                      <Checkbox
                        label={'Use 7TV Emotes'}
                        checked={useEmotes}
                        onChange={(event) =>
                          setUseEmotes(event.currentTarget.checked)
                        }
                      />
                      <Text c={useEmotes ? '' : 'dimmed'}>Emote Set</Text>
                      <Combobox
                        disabled={!useEmotes}
                        store={combobox_logic}
                        withinPortal={false}
                        onOptionSubmit={(val) => {
                          setSelectedSet(val)
                          combobox_logic.closeDropdown()
                        }}
                      >
                        <Combobox.Target>
                          <InputBase
                            component="button"
                            type="button"
                            pointer
                            rightSection={
                              comboBoxLoading ? (
                                <Loader size={18} />
                              ) : (
                                <Combobox.Chevron />
                              )
                            }
                            onClick={() => combobox_logic.toggleDropdown()}
                            rightSectionPointerEvents="none"
                          >
                            {selectedSet || (
                              <Input.Placeholder>Pick value</Input.Placeholder>
                            )}
                          </InputBase>
                        </Combobox.Target>

                        <Combobox.Dropdown>
                          <Combobox.Options>
                            {comboBoxLoading ? (
                              <Combobox.Empty>Loading....</Combobox.Empty>
                            ) : (
                              combobox_options
                            )}
                          </Combobox.Options>
                        </Combobox.Dropdown>
                      </Combobox>
                      <Checkbox
                        disabled={!useEmotes || !useSentiment}
                        label={'Filter Emotes for Sentiment Analysis'}
                        checked={filterEmotes}
                        defaultChecked={false}
                        onChange={(event) =>
                          setFilterEmotes(event.currentTarget.checked)
                        }
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
              <Tooltip
                label={
                  isSubmitDisabled
                    ? 'Choose a format first.'
                    : 'Submit to Queue'
                }
              >
                <Button disabled={isSubmitDisabled} onClick={handleSubmit}>
                  Submit
                </Button>
              </Tooltip>
            </Stack>
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
      <Tooltip label="Preprocess">
        <Button onClick={open}>
          Preprocess
          <IconScanEye size={20} />
        </Button>
      </Tooltip>
    </>
  )
}
