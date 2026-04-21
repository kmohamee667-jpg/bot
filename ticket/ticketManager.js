import { 
    PermissionFlagsBits, 
    ChannelType, 
    EmbedBuilder,
    Colors, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} from 'discord.js';
import { initTicketSystem } from './initTicketSystem.js';

import config from '../config/config.js';
import { createTicketRow, userCloseRow, closeConfirmRow, closeConfirmRowClose, ticketControlsRow, supportControlsRow, closedEmbed, claimPromptRow, claimPromptEmbed, claimedInTicketEmbed, claimedInClaimChannelEmbed, ticketClosedDMEmbed } from './buttonsHandler.js';
import { getNextTicketId, createTicket, getUserOpenTicket, getTicketByChannelId, updateTicketStatus, claimTicket, updateClaimPromptMessageId } from './database.js';

export { initTicketSystem };

const allowedRoles = config.allowedTicketRoles;

export const handleCreateTicket = async (interaction) => {
    await sendStructuredLog(interaction.guild, 'create_start', { userId: interaction.user.id, details: `User: ${interaction.user.tag}` });
    
    try {
        await interaction.deferReply({ ephemeral: true });
    } catch (deferErr) {
        await sendStructuredLog(interaction.guild, 'defer_failed', { userId: interaction.user.id, details: deferErr.message });
        return;
    }
    
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    
    await sendStructuredLog(interaction.guild, 'spam_check', { userId, details: 'Checking open ticket' });
    let openTicket;
    try {
        openTicket = await getUserOpenTicket(userId, guildId);
    } catch (dbErr) {
        await sendStructuredLog(interaction.guild, 'db_error', { userId, details: `Spam check DB: ${dbErr.message}` });
    }
    
    if (openTicket) {
        const channel = interaction.guild.channels.cache.get(openTicket.channelId);
        if (!channel) {
            await updateTicketStatus(openTicket.channelId, 'closed', interaction.user.id);
            const cleanEmbed = new EmbedBuilder()
                .setDescription('تم تنظيف تيكت قديم محذوف تلقائياً ✅\nيمكنك فتح تيكت جديد.')
                .setColor('Green');
            await interaction.editReply({ embeds: [cleanEmbed] });
            await sendStructuredLog(interaction.guild, 'old_ticket_cleaned', { userId, ticketId: openTicket.ticketId });
            return;
        }
        await sendStructuredLog(interaction.guild, 'spam_detected', { userId, ticketId: openTicket.ticketId });
        const spamEmbed = new EmbedBuilder()
            .setDescription(`لديك تيكيت مفتوح: <#${openTicket.channelId}> 🎫`)
            .setColor('Orange');
        await interaction.editReply({ embeds: [spamEmbed] });
        return;
    }
    
    await sendStructuredLog(interaction.guild, 'no_spam_confirm', { userId, details: 'Sending confirm' });
    const confirmEmbed = new EmbedBuilder()
        .setTitle('🎫 تأكيد فتح تيكت')
        .setDescription('هل أنت متأكد؟')
        .setColor('Yellow');
    
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_confirm_yes').setLabel('Yes ✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ticket_confirm_no').setLabel('No').setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [confirmEmbed], components: [row] });
    await sendStructuredLog(interaction.guild, 'confirm_sent', { userId });
};

export const confirmTicketCreation = async (interaction) => {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const ticketId = await getNextTicketId(guildId);
    
    const channel = await interaction.guild.channels.create({
        name: `ticket-${ticketId}`,
        type: ChannelType.GuildText,
        parent: config.openCategoryId,
        permissionOverwrites: [
            {
                id: interaction.guild.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: userId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
            },
            // Management initially CANNOT see the ticket
            ...allowedRoles.map(roleId => ({
                id: roleId,
                deny: [PermissionFlagsBits.ViewChannel]
            }))
        ]
    });

    const ticketData = {
        guildId,
        ticketId,
        userId,
        channelId: channel.id
    };

    await createTicket(ticketData);

    const ticket = await getTicketByChannelId(channel.id);

    // Mention msg separate
    await channel.send(`<@${userId}> Please wait for support team response... 🎫`);

    // Welcome Row (No claim button here anymore)
    const welcomeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_close').setLabel('إغلاق التيكيت').setEmoji('🔒').setStyle(ButtonStyle.Danger)
    );
    
    const welcome = new EmbedBuilder()
        .setTitle('🎫 مرحباً بك!')
        .setDescription(`أهلاً بك <@${userId}>، سيتم الرد عليك قريباً من قبل فريق الدعم.\nيمكنك الضغط على الزر أدناه لإغلاق التيكيت إذا انتهيت.`)
        .setColor(Colors.Blue)
        .setTimestamp();

    await channel.send({
        embeds: [welcome],
        components: [welcomeRow]
    });

    await interaction.update({ content: `تم فتح التيكيت بنجاح: ${channel} 🎫`, components: [], embeds: [] });

    // Send Claim Prompt to management channel
    const claimChannel = interaction.guild.channels.cache.get(config.claimChannelId);
    if (claimChannel) {
        const pingRoles = allowedRoles.map(roleId => `<@&${roleId}>`).join(' ');
        const promptMsg = await claimChannel.send({
            content: `📢 تيكيت جديد بانتظار الاستلام! ${pingRoles}`,
            embeds: [claimPromptEmbed(ticket)],
            components: [claimPromptRow()]
        });
        await updateClaimPromptMessageId(channel.id, promptMsg.id);
    }

    // Log
    await sendStructuredLog(interaction.guild, 'ticket_created', { userId, ticketId, channel: channel.id });
};

