// SystemLogs/picture.log.js
// منطق مراقبة وتسجيل حذف الصور فقط
import { EmbedBuilder } from 'discord.js';

export function registerPictureLogs(client, logChannelId) {
  client.on('messageDelete', async (message) => {
    if (!message.guild || message.partial) return;
    if (message.author?.bot || message.author?.system) return;
    // تحقق أن الرسالة تحتوي على صورة واحدة على الأقل
    const imageAttachment = message.attachments?.find(att => att.contentType && att.contentType.startsWith('image/'));
    if (!imageAttachment) return;
    const channel = client.channels.cache.get(logChannelId);
    if (!channel) return;
    await sendPictureLog({ message, channel, client, imageAttachment });
  });
}

async function sendPictureLog({ message, channel, client, imageAttachment }) {
  const imgs = {
    pic: 'attachment://picmessage.png',
    bot: client.user.displayAvatarURL()
  };
  const user = {
    username: message.author?.username || 'غير معروف',
    avatarURL: message.author?.displayAvatarURL?.() || message.author?.avatarURL || '',
    id: message.author?.id || ''
  };
  const serverName = channel.guild?.name || 'Server';
  const time = new Date().toLocaleString('ar-EG');
  const realChannelName = message.channel?.name || 'غير معروف';
  const realChannelId = message.channel?.id || '';
  const msgContent = `\`\`\`${message.content || 'no message'}\`\`\``;

  const embed = new EmbedBuilder()
    .setColor('#c0392b')
    .setAuthor({
      name: user.username,
      iconURL: user.avatarURL || undefined
    })
    .setThumbnail(imgs.pic)
    .setFooter({
      text: `${client.user.username} | ${serverName}`,
      iconURL: imgs.bot
    })
    .setTimestamp(new Date())
    .addFields([
      { name: 'العملية', value: 'حذف صورة', inline: false },
      { name: 'بواسطة', value: `<@${user.id}>`, inline: true },
      { name: 'في', value: ` (<#${realChannelId}>)`, inline: true },
      { name: 'الرسالة', value: msgContent, inline: false }
    ]);

  // أرسل الإمبيد أولاً ثم الصورة المحذوفة كمرفق بعدها مباشرة
  await channel.send({ embeds: [embed], files: [{ attachment: 'imgs/picmessage.png', name: 'picmessage.png' }] });
  await channel.send({ files: [{ attachment: imageAttachment.url, name: 'deleted-image.png' }] });
}
