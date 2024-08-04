// components/NavbarNested.js
import { Group, Code, ScrollArea, rem } from '@mantine/core';
import { IconMessage, IconVideo, IconAdjustments, IconDatabaseCog } from '@tabler/icons-react';
import { LinksGroup } from '@/components';
import { ThemeToggle } from '@/components';
import { Logo } from '@/components';
import classes from './NavbarNested.module.css';

const fixedData = [
  {
    label: 'Chat',
    icon: IconMessage,
    links: [
      { label: 'Activity Analysis', link: '/analytics/chat/activity' },
      { label: 'Sentiment Analysis', link: '/analytics/chat/sentiment' },
      { label: 'Topic Clustering', link: '/analytics/chat/topic' },
      { label: 'Emote Usage', link: '/analytics/chat/emotes' },
    ]
  },
  {
    label: 'Stream',
    icon: IconVideo,
    links: [
      { label: 'TBD', link: '/' }
    ]
  },
  {
    label: 'Data',
    icon: IconDatabaseCog,
    links: [
      { label: 'Chat', link: '/data/chat' },
      { label: 'Stream', link: '/data/stream' },
    ]
  },
  {
    label: 'Settings',
    icon: IconAdjustments,
    links: [
      { label: 'General', link: '/settings/general' }
    ],
  },
];

interface NavbarNestedProps {
  initiallyOpenedStates: { [key: string]: boolean };
}

export function NavbarNested({ initiallyOpenedStates }: NavbarNestedProps) {
  const data = fixedData.map((item) => ({
    ...item,
    initiallyOpened: initiallyOpenedStates[item.label] || false,
  }));

  const links = data.map((item) => <LinksGroup {...item} key={item.label} />);

  return (
    <nav className={classes.navbar}>
      <div className={classes.header}>
        <Group justify="space-between">
          <Logo style={{ width: rem(120) }} />
          <Code fw={700}>v0.0.1</Code>
        </Group>
      </div>

      <ScrollArea className={classes.links}>
        <div className={classes.linksInner}>{links}</div>
      </ScrollArea>
      <ThemeToggle />
    </nav>
  );
}