export const handleCloseTicket = async (interaction) => {
    const confirmEmbed = new EmbedBuilder()
        .setTitle('🔒 Close Confirmation')
        .setDescription('Are you sure to close ticket?')
        .setColor(Colors.Orange);

    await interaction.reply({ 
        embeds: [confirmEmbed], 
        components: [closeConfirmRowClose()], 
        ephemeral: true 
    });
};

export const executeCloseTicket = async (interaction) => {
    const ticket = await getTicketByChannelId(interaction.channelId);
    if (!ticket) {
        const errEmbed = new EmbedBuilder()
            .setDescription('Ticket not found!')
            .setColor('Red');
        return interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }

    // Complete deny user access
    if (ticket.userId) {
        await interaction.channel.permissionOverwrites.edit(ticket.userId.toString(), {
            ViewChannel: false,
            SendMessages: false,
            ReadMessageHistory: false
        }, { reason: 'Ticket closed' }).catch(err => console.error(`Failed to remove perms for user ${ticket.userId}:`, err));
    }

    // Lock everyone SendMessages (@everyone role)
    await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { 
        SendMessages: false 
    }).catch(err => console.error('Failed to lock everyone perms:', err));

    // Move user to welcome channel if in voice
    const welcomeChannel = interaction.guild.channels.cache.get(config.welcomeChannel);
    const member = await interaction.guild.members.fetch(ticket.userId).catch(() => null);
    
    // Send DM to user
    if (member) {
        await member.send({ embeds: [ticketClosedDMEmbed(ticket, interaction.user, interaction.guild)] }).catch(() => {
            console.log(`Could not send DM to user ${ticket.userId}`);
        });

        if (member.voice.channel) {
            await member.voice.setChannel(welcomeChannel).catch(() => {});
        }
    }

    // Update DB
    await updateTicketStatus(interaction.channelId, 'closed', interaction.user.id);

    // Rename & move
    await interaction.channel.setName(`closed-${ticket.ticketId}`);
    await interaction.channel.setParent(config.closedCategoryId);

    await interaction.channel.send({ embeds: [closedEmbed(interaction.user)] });

    // Support controls
    await interaction.channel.send({
        embeds: [new EmbedBuilder()
            .setTitle('Support team ticket controls')
            .setDescription('```\n[Copy this block for logs]\n```')
            .setColor(Colors.Blue)
        ],
        components: [supportControlsRow()]
    });

    const closeSuccessEmbed = new EmbedBuilder()
        .setDescription('✅ Ticket closed')
        .setColor('Green');
    await interaction.update({ embeds: [closeSuccessEmbed], components: [] });

    await sendStructuredLog(interaction.guild, 'ticket_closed', { userId: interaction.user.id, ticketId: ticket.ticketId, channel: interaction.channelId });
};

export const handleClaimTicket = async (interaction) => {
    const ticket = await getTicketByChannelId(interaction.channelId || interaction.message.channelId); // Handle both in-ticket and claim-channel buttons
    
    // Find the actual ticket if the interaction is from the claim channel
    let targetTicket = ticket;
    if (!targetTicket && interaction.channelId === config.claimChannelId) {
        // If interaction came from claim channel, we need to find the ticket by the message ID
        // (Wait, database.js doesn't have getTicketByClaimMessageId, but we can search for it)
        const TicketModel = (await import('../models/Ticket.js')).default;
        targetTicket = await TicketModel.findOne({ claimPromptMessageId: interaction.message.id });
    }

    if (!targetTicket) {
        return interaction.reply({ content: 'عذراً، لم يتم العثور على التيكيت فى قاعدة البيانات.', ephemeral: true });
    }

    if (targetTicket.claimedBy) {
        const claimedEmbed = new EmbedBuilder()
            .setDescription(`عذراً، هذا التيكيت تم استلامه بالفعل من قبل <@${targetTicket.claimedBy}>!`)
            .setColor('Yellow');
        return interaction.reply({ embeds: [claimedEmbed], ephemeral: true });
    }

    const newTicket = await claimTicket(targetTicket.channelId, interaction.user.id);
    if (!newTicket) {
        return interaction.reply({ content: 'فشل استلام التيكيت، ربما استلمه شخص آخر بالفعل.', ephemeral: true });
    }

    const ticketChannel = interaction.guild.channels.cache.get(targetTicket.channelId);
    if (ticketChannel) {
        // Reveal channel to all management roles
        for (const roleId of allowedRoles) {
            await ticketChannel.permissionOverwrites.edit(roleId, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                ManageChannels: true
            }).catch(e => console.error(`Failed to update perms for role ${roleId}:`, e));
        }

        // Send claim embed in ticket channel
        await ticketChannel.send({ embeds: [claimedInTicketEmbed(interaction.user, targetTicket)] });
    }

    // Update claim message in claim channel
    if (interaction.channelId === config.claimChannelId) {
        await interaction.update({
            content: `✅ تم استلام التيكيت بواسطة <@${interaction.user.id}>`,
            embeds: [claimedInClaimChannelEmbed(targetTicket, interaction.user)],
            components: [] // Hide buttons
        });
    } else {
        await interaction.reply({ content: '✅ تم استلام التيكيت بنجاح!', ephemeral: true });
    }

    await sendStructuredLog(interaction.guild, 'ticket_claimed', { userId: interaction.user.id, ticketId: targetTicket.ticketId, channel: targetTicket.channelId });
};

