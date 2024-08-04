import styles from "./page.module.css";
import { NavbarNested } from "../../../components";
import { initiallyOpenedStates } from '../opened_states';
import { Dropzone, DropzoneProps, IMAGE_MIME_TYPE } from "@mantine/dropzone";

export default function Page() {
  return (
    <main className={styles.main}>
      <div className={styles.navbar}>
        <NavbarNested initiallyOpenedStates={initiallyOpenedStates}></NavbarNested>
      </div>
      <div className={styles.grid}>
        Welcome to the stream data upload page.
      </div>
    </main >
  );
}