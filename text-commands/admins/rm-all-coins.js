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

    const targetUser = message.mentions.users.first();
    const logChannel = message.guild.channels.cache.get('1496073806442397787');

    try {
        if (targetUser) {
            // Reset specific user
            await Coin.findOneAndUpdate(
                { guildId: message.guild.id, userId: targetUser.id },
                { balance: 0 },
                { upsert: true }
            );
            message.reply(`✅ تم تصفير كوينات <@${targetUser.id}> بنجاح.`);

            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setAuthor({ name: `تصفير كوينات | ${targetUser.username}`, iconURL: message.author.displayAvatarURL() })
                    .setColor(Colors.Black)
                    .addFields(
                        { name: '👤 العضو', value: `<@${targetUser.id}>`, inline: true },
                        { name: '👮 بواسطة', value: `<@${message.author.id}>`, inline: true },
                        { name: '📝 نوع التصفير', value: 'عضو محدد', inline: true }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        } else {
            // Reset ALL users in this guild
            const result = await Coin.updateMany(
                { guildId: message.guild.id },
                { balance: 0 }
            );
            message.reply(`⚠️ تم تصفير كوينات **جميع** الأعضاء بنجاح (إجمالي: ${result.modifiedCount}).`);

            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setAuthor({ name: `تصفير شامل للكوينات`, iconURL: message.author.displayAvatarURL() })
                    .setColor(Colors.DarkRed)
                    .setDescription(`قام <@${message.author.id}> بتصفير كوينات **جميع** أعضاء السيرفر.`)
                    .addFields(
                        { name: '📊 عدد الحسابات المتأثرة', value: `${result.modifiedCount}`, inline: true }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        }
    } catch (error) {
        console.error('Reset coins error:', error);
        message.reply('❌ حدث خطأ أثناء تصفير الكوينات.');
    }
};
