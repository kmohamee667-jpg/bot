// timeout.js
// أوامر التايم-أوت (Time & Untime) مع نظام معالجة المدد واللوجات
import { EmbedBuilder, Colors } from 'discord.js';
import Warning from '../../models/Warning.js';

export default async (message, args) => {
    const isUntime = message.content.toLowerCase().includes('untime') || message.content.includes('انتايم');
    
    // 1. تحقق من الصلاحيات (صاحب السيرفر أو رتبة أونر محددة)
    const ownerRoleId = '1494164519994392747';
    const isOwner = message.author.id === message.guild.ownerId || 
                    message.member.roles.cache.has(ownerRoleId);

    if (!isOwner) return;

    // 2. الحصول على العضو المستهدف
    const targetMember = message.mentions.members.first();
    if (!targetMember) return message.reply(`❌ يرجى منشن العضو: \`${isUntime ? 'انتايم' : 'تايم'} @عضو\``);

    const logChannel = message.guild.channels.cache.get('1494164522666164392');

    if (isUntime) {
        // --- UNTIMEOUT LOGIC ---
        try {
            await targetMember.timeout(null);
            message.channel.send(`✅ تم إزالة التايم-أوت عن **${targetMember.user.tag}**.`);

            // Log
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setAuthor({ 
                        name: `إزالة تايم-أوت | ${targetMember.user.username}`, 
                        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                    })
                    .setColor(Colors.Green)
                    .addFields(
                        { name: '👤 العضو المعني', value: `<@${targetMember.id}>`, inline: true },
                        { name: '👮 بواسطة', value: `<@${message.author.id}>`, inline: true }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (err) {
            console.error(err);
            message.reply('❌ فشل إزالة التايم-أوت.');
        }
        return;
    }

    // --- TIMEOUT LOGIC ---
    const durationArg = args[1]; // e.g., 10m, 5h, 30d
    const reason = args.slice(2).join(' ') || 'لا يوجد سبب محدد';

    if (!durationArg) return message.reply('❌ يرجى تحديد المدة (مثال: 10m, 5h, 3d)');

    // Parse Duration
    const timeValue = parseInt(durationArg);
    const timeUnit = durationArg.replace(/[0-9]/g, '').toLowerCase();

    if (isNaN(timeValue)) return message.reply('❌ قيمة المدة غير صحيحة.');

    let ms = 0;
    let durationLabel = '';

    switch (timeUnit) {
        case 'm': ms = timeValue * 60 * 1000; durationLabel = `${timeValue} دقيقة`; break;
        case 'h': ms = timeValue * 60 * 60 * 1000; durationLabel = `${timeValue} ساعة`; break;
        case 'd': ms = timeValue * 24 * 60 * 60 * 1000; durationLabel = `${timeValue} يوم`; break;
        default: return message.reply('❌ وحدة الزمن غير مدعومة (استخدم: m, h, d)');
    }

    // Discord Limit: 28 days
    const maxMs = 28 * 24 * 60 * 60 * 1000;
    if (ms > maxMs) {
        ms = maxMs;
        durationLabel = '28 يوم (الحد الأقصى)';
    }

    try {
        // Fetch warning count for the DM
        const warnings = await Warning.find({ guildId: message.guild.id, userId: targetMember.id });
        const warningCount = warnings.length;

        // Send DM before timeout
        const dmEmbed = new EmbedBuilder()
            .setTitle(`⏳ تم إسكاتك مؤقتاً - ${message.guild.name}`)
            .setDescription(`لقد تلقيت تايم-أوت (Timeout) في السيرفر.`)
            .addFields(
                { name: '📝 السبب', value: `\`\`\`${reason}\`\`\``, inline: false },
                { name: '⏱️ المدة', value: durationLabel, inline: true },
                { name: '📊 إجمالي تحذيراتك', value: `${warningCount}`, inline: true },
                { name: '👮 بواسطة', value: `<@${message.author.id}>`, inline: true }
            )
            .setColor(Colors.Yellow)
            .setFooter({ text: 'يرجى الالتزام بالقوانين بمجرد انتهاء المدة.' })
            .setTimestamp();
        
        await targetMember.send({ embeds: [dmEmbed] }).catch(() => {});

        // Execute Timeout
        await targetMember.timeout(ms, `${reason} | By: ${message.author.tag}`);
        
        message.channel.send(`✅ تم إعطاء **${targetMember.user.tag}** تايم-أوت لمدة **${durationLabel}**.`);

        // Log
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: `تايم-أوت | ${targetMember.user.username}`, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setColor(Colors.Yellow)
                .addFields(
                    { name: '👤 العضو المعني', value: `<@${targetMember.id}>`, inline: true },
                    { name: '👮 بواسطة', value: `<@${message.author.id}>`, inline: true },
                    { name: '⏱️ المدة', value: durationLabel, inline: true },
                    { name: '📝 السبب', value: `\`\`\`${reason}\`\`\``, inline: false }
                )
                .setFooter({ text: `ID: ${targetMember.id}`, iconURL: message.client.user.displayAvatarURL() })
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
    } catch (error) {
        console.error('Timeout error:', error);
        message.reply('❌ حدث خطأ أثناء تنفيذ التايم-أوت.');
    }
};
