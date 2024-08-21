import { Button, Paper, Stack, Text, TextInput } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import styles from './RustlogImport.module.css';

export function RustlogImport() {
    return (
        <Paper className={styles.inner_paper}>
            <Stack className={styles.inner_paper_stack}>
                <Text className={styles.centered_header}>
                    Import From Rustlog API
                </Text>
                <TextInput
                    label={"Repository"}
                />
                <TextInput
                    label={"Channel Name"}
                />
                <DatePickerInput
                    label={"Time Range"}
                    type={'range'}
                />
                <Button>
                    Submit
                </Button>
            </Stack>
        </Paper>)
};