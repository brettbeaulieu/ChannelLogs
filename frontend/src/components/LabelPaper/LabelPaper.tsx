import { Text, Paper, Stack } from "@mantine/core"
import styles from './LabelPaper.module.css';
import { ReactElement } from "react";

interface LabelPaperProps {
    label: string
    main: ReactElement
}

export function LabelPaper({ label, main }: LabelPaperProps) {
    return (
        <Paper className={styles.paper}>
            <Stack>
                <Text className={styles.label}>{label}</Text>
                <div className={styles.main}>{main}</div>
            </Stack>

        </Paper>
    )
}