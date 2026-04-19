// SystemLogs/role.log.js
// مراقبة إعطاء أو إزالة الرتب (roles) للمستخدمين
import { EmbedBuilder } from 'discord.js';

export function registerRoleLogs(client, logChannelId) {
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    // تجاهل البوتات
    if (newMember.user.bot) return;
    const oldRoles = new Set(oldMember.roles.cache.map(r => r.id));
    const newRoles = new Set(newMember.roles.cache.map(r => r.id));
    // الرتب التي أضيفت
    const added = [...newRoles].filter(x => !oldRoles.has(x));
    // الرتب التي أزيلت
    const removed = [...oldRoles].filter(x => !newRoles.has(x));
    if (added.length === 0 && removed.length === 0) return;
    const channel = client.channels.cache.get(logChannelId);
    if (!channel) return;
    // جلب معلومات آخر عملية من اللوج
    let executor = 'غير معروف';
    let action = '';
    let roleId = '';
    let roleName = '';
    let emoji = '';
    if (added.length > 0) {
      action = 'إعطاء رتبة';
      roleId = added[0];
      emoji = '✅';
      roleName = newMember.guild.roles.cache.get(roleId)?.name || 'غير معروف';
    } else if (removed.length > 0) {
      action = 'إزالة رتبة';
      roleId = removed[0];
      emoji = '❌';
      roleName = oldMember.guild.roles.cache.get(roleId)?.name || 'غير معروف';
    }
    try {
      const fetchedLogs = await newMember.guild.fetchAuditLogs({
        type: 'MEMBER_ROLE_UPDATE',
        limit: 5
      });
      const log = fetchedLogs.entries.find(entry => entry.target.id === newMember.id && entry.changes.some(c => c.key === 'roles'));
      if (log) executor = log.executor.username;
    } catch {}
    const user = newMember.user;
    const serverName = channel.guild?.name || 'Server';
    const embed = new EmbedBuilder()
      .setColor(action === 'إعطاء رتبة' ? '#27ae60' : '#c0392b')
      .setAuthor({
        name: user.username,
        iconURL: user.displayAvatarURL()
      })
      .setThumbnail('attachment://role.png')
      .setFooter({
        text: `${client.user.username} | ${serverName}`,
        iconURL: client.user.displayAvatarURL()
      })
      .setTimestamp(new Date())
      .addFields([
        { name: action, value: `${emoji} ${action}`, inline: false },
        { name: 'من', value: executor, inline: true },
        { name: 'إلى', value: `<@${user.id}>`, inline: true },
        { name: 'الرول', value: `\`\`\`${roleName}\`\`\``, inline: false }
      ]);
    await channel.send({ embeds: [embed], files: [{ attachment: 'imgs/role.png', name: 'role.png' }] });
  });
}
