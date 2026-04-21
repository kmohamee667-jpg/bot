import { EmbedBuilder, Colors } from 'discord.js';
import config from '../config/config.js';
import { createTicketRow } from './buttonsHandler.js';

export const initTicketSystem = async (client, config) => {
    try {
        const channel = client.channels.cache.get(config.ticketChannelId);
        if (!channel) {
            console.log('❌ Ticket channel not found:', config.ticketChannelId);
            return;
        }

        const messages = await channel.messages.fetch({ limit: 10 });
        const existingTicketMsg = messages.find(msg => 
            msg.embeds.length > 0 && 
            msg.embeds[0].title?.includes('عاوز تقدم شكوى') &&
            msg.components.length > 0
        );

        if (!existingTicketMsg) {
            const embed = new EmbedBuilder()
                .setTitle('🎫 عاوز تقدم شكوى؟')
                .setColor(Colors.Blurple)
                .setTimestamp();

            await channel.send({ 
                embeds: [embed], 
                components: [createTicketRow()] 
            });
            console.log('✅ Ticket system initialized - initial message sent');
        } else {
            console.log('✅ Ticket system already initialized');
        }
    } catch (error) {
        console.error('❌ Ticket system init failed:', error);
    }
};

