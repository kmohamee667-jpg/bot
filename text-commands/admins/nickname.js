import AdminCommand from '../../models/AdminCommand.js';
import { EmbedBuilder } from 'discord.js';

export default async (message, args) => {
    // تحقق من الصلاحيات
    const command = await AdminCommand.findOne({ command: 'nickname' });
    if (!command) {
        return message.reply('لم يتم ضبط صلاحيات هذا الأمر بعد.');
    }
    const allowedUser = command.users.find(u => u.id === message.author.id);
    const allowedRole = message.member.roles.cache.some(role => {
        const roleName = role.name.trim();
        return command.roles.map(r => r.trim()).includes(roleName);
    });
    if (!allowedUser && !allowedRole) {
        return;
    }
    // تحديد العضو المستهدف والإجراء بناءً على عدد المعطيات
    let member;
    let newNick;

    if (args.length === 0) {
        // لا يوجد معطيات: إزالة لقب المستخدم نفسه
        member = message.member;
        newNick = null;
    } else if (args.length === 1) {
        // منشن فقط: إزالة لقب العضو المذكور
        member = message.mentions.members.first();
        if (!member) {
            return message.reply('يرجى منشن العضو بشكل صحيح، أو اكتب الأمر بدون معطيات لإزالة لقبك.');
        }
        newNick = null;
    } else {
        // منشن + اسم جديد: تعيين اللقب الجديد
        member = message.mentions.members.first();
        if (!member) {
            return message.reply('يرجى منشن العضو بشكل صحيح.');
        }
        newNick = args.slice(1).join(' ');
    }

    const oldNick = member.nickname || member.user.globalName || member.user.username;
    try {
        await member.setNickname(newNick);
    } catch (err) {
        return message.reply('لا يمكن تغيير الاسم المستعار لهذا العضو (ربما صلاحيات البوت غير كافية).');
    }

    // بناء الإمبيد
    const actionLabel = newNick === null ? 'تم إزالة الاسم المستعار' : 'تم تغيير الاسم المستعار';
    const nickDisplay = newNick === null
        ? `\`\`\`${oldNick} => (لا يوجد)\`\`\``
        : `\`\`\`${oldNick} => ${newNick}\`\`\``;
    const serverName = message.guild?.name || 'Server';
    const embed = new EmbedBuilder()
        .setColor('#52df00')
        .setAuthor({
            name: member.user.username,
            iconURL: member.user.displayAvatarURL()
        })
        .setThumbnail('attachment://signature.png')
        .setFooter({
            text: `${message.client.user.username} | ${serverName}`,
            iconURL: message.client.user.displayAvatarURL()
        })
        .setTimestamp(new Date())
        .addFields([
            { name: actionLabel, value: `<@${member.user.id}>`, inline: false },
            { name: 'بواسطة', value: `<@${message.author.id}>`, inline: true },
            { name: 'في', value: `${message.channel.name} (<#${message.channel.id}>)`, inline: true },
            { name: 'الاسم', value: nickDisplay, inline: false }
        ]);
    await message.channel.send({ embeds: [embed], files: [{ attachment: 'imgs/signature.png', name: 'signature.png' }] });
};
