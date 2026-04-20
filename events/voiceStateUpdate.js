import { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import PrivateVC from '../models/PrivateVC.js';

const jointocreateId = '1494164521630306369';
const creatingChannels = new Set();

export default async (oldState, newState) => {
    console.log('voiceStateUpdate event triggered');

    const { member, guild } = newState;

    if (!guild) {
        console.log('No guild found on newState — skipping');
        return;
    }

    console.log(`Guild ID: ${guild.id}`);

    const allowedServers = process.env.ALLOW_SERVER?.split(',') || [];
    console.log(`Allowed servers: [${allowedServers.join(', ')}]`);

    if (!allowedServers.includes(guild.id)) {
        console.log(`Guild ${guild.id} is not in the allowed servers list — skipping`);
        return;
    }

    console.log(`User joining channel: ${newState.channelId ?? 'none'} | leaving channel: ${oldState.channelId ?? 'none'}`);

    // 1. User joins the "Join to Create" channel
    if (newState.channelId === jointocreateId) {
        console.log('User joined Join to Create channel - creating new VC');

        if (creatingChannels.has(member.id)) {
            console.log(`Member ${member.id} is already in the creation queue — skipping duplicate`);
            return;
        }
        creatingChannels.add(member.id);

        try {
            // Check if user already has an active channel (Search by ownerId only due to unique index)
            let vcData = await PrivateVC.findOne({ ownerId: member.id });
            console.log(`Existing VC data for member ${member.id}: ${vcData ? JSON.stringify({ channelId: vcData.channelId, name: vcData.name }) : 'none'}`);
            
            if (vcData && vcData.channelId) {
                const activeChannel = guild.channels.cache.get(vcData.channelId);
                if (activeChannel) {
                    console.log(`Member ${member.id} already has an active channel (${vcData.channelId}) — kicking back`);
                    await member.voice.setChannel(null).catch(() => {});
                    const dm = await member.createDM().catch(() => null);
                    if (dm) dm.send('أنت تملك قناة خاصة نشطة بالفعل!').catch(() => {});
                    return;
                }
            }

            // Get trigger channel to find its parent category
            const triggerChannel = await guild.channels.fetch(jointocreateId).catch(() => null);
            const parentId = triggerChannel ? triggerChannel.parentId : null;
            console.log(`Trigger channel parent category ID: ${parentId ?? 'none'}`);
            
            // Use saved settings or defaults
            const channelName = vcData?.name || `${member.user.username}'s VC`;
            const userLimit = vcData?.limit || 0;
            console.log(`Creating channel with name="${channelName}", userLimit=${userLimit}`);

            const newChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: parentId,
                userLimit: userLimit,
                permissionOverwrites: [
                    {
                        id: guild.id, // @everyone
                        allow: vcData?.isHidden ? [] : ['ViewChannel'],
                        deny: (vcData?.isHidden ? ['ViewChannel'] : []).concat(vcData?.isLocked ? ['Connect'] : [])
                    },
                    {
                        id: member.id, // The creator
                        allow: ['ManageChannels', 'MoveMembers', 'DeafenMembers', 'MuteMembers', 'Connect', 'ViewChannel'],
                    },
                ],
            });

            console.log(`New channel created: ${newChannel.id}`);

            // Initial Trusted/Blocked permissions
            if (vcData) {
                for (const userId of vcData.trustedUsers) {
                    await newChannel.permissionOverwrites.edit(userId, { Connect: true, ViewChannel: true }).catch(() => {});
                }
                for (const userId of vcData.blockedUsers) {
                    await newChannel.permissionOverwrites.edit(userId, { Connect: false }).catch(() => {});
                }
            }

            // Update or create DB record
            if (vcData) {
                vcData.channelId = newChannel.id;
                await vcData.save();
            } else {
                vcData = await PrivateVC.create({
                    channelId: newChannel.id,
                    ownerId: member.id,
                    guildId: guild.id,
                    name: channelName,
                    limit: userLimit,
                    trustedUsers: [],
                    blockedUsers: []
                });
            }

            // Move the user to the new channel
            await member.voice.setChannel(newChannel);

            // Send Control Panel (Check if channel still exists)
            const exists = guild.channels.cache.has(newChannel.id);
            if (!exists) return;

            const embed = new EmbedBuilder()
                .setTitle('👑 لوحة تحكم الغرفة الملكية')
                .setDescription('مرحباً بك مجدداً! تم استعادة إعدادات غرفتك السابقة تلقائياً. تحكم في مملكتك من هنا.')
                .setColor('#FFD700');


            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('vc_rename').setLabel('الاسم').setEmoji('✏️').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('vc_privacy_menu').setLabel('الخصوصية').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vc_limit').setLabel('العدد').setEmoji('👥').setStyle(ButtonStyle.Secondary)
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('vc_trust').setLabel('ثقة').setEmoji('🤝').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('vc_block').setLabel('حظر').setEmoji('🚫').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('vc_transfer').setLabel('نقل ملكية').setEmoji('👑').setStyle(ButtonStyle.Danger)
            );

            const row3 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('vc_trusted_list').setLabel('قائمة الموثوقين').setEmoji('📜').setStyle(ButtonStyle.Primary)
            );

            await newChannel.send({
                content: `<@${member.id}>`,
                embeds: [embed],
                components: [row1, row2, row3]
            }).catch(() => {});

        } catch (error) {
            console.error(`Error creating channel: ${error.message}`);
            console.error(error);
        } finally {
            creatingChannels.delete(member.id);
        }
    }

    // 2. User leaves a channel
    if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const oldChannel = oldState.channel;
        
        const vcData = await PrivateVC.findOne({ channelId: oldState.channelId });
        if (vcData && oldChannel.members.size === 0) {
            try {
                await oldChannel.delete();
                // Clear active channel but KEEP settings
                vcData.channelId = null;
                await vcData.save();
            } catch (error) {
                // Silence
            }
        }
    }
};


