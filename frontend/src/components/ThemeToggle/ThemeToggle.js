// components/ThemeToggle.js
import React from 'react';
import { SegmentedControl, useMantineColorScheme, Center, rem } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';
import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
    // State to hold the current theme
    const { colorScheme, setColorScheme } = useMantineColorScheme();

    return (
        <SegmentedControl
            classNames={{
                indicator: styles.indicator,
                root: styles.theme_toggle,
                label: styles.label,
                innerLabel: styles.innerLabel
            }}
            onChange={setColorScheme}
            value={colorScheme}
            data={[
                {
                    label: (<Center className={styles.icon_link_group}>
                        <IconSun className={styles.icon} />
                        <span>Light</span>
                    </Center>), value: 'light'
                },
                {
                    label: (<Center className={styles.icon_link_group}>
                        <IconMoon className={styles.icon} />
                        <span>Dark</span>
                    </Center>), value: 'dark'
                }
            ]}
        />
    );
}


