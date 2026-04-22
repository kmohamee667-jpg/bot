import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, AttachmentBuilder } from 'discord.js';
import MarketRole from '../models/MarketRole.js';
import { generateMarketImage } from './marketImage.js';

const MARKET_CHANNEL_ID = '1494164521038905401';

class MarketManager {
    
    async initMarket(client) {
        // Find the channel
        const channel = client.channels.cache.get(MARKET_CHANNEL_ID);
        if (!channel) {
            console.error('[MarketManager] Market channel not found!');
            return;
        }

        try {
            // Delete old bot messages
            const messages = await channel.messages.fetch({ limit: 20 });
            const botMessages = messages.filter(m => m.author.id === client.user.id);
            for (const msg of botMessages.values()) {
                await msg.delete().catch(() => {});
            }
        } catch (err) {
            console.error('[MarketManager] Failed to delete old messages', err);
        }

        const guildId = channel.guild.id;
        await this.updateMarket(client, guildId);
    }

    async updateMarket(client, guildId) {
        const channel = client.channels.cache.get(MARKET_CHANNEL_ID);
        if (!channel) return;

        const rolesInMarket = await MarketRole.find({ guildId });
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;
        
        // Prepare data for image
        const rolesData = [];
        const options = [];

        for (const mr of rolesInMarket) {
            const role = guild.roles.cache.get(mr.roleId);
            if (!role) {
                // If role was deleted from server, remove from market
                await MarketRole.deleteOne({ _id: mr._id });
                continue;
            }
            
            rolesData.push({
                name: role.name,
                color: role.hexColor,
                price: mr.price
            });

            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel(role.name)
                    .setDescription(`السعر: ${mr.price} كوين`)
                    .setValue(role.id)
                    .setEmoji('💎')
            );
        }

        const imageBuffer = await generateMarketImage(rolesData);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'market.png' });

        const embed = new EmbedBuilder()
            .setTitle('🛒 Role Market')
            .setDescription('>>> **أهلاً بك في سوق الرتب!**\nيمكنك شراء الرتب المميزة أدناه باستخدام الكوينات الخاصة بك.\n\nقم باختيار الرتبة التي ترغب بشرائها من القائمة المنسدلة.')
            .setColor('#2B2D31')
            .setImage('attachment://market.png')
            .setFooter({ text: 'Role Market System', iconURL: guild.iconURL() });

        const components = [];
        if (options.length > 0) {
            const select = new StringSelectMenuBuilder()
                .setCustomId('market_select_role')
                .setPlaceholder('اختر رتبة لشرائها...')
                .addOptions(options.slice(0, 25)); // Discord max 25
            
            components.push(new ActionRowBuilder().addComponents(select));
        } else {
             // To prevent crashing when no options, add a dummy disabled option or don't add the menu
             const emptySelect = new StringSelectMenuBuilder()
                .setCustomId('market_select_role')
                .setPlaceholder('السوق فارغ حالياً...')
                .addOptions(new StringSelectMenuOptionBuilder().setLabel('فارغ').setValue('empty'))
                .setDisabled(true);
             components.push(new ActionRowBuilder().addComponents(emptySelect));
        }

        try {
            // Check if there is an existing message by the bot
            const messages = await channel.messages.fetch({ limit: 10 });
            const botMsg = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].title === '🛒 Role Market');

            if (botMsg) {
                await botMsg.edit({ embeds: [embed], files: [attachment], components });
            } else {
                await channel.send({ embeds: [embed], files: [attachment], components });
            }
        } catch (err) {
            console.error('[MarketManager] Failed to send/edit market message', err);
        }
    }
}

export default new MarketManager();
