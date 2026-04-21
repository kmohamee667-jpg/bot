import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export const createTicketRow = () => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_create')
            .setLabel('Create Ticket')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎫')
    );
};

export const closeConfirmRow = () => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_confirm_yes').setLabel('نعم').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ticket_confirm_no').setLabel('لا').setStyle(ButtonStyle.Secondary)
    );
};

export const closeConfirmRowClose = () => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_close_confirm_yes').setLabel('نعم').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ticket_close_confirm_no').setLabel('لا').setStyle(ButtonStyle.Secondary)
    );
};

export const userCloseRow = () => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_close').setLabel('إغلاق التيكيت').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );
};

export const ticketControlsRow = () => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Ticket').setStyle(ButtonStyle.Primary).setEmoji('✅'),
        new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );
};

export const claimPromptRow = () => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_claim').setLabel('استلام التيكيت').setStyle(ButtonStyle.Primary).setEmoji('✅')
    );
};

export const supportControlsRow = () => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_open').setLabel('Open').setStyle(ButtonStyle.Success).setEmoji('🔓'),
        new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
    );
};

export const welcomeEmbed = (user) => {
    return new EmbedBuilder()
        .setTitle('🎫 مرحباً بك!')
        .setDescription('سيتم الرد عليك قريباً من فريق الدعم\nلإغلاق التيكيت اضغط زر الإغلاق')
        .setFooter({ text: 'Created by [اسم البوت]' })
        .setTimestamp();
};

export const closedEmbed = (closer) => {
    return new EmbedBuilder()
        .setTitle('🔒 Ticket Closed')
        .setDescription(`Ticket Closed by <@${closer}>`)
        .setColor('Red');
};

export const claimPromptEmbed = (ticket) => {
  const createdAt = ticket.createdAt.toLocaleString('en-US');
  return new EmbedBuilder()
    .setTitle('📥 التيكيت جاهز للاستلام')
    .setDescription('اضغط الزر لاستلام التيكيت')
    .addFields(
      { name: 'رقم التيكيت', value: `#${ticket.ticketId}`, inline: true },
      { name: 'صاحب التيكيت', value: `<@${ticket.userId}>`, inline: true },
      { name: 'فتح في', value: createdAt, inline: false }
    )
    .setColor('Orange')
    .setTimestamp();
};

export const claimConfirmEmbed = (ticket, claimer) => {
  const createdAt = ticket.createdAt.toLocaleString('en-US');
  const claimedAt = new Date().toLocaleString('en-US');
  return new EmbedBuilder()
    .setAuthor({
      name: `<@${claimer}> استلم التيكيت`,
      iconURL: `https://cdn.discordapp.com/avatars/${claimer}/${interaction.user.displayAvatarURL({ dynamic: true })}`
    })
    .setTitle('✅ تم استلام التيكيت')
    .setDescription(`**الاداري:** <@${claimer}>\n**خاصة ب:** <@${ticket.userId}>\n**فتح في:** ${createdAt}\n**استلام في:** ${claimedAt}`)
    .setColor(0x00AA00)
    .setTimestamp();
};

