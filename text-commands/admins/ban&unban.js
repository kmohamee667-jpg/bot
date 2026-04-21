// ban&unban.js
// أوامر البان ورفع البان مع نظام لوجات مطور
import AdminCommand from '../../models/AdminCommand.js';
import { EmbedBuilder, Colors } from 'discord.js';

export default async function (message, args) {
    const commandName = args[0].toLowerCase(); // 'ban' or 'unban'
    
    // 1. تحقق من الصلاحيات
    const commandObj = await AdminCommand.findOne({ command: commandName });
    if (!commandObj) return message.reply(`❌ لم يتم ضبط صلاحيات أمر ${commandName}.`);

    const isAllowed = commandObj.users.some(u => u.id === message.author.id) || 
                      message.member.roles.cache.some(role => commandObj.roles.includes(role.name));

    if (!isAllowed && message.author.id !== message.guild.ownerId) return;

    // 2. الحصول على العضو المستهدف
    const target = args[1];
    if (!target) return message.reply(`❌ الصيغة: \`${commandName} @عضو [السبب]\``);

    const userId = target.replace(/[<@!>]/g, '');
    const reason = args.slice(2).join(' ') || 'لا يوجد سبب محدد';
    const logChannel = message.guild.channels.cache.get('1494164522666164389');

    if (commandName === 'ban') {
        try {
            const member = await message.guild.members.fetch(userId).catch(() => null);
            const userTag = member ? member.user.tag : userId;

            // Send DM before ban
            if (member) {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`🚫 تم حظرك من - ${message.guild.name}`)
                    .setDescription(`لقد تم حظرك (Ban) من السيرفر.`)
                    .addFields(
                        { name: '📝 السبب', value: `\`\`\`${reason}\`\`\``, inline: false },
                        { name: '👮 بواسطة', value: `<@${message.author.id}>`, inline: true }
                    )
                    .setColor(Colors.Red)
                    .setFooter({ text: 'يمكنك التواصل مع الإدارة إذا كنت تعتقد أن هذا خطأ.' })
                    .setTimestamp();
                await member.send({ embeds: [dmEmbed] }).catch(() => {});
            }

            await message.guild.members.ban(userId, { reason: `${reason} | By: ${message.author.tag}` });
            
            message.channel.send(`✅ تم حظر **${userTag}** بنجاح.`);

            // Log
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setAuthor({ 
                        name: `حظر عضو (Ban) | ${userTag}`, 
                        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                    })
                    .setColor(Colors.Red)
                    .addFields(
                        { name: '👤 العضو المحظور', value: `<@${userId}>`, inline: true },
                        { name: '👮 بواسطة', value: `<@${message.author.id}>`, inline: true },
                        { name: '📝 السبب', value: `\`\`\`${reason}\`\`\``, inline: false }
                    )
                    .setFooter({ text: `ID: ${userId}`, iconURL: message.client.user.displayAvatarURL() })
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (err) {
            console.error(err);
            message.reply('❌ فشل تنفيذ البان. تأكد من الصلاحيات.');
        }
    } else if (commandName === 'unban') {
        try {
            await message.guild.members.unban(userId, `Unbanned by ${message.author.tag} | Reason: ${reason}`);
            message.channel.send(`✅ تم إلغاء حظر العضو ذو الآيدي **${userId}** بنجاح.`);

            // Log
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setAuthor({ 
                        name: `إلغاء حظر (Unban)`, 
                        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                    })
                    .setColor(Colors.Green)
                    .addFields(
                        { name: '👤 العضو المعني (ID)', value: `\`${userId}\``, inline: true },
                        { name: '👮 بواسطة', value: `<@${message.author.id}>`, inline: true },
                        { name: '📝 سبب الإلغاء', value: `\`\`\`${reason}\`\`\``, inline: false }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (err) {
            console.error(err);
            message.reply('❌ فشل إلغاء الحظر. تأكد من الآيدي.');
        }
    }
}
