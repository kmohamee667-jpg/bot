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


export const ticketControlsRow = () => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim Ticket').setStyle(ButtonStyle.Primary).setEmoji('✅'),
        new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
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
        .setDescription(`<@${user.id}> Welcome\nسيتم الرد عليك قريباً من فريق الدعم\nلإغلاق التيكيت اضغط زر الإغلاق`)
        .setFooter({ text: 'Created by [اسم البوت]' })
        .setTimestamp();
};

export const closedEmbed = (closer) => {
    return new EmbedBuilder()
        .setTitle('🔒 Ticket Closed')
        .setDescription(`Ticket Closed by <@${closer}>`)
        .setColor('Red');
};

