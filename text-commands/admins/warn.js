import AdminCommand from '../../models/AdminCommand.js';
import Warning from '../../models/Warning.js';
import { EmbedBuilder, Colors } from 'discord.js';

export default async (message, args) => {
    // 1. Check Permissions
    const commandPerms = await AdminCommand.findOne({ command: 'warn' });
    if (!commandPerms) return message.reply('❌ لم يتم ضبط صلاحيات أمر التحذير في قاعدة البيانات.');

    const isAllowed = commandPerms.users.some(u => u.id === message.author.id) || 
                      message.member.roles.cache.some(role => commandPerms.roles.includes(role.name));

    if (!isAllowed && message.author.id !== message.guild.ownerId) return;

    // 2. Parse Arguments
    const targetUser = message.mentions.users.first();
    const reason = args.slice(1).join(' ');

    if (!targetUser) return message.reply('❌ يرجى منشن العضو: `ورن @عضو السبب`');
    if (!reason) return message.reply('❌ يرجى كتابة سبب التحذير: `ورن @عضو السبب`');
    if (targetUser.bot) return message.reply('❌ لا يمكنك تحذير البوتات.');

    const guildId = message.guild.id;
    const userId = targetUser.id;

    try {
        // 3. Logic: Get sequential ID and Total Points
        const userWarnings = await Warning.find({ guildId, userId });
        const warningCount = userWarnings.length + 1;
        const nextId = warningCount;

        // 4. Create Warning Record
        const newWarning = new Warning({
            guildId,
            userId,
            moderatorId: message.author.id,
            reason,
            warningId: nextId,
            pointsAtTime: warningCount
        });
        await newWarning.save();

        // 5. Response in Channel
        const channelEmbed = new EmbedBuilder()
            .setDescription(`⚠️ تم إعطاء <@${userId}> تحذير بنجاح.`)
            .setColor(Colors.Yellow);
        await message.reply({ embeds: [channelEmbed] });

        // 6. Send DM to User
        const dmEmbed = new EmbedBuilder()
            .setTitle(`⚠️ تنبيه جديد - ${message.guild.name}`)
            .setDescription(`لقد تلقيت تنبيهاً في **${message.guild.name}**`)
            .addFields(
                { name: '📝 السبب', value: `\`\`\`${reason}\`\`\``, inline: false },
                { name: '🆔 Warning ID', value: `#${nextId}`, inline: true },
                { name: '📊 النقاط', value: `${warningCount}`, inline: true }
            )
            .setColor(Colors.Yellow)
            .setFooter({ text: 'تواصل مع الإدارة إذا كنت تعتقد أن هذا التنبيه تم إصداره عن طريق الخطأ' })
            .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
            message.channel.send(`⚠️ تعذر إرسال رسالة خاصة لـ <@${userId}> (الخاص مغلق).`);
        });

        // 7. Log to Channel 1494164522666164395
        const logChannel = message.guild.channels.cache.get('1494164522666164395');
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: `تحذير جديد | ${targetUser.username}`, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setColor(Colors.Orange)
                .addFields(
                    { name: '👤 العضو المحذر', value: `<@${userId}>`, inline: true },
                    { name: '👮 بواسطة', value: `<@${message.author.id}>`, inline: true },
                    { name: '🆔 الرقم', value: `#${nextId}`, inline: true },
                    { name: '📝 السبب', value: `\`\`\`${reason}\`\`\``, inline: false }
                )
                .setFooter({ text: `ID: ${userId} • ${message.guild.name}`, iconURL: message.client.user.displayAvatarURL() })
                .setTimestamp();
            
            await logChannel.send({ embeds: [logEmbed] });
        }

    } catch (error) {
        console.error('Warn command error:', error);
        message.reply('❌ حدث خطأ أثناء تنفيذ الأمر.');
    }
};
