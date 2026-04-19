// ban&unban.js
// أوامر البان ورفع البان مع نظام لوجات
import AdminCommand from '../../models/AdminCommand.js';
import fs from 'fs';
import path from 'path';

// مسار ملفات اللوج
const banLogPath = path.join(process.cwd(), 'SystemLogs', 'ban.log.js');
const unbanLogPath = path.join(process.cwd(), 'SystemLogs', 'unban.log.js');

// دالة لكتابة اللوج
function writeLog(type, targetInfo, adminUser, date) {
    const logPath = type === 'ban' ? banLogPath : unbanLogPath;
    const img = type === 'ban' ? 'ban.png' : 'unban.png';
    const logMsg = `==============================\n` +
        `الصورة: ${img}\n` +
        `العضو: ${targetInfo}\n` +
        `بواسطة: ${adminUser.tag} (${adminUser.id})\n` +
        `التاريخ: ${date}\n` +
        `==============================\n`;
    fs.appendFileSync(logPath, logMsg, 'utf8');
}

export default async function (message, args) {
    const commandName = args[0].toLowerCase(); // 'ban' or 'unban'
    
    // تحقق من الصلاحيات من قاعدة البيانات للعلاقة بالأمر المستخدم
    const commandObj = await AdminCommand.findOne({ command: commandName });
    if (!commandObj) {
        return message.reply(`لم يتم ضبط صلاحيات أمر ${commandName} في قاعدة البيانات.`);
    }

    const allowedUser = commandObj.users.find(u => u.id === message.author.id);
    const allowedRole = message.member.roles.cache.some(role => {
        const roleName = role.name.trim();
        return commandObj.roles.map(r => r.trim()).includes(roleName);
    });

    if (!allowedUser && !allowedRole) {
        return ;
    }

    // الحصول على العضو المستهدف (منشن أو آيدي)
    const target = args[1];
    if (!target) {
        return message.reply(`يرجى تحديد العضو (منشن أو الآيدي). مثال: \`${commandName} @user\` أو \`${commandName} 123456789012345678\``);
    }

    const userId = target.replace(/[<@!>]/g, '');
    const now = new Date().toLocaleString('ar-EG', { hour12: false });

    if (commandName === 'ban') {
        try {
            const member = await message.guild.members.fetch(userId).catch(() => null);
            const tag = member ? member.user.tag : userId;
            
            await message.guild.members.ban(userId, { reason: `Banned by ${message.author.tag}` });
            
            writeLog('ban', `${tag} (${userId})`, message.author, now);
            message.channel.send(`✅ تم حظر (Ban) **${tag}** بنجاح.`);
        } catch (err) {
            console.error(err);
            message.reply('❌ فشل تنفيذ البان. تأكد من أن الآيدي صحيح وأن رتبة البوت أعلى من رتبة العضو.');
        }
    } else if (commandName === 'unban') {
        try {
            await message.guild.members.unban(userId, `Unbanned by ${message.author.tag}`);
            
            writeLog('unban', userId, message.author, now);
            message.channel.send(`✅ تم إلغاء حظر (Unban) العضو ذو الآيدي **${userId}** بنجاح.`);
        } catch (err) {
            console.error(err);
            message.reply('❌ فشل إلغاء الحظر. تأكد من أن الآيدي صحيح وأن العضو محظور بالفعل.');
        }
    }
}
