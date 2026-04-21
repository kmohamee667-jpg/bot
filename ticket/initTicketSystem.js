import { EmbedBuilder, Colors } from 'discord.js';
import config from '../config/config.js';
import { createTicketRow } from './buttonsHandler.js';

export const initTicketSystem = async (client, config) => {
    console.log('🔄 [TICKET INIT] Starting...');
    try {
        const channel = await client.channels.fetch(config.ticketChannelId).catch(() => null);
        if (!channel) {
            console.error('❌ [TICKET INIT] Channel not found:', config.ticketChannelId);
            return;
        }
        console.log('✅ [TICKET INIT] Channel:', channel.name);

        // Clear old ticket messages
        const messages = await channel.messages.fetch({ limit: 50 });
        await Promise.all(
            messages.filter(msg => msg.author.id === client.user.id).map(msg => 
                msg.delete().catch(console.error)
            )
        );

        const embed = new EmbedBuilder()
            .setTitle('🎫 عاوز تتواصل مع الإداره ؟')
            .setColor('Blurple')
            .setTimestamp();

        const msg = await channel.send({ 
            embeds: [embed], 
            components: [createTicketRow()] 
        });

        console.log('✅ [TICKET INIT] Message sent ID:', msg.id);
        // Refresh components every 6 hours (Discord button limit)
        setInterval(async () => {
            try {
                const freshMsg = await channel.messages.fetch(msg.id);
                if (freshMsg.components.length === 0) {
                    await freshMsg.edit({ components: [createTicketRow()] });
                    console.log('🔄 [TICKET] Button refreshed');
                }
            } catch (e) {
                console.error('Button refresh failed:', e);
            }
        }, 6 * 60 * 60 * 1000); // 6 hours
    } catch (error) {
        console.error('❌ [TICKET INIT ERROR]:', error);
    }
};


