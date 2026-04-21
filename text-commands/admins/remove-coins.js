import AdminCommand from '../../models/AdminCommand.js';
import Coin from '../../models/Coin.js';
import { EmbedBuilder, Colors } from 'discord.js';

export default async (message, args) => {
    // 1. Check Permissions
    const commandPerms = await AdminCommand.findOne({ command: 'coins_system' });
    const isAllowed = message.author.id === message.guild.ownerId || 
                      message.member.roles.cache.some(role => 
                          ['معلم', 'معلمه', 'اونر'].includes(role.name) || 
                          (commandPerms && commandPerms.roles.includes(role.name))
                      );

    if (!isAllowed) return;

    // 2. Parse arguments: !remove-coins @user <amount>
    const targetUser = message.mentions.users.first();
    const amount = parseInt(args[1]);

    if (!targetUser || isNaN(amount)) {
        return message.reply('❌ الصيغة الصحيحة: `!remove-coins @عضو <العدد>`');
    }

    try {
        // 3. Update Balance
        let coinData = await Coin.findOne({ guildId: message.guild.id, userId: targetUser.id });
        if (!coinData || coinData.balance < amount) {
            return message.reply('❌ رصيد العضو لا يكفي للخصم.');
        }
        
        coinData.balance -= amount;
        await coinData.save();

        // 4. Response in Channel
        message.reply(`✅ تم خصم **${amount}** كوين من <@${targetUser.id}> بنجاح.`);

        // 5. Log to 1496073806442397787
        const logChannel = message.guild.channels.cache.get('1496073806442397787');
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setAuthor({ name: `خصم كوينات | ${targetUser.username}`, iconURL: message.author.displayAvatarURL() })
                .setColor(Colors.Red)
                .addFields(
                    { name: '👤 العضو', value: `<@${targetUser.id}>`, inline: true },
                    { name: '👮 بواسطة', value: `<@${message.author.id}>`, inline: true },
                    { name: '💰 المبلغ المخصوم', value: `-${amount} كوين`, inline: true },
                    { name: '📊 الرصيد الجديد', value: `${coinData.balance}`, inline: true }
                )
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }

    } catch (error) {
        console.error('Remove coins error:', error);
        message.reply('❌ حدث خطأ أثناء خصم الكوينات.');
    }
};
