// components/NavbarNested.js
import { ScrollArea } from '@mantine/core';
import { IconMessage, IconAdjustments, IconDatabaseCog } from '@tabler/icons-react';
import { LinksGroup } from '@/components';
import { ThemeToggle } from '@/components';
import classes from './NavbarNested.module.css';

const fixedData = [
  {
    label: 'Chat',
    icon: IconMessage,
    links: [
      { label: 'Dashboard', link: '/analytics/chat/dashboard' }
    ]
  },
  {
    label: 'Data',
    icon: IconDatabaseCog,
    links: [
      { label: 'Chat', link: '/data/chat' },
      { label: 'Emotes', link: '/data/emotes' }
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


export function NavbarNested() {
  const data = fixedData.map((item) => ({
    ...item,
  }));

  const links = data.map((item) => <LinksGroup {...item} key={item.label} />);


  return (
    <>
      <nav className={classes.desktopNavbar}>
        <ScrollArea className={classes.links}>
          <div className={classes.linksInner}>{links}</div>
        </ScrollArea>
        <ThemeToggle />
      </nav>
    </>
  );
}
