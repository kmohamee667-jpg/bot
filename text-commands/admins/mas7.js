
import { EmbedBuilder } from 'discord.js';
import AdminCommand from '../../models/AdminCommand.js';

export default async (message, args) => {
    
    // تحقق من الصلاحيات
    const command = await AdminCommand.findOne({ command: 'mas7' });
    if (!command) {
        console.log('لم يتم العثور على صلاحيات الأمر في قاعدة البيانات');
        return message.reply('لم يتم ضبط صلاحيات هذا الأمر بعد.');
    }
    
    const allowedUser = command.users.find(u => u.id === message.author.id);
    const allowedRole = message.member.roles.cache.some(role => {
        const roleName = role.name.trim();
        return command.roles.map(r => r.trim()).includes(roleName);
    });
    
    if (!allowedUser && !allowedRole) {
        console.log('ليس لديك صلاحية استخدام هذا الأمر');
        return;
    }

    let deleteCount = 0;
    try {
        if (!args[0]) {
            const fetched = await message.channel.messages.fetch({ limit: 100 });
            await message.channel.bulkDelete(fetched, true);
            deleteCount = fetched.size;
        } else if (!isNaN(args[0])) {
            let count = parseInt(args[0]);
            if (count > 100) count = 100;
            const fetched = await message.channel.messages.fetch({ limit: count });
            await message.channel.bulkDelete(fetched, true);
            deleteCount = fetched.size;
        } else {
            return message.reply('يرجى كتابة رقم صحيح بعد الأمر.');
        }
    } catch (err) {
        console.error('خطأ أثناء تنفيذ المسح:', err);
        return message.reply('حدث خطأ أثناء تنفيذ الأمر.');
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString('EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateString = now.toLocaleDateString('EG');
    const serverName = message.guild?.name || 'Server';
    const memberMention = `<@${message.author.id}>`;
    const embed = new EmbedBuilder()
        .setColor('#030a64')
        .setDescription(`تم حذف \`${deleteCount}\` رسائل بواسطة ${memberMention}\n\n${serverName} ✦\n${dateString} - ${timeString}`)

    try { await message.delete(); } catch {}
    const replyMsg = await message.channel.send({
        embeds: [embed],
        content: memberMention
    });
    setTimeout(() => replyMsg.delete().catch(() => {}), 4000);
};