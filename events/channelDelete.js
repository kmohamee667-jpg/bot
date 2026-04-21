import { ChannelType } from 'discord.js';
import { getTicketByChannelId, updateTicketStatus } from '../ticket/database.js';

export default (channel) => {
    if (channel.type !== ChannelType.GuildText || !channel.name.startsWith('ticket-')) return;
    
    console.log(`🗑️ Auto-cleaning ticket channel delete: ${channel.id}`);
    
    getTicketByChannelId(channel.id).then(ticket => {
        if (ticket) {
            updateTicketStatus(channel.id, 'closed', null, { reason: 'channel deleted externally' }).then(() => {
                console.log(`✅ Stale ticket closed: ${ticket.ticketId}`);
            }).catch(err => console.error('DB error on channelDelete:', err));
        }
    }).catch(err => console.error('Ticket lookup failed on channelDelete:', err));
};
