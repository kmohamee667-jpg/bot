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
import { createTicketRow, closeConfirmRow, closeConfirmRowClose, ticketControlsRow, supportControlsRow, welcomeEmbed, closedEmbed, claimPromptEmbed, claimPromptRow } from './buttonsHandler.js';
import { getNextTicketId, createTicket, getUserOpenTicket, getTicketByChannelId, updateTicketStatus, claimTicket } from './database.js';

export { initTicketSystem };

const allowedRoles = config.allowedTicketRoles;

export const handleCreateTicket = async (interaction) => {
    console.log('🎫 [CREATE-TICKET] START - User:', interaction.user.tag, 'Guild:', interaction.guild.id);
    
    try {
        await interaction.deferReply({ ephemeral: true });
    } catch (deferErr) {
        console.error('Defer failed:', deferErr);
        return;
    }
    
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    
    console.log('🔍 Checking spam for user:', userId);
    let openTicket;
    try {
        openTicket = await getUserOpenTicket(userId, guildId);
    } catch (dbErr) {
        console.error('DB spam check failed:', dbErr);
    }
    
    if (openTicket) {
        const channel = interaction.guild.channels.cache.get(openTicket.channelId);
        if (!channel) {
            await updateTicketStatus(openTicket.channelId, 'closed', interaction.user.id);
            const cleanEmbed = new EmbedBuilder()
                .setDescription('تم تنظيف تيكت قديم محذوف تلقائياً ✅\nيمكنك فتح تيكت جديد.')
                .setColor('Green');
            await interaction.editReply({ embeds: [cleanEmbed] });
            return;
        }
        console.log('❌ SPAM DETECTED - Open ticket:', openTicket.ticketId);
        const spamEmbed = new EmbedBuilder()
            .setDescription(`لديك تيكيت مفتوح: <#${openTicket.channelId}> 🎫`)
            .setColor('Orange');
        await interaction.editReply({ embeds: [spamEmbed] });
        return;
    }
    
    console.log('✅ No spam - sending confirm');
    const confirmEmbed = new EmbedBuilder()
        .setTitle('🎫 تأكيد فتح تيكت')
        .setDescription('هل أنت متأكد؟')
        .setColor('Yellow');
    
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_confirm_yes').setLabel('نعم ✅').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ticket_confirm_no').setLabel('لا').setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [confirmEmbed], components: [row] });
    console.log('✅ CONFIRM SENT');
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
            ...allowedRoles.map(roleId => ({
                id: roleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
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
    await channel.send(`<@${userId}> يرجى الانتظار حتى يتم الرد عليك من فريق الدعم... 🎫`);

    // Welcome embed
    await channel.send({
        embeds: [welcomeEmbed(interaction.user)]
    });

    // Hide from user
    await channel.permissionOverwrites.edit(userId, {
        ViewChannel: false
    });

    // Admin claim prompt
    await channel.send({
        embeds: [claimPromptEmbed(ticket)],
        components: [claimPromptRow()]
    });

    // Ping admins
    const pingRoles = allowedRoles.map(roleId => `<@&${roleId}>`).join(' ');
    await channel.send(pingRoles);

    await interaction.update({ content: `تم إنشاء تيكيتك: ${channel}`, components: [], embeds: [] });

    // Log
    await sendLog(interaction.guild, `**تيكيت جديد مفتوح** 🎫\n<@${userId}> → <#${channel.id}> (ID: ${ticketId})`);
};

export const handleCloseTicket = async (interaction) => {
    const confirmEmbed = new EmbedBuilder()
        .setTitle('🔒 تأكيد الإغلاق')
        .setDescription('هل أنت متأكد من إغلاق التيكيت؟')
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
            .setDescription('تيكيت غير موجود!')
            .setColor('Red');
        return interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }

    // Complete deny user access
    await interaction.channel.permissionOverwrites.edit(ticket.userId, {
        ViewChannel: false,
        SendMessages: false,
        ReadMessageHistory: false
    }, { reason: 'Ticket closed' });

    // Lock everyone SendMessages
    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { 
        SendMessages: false 
    });

    // Move user to welcome channel if in voice
    const welcomeChannel = interaction.guild.channels.cache.get(config.welcomeChannel);
    const member = await interaction.guild.members.fetch(ticket.userId).catch(() => null);
    if (member && member.voice.channel) {
        await member.voice.setChannel(welcomeChannel).catch(() => {});
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
        .setDescription('✅ تم إغلاق التيكيت')
        .setColor('Green');
    await interaction.update({ embeds: [closeSuccessEmbed], components: [] });

    await sendLog(interaction.guild, `**تيكيت مغلق** 🔒\n<@${interaction.user.id}> أغلق <#${interaction.channelId}> (ID: ${ticket.ticketId})`);
};

export const handleClaimTicket = async (interaction) => {
    const ticket = await getTicketByChannelId(interaction.channelId);
    if (ticket.claimedBy) {
        const claimedEmbed = new EmbedBuilder()
            .setDescription(`تم استلام التيكيت بالفعل بواسطة <@${ticket.claimedBy}>!`)
            .setColor('Yellow');
        return interaction.reply({ embeds: [claimedEmbed], ephemeral: true });
    }

    const newTicket = await claimTicket(interaction.channelId, interaction.user.id);
    if (!newTicket) {
        const claimErrEmbed = new EmbedBuilder()
            .setDescription('خطأ في استلام التيكيت!')
            .setColor('Red');
        return interaction.reply({ embeds: [claimErrEmbed], ephemeral: true });
    }

    // Restore user perms
    await interaction.channel.permissionOverwrites.edit(ticket.userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
    });

    // Delete claim prompt
    const messages = await interaction.channel.messages.fetch({ limit: 20 });
    const promptMsg = messages.find(msg => msg.embeds[0] && msg.embeds[0].title.includes('استلام'));
    if (promptMsg) {
        await promptMsg.delete().catch(() => {});
    }

    // Public confirm msg
    const publicText = `\`\`\n✅ تم استلام التيكيت بواسطة <@${interaction.user.id}>\nهذه التيكيت خاصة بـ <@${ticket.userId}>\nتم فتحها في ${ticket.createdAt.toLocaleString('ar-EG')}\n\`\`\``;
    await interaction.channel.send({
        content: publicText,
        embeds: [new EmbedBuilder()
            .setDescription('تم الاستلام بنجاح')
            .setThumbnail(interaction.user.displayAvatarURL())
            .setColor('Green')
        ]
    });

    const claimSuccessEmbed = new EmbedBuilder()
        .setDescription('✅ تم استلام التيكيت!')
        .setColor('Green');
    await interaction.reply({ embeds: [claimSuccessEmbed], ephemeral: true });

    await sendLog(interaction.guild, `**تيكيت مستلم** ✅\n<@${interaction.user.id}> استلم <#${interaction.channelId}> (ID: ${ticket.ticketId})`);
};

