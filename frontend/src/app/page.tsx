import styles from "./page.module.css";
import { NavbarNested } from "@/components";
import { initiallyOpenedStates } from "./opened_states"

export default function Page() {
  return (
    <main className={styles.main}>
      <div className={styles.navbar}>
        <NavbarNested initiallyOpenedStates={initiallyOpenedStates}></NavbarNested>
      </div>
      <div className={styles.grid}>
        Welcome to the home page.
      </div>
    </main>
  );
}
