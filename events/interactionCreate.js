import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionFlagsBits, UserSelectMenuBuilder, MessageFlags, EmbedBuilder } from 'discord.js';
import config from '../config/config.js';
import PrivateVC from '../models/PrivateVC.js';
import AdminCommand from '../models/AdminCommand.js';
import GuildSettings from '../models/GuildSettings.js';
import TimerSession from '../models/TimerSession.js';
import TimerManager from '../utils/TimerManager.js';


// Cache for administrative permissions to avoid repeated DB calls
let adminCache = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 30000; // 30 seconds

async function getAdminData() {
    const now = Date.now();
    if (!adminCache || now - lastCacheUpdate > CACHE_TTL) {
        adminCache = await AdminCommand.findOne({ command: 'manage_vc_creator' });
        lastCacheUpdate = now;
    }
    return adminCache;
}

export default async (interaction) => {
    // --- WHITELIST GUARD ---
    if (interaction.guild && !config.allowedServers.includes(interaction.guild.id)) return;

    console.log('🤖 Interaction received:', interaction.customId, interaction.channelId);
    
    if (!interaction.guild) return;

    // 1. GENDER BUTTONS (FIRST)
    if (interaction.channelId === '1494164521038905398' && interaction.isButton()) {
        // ... gender code unchanged
        return;
    }

    // 2. TICKET BUTTONS (COMPLETE HANDLER)
    if (interaction.isButton() && (interaction.customId === 'ticket_create' || interaction.customId.startsWith('ticket_'))) {
        console.log('🎫 TICKET PRIORITY HANDLER!');
        const { handleCreateTicket, confirmTicketCreation, handleCloseTicket, executeCloseTicket, handleClaimTicket, handleReopenTicket, handleDeleteTicket } = await import('../ticket/ticketManager.js');
        
        try {
            switch(interaction.customId) {
                case 'ticket_create':
                    await handleCreateTicket(interaction);
                    break;
                case 'ticket_confirm_yes':
                    await confirmTicketCreation(interaction);
                    break;
                case 'ticket_confirm_no':
                case 'ticket_close_confirm_no':
                    await interaction.update({ 
                        embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('>>> **تم إلغاء العملية ✅**')], 
                        components: [] 
                    });
                    break;
                case 'ticket_close':
                    await handleCloseTicket(interaction);
                    break;
                case 'ticket_close_confirm_yes':
                    await executeCloseTicket(interaction);
                    break;
                case 'ticket_claim':
                    await handleClaimTicket(interaction);
                    break;
                case 'ticket_open':
                    await handleReopenTicket(interaction);
                    break;
                case 'ticket_delete':
                    await handleDeleteTicket(interaction);
                    break;
                default:
                    return;
            }
        } catch (error) {
            console.error('🎫 TICKET ERROR:', error);
            try {
                await interaction[interaction.deferred ? 'editReply' : 'reply']({ content: 'خطأ فني - Console.', flags: [MessageFlags.Ephemeral] });
            } catch {}
        }
        return;
    }


    // 3. VC + OTHER SYSTEMS (AFTER TICKET)
    // Check if the server is active in database
    const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
    if (settings && !settings.active) {
        return interaction.reply({ content: 'البوت متوقف حالياً في هذا السيرفر.', flags: [MessageFlags.Ephemeral] });
    }

    const allowedServers = process.env.ALLOW_SERVER?.split(',') || [];
    if (!allowedServers.includes(interaction.guild.id)) return;



    const channel = interaction.channel;
    let vcData = await PrivateVC.findOne({ channelId: interaction.channelId });

    // Fallback: Check if the user is the owner but the channel ID hasn't updated in DB yet
    if (!vcData) {
        vcData = await PrivateVC.findOne({ ownerId: interaction.user.id, guildId: interaction.guild.id });
        if (vcData && !vcData.channelId) {
            vcData.channelId = interaction.channelId;
            await vcData.save().catch(() => {});
        }
    }

    const isOwnerAction = async (customId) => {
        if (!customId.startsWith('vc_')) return false;

        // 1. Admin/Server Owner check (Top Priority)
        if (interaction.user.id === interaction.guild.ownerId) return true;
        if (interaction.member.roles.cache.some(role => role.name === 'OWNER')) return true;
        const adminData = await getAdminData();
        if (adminData) {
            const hasUserPerm = adminData.users.some(u => u.id === interaction.user.id);
            const hasRolePerm = adminData.roles.some(roleName => 
                interaction.member.roles.cache.some(r => r.name === roleName || r.id === roleName)
            );
            if (hasUserPerm || hasRolePerm) return true;
        }

        // 2. Room Owner check
        if (!vcData) {
            console.log(`[VC Debug] No data found for channel: ${interaction.channelId}`);
            return false;
        }
        return interaction.user.id === vcData.ownerId;
    };

    // 1. Handle Buttons
    if (interaction.isButton()) {
        if (!(await isOwnerAction(interaction.customId))) {
            if (interaction.customId.startsWith('vc_')) {
                return interaction.reply({ content: 'أنت لست صاحب هذه الغرفة أو إدارياً للتحكم بها!', flags: [MessageFlags.Ephemeral] });
            }
            return;
        }

        if (interaction.customId === 'vc_rename') {
            const modal = new ModalBuilder().setCustomId('vc_modal_rename').setTitle('تغيير اسم الغرفة');
            const nameInput = new TextInputBuilder().setCustomId('new_name').setLabel('الاسم الجديد').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
            await interaction.showModal(modal);
        }

        if (interaction.customId === 'vc_privacy_menu') {
            const select = new StringSelectMenuBuilder()
                .setCustomId('vc_select_privacy')
                .setPlaceholder('اختر إعداد الخصوصية...')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('قفل الروم').setValue('privacy_lock').setEmoji('🔒'),
                    new StringSelectMenuOptionBuilder().setLabel('فتح الروم').setValue('privacy_unlock').setEmoji('🔓'),
                    new StringSelectMenuOptionBuilder().setLabel('إخفاء الروم').setValue('privacy_hide').setEmoji('👻'),
                    new StringSelectMenuOptionBuilder().setLabel('إظهار الروم').setValue('privacy_show').setEmoji('👁️'),
                    new StringSelectMenuOptionBuilder().setLabel('شات عام').setValue('privacy_chat_public').setEmoji('💬'),
                    new StringSelectMenuOptionBuilder().setLabel('شات خاص').setValue('privacy_chat_private').setEmoji('📵'),
                    new StringSelectMenuOptionBuilder().setLabel('تظهر للبنات بس').setValue('privacy_female').setEmoji('👩'),
                    new StringSelectMenuOptionBuilder().setLabel('تظهر للولاد بس').setValue('privacy_male').setEmoji('👨'),
                    new StringSelectMenuOptionBuilder().setLabel('تظهر للولاد والبنات').setValue('privacy_all').setEmoji('👥')
                );
            await interaction.reply({ 
                embeds: [new EmbedBuilder().setColor('#2B2D31').setDescription('>>> **إعدادات الخصوصية:**')], 
                components: [new ActionRowBuilder().addComponents(select)], 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        if (interaction.customId === 'vc_limit') {
            const modal = new ModalBuilder().setCustomId('vc_modal_limit').setTitle('تحديد عدد الأعضاء');
            const limitInput = new TextInputBuilder().setCustomId('limit_count').setLabel('العدد (0-99)').setStyle(TextInputStyle.Short).setPlaceholder('0 للغاء الحد').setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
            await interaction.showModal(modal);
        }

        if (interaction.customId === 'vc_trust') {
            const userSelect = new UserSelectMenuBuilder().setCustomId('vc_select_trust').setPlaceholder('اختر العضو لإعطائه الثقة...').setMaxValues(1);
            await interaction.reply({ 
                embeds: [new EmbedBuilder().setColor('#2B2D31').setDescription('>>> **اختر العضو من القائمة لإعطائه الثقة:**')], 
                components: [new ActionRowBuilder().addComponents(userSelect)], 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        if (interaction.customId === 'vc_block') {
            const userSelect = new UserSelectMenuBuilder().setCustomId('vc_select_block').setPlaceholder('اختر العضو لحظره...').setMaxValues(1);
            await interaction.reply({ 
                embeds: [new EmbedBuilder().setColor('#2B2D31').setDescription('>>> **اختر العضو الذي تريد حظره من الروم:**')], 
                components: [new ActionRowBuilder().addComponents(userSelect)], 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        if (interaction.customId === 'vc_transfer') {
            const userSelect = new UserSelectMenuBuilder().setCustomId('vc_select_transfer').setPlaceholder('اختر الملك الجديد للروم...').setMaxValues(1);
            await interaction.reply({ 
                embeds: [new EmbedBuilder().setColor('#2B2D31').setDescription('>>> **اختر العضو الذي تريد نقل ملكية الروم إليه:**')], 
                components: [new ActionRowBuilder().addComponents(userSelect)], 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        if (interaction.customId === 'vc_trusted_list') {
            if (vcData.trustedUsers.length === 0) {
                return interaction.reply({ 
                    embeds: [new EmbedBuilder().setColor('#2B2D31').setDescription('>>> **لا يوجد أعضاء موثوقون حالياً.**')], 
                    flags: [MessageFlags.Ephemeral] 
                });
            }
            const select = new StringSelectMenuBuilder().setCustomId('vc_select_untrust').setPlaceholder('اختر عضواً لإزالة الثقة منه...');
            for (const userId of vcData.trustedUsers) {
                const member = await interaction.guild.members.fetch(userId).catch(() => null);
                select.addOptions(new StringSelectMenuOptionBuilder().setLabel(member ? member.user.username : userId).setValue(userId).setEmoji('❌'));
            }
            await interaction.reply({ 
                embeds: [new EmbedBuilder().setColor('#2B2D31').setDescription('>>> **قائمة الموثوقين الحالية:**')], 
                components: [new ActionRowBuilder().addComponents(select)], 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // --- VC TIMER STOP BUTTON ---
        if (interaction.customId === 'vc_timer_stop') {
            const session = await TimerSession.findOne({ channelId: interaction.channelId });
            if (!session) return interaction.reply({ content: 'لا يوجد تايمر يعمل حالياً.', flags: [MessageFlags.Ephemeral] });

            // Permission Check: Only the Starter, Server Owner, or someone with 'OWNER' role
            const isStarter = interaction.user.id === session.startedBy;
            const isGuildOwner = interaction.guild.ownerId === interaction.user.id;
            const isServerAdmin = interaction.member.roles.cache.some(role => role.name === 'OWNER');

            if (!isStarter && !isGuildOwner && !isServerAdmin) {
                return interaction.reply({ 
                    content: '❌ لا تملك صلاحية إيقاف هذا التاييمر (فقط الشخص الذي بدأه أو صاحب السيرفر يمكنهم ذلك).', 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            TimerManager.stopTimer(interaction.channelId);

            // Delete the timer message before deleting the session
            if (session.messageId) {
                const msg = await interaction.channel.messages.fetch(session.messageId).catch(() => null);
                if (msg) await msg.delete().catch(() => {});
            }

            await TimerSession.deleteOne({ _id: session._id });

            await interaction.reply({ 
                embeds: [new EmbedBuilder().setColor('#00FF00').setDescription(`>>> **✅ تم إيقاف التايمر ومسح البيانات بواسطة <@${interaction.user.id}>.**`)] 
            });
        }
    }

    // 2. Handle Select Menus (String)
    if (interaction.isStringSelectMenu()) {
        if (!(await isOwnerAction(interaction.customId))) return;
        if (!vcData) return interaction.reply({ content: 'عذراً، لم يتم العثور على بيانات لهذه الغرفة في قاعدة البيانات.', flags: [MessageFlags.Ephemeral] });

        if (interaction.customId === 'vc_select_privacy') {
            const selection = interaction.values[0];
            const everyone = interaction.guild.roles.everyone;

        if (selection === 'privacy_lock') {
            try {
                await channel.permissionOverwrites.edit(everyone, { Connect: false });
                await new Promise(r => setTimeout(r, 500));
                await channel.permissionOverwrites.edit(everyone, { SendMessages: false, ReadMessageHistory: false });
                vcData.isLocked = true;
                await vcData.save();
                return interaction.update({ 
                    embeds: [new EmbedBuilder().setColor('#2B2D31').setDescription('>>> **تم قفل الروم والشات بنجاح! 🔒**')], 
                    components: [] 
                });
            } catch (error) {
                console.error(`[VC Privacy Lock Error] Channel: ${channel.id}, User: ${interaction.user.id}`, error);
                return interaction.update({ 
                    embeds: [new EmbedBuilder().setColor('#FF4500').setDescription('>>> **❌ خطأ في تحديث صلاحيات الروم.**')], 
                    components: [] 
                });
            }
        }
        if (selection === 'privacy_unlock') {
            try {
                await channel.permissionOverwrites.edit(everyone, { Connect: true });
                vcData.isLocked = false;
                await vcData.save();
                return interaction.update({ 
                    embeds: [new EmbedBuilder().setColor('#2B2D31').setDescription('>>> **تم فتح الروم للجميع! 🔓**')], 
                    components: [] 
                });
            } catch (error) {
                console.error(`[VC Privacy Unlock Error] Channel: ${channel.id}, User: ${interaction.user.id}`, error);
                return interaction.update({ 
                    embeds: [new EmbedBuilder().setColor('#FF4500').setDescription('>>> **❌ خطأ في تحديث صلاحيات فتح الروم.**')], 
                    components: [] 
                });
            }
        }
            if (selection === 'privacy_hide') {
                await channel.permissionOverwrites.edit(everyone, { 
                    ViewChannel: false, 
                    Connect: false,
                    SendMessages: false,
                    ReadMessageHistory: false
                });
                vcData.isHidden = true;
                vcData.isLocked = true;
                await vcData.save();
                return interaction.update({ 
                    embeds: [new EmbedBuilder().setColor('#2B2D31').setDescription('>>> **تم إخفاء وقفل الروم والشات عن الجميع! 👻🔒**')], 
                    components: [] 
                });
            }
            if (selection === 'privacy_show') {
                try {
                    await channel.permissionOverwrites.edit(everyone, { ViewChannel: true });
                    vcData.isHidden = false;
                    await vcData.save();
                    return interaction.update({ 
                        embeds: [new EmbedBuilder().setColor('#2B2D31').setDescription('>>> **تم إظهار الروم للجميع! 👁️**')], 
                        components: [] 
                    });
                } catch (error) {
                    console.error(`[VC Privacy Show Error] Channel: ${channel.id}, User: ${interaction.user.id}`, error);
                    return interaction.update({ 
                        embeds: [new EmbedBuilder().setColor('#FF4500').setDescription('>>> **❌ حدث خطأ أثناء إظهار الروم.**')], 
                        components: [] 
                    });
                }
            }
            if (selection === 'privacy_chat_public') {
                try {
                    await channel.permissionOverwrites.edit(everyone, { SendMessages: true, ReadMessageHistory: true });
                    return interaction.update({ 
                        embeds: [new EmbedBuilder().setColor('#2B2D31').setDescription('>>> **تم فتح الشات للجميع! 💬**')], 
                        components: [] 
                    });
                } catch (error) {
                    console.error(`[VC Chat Public Error] Channel: ${channel.id}, User: ${interaction.user.id}`, error);
                    return interaction.update({ 
                        embeds: [new EmbedBuilder().setColor('#FF4500').setDescription('>>> **❌ حدث خطأ أثناء فتح الشات.**')], 
                        components: [] 
                    });
                }
            }
            if (selection === 'privacy_chat_private') {
                await channel.permissionOverwrites.edit(everyone, { SendMessages: false, ReadMessageHistory: false });
                return interaction.update({ 
                    embeds: [new EmbedBuilder().setColor('#2B2D31').setDescription('>>> **تم جعل الشات خاصاً بالموجودين فقط! 📵**')], 
                    components: [] 
                });
            }

            if (selection === 'privacy_all') {
                await channel.permissionOverwrites.edit(everyone, { ViewChannel: true });
                vcData.privacyMode = 'all';
                await vcData.save();
                return interaction.update({ 
                    embeds: [new EmbedBuilder().setColor('#2B2D31').setDescription('>>> **تم تعيين الروم لتظهر للجميع! 👥**')], 
                    components: [] 
                });
            }

            if (selection === 'privacy_female') {
                const femaleRole = interaction.guild.roles.cache.find(r => r.name === 'female' || r.name === 'بنات');
                await channel.permissionOverwrites.edit(everyone, { ViewChannel: false });
                if (femaleRole) {
                    await channel.permissionOverwrites.edit(femaleRole.id, { ViewChannel: true });
                }
                vcData.privacyMode = 'female';
                await vcData.save();
                return interaction.update({ 
                    embeds: [new EmbedBuilder().setColor('#FF69B4').setDescription('>>> **تم تعيين الروم لتظهر للبنات فقط! 👩**')], 
                    components: [] 
                });
            }

            if (selection === 'privacy_male') {
                const maleRole = interaction.guild.roles.cache.find(r => r.name === 'male' || r.name === 'ولاد');
                await channel.permissionOverwrites.edit(everyone, { ViewChannel: false });
                if (maleRole) {
                    await channel.permissionOverwrites.edit(maleRole.id, { ViewChannel: true });
                }
                vcData.privacyMode = 'male';
                await vcData.save();
                return interaction.update({ 
                    embeds: [new EmbedBuilder().setColor('#1E90FF').setDescription('>>> **تم تعيين الروم لتظهر للولاد فقط! 👨**')], 
                    components: [] 
                });
            }
        }

        if (interaction.customId === 'vc_select_untrust') {
            const userId = interaction.values[0];
            vcData.trustedUsers = vcData.trustedUsers.filter(id => id !== userId);
            await vcData.save();
            await channel.permissionOverwrites.delete(userId).catch(() => {});
            return interaction.update({ 
                embeds: [new EmbedBuilder().setColor('#FF4500').setDescription(`>>> **تم إزالة الثقة من <@${userId}> بنجاح ✅**`)], 
                components: [] 
            });
        }
    }

    // 3. Handle User Select Menus
    if (interaction.isUserSelectMenu()) {
        if (!(await isOwnerAction(interaction.customId))) return;
        if (!vcData) return interaction.reply({ content: 'عذراً، لم يتم العثور على بيانات لهذه الغرفة في قاعدة البيانات.', flags: [MessageFlags.Ephemeral] });
        const userId = interaction.values[0];

        if (interaction.customId === 'vc_select_trust') {
            if (!vcData.trustedUsers.includes(userId)) {
                vcData.trustedUsers.push(userId);
                await vcData.save();
            }
            await channel.permissionOverwrites.edit(userId, { Connect: true, ViewChannel: true });
            return interaction.update({ 
                embeds: [new EmbedBuilder().setColor('#2B2D31').setDescription(`>>> **تم إعطاء الثقة للعضو <@${userId}> بنجاح! 🤝**`)], 
                components: [] 
            });
        }

        if (interaction.customId === 'vc_select_block') {
            if (userId === vcData.ownerId) {
                return interaction.update({ 
                    embeds: [new EmbedBuilder().setColor('#FF4500').setDescription('>>> **لا يمكنك حظر مالك الروم! ❌**')], 
                    components: [] 
                });
            }
            if (!vcData.blockedUsers.includes(userId)) {
                vcData.blockedUsers.push(userId);
                await vcData.save();
            }
            await channel.permissionOverwrites.edit(userId, { Connect: false });
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (member && member.voice.channelId === channel.id) await member.voice.setChannel(null);
            return interaction.update({ 
                embeds: [new EmbedBuilder().setColor('#FF4500').setDescription(`>>> **تم حظر العضو <@${userId}> من الروم بنجاح! 🚫**`)], 
                components: [] 
            });
        }

        if (interaction.customId === 'vc_select_transfer') {
            if (userId === interaction.user.id) return interaction.update({ content: 'لا يمكنك نقل الملكية لنفسك!', components: [] });
            
            let newOwnerData = await PrivateVC.findOne({ ownerId: userId, guildId: interaction.guild.id });
            if (newOwnerData) {
                if (newOwnerData.channelId) {
                    return interaction.update({ content: 'هذا العضو يملك قناة نشطة بالفعل، لا يمكنه استلام ملكية قناة أخرى حالياً.', components: [] });
                }
                await PrivateVC.deleteOne({ _id: newOwnerData._id });
            }

            try {
                await channel.permissionOverwrites.edit(userId, { 
                    ManageChannels: true, 
                    MoveMembers: true, 
                    DeafenMembers: true, 
                    MuteMembers: true, 
                    Connect: true, 
                    ViewChannel: true 
                });
                await channel.permissionOverwrites.delete(interaction.user.id).catch(() => {});
                if (vcData.trustedUsers.includes(interaction.user.id)) {
                    await channel.permissionOverwrites.edit(interaction.user.id, { Connect: true, ViewChannel: true }).catch(() => {});
                }
            } catch (error) {
                return interaction.update({ 
                    embeds: [new EmbedBuilder().setColor('#FF4500').setDescription('>>> **❌ حدث خطأ أثناء محاولة نقل الملكية.**')], 
                    components: [] 
                });
            }

            vcData.ownerId = userId;
            await vcData.save();

            await interaction.update({ 
                embeds: [new EmbedBuilder().setColor('#00FF00').setDescription('>>> **تم تنفيذ طلب نقل الملكية بنجاح. ✅**')], 
                components: [] 
            });
            
            const transferEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('👑 انتقال ملكية')
                .setDescription(`>>> **تم نقل ملكية هذه الغرفة من <@${interaction.user.id}> إلى <@${userId}>**`);

            return channel.send({ embeds: [transferEmbed] });
        }
    }

    // TICKET SYSTEM
    if (interaction.isButton() && (interaction.customId === 'ticket_create' || interaction.customId.startsWith('ticket_'))) {
        const { handleCreateTicket, confirmTicketCreation, handleCloseTicket, executeCloseTicket, handleClaimTicket, handleReopenTicket, handleDeleteTicket } = await import('../ticket/ticketManager.js');
        try {
            switch(interaction.customId) {
                case 'ticket_create': await handleCreateTicket(interaction); break;
                case 'ticket_confirm_yes': await confirmTicketCreation(interaction); break;
                case 'ticket_confirm_no':
                case 'ticket_close_confirm_no': await interaction.update({ content: 'تم إلغاء العملية ✅', components: [] }); break;
                case 'ticket_close': await handleCloseTicket(interaction); break;
                case 'ticket_close_confirm_yes': await executeCloseTicket(interaction); break;
                case 'ticket_claim': await handleClaimTicket(interaction); break;
                case 'ticket_open': await handleReopenTicket(interaction); break;
                case 'ticket_delete': await handleDeleteTicket(interaction); break;
            }
        } catch (error) { console.error('Ticket Error:', error); }
        return;
    }

    // 4. Handle Modals
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'vc_modal_rename') {
            if (!vcData) return interaction.reply({ content: 'عذراً، لم يتم العثور على بيانات هذه الغرفة.', flags: [MessageFlags.Ephemeral] });
            const newName = interaction.fields.getTextInputValue('new_name');
            await channel.setName(newName);
            vcData.name = newName;
            await vcData.save();
            await interaction.reply({ 
                embeds: [new EmbedBuilder().setColor('#2B2D31').setDescription(`>>> **تم تغيير اسم الروم بنجاح إلى: ** \`${newName}\` ✅`)], 
                flags: [MessageFlags.Ephemeral] 
            });
        }
        if (interaction.customId === 'vc_modal_limit') {
            if (!vcData) return interaction.reply({ content: 'عذراً، لم يتم العثور على بيانات هذه الغرفة.', flags: [MessageFlags.Ephemeral] });
            const limitStr = interaction.fields.getTextInputValue('limit_count');
            const limit = parseInt(limitStr);
            if (isNaN(limit) || limit < 0 || limit > 99) {
                return interaction.reply({ 
                    embeds: [new EmbedBuilder().setColor('#FF4500').setDescription('>>> **يرجى إدخال رقم صحيح بين (0-99). ❌**')], 
                    flags: [MessageFlags.Ephemeral] 
                });
            }
            await channel.setUserLimit(limit);
            vcData.limit = limit;
            await vcData.save();
            await interaction.reply({ 
                embeds: [new EmbedBuilder().setColor('#2B2D31').setDescription(`>>> **تم تحديث حد الأعضاء إلى: ** \`${limit === 0 ? 'مفتوح' : limit}\` 👥`)], 
                flags: [MessageFlags.Ephemeral] 
            });
        }
    }


    // 5. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;
        if (commandName === 'coins') {
            const { handleCoinsSlash } = await import('../slash-commands/coins.js');
            await handleCoinsSlash(interaction);
        } else if (['add-coins', 'remove-coins', 'reset-coins'].includes(commandName)) {
            const { handleCoinAdminSlash } = await import('../slash-commands/coin-admin.js');
            await handleCoinAdminSlash(interaction);
        } else if (commandName === 'start') {
            const { handleStartTimer } = await import('../slash-commands/timer/start.js');
            await handleStartTimer(interaction);
        }
    }

    // 6. Handle Autocomplete (Themes)
    if (interaction.isAutocomplete()) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const TimerTheme = (await import('../models/TimerTheme.js')).default;
        
        // 1. Define hardcoded defaults
        const defaultThemes = [
            { name: '🌅 Sunset', value: 'sunset' },
            { name: '🎯 Focus', value: 'focus' }
        ];

        // 2. Fetch all themes from DB
        const dbThemes = await TimerTheme.find({}).catch(() => []);
        
        // 3. Map DB themes to choices format
        const dbChoices = dbThemes.map(theme => ({
            name: `${theme.name === 'sunset' ? '🌅' : theme.name === 'focus' ? '🎯' : '🎨'} ${theme.name.charAt(0).toUpperCase() + theme.name.slice(1)}`,
            value: theme.name
        }));

        // 4. Merge (Avoid duplicates from DB if they are defaults)
        const allChoices = [...defaultThemes];
        dbChoices.forEach(dbChoice => {
            if (!allChoices.find(c => c.value === dbChoice.value)) {
                allChoices.push(dbChoice);
            }
        });

        // 5. Filter by focusedValue
        const filtered = allChoices.filter(choice => 
            choice.name.toLowerCase().includes(focusedValue) || 
            choice.value.toLowerCase().includes(focusedValue)
        ).slice(0, 25);

        await interaction.respond(filtered).catch(() => {});
    }
};
