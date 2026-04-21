// kick.js
// أمر الطرد (Kick) مع نظام لوجات وتنبيه خاص
import AdminCommand from '../../models/AdminCommand.js';
import { EmbedBuilder, Colors } from 'discord.js';

export default async (message, args) => {
    // 1. تحقق من الصلاحيات (صاحب السيرفر أو رتبة أونر محددة)
    const ownerRoleId = '1494164519994392747';
    const isOwner = message.author.id === message.guild.ownerId || 
                    message.member.roles.cache.has(ownerRoleId);

    if (!isOwner) return;

    // 2. الحصول على العضو المستهدف
    const targetMember = message.mentions.members.first();
    const reason = args.slice(1).join(' ') || 'لا يوجد سبب محدد';

    if (!targetMember) return message.reply('❌ يرجى منشن العضو: `كيك @عضو [السبب]`');
    if (!targetMember.kickable) return message.reply('❌ لا يمكنني طرد هذا العضو (رتبته أعلى مني أو لا أملك صلاحيات).');

    try {
        // 3. إرسال رسالة خاصة قبل الطرد
        const dmEmbed = new EmbedBuilder()
            .setTitle(`👢 تم طردك من - ${message.guild.name}`)
            .setDescription(`لقد تم طردك (Kick) من السيرفر.`)
            .addFields(
                { name: '📝 السبب', value: `\`\`\`${reason}\`\`\``, inline: false },
                { name: '👮 بواسطة', value: `<@${message.author.id}>`, inline: true }
            )
            .setColor(Colors.Orange)
            .setFooter({ text: 'يمكنك العودة للسيرفر عبر رابط الدعوة إذا لم يكن طرداً نهائياً.' })
            .setTimestamp();
        
        await targetMember.send({ embeds: [dmEmbed] }).catch(() => {});

        // 4. تنفيذ الطرد
        await targetMember.kick(`${reason} | By: ${message.author.tag}`);
        
        message.channel.send(`✅ تم طرد **${targetMember.user.tag}** بنجاح.`);

        // 5. اللوج (Log Channel: 1494164522666164390)
        const logChannel = message.guild.channels.cache.get('1494164522666164390');
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: `طرد عضو (Kick) | ${targetMember.user.username}`, 
                    iconURL: message.author.displayAvatarURL({ dynamic: true }) 
                })
                .setColor(Colors.Orange)
                .addFields(
                    { name: '👤 العضو المطرود', value: `<@${targetMember.id}>`, inline: true },
                    { name: '👮 بواسطة', value: `<@${message.author.id}>`, inline: true },
                    { name: '📝 السبب', value: `\`\`\`${reason}\`\`\``, inline: false }
                )
                .setFooter({ text: `ID: ${targetMember.id}`, iconURL: message.client.user.displayAvatarURL() })
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
    } catch (error) {
        console.error('Kick error:', error);
        message.reply('❌ حدث خطأ أثناء محاولة الطرد.');
    }
};
