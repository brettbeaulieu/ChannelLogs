import { getData, postData } from "@/api/apiHelpers";
import { Accordion, Checkbox, Combobox, Input, InputBase, Loader, NumberInput, Stack, useCombobox, Text, Modal, Button, Tooltip, Select } from "@mantine/core";
import { useState } from "react";
import styles from './PreprocessModal.module.css';
import { useDisclosure } from "@mantine/hooks";
import { IconScanEye } from "@tabler/icons-react";

export interface EmoteSetData {
    id: number;
    name: string;
    set_id: string;
    counts: Record<string, any>;
}

export interface PreprocessModalProps {
    parent_ids: Set<string>;
}



export function PreprocessModal({ parent_ids: _parent_ids }: PreprocessModalProps) {
    const [useEmotes, setUseEmotes] = useState<boolean | undefined>(false);
    const [filterEmotes, setFilterEmotes] = useState(false);
    const [minWords, setMinWords] = useState<string | number>(1);
    const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
    const [selectedSet, setSelectedSet] = useState<string | null>(null);
    const [comboBoxLoading, setComboBoxLoading] = useState(false);
    const [emoteSets, setEmoteSets] = useState<EmoteSetData[]>([]);
    const [opened, { open, close }] = useDisclosure(false);
    const parent_ids = _parent_ids;

    console.log(`Parent IDs: ${Array.from(parent_ids)}`);

    const getEmoteSets = async () => {
        const response = await getData('chat/emote-sets');
        const data: EmoteSetData[] = await response.json();
        return data;
    }

    const combobox_logic = useCombobox({
        onDropdownClose: () => combobox_logic.resetSelectedOption(),
        onDropdownOpen: () => {
            if (emoteSets.length === 0 && !comboBoxLoading) {
                setComboBoxLoading(true);
                getEmoteSets().then((response) => {
                    setEmoteSets(response);
                    setComboBoxLoading(false);
                    combobox_logic.resetSelectedOption();
                });
            }
        },
    });

    const handleSubmit = async () => {
        const formData = new FormData;
        formData.append('parent_ids', JSON.stringify(Array.from(parent_ids)));
        formData.append('format', selectedFormat ? selectedFormat : '');
        formData.append('useEmotes', useEmotes ? 'true' : 'false');
        if (useEmotes && selectedSet) {
            formData.append('emote-set', selectedSet.toString());
            formData.append('filter_emotes', filterEmotes.toString());
        }
        formData.append('minWords', minWords.toString());
        await postData(`chat/files/preprocess/`, formData);
    }

    const combobox_options = emoteSets.map((item) => (
        <Combobox.Option value={item.name} key={item.id}>
            {item.name}
        </Combobox.Option>
    ));

    const isSubmitDisabled = !selectedFormat || (useEmotes && !selectedSet);

    return (
        <>
            <Modal.Root opened={opened} onClose={close} centered>
                <Modal.Overlay />
                <Modal.Content>
                    <Modal.Header>
                        <Modal.Title><Text size="xl">Preprocess File(s)</Text></Modal.Title>
                        <Modal.CloseButton />
                    </Modal.Header>
                    <Modal.Body>
                        <Stack>
                            <Accordion multiple>
                                <Accordion.Item key='format' value='format'>
                                    <Accordion.Control>{<Text size="xl">Format</Text>}</Accordion.Control>
                                    <Accordion.Panel className={styles.accordion_panel}>
                                        <Select label="Log Format" data={["Chatterino", "Rustlog"]} value={selectedFormat} onChange={(value) => setSelectedFormat(value)} />
                                    </Accordion.Panel>
                                </Accordion.Item>
                                <Accordion.Item key='emote' value='emote'>
                                    <Accordion.Control>{<Text size="xl">Emotes</Text>
                                    }</Accordion.Control>
                                    <Accordion.Panel className={styles.accordion_panel}>
                                        <Stack>
                                            <Checkbox label={"Use Emotes"} checked={useEmotes}
                                                onChange={(event) => setUseEmotes(event.currentTarget.checked)} />
                                            <Text c={useEmotes ? ("") : ("dimmed")}>Emote Set</Text>
                                            <Combobox
                                                disabled={!useEmotes}
                                                store={combobox_logic}
                                                withinPortal={false}
                                                onOptionSubmit={(val) => {
                                                    setSelectedSet(val);
                                                    combobox_logic.closeDropdown();
                                                }}
                                            >
                                                <Combobox.Target>
                                                    <InputBase
                                                        component="button"
                                                        type="button"
                                                        pointer
                                                        rightSection={comboBoxLoading ? <Loader size={18} /> : <Combobox.Chevron />}
                                                        onClick={() => combobox_logic.toggleDropdown()}
                                                        rightSectionPointerEvents="none"
                                                    >
                                                        {selectedSet || <Input.Placeholder>Pick value</Input.Placeholder>}
                                                    </InputBase>
                                                </Combobox.Target>

                                                <Combobox.Dropdown>
                                                    <Combobox.Options>
                                                        {comboBoxLoading ? <Combobox.Empty>Loading....</Combobox.Empty> : combobox_options}
                                                    </Combobox.Options>
                                                </Combobox.Dropdown>
                                            </Combobox>
                                            <Checkbox disabled={!useEmotes}
                                                label={'Filter Emotes for Sentiment Analysis'}
                                                value={filterEmotes.toString()}
                                                onChange={(event) => setFilterEmotes(event.currentTarget.checked)} />
                                        </Stack>
                                    </Accordion.Panel>
                                </Accordion.Item>
                                <Accordion.Item key='misc' value='misc'>
                                    <Accordion.Control>{<Text size="xl">Misc</Text>}</Accordion.Control>
                                    <Accordion.Panel className={styles.accordion_panel}>
                                        <NumberInput label="Minimum Words" value={minWords} onChange={setMinWords} />
                                    </Accordion.Panel>
                                </Accordion.Item>
                            </Accordion>
                            <Tooltip label={isSubmitDisabled ? ("Choose a format first.") : ("Submit to Queue")}>
                                <Button disabled={isSubmitDisabled} onClick={handleSubmit}>Submit</Button>
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