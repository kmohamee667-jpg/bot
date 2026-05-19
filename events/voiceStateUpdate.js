import { ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import PrivateVC from '../models/PrivateVC.js';
import { generatePVCGuideImage } from '../utils/pvcImage.js';
import Coin from '../models/Coin.js';

const jointocreateId = '1494164521630306369';
const creatingChannels = new Set();
const voiceJoinTimes = new Map(); // key: userId, value: Date

export default async (oldState, newState) => {
    console.log('voiceStateUpdate event triggered');

    const { member, guild } = newState;

    if (!guild) {
        console.log('No guild found on newState — skipping');
        return;
    }

    const userId = member.id;
    const guildId = guild.id;

    // --- DYNAMIC VOICE TIME TRACKING FOR COIN CARD ---
    try {
        const oldChannel = oldState.channelId;
        const newChannel = newState.channelId;

        if (!oldChannel && newChannel) {
            // User joined a voice channel
            voiceJoinTimes.set(userId, new Date());
        } else if (oldChannel && !newChannel) {
            // User left a voice channel
            const joinTime = voiceJoinTimes.get(userId);
            if (joinTime) {
                const diffMs = Date.now() - joinTime.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                if (diffMins > 0) {
                    await Coin.updateOne(
                        { guildId, userId },
                        { $inc: { voiceTime: diffMins } },
                        { upsert: true }
                    );
                }
                voiceJoinTimes.delete(userId);
            }
        } else if (oldChannel && newChannel && oldChannel !== newChannel) {
            // User moved voice channels -> Update their time and reset join time
            const joinTime = voiceJoinTimes.get(userId);
            if (joinTime) {
                const diffMs = Date.now() - joinTime.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                if (diffMins > 0) {
                    await Coin.updateOne(
                        { guildId, userId },
                        { $inc: { voiceTime: diffMins } },
                        { upsert: true }
                    );
                }
            }
            voiceJoinTimes.set(userId, new Date());
        }
    } catch (err) {
        console.error('[Voice Time Tracking Error]:', err);
    }

    console.log(`Guild ID: ${guild.id}`);

    const allowedServers = process.env.ALLOW_SERVER?.split(',').map(id => id.trim()).filter(id => id) || [];
    console.log(`Parsed allowed servers: ${JSON.stringify(allowedServers)}`);

    console.log(`Checking if guild "${guild.id}" is in [${allowedServers.join(', ')}]`);
    if (!allowedServers.includes(guild.id)) {
        console.log(`Guild ${guild.id} is not in the allowed servers list — skipping`);
        return;
    }

    console.log(`User joining channel: ${newState.channelId ?? 'none'} | leaving channel: ${oldState.channelId ?? 'none'}`);

    // --- Dynamic JTC Locking/Unlocking ---
    if (oldState.channelId !== newState.channelId) {
        try {
            const jtcChannel = guild.channels.cache.get(jointocreateId);
            if (jtcChannel) {
                // If user is in ANY channel that is NOT the JTC itself, lock JTC for them
                if (newState.channelId && newState.channelId !== jointocreateId) {
                    await jtcChannel.permissionOverwrites.edit(member.id, { 
                        Connect: false,
                        ViewChannel: false
                    }).catch(() => {});
                } 
                // If user is NOT in any channel, unlock JTC for them
                else if (!newState.channelId) {
                    await jtcChannel.permissionOverwrites.delete(member.id).catch(() => {});
                }
            }
        } catch (err) {
            console.error('[JTC Permission Sync Error]:', err);
        }
    }

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
                const activeChannel = guild.channels.cache.get(vcData.channelId) || await guild.channels.fetch(vcData.channelId).catch(() => null);
                if (activeChannel) {
                    // If the old channel is empty, delete it before creating a new one
                    if (activeChannel.members.size === 0) {
                        console.log(`Deleting old empty channel ${activeChannel.id} for owner ${member.id}`);
                        await activeChannel.delete().catch(() => {});
                    } else {
                        console.log(`Old channel ${activeChannel.id} is still active with members. Proceeding to create new one as requested.`);
                    }
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
                        allow: [],
                        deny: ['ViewChannel']
                    },
                    {
                        id: member.id, // The creator
                        allow: ['ManageChannels', 'MoveMembers', 'DeafenMembers', 'MuteMembers', 'Connect', 'ViewChannel'],
                    },
                ],
            });

            // Apply privacyMode permissions
            if (vcData?.privacyMode === 'all') {
                await newChannel.permissionOverwrites.edit(guild.id, { ViewChannel: true });
            } else if (vcData?.privacyMode === 'female') {
                const femaleRole = guild.roles.cache.find(r => r.name === 'female' || r.name === 'بنات');
                if (femaleRole) {
                    await newChannel.permissionOverwrites.edit(femaleRole.id, { ViewChannel: true });
                }
            } else if (vcData?.privacyMode === 'male') {
                const maleRole = guild.roles.cache.find(r => r.name === 'male' || r.name === 'ولاد');
                if (maleRole) {
                    await newChannel.permissionOverwrites.edit(maleRole.id, { ViewChannel: true });
                }
            }

            // Apply lock/hide
            if (vcData?.isHidden) {
                await newChannel.permissionOverwrites.edit(guild.id, { ViewChannel: false });
            }
            if (vcData?.isLocked) {
                await newChannel.permissionOverwrites.edit(guild.id, { Connect: false });
            }

            console.log(`New channel created: ${newChannel.id}`);
            console.log('✅ تم انشاء قناه خاصه');

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
                    blockedUsers: [],
                    privacyMode: 'all',
                    isLocked: false,
                    isHidden: false
                });
            }

            // Move the user to the new channel
            await member.voice.setChannel(newChannel);

            // Send Control Panel (Check if channel still exists)
            const exists = guild.channels.cache.has(newChannel.id);
            if (!exists) return;

            const privacyText = vcData ? {
                all: 'تظهر للولاد والبنات 👥',
                female: 'تظهر للبنات بس 👩',
                male: 'تظهر للولاد بس 👨'
            }[vcData.privacyMode] || 'تظهر للكل 👥' : 'تظهر للكل 👥';

            const limitText = vcData?.limit === 0 ? 'مفتوح 👥' : `${vcData.limit} عضو`;

            const lockText = vcData?.isLocked ? 'مقفول 🔒' : 'مفتوح 🔓';
            const hideText = vcData?.isHidden ? 'مخفي 👻' : 'ظاهر 👁️';

            const embed = new EmbedBuilder()
                .setTitle('👑 لوحة تحكم الغرفة الملكية')
                .setDescription('مرحباً بك مجدداً! تم استعادة إعدادات غرفتك السابقة تلقائياً.\n\nاستخدم الأزرار بالأسفل لإدارة غرفتك الصوتية بالكامل.')
                .setColor('#FFD700')
                .setImage('attachment://pvc_guide.png');


            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('vc_rename').setEmoji('📝').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vc_privacy_menu').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vc_limit').setEmoji('👥').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vc_status').setEmoji('📊').setStyle(ButtonStyle.Secondary)
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('vc_trust').setEmoji('🤝').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vc_block').setEmoji('🚫').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vc_transfer').setEmoji('👑').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('vc_trusted_list').setEmoji('📜').setStyle(ButtonStyle.Secondary)
            );

            console.log(`Generating and sending dynamic VC control panel guide to channel ${newChannel.id}`);
            const guideImageBuffer = await generatePVCGuideImage().catch(() => null);

            await newChannel.send({
                content: `<@${member.id}>`,
                embeds: [embed],
                components: [row1, row2],
                files: guideImageBuffer ? [{ attachment: guideImageBuffer, name: 'pvc_guide.png' }] : []
            }).catch(err => console.error('[VC Panel Send Fail]:', err));
            console.log('[VC Panel] Sent successfully');

        } catch (error) {
            console.error('❌ فشل انشاء القناه:', error);
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


