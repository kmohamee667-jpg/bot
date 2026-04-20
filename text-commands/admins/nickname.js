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
    // تحقق من الصيغة الجديدة
    let targetMember = message.member; // Default to self
    let oldNick = targetMember.nickname || targetMember.user.globalName || targetMember.user.username;
    let action = 'set'; // or 'remove'

    if (args.length === 0) {
        // سمي -> remove self nickname
        action = 'remove';
    } else if (args.length === 1 && message.mentions.members.first()) {
        // سمي @user -> remove target nickname
        targetMember = message.mentions.members.first();
        if (!targetMember) return message.reply('يرجى منشن العضو بشكل صحيح.');
        oldNick = targetMember.nickname || targetMember.user.globalName || targetMember.user.username;
        action = 'remove';
    } else if (args.length >= 2 && message.mentions.members.first()) {
        // سمي @user newname -> set nickname
        targetMember = message.mentions.members.first();
        if (!targetMember) return message.reply('يرجى منشن العضو بشكل صحيح.');
        const newNick = args.slice(1).join(' ');
        oldNick = targetMember.nickname || targetMember.user.globalName || targetMember.user.username;
        try {
            await targetMember.setNickname(newNick);
            action = 'set';
        } catch (err) {
            console.error('[Nickname Error] Failed to set nickname:', err);
            return message.reply('لا يمكن تغيير الاسم المستعار (صلاحيات؟).');
        }
    } else {
        return message.reply('الصيغة: `سمي` (إزالة اسمك) | `سمي @عضو` (إزالة اسمه) | `سمي @عضو اسم_جديد`');
    }

    // Remove nickname
    if (action === 'remove') {
        try {
            await targetMember.setNickname(null);
        } catch (err) {
            console.error('[Nickname Error] Failed to remove nickname:', err);
            return message.reply('لا يمكن إزالة الاسم المستعار (صلاحيات؟).');
        }
    }
    // بناء الإمبيد
    const serverName = message.guild?.name || 'Server';
    const newNickDisplay = action === 'remove' ? '(تم الإزالة)' : oldNick;
    const embed = new EmbedBuilder()
        .setColor('#52df00')
        .setAuthor({
            name: targetMember.user.username,
            iconURL: targetMember.user.displayAvatarURL()
        })
        .setThumbnail('attachment://signature.png')
        .setFooter({
            text: `${message.client.user.username} | ${serverName}`,
            iconURL: message.client.user.displayAvatarURL()
        })
        .setTimestamp(new Date())
        .addFields([
            { name: action === 'remove' ? 'تم إزالة الاسم المستعار' : 'تم تغيير الاسم المستعار', value: `<@${targetMember.user.id}>`, inline: false },
            { name: 'بواسطة', value: `<@${message.author.id}>`, inline: true },
            { name: 'في', value: `${message.channel.name} (<#${message.channel.id}>)`, inline: true },
            { name: 'الاسم', value: `\`\`\`${oldNick} => ${newNickDisplay}\`\`\``, inline: false }
        ]);
    await message.channel.send({ embeds: [embed], files: [{ attachment: 'imgs/signature.png', name: 'signature.png' }] });
};
