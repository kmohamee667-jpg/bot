import { 
    PermissionFlagsBits, 
    ChannelType, 
    EmbedBuilder,
    Colors 
} from 'discord.js';
import { 
    PermissionFlagsBits, 
    ChannelType, 
    EmbedBuilder,
    Colors 
} from 'discord.js';
import { initTicketSystem } from './initTicketSystem.js';
import config from '../config/config.js';
import { createTicketRow, closeConfirmRow, ticketControlsRow, supportControlsRow, welcomeEmbed, closedEmbed } from './buttonsHandler.js';
import { getNextTicketId, createTicket, getUserOpenTicket, getTicketByChannelId, updateTicketStatus, claimTicket } from './database.js';

export { initTicketSystem };

const allowedRoles = config.allowedTicketRoles;


export const handleCreateTicket = async (interaction) => {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    
    // Anti-spam check
    const openTicket = await getUserOpenTicket(userId, guildId);
    if (openTicket) {
        return interaction.reply({ content: 'لديك تيكيت مفتوح بالفعل!', ephemeral: true });
    }

    const confirmEmbed = new EmbedBuilder()
        .setTitle('🎫 تأكيد')
        .setDescription('هل أنت متأكد أنك تريد فتح تيكيت؟')
        .setColor(Colors.Yellow);

    await interaction.reply({ 
        embeds: [confirmEmbed], 
        components: [closeConfirmRow()], 
        ephemeral: true 
    });
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

    const welcomeMsg = await channel.send({
        content: `<@${userId}> Welcome`,
        embeds: [welcomeEmbed(interaction.user)],
        components: [ticketControlsRow()]
    });

    const waitMsg = await channel.send('انتظر حتى يتم الرد عليك...');
    
    // Ping allowed roles
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
    if (!ticket) return interaction.reply({ content: 'تيكيت غير موجود!', ephemeral: true });

    // Lock & remove user perms
    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { 
        SendMessages: false, 
        ReadMessageHistory: ticket.status === 'open' ? false : true 
    });
    await interaction.channel.permissionOverwrites.delete(ticket.userId);

    // Update DB
    await updateTicketStatus(interaction.channelId, 'closed', interaction.user.id);

    // Rename & move
    await interaction.channel.setName(`closed-${ticket.ticketId}`);
    await interaction.channel.setParent(config.closedCategoryId);

    await interaction.channel.send({ embeds: [closedEmbed(interaction.user)] });

    // Send support controls
    await interaction.channel.send({
        embeds: [new EmbedBuilder()
            .setTitle('Support team ticket controls')
            .setDescription('```\n[Copy this block for logs]\n```')
            .setColor(Colors.Blue)
        ],
        components: [supportControlsRow()]
    });

    await interaction.update({ content: '✅ تم إغلاق التيكيت', components: [], embeds: [] });

    await sendLog(interaction.guild, `**تيكيت مغلق** 🔒\n<@${interaction.user.id}> أغلق <#${interaction.channelId}> (ID: ${ticket.ticketId})`);
};

export const handleClaimTicket = async (interaction) => {
    const ticket = await claimTicket(interaction.channelId, interaction.user.id);
    if (!ticket) {
        return interaction.reply({ content: 'التيكيت مستلم بالفعل أو مغلق!', ephemeral: true });
    }

    // Hide claim button for others (update message)
    const messages = await interaction.channel.messages.fetch({ limit: 10 });
    const controlMsg = messages.find(msg => msg.components[0]?.components[0]?.customId === 'ticket_claim');
    if (controlMsg) {
        await controlMsg.edit({ components: [ticketControlsRow()] }); // Regenerate without hiding logic yet
    }

    await interaction.reply({ content: `تم استلام التيكيت بواسطة <@${interaction.user.id}> ✅`, ephemeral: true });

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