export const handleReopenTicket = async (interaction) => {
    const ticket = await getTicketByChannelId(interaction.channelId);
    if (ticket.status !== 'closed') return;

    await updateTicketStatus(interaction.channelId, 'open', interaction.user.id);
    await interaction.channel.setName(`ticket-${ticket.ticketId}`);
    await interaction.channel.setParent(config.openCategoryId);

    // Restore user perms + mention
    await interaction.channel.permissionOverwrites.edit(ticket.userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
    });
    await interaction.channel.send(`<@${ticket.userId}> Ticket reopened! 🔓`);

    await interaction.reply({ content: `**Ticket reopened by <@${interaction.user.id}>**`, ephemeral: true });

    await sendStructuredLog(interaction.guild, 'ticket_reopened', { userId: interaction.user.id, ticketId: ticket.ticketId, channel: interaction.channelId });
};

export const handleDeleteTicket = async (interaction) => {
    const ticket = await getTicketByChannelId(interaction.channelId);
    await sendStructuredLog(interaction.guild, 'ticket_deleted', { userId: interaction.user.id, ticketId: ticket?.ticketId || 'N/A', channel: interaction.channelId });
    await updateTicketStatus(interaction.channelId, 'closed', interaction.user.id);
    await interaction.channel.delete();
};

const sendStructuredLog = async (guild, event, data = {}) => {
    try {
        const logChannel = guild.channels.cache.get(config.logsChannelId);
        if (!logChannel) return;

        const client = guild.client;
        const user = data.userId ? await client.users.fetch(data.userId).catch(() => null) : null;

        let titleEmoji = '📋', color = 0x2F3136, titleText = event;
        switch(event.toLowerCase()) {
            case 'ticket_created': titleEmoji = '🎫'; color = 0x2ECC71; titleText = 'فتح تيكيت جديد'; break;
            case 'ticket_closed': titleEmoji = '🔒'; color = 0xE74C3C; titleText = 'تم إغلاق التيكيت'; break;
            case 'ticket_claimed': titleEmoji = '✅'; color = 0x3498DB; titleText = 'تم استلام التيكيت'; break;
            case 'ticket_reopened': titleEmoji = '🔓'; color = 0xF1C40F; titleText = 'إعادة فتح التيكيت'; break;
            case 'ticket_deleted': titleEmoji = '🗑️'; color = 0x95A5A6; titleText = 'حذف التيكيت نهائياً'; break;
            case 'spam_detected': titleEmoji = '❌'; color = 0xE67E22; titleText = 'كشف محاولة سبام'; break;
            case 'old_ticket_cleaned': titleEmoji = '🧹'; color = 0x1ABC9C; titleText = 'تنظيف تيكيت قديم'; break;
            case 'db_error': titleEmoji = '⚠️'; color = 0x992D22; titleText = 'خطأ في قاعدة البيانات'; break;
            case 'defer_failed': titleEmoji = '⚠️'; color = 0x992D22; titleText = 'فشل الرد السريع'; break;
            default: titleEmoji = '📑'; color = 0x2F3136; titleText = event;
        }

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: user ? `${user.tag} (${user.id})` : 'نظام التيكيت', 
                iconURL: user ? user.displayAvatarURL({ dynamic: true }) : client.user.displayAvatarURL() 
            })
            .setTitle(`${titleEmoji} ${titleText}`)
            .setColor(color)
            .setThumbnail(user ? user.displayAvatarURL({ dynamic: true, size: 256 }) : client.user.displayAvatarURL())
            .addFields(
                { name: '👤 المنفذ/المستخدم', value: data.userId ? `<@${data.userId}>` : '`System`', inline: true },
                { name: '🎫 التيكيت', value: data.ticketId ? `\`#${data.ticketId}\`` : data.channel ? `<#${data.channel}>` : '`N/A`', inline: true }
            )
            .setFooter({ 
                text: `${guild.name} • سجلات التيكيت`, 
                iconURL: client.user.displayAvatarURL({ dynamic: true }) 
            })
            .setTimestamp();

        if (data.details) {
            embed.addFields({ name: '📝 تفاصيل إضافية', value: `\`\`\`\n${data.details}\n\`\`\``, inline: false });
        }

        await logChannel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Structured log failed:', err);
    }
};
