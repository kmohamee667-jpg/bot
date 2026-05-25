import config from '../config/config.js';
import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { generateWelcomeGif } from './welcomeGif.js';

export const updateLastWelcomeMessage = async (client) => {
    try {
        const welcomeChannelId = config.welcomeChannel;
        const channel = client.channels.cache.get(welcomeChannelId);
        if (!channel) return;

        // Fetch last few messages to find the most recent welcome message
        const messages = await channel.messages.fetch({ limit: 5 });
        
        // Find a message from the bot that mentions a user, has an embed, but NO attachments yet
        const lastWelcomeMsg = messages.find(m => 
            m.author.id === client.user.id && 
            m.content.match(/<@!?(\d+)>/) && 
            m.embeds.length > 0 && 
            m.attachments.size === 0
        );

        if (!lastWelcomeMsg) {
            console.log('✅ [Welcome Updater] All recent welcome messages are up to date.');
            return;
        }

        const match = lastWelcomeMsg.content.match(/<@!?(\d+)>/);
        if (!match) return;
        
        const userId = match[1];
        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) return;

        console.log(`🔄 [Welcome Updater] Adding animated GIF to last welcome message for: ${user.username}...`);
        
        const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
        const gifBuffer = await generateWelcomeGif(user.username, avatarUrl);
        const attachment = new AttachmentBuilder(gifBuffer, { name: 'welcome.gif' });

        const embed = EmbedBuilder.from(lastWelcomeMsg.embeds[0]).setImage('attachment://welcome.gif');

        await lastWelcomeMsg.edit({ embeds: [embed], files: [attachment] });
        console.log('✅ [Welcome Updater] Successfully updated last welcome message!');
        
    } catch (error) {
        console.error('❌ [Welcome Updater] Error:', error);
    }
};