export const handleReopenTicket = async (interaction) => {
    const ticket = await getTicketByChannelId(interaction.channelId);
    if (ticket.status !== 'closed') return;

    await updateTicketStatus(interaction.channelId, 'open', interaction.user.id);
    await interaction.channel.setName(`ticket-${ticket.ticketId}`);
    await interaction.channel.setParent(config.openCategoryId);

    // Restore user perms
    await interaction.channel.permissionOverwrites.edit(ticket.userId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
    });

    await interaction.reply({ content: `**Ticket Opened by <@${interaction.user.id}>** 🔓`, ephemeral: true });

    await sendLog(interaction.guild, `**تيكيت مفتوح** 🔓\n<@${interaction.user.id}> أعاد فتح <#${interaction.channelId}> (ID: ${ticket.ticketId})`);
};

export const handleDeleteTicket = async (interaction) => {
    const ticket = await getTicketByChannelId(interaction.channelId);
    await sendLog(interaction.guild, `**تيكيت محذوف** 🗑️\n<@${interaction.user.id}> حذف <#${interaction.channelId}> (ID: ${ticket?.ticketId || 'N/A'})`);
      await updateTicketStatus(interaction.channelId, 'closed', interaction.user.id);
    await interaction.channel.delete();
};

const sendLog = async (guild, content) => {
    try {
        const logChannel = guild.channels.cache.get(config.logsChannelId);
        if (logChannel) {
            await logChannel.send(content);
        }
    } catch (err) {
        console.error('Log send failed:', err);
    }
};

