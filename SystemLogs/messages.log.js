// SystemLogs/messages.log.js
// منطق مراقبة وتسجيل عمليات حذف وتعديل الرسائل في الديسكورد
import { EmbedBuilder } from 'discord.js';

export function registerMessageLogs(client, logChannelId) {
  // حذف الرسائل
  client.on('messageDelete', async (message) => {
    if (!message.guild || message.partial) return;
    // تجاهل إذا كان الفاعل بوت أو App
    if (message.author?.bot || message.author?.system) return;
    const channel = client.channels.cache.get(logChannelId);
    if (!channel) return;
    await sendLog({
      action: 'delete',
      message,
      channel,
      client
    });
  });

  // تعديل الرسائل
  client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!oldMessage.guild || oldMessage.partial || newMessage.partial) return;
    if (oldMessage.content === newMessage.content) return;
    // تجاهل إذا كان الفاعل بوت أو App
    if (oldMessage.author?.bot || oldMessage.author?.system) return;
    const channel = client.channels.cache.get(logChannelId);
    if (!channel) return;
    await sendLog({
      action: 'edit',
      oldMessage,
      newMessage,
      channel,
      client
    });
  });
}

async function sendLog({ action, message, oldMessage, newMessage, channel, client }) {
  // صور العمليات (كمرفقات محلية)
  // استخدم صور أكبر (يفضل PNG شفاف أكبر من 128x128)
  const imgs = {
    delete: 'attachment://message-delete.png',
    edit: 'attachment://EditMessage.png',
    bot: client.user.displayAvatarURL()
  };
  let user, executor, oldContent, newContent;
  if (action === 'delete') {
    user = {
      username: message.author?.username || 'غير معروف',
      avatarURL: message.author?.displayAvatarURL?.() || message.author?.avatarURL || '',
      id: message.author?.id || ''
    };
    executor = user;
    oldContent = message.content;
  } else {
    user = {
      username: oldMessage.author?.username || 'غير معروف',
      avatarURL: oldMessage.author?.displayAvatarURL?.() || oldMessage.author?.avatarURL || '',
      id: oldMessage.author?.id || ''
    };
    executor = user;
    oldContent = oldMessage.content;
    newContent = newMessage.content;
  }
  const serverName = channel.guild?.name || 'Server';
  const time = new Date().toLocaleString('ar-EG');

  // بناء الإمبيد بشكل رسمي
  // اسم القناة الحقيقية وID القناة
  let realChannelName = '';
  let realChannelId = '';
  if (action === 'delete') {
    realChannelName = message.channel?.name || 'غير معروف';
    realChannelId = message.channel?.id || '';
  } else {
    realChannelName = oldMessage.channel?.name || 'غير معروف';
    realChannelId = oldMessage.channel?.id || '';
  }

  const embed = new EmbedBuilder()
    .setColor(action === 'delete' ? '#c0392b' : '#2980b9')
    .setAuthor({
      name: user.username,
      iconURL: user.avatarURL || undefined
    })
    .setThumbnail(imgs[action]) // صورة العملية في الزاوية العليا اليمنى وبحجم أكبر
    .setFooter({
      text: `${client.user.username} | ${serverName}`,
      iconURL: imgs.bot
    })
    .setTimestamp(new Date())
    .addFields([
      { name: 'العملية', value: action === 'delete' ? 'حذف رسالة' : 'تعديل رسالة', inline: false },
      { name: 'بواسطة', value: `<@${executor.id}>`, inline: true },
      { name: 'في', value: ` (<#${realChannelId}>)`, inline: true },
      ...(action === 'edit' ? [
        { name: 'الرسالة القديمة', value: `\`\`\`${oldContent || 'غير متوفر'}\`\`\``, inline: false },
        { name: 'الرسالة الجديدة', value: `\`\`\`${newContent || 'غير متوفر'}\`\`\``, inline: false }
      ] : [
        { name: 'الرسالة المحذوفة', value: `\`\`\`${oldContent || 'غير متوفر'}\`\`\``, inline: false }
      ])
    ]);

  const files = [];
  if (action === 'delete') files.push({ attachment: 'imgs/message-delete.png', name: 'message-delete.png' });
  if (action === 'edit') files.push({ attachment: 'imgs/EditMessage.png', name: 'EditMessage.png' });

  await channel.send({ embeds: [embed], files });
}
