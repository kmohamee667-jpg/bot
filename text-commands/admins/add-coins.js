import AdminCommand from '../../models/AdminCommand.js';
import Coin from '../../models/Coin.js';
import { EmbedBuilder, Colors } from 'discord.js';

export default async (message, args) => {
    // 1. Check Permissions
    const commandPerms = await AdminCommand.findOne({ command: 'coins_system' });
    const isAllowed = message.author.id === message.guild.ownerId || 
                      message.member.roles.cache.some(role => 
                          ['معلم', 'معلمه', 'OWNER'].includes(role.name) || 
                          (commandPerms && commandPerms.roles.includes(role.name))
                      );

    if (!isAllowed) return;

    // 2. Parse arguments: !add-coins @user <amount>
    const targetUser = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!targetUser || isNaN(amount)) {
        return message.reply('❌ الصيغة الصحيحة: `!add-coins @عضو <العدد>`');
    }

    try {
        // 3. Update Balance
        let coinData = await Coin.findOne({ guildId: message.guild.id, userId: targetUser.id });
        if (!coinData) {
            coinData = new Coin({ guildId: message.guild.id, userId: targetUser.id, balance: 0 });
        }
        
        coinData.balance += amount;
        await coinData.save();

        // 4. Response in Channel
        message.reply(`✅ تم إضافة **${amount}** كوين لـ <@${targetUser.id}> بنجاح.`);

        // 5. DM to User
        const dmEmbed = new EmbedBuilder()
            .setTitle('💰 Coins Received')
            .setDescription(`You have received **${amount}** coins from **${message.author.username}**.`)
            .addFields(
                { name: 'Sender', value: message.author.username, inline: true },
                { name: 'Amount Received', value: `${amount} coins`, inline: true },
                { name: 'Current Balance', value: `${coinData.balance} coins`, inline: false }
            )
            .setColor(Colors.Gold)
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp();
        
        await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});

        // 6. Log to 1496073653106905249
        const logChannel = message.guild.channels.cache.get('1496073653106905249');
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setAuthor({ name: `إضافة كوينات | ${targetUser.username}`, iconURL: message.author.displayAvatarURL() })
                .setColor(Colors.Green)
                .addFields(
                    { name: '👤 المستلم', value: `<@${targetUser.id}>`, inline: true },
                    { name: '👮 بواسطة', value: `<@${message.author.id}>`, inline: true },
                    { name: '💰 المبلغ', value: `+${amount} كوين`, inline: true },
                    { name: '📊 الرصيد الجديد', value: `${coinData.balance}`, inline: true }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }

    } catch (error) {
        console.error('Add coins error:', error);
        message.reply('❌ حدث خطأ أثناء إضافة الكوينات.');
    }
};
