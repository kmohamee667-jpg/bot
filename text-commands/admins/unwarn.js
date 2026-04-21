import AdminCommand from '../../models/AdminCommand.js';
import Warning from '../../models/Warning.js';
import { EmbedBuilder, Colors } from 'discord.js';

export default async (message, args) => {
    // 1. Check Permissions
    const commandPerms = await AdminCommand.findOne({ command: 'unwarn' });
    if (!commandPerms) return message.reply('❌ لم يتم ضبط صلاحيات أمر إلغاء التحذير.');

    const isAllowed = commandPerms.users.some(u => u.id === message.author.id) || 
                      message.member.roles.cache.some(role => commandPerms.roles.includes(role.name));

    if (!isAllowed && message.author.id !== message.guild.ownerId) return;

    // 2. Parse Arguments: unwarn @user #ID [Resolution Reason]
    const targetUser = message.mentions.users.first();
    const idArg = args.find(a => a.startsWith('#'));
    const resolutionReason = args.slice(2).join(' ') || 'لم يتم ذكر سبب';

    if (!targetUser) return message.reply('❌ يرجى منشن العضو: `انورن @عضو #الرقم`');
    if (!idArg) return message.reply('❌ يرجى كتابة رقم التحذير مسبوقاً بـ #: `انورن @عضو #1`');

    const warningId = parseInt(idArg.replace('#', ''));
    if (isNaN(warningId)) return message.reply('❌ رقم التحذير غير صحيح.');

    try {
        // 3. Find and Update Warning
        const warning = await Warning.findOne({ 
            guildId: message.guild.id, 
            userId: targetUser.id, 
            warningId: warningId,
            status: 'active'
        });

        if (!warning) return message.reply(`❌ لم يتم العثور على تحذير نشط يحمل الرقم #${warningId} لهذا العضو.`);

        warning.status = 'resolved';
        warning.resolvedBy = message.author.id;
        warning.resolutionReason = resolutionReason;
        warning.resolvedAt = new Date();
        await warning.save();

        // 4. Channel Response
        const channelEmbed = new EmbedBuilder()
            .setDescription(`✅ تم إلغاء التحذير #${warningId} لـ <@${targetUser.id}> بنجاح.`)
            .setColor(Colors.Green);
        await message.reply({ embeds: [channelEmbed] });

        // 5. Send DM to User
        const dmEmbed = new EmbedBuilder()
            .setTitle(`✅ تمت إزالة التحذير - ${message.guild.name}`)
            .setDescription(`تمت تسوية أحد تحذيراتك في **${message.guild.name}**`)
            .addFields(
                { name: '🆔 Warning ID', value: `#${warningId}`, inline: true },
                { name: '🎯 المستوى', value: '🟡 متوسط', inline: true },
                { name: '📝 السبب الأصلي', value: `\`\`\`${warning.reason}\`\`\``, inline: false },
                { name: '🔧 سبب الإزالة', value: `\`\`\`${resolutionReason}\`\`\``, inline: false },
                { name: '👮 تمت الإزالة بواسطة', value: `<@${message.author.id}>`, inline: true }
            )
            .setColor(Colors.Green)
            .setFooter({ text: 'تم اتخاذ هذا الإجراء من قبل طاقم الإدارة' })
            .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
            console.log(`Could not send DM to user ${targetUser.id}`);
        });

        // 6. Log to Channel
        const logChannel = message.guild.channels.cache.get('1494164522666164395');
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: `إزالة تحذير | ${targetUser.username}`, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setColor(Colors.Green)
                .addFields(
                    { name: '👤 العضو المعني', value: `<@${targetUser.id}>`, inline: true },
                    { name: '👮 بواسطة', value: `<@${message.author.id}>`, inline: true },
                    { name: '🆔 رقم التحذير', value: `#${warningId}`, inline: true },
                    { name: '📝 السبب الأصلي', value: `\`\`\`${warning.reason}\`\`\``, inline: false },
                    { name: '🔧 سبب الإزالة', value: `\`\`\`${resolutionReason}\`\`\``, inline: false }
                )
                .setFooter({ text: `ID: ${targetUser.id} • ${message.guild.name}`, iconURL: message.client.user.displayAvatarURL() })
                .setTimestamp();
            
            await logChannel.send({ embeds: [logEmbed] });
        }

    } catch (error) {
        console.error('Unwarn command error:', error);
        message.reply('❌ حدث خطأ أثناء تنفيذ الأمر.');
    }
};
