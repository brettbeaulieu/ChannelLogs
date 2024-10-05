import { Channel } from "@/api"
import { DateMenu } from "@/components"
import { Paper, Select } from "@mantine/core"
import styles from './ChannelDateGroup.module.css'

type SetStateAction<T> = React.Dispatch<React.SetStateAction<T>>

interface ChannelDateGroupProps {
    channel: Channel | undefined
    setChannel: SetStateAction<Channel | undefined>

    channelList: Channel[]

    dateRange: [Date | null, Date | null]
    setDateRange: SetStateAction<[Date | null, Date | null]>
}


export function ChannelDateGroup({ channel, setChannel, channelList, dateRange, setDateRange }: ChannelDateGroupProps) {
    const handleChannelOnChange = (newName: string | null): void => {
        if (newName) {
            const obj = channelList.find((x) => x.name == newName)
            setChannel(obj)
        }
    }
    return (
        <Paper withBorder className={styles.paper} shadow="md">

                <Select
                    classNames={{input: styles.select, dropdown: styles.select}}
                    data={channelList.map((elem: Channel) => elem.name)}
                    value={channel ? channel.name : ''}
                    placeholder="Select a channel"
                    onChange={handleChannelOnChange}
                    searchable
                />
                <DateMenu dateRange={dateRange} dateChange={setDateRange} />

        </Paper>
    )
}
