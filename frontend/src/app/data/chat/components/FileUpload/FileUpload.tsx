import { Paper, Stack, Loader, Button, Text, Group } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import styles from './FileUpload.module.css';
import { useRef, useState } from "react";
import { postData } from "@/api/apiHelpers";

export interface FileUploadProps {
    fetchFiles: Function;
}

export function FileUpload({ fetchFiles }: FileUploadProps) {
    const openRef = useRef<() => void>(null);
    const [loading, setLoading] = useState(false);


    const handleDrop = async (files: File[]) => {
        setLoading(true);
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        const response = await postData('chat/files/', formData);
        await fetchFiles();
        setLoading(false);
    };


    return (
        <Paper className={styles.inner_paper} withBorder>
            <Stack className={styles.inner_paper_stack}>
                <Text className={styles.centered_header}>
                    Upload Files
                </Text>

                <Dropzone
                    openRef={openRef}
                    onDrop={handleDrop}
                    className={styles.file_upload}
                >
                    {loading ? <Loader /> : <Text size={"md"}>Drop files here or click to select</Text>}
                </Dropzone>
            </Stack>
        </Paper>
    )
};
