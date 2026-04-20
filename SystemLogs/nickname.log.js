// SystemLogs/nickname.log.js
// مراقبة تغيير كنية (Nickname) المستخدمين
import { EmbedBuilder } from 'discord.js';

function isArabic(text) {
  // يتحقق إذا كان النص يحتوي على أحرف عربية
  return /[\u0600-\u06FF]/.test(text);
}

export function registerNicknameLogs(client, logChannelId) {
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    // تجاهل إذا كان التغيير من بوت
    if (newMember.user.bot) return;

    // تحقق من التغيير في nickname
    // نكتشف حالة الحذف (كان هناك nickname ثم أصبح null) بشكل صريح
    const nicknameRemoved = oldMember.nickname !== null && newMember.nickname === null;
    const oldNick = oldMember.nickname || oldMember.user.globalName || oldMember.user.username;
    const newNick = newMember.nickname || newMember.user.globalName || newMember.user.username;

    // تجاهل إذا لم يتغير الـ nickname الفعلي (وليس مجرد تغيير في globalName/username)
    if (!nicknameRemoved && oldMember.nickname === newMember.nickname) return;
    const channel = client.channels.cache.get(logChannelId);
    if (!channel) return;
    // تحديد من قام بالتغيير (حقيقي أو بوت)
    let executorName = 'غير معروف';
    try {
      const fetchedLogs = await newMember.guild.fetchAuditLogs({
        type: 24, // MEMBER_UPDATE
        limit: 5
      });
      const log = fetchedLogs.entries.find(entry => entry.target.id === newMember.id && entry.changes.some(c => c.key === 'nick'));
      if (log) {
        if (log.executor.bot && log.extra && log.extra.reason) {
          executorName = log.extra.reason;
        } else {
          executorName = log.executor.username;
        }
      }
    } catch {}

    // تنسيق عرض الاسم القديم والجديد
    let blockMsg = '';
    const oldIsAr = isArabic(oldNick);
    if (nicknameRemoved) {
      // حالة الحذف: نعرض الاسم القديم ثم (تم الحذف) بشكل واضح
      if (oldIsAr) {
        blockMsg = `(تم الحذف) <= ${oldNick}`;
      } else {
        blockMsg = `${oldNick} => (تم الحذف)`;
      }
    } else {
      const newIsAr = isArabic(newNick);
      if (!oldIsAr && newIsAr) {
        blockMsg = `${oldNick} => ${newNick}`;
      } else if (oldIsAr && !newIsAr) {
        blockMsg = `${newNick} <= ${oldNick}`;
      } else if (!oldIsAr && !newIsAr) {
        blockMsg = `${oldNick} => ${newNick}`;
      } else {
        blockMsg = `${oldNick} => ${newNick}`;
      }
    }

    const user = newMember.user;
    const serverName = channel.guild?.name || 'Server';
    const embed = new EmbedBuilder()
      .setColor('#e67e22')
      .setAuthor({
        name: user.username,
        iconURL: user.displayAvatarURL()
      })
      .setThumbnail('attachment://signature.png')
      .setFooter({
        text: `${client.user.username} | ${serverName}`,
        iconURL: client.user.displayAvatarURL()
      })
      .setTimestamp(new Date())
      .addFields([
        { name: 'تغيير كنية', value: `<@${user.id}>`, inline: false },
        { name: 'بواسطة', value: executorName, inline: true },
        { name: 'في', value: `${channel.name} (<#${channel.id}>)`, inline: true },
        { name: 'الاسم', value: `\`\`\`${blockMsg}\`\`\``, inline: false }
      ]);

    await channel.send({ embeds: [embed], files: [{ attachment: 'imgs/signature.png', name: 'signature.png' }] });
  });
}
