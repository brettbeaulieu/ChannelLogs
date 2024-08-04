import styles from "./page.module.css";
import { LinksGroup, NavbarNested, UserButton, Logo } from "../../../../components";
import { initiallyOpenedStates } from '../opened_states';
import { AreaChart } from "@mantine/charts";

export default function Page() {
  return (
    <main className={styles.main}>
      <div className={styles.navbar}>
        <NavbarNested initiallyOpenedStates={initiallyOpenedStates}></NavbarNested>
      </div>
      <div className={styles.grid}>
        <AreaChart
          h={300}
          data={[]}
          dataKey="date"
          series={[]}
          curveType="linear"
        ></AreaChart>
      </div>
    </main>
  );
}