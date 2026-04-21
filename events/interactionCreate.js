import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionFlagsBits, UserSelectMenuBuilder, MessageFlags } from 'discord.js';
import config from '../config/config.js';
import PrivateVC from '../models/PrivateVC.js';
import AdminCommand from '../models/AdminCommand.js';
import GuildSettings from '../models/GuildSettings.js';


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
                    await interaction.update({ content: 'تم إلغاء العملية ✅', components: [] });
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
const unknownEmbed = new EmbedBuilder()
    .setDescription('زر غير مدعوم')
    .setColor('Grey');
await interaction.reply({ embeds: [unknownEmbed], flags: [MessageFlags.Ephemeral] });
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

        // Additional check for data-reliant actions
        if (!vcData && interaction.customId !== 'vc_rename' && interaction.customId !== 'vc_limit') {
             // We allow rename/limit to fail gracefully or try to recover
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
            await interaction.reply({ content: 'إعدادات الخصوصية:', components: [new ActionRowBuilder().addComponents(select)], flags: [MessageFlags.Ephemeral] });
        }

        if (interaction.customId === 'vc_limit') {
            const modal = new ModalBuilder().setCustomId('vc_modal_limit').setTitle('تحديد عدد الأعضاء');
            const limitInput = new TextInputBuilder().setCustomId('limit_count').setLabel('العدد (0-99)').setStyle(TextInputStyle.Short).setPlaceholder('0 للغاء الحد').setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
            await interaction.showModal(modal);
        }

        if (interaction.customId === 'vc_trust') {
            const userSelect = new UserSelectMenuBuilder().setCustomId('vc_select_trust').setPlaceholder('اختر العضو لإعطائه الثقة...').setMaxValues(1);
            await interaction.reply({ content: 'اختر العضو من القائمة:', components: [new ActionRowBuilder().addComponents(userSelect)], flags: [MessageFlags.Ephemeral] });
        }

        if (interaction.customId === 'vc_block') {
            const userSelect = new UserSelectMenuBuilder().setCustomId('vc_select_block').setPlaceholder('اختر العضو لحظره...').setMaxValues(1);
            await interaction.reply({ content: 'اختر العضو لحظره:', components: [new ActionRowBuilder().addComponents(userSelect)], flags: [MessageFlags.Ephemeral] });
        }

        if (interaction.customId === 'vc_transfer') {
            const userSelect = new UserSelectMenuBuilder().setCustomId('vc_select_transfer').setPlaceholder('اختر الملك الجديد للروم...').setMaxValues(1);
            await interaction.reply({ content: 'اختر العضو الذي تريد نقل الملكية إليه:', components: [new ActionRowBuilder().addComponents(userSelect)], flags: [MessageFlags.Ephemeral] });
        }

        if (interaction.customId === 'vc_trusted_list') {
            if (vcData.trustedUsers.length === 0) return interaction.reply({ content: 'لا يوجد أعضاء موثوقون.', flags: [MessageFlags.Ephemeral] });
            const select = new StringSelectMenuBuilder().setCustomId('vc_select_untrust').setPlaceholder('اختر عضواً لإزالة الثقة منه...');
            for (const userId of vcData.trustedUsers) {
                const member = await interaction.guild.members.fetch(userId).catch(() => null);
                select.addOptions(new StringSelectMenuOptionBuilder().setLabel(member ? member.user.username : userId).setValue(userId).setEmoji('❌'));
            }
            await interaction.reply({ content: 'قائمة الموثوقين:', components: [new ActionRowBuilder().addComponents(select)], flags: [MessageFlags.Ephemeral] });
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
                return interaction.update({ content: 'تم قفل الروم والشات! 🔒', components: [] });
            } catch (error) {
                console.error(`[VC Privacy Lock Error] Channel: ${channel.id}, User: ${interaction.user.id}`, error);
                return interaction.update({ content: '❌ خطأ في تحديث صلاحيات الروم. تحقق من صلاحيات البوت.', components: [] });
            }
        }
        if (selection === 'privacy_unlock') {
            try {
                await channel.permissionOverwrites.edit(everyone, { Connect: true });
                vcData.isLocked = false;
                await vcData.save();
                return interaction.update({ content: 'تم فتح الروم! 🔓', components: [] });
            } catch (error) {
                console.error(`[VC Privacy Unlock Error] Channel: ${channel.id}, User: ${interaction.user.id}`, error);
                return interaction.update({ content: '❌ خطأ في تحديث صلاحيات الروم. تحقق من صلاحيات البوت.', components: [] });
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
                return interaction.update({ content: 'تم إخفاء وقفل الروم والشات عن الجميع! 👻🔒\n(الموثوقون فقط يمكنهم الرؤية والدخول)', components: [] });
            }
            if (selection === 'privacy_show') {
                try {
                    await channel.permissionOverwrites.edit(everyone, { ViewChannel: true });
                    vcData.isHidden = false;
                    await vcData.save();
                    return interaction.update({ content: 'تم إظهار الروم! 👁️', components: [] });
                } catch (error) {
                    console.error(`[VC Privacy Show Error] Channel: ${channel.id}, User: ${interaction.user.id}`, error);
                    return interaction.update({ content: '❌ خطأ في تحديث صلاحيات الروم. تحقق من صلاحيات البوت.', components: [] });
                }
            }
            if (selection === 'privacy_chat_public') {
                try {
                    await channel.permissionOverwrites.edit(everyone, { SendMessages: true, ReadMessageHistory: true });
                    return interaction.update({ content: 'تم فتح الشات! 💬', components: [] });
                } catch (error) {
                    console.error(`[VC Chat Public Error] Channel: ${channel.id}, User: ${interaction.user.id}`, error);
                    return interaction.update({ content: '❌ خطأ في تحديث صلاحيات الشات. تحقق من صلاحيات البوت.', components: [] });
                }
            }
            if (selection === 'privacy_chat_private') {
                await channel.permissionOverwrites.edit(everyone, { SendMessages: false, ReadMessageHistory: false });
                return interaction.update({ content: 'تم قفل الشات! 📵', components: [] });
            }

            // New gender privacy options
            if (selection === 'privacy_all') {
                await channel.permissionOverwrites.edit(everyone, { ViewChannel: true });
                vcData.privacyMode = 'all';
                await vcData.save();
                return interaction.update({ content: 'تم تعيين الروم لتظهر للكل! 👥', components: [] });
            }

            if (selection === 'privacy_female') {
                const femaleRole = interaction.guild.roles.cache.find(r => r.name === 'female' || r.name === 'بنات');
                await channel.permissionOverwrites.edit(everyone, { ViewChannel: false });
                if (femaleRole) {
                    await channel.permissionOverwrites.edit(femaleRole.id, { ViewChannel: true });
                }
                vcData.privacyMode = 'female';
                await vcData.save();
                return interaction.update({ content: 'تم تعيين الروم لتظهر للبنات فقط! 👩', components: [] });
            }

            if (selection === 'privacy_male') {
                const maleRole = interaction.guild.roles.cache.find(r => r.name === 'male' || r.name === 'ولاد');
                await channel.permissionOverwrites.edit(everyone, { ViewChannel: false });
                if (maleRole) {
                    await channel.permissionOverwrites.edit(maleRole.id, { ViewChannel: true });
                }
                vcData.privacyMode = 'male';
                await vcData.save();
                return interaction.update({ content: 'تم تعيين الروم لتظهر للولاد فقط! 👨', components: [] });
            }
        }

        if (interaction.customId === 'vc_select_untrust') {
            const userId = interaction.values[0];
            vcData.trustedUsers = vcData.trustedUsers.filter(id => id !== userId);
            await vcData.save();
            await channel.permissionOverwrites.delete(userId).catch(() => {});
            return interaction.update({ content: `تم إزالة الثقة من <@${userId}> ✅`, components: [] });
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
            return interaction.update({ content: `تم إعطاء الثقة للعضو <@${userId}>! 🤝`, components: [] });
        }

        if (interaction.customId === 'vc_select_block') {
            if (userId === vcData.ownerId) {
                return interaction.update({ content: 'مينفعش تحظر مالك الروم من الروم! ❌', components: [] });
            }
            if (!vcData.blockedUsers.includes(userId)) {
                vcData.blockedUsers.push(userId);
                await vcData.save();
            }
            await channel.permissionOverwrites.edit(userId, { Connect: false });
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (member && member.voice.channelId === channel.id) await member.voice.setChannel(null);
            return interaction.update({ content: `تم حظر العضو <@${userId}> من الروم! 🚫`, components: [] });
        }

        if (interaction.customId === 'vc_select_transfer') {
            if (userId === interaction.user.id) return interaction.update({ content: 'لا يمكنك نقل الملكية لنفسك!', components: [] });
            
            // Check if new owner already has settings record
            let newOwnerData = await PrivateVC.findOne({ ownerId: userId, guildId: interaction.guild.id });
            if (newOwnerData) {
                if (newOwnerData.channelId) {
                    return interaction.update({ content: 'هذا العضو يملك قناة نشطة بالفعل، لا يمكنه استلام ملكية قناة أخرى حالياً.', components: [] });
                }
                // If the target user has inactive saved settings, delete them to avoid duplicate key error
                await PrivateVC.deleteOne({ _id: newOwnerData._id });
            }

// Transfer permissions - with error handling
            try {
                // 1. Give New Owner permissions
                await channel.permissionOverwrites.edit(userId, { 
                    ManageChannels: true, 
                    MoveMembers: true, 
                    DeafenMembers: true, 
                    MuteMembers: true, 
                    Connect: true, 
                    ViewChannel: true 
                });
                console.log(`[VC Transfer] Granted full perms to new owner ${userId}`);

                // 2. Remove Old Owner permissions
                await channel.permissionOverwrites.delete(interaction.user.id).catch(err => {
                    console.error(`[VC Transfer] Failed to delete old owner perms:`, err);
                });
                
                // 3. If old owner is trusted, keep their trust permissions
                if (vcData.trustedUsers.includes(interaction.user.id)) {
                    await channel.permissionOverwrites.edit(interaction.user.id, { Connect: true, ViewChannel: true }).catch(err => {
                        console.error(`[VC Transfer] Failed to set trust perms for old owner:`, err);
                    });
                }
            } catch (error) {
                console.error(`[VC Transfer Error] Channel ${channel.id}, from ${interaction.user.id} to ${userId}:`, error);
                return interaction.update({ content: '❌ خطأ في نقل الملكية. تأكد من صلاحيات البوت (Manage Channels).', components: [] });
            }

            // Update DB
            vcData.ownerId = userId;
            await vcData.save();

            // Public notification in the channel
            await interaction.update({ content: 'تم تنفيذ طلب نقل الملكية بنجاح. ✅', components: [] });
            return channel.send({ 
                content: `👑 **انتقال ملكية**\nتم نقل ملكية هذه الغرفة من <@${interaction.user.id}> إلى <@${userId}>\nمبروك <@${userId}>، أنت الملك هنا الآن! 👑` 
            });
        }
    }

// === TICKET SYSTEM HANDLERS ===
    // Check if ticket channel first (early return for performance)
    // TOP PRIORITY TICKET - FIRST CHECK
    if (interaction.isButton() && interaction.customId === 'ticket_create') {
        console.log('🎫 [TICKET-CREATE] HIT - User:', interaction.user.tag);
        const { handleCreateTicket } = await import('../ticket/ticketManager.js');
        await handleCreateTicket(interaction);
        return;
    }




    // All other ticket interactions
    if (interaction.customId?.startsWith('ticket_')) {
        const { 
            handleCreateTicket, 
            confirmTicketCreation, 
            handleCloseTicket, 
            executeCloseTicket, 
            handleClaimTicket,
            handleReopenTicket,
            handleDeleteTicket 
        } = await import('../ticket/ticketManager.js');
        
        try {
            console.log('🎫 Processing ticket interaction:', interaction.customId);
            switch (interaction.customId) {
                case 'ticket_confirm_yes':
                    await confirmTicketCreation(interaction);
                    break;
                case 'ticket_close_confirm_yes':
                    await executeCloseTicket(interaction);
                    break;
                case 'ticket_close_confirm_no':
                case 'ticket_confirm_no':
                    await interaction.update({ content: 'تم إلغاء العملية.', components: [], embeds: [] });
                    break;
                case 'ticket_close':
                    await handleCloseTicket(interaction);
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
                    await interaction.reply({ content: 'زر غير معروف!', ephemeral: true });
            }
        } catch (error) {
            console.error('[Ticket Error]:', error);
            await interaction.reply({ content: 'حدث خطأ! حاول مرة أخرى.', ephemeral: true }).catch(() => {});
        }
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
            await interaction.reply({ content: `تم تغيير الاسم إلى: **${newName}** ✅`, flags: [MessageFlags.Ephemeral] });
        }
        if (interaction.customId === 'vc_modal_limit') {
            if (!vcData) return interaction.reply({ content: 'عذراً، لم يتم العثور على بيانات هذه الغرفة.', flags: [MessageFlags.Ephemeral] });
            const limit = parseInt(interaction.fields.getTextInputValue('limit_count'));
            if (isNaN(limit) || limit < 0 || limit > 99) return interaction.reply({ content: 'يرجى إدخال رقم صحيح (0-99).', flags: [MessageFlags.Ephemeral] });
            await channel.setUserLimit(limit);
            vcData.limit = limit;
            await vcData.save();
            await interaction.reply({ content: `تم تحديد العدد إلى: **${limit === 0 ? 'مفتوح' : limit}** 👥`, flags: [MessageFlags.Ephemeral] });
        }
    }

    // === CHAT INPUT COMMANDS (SLASH) ===
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'coins') {
            const { handleCoinsSlash } = await import('../slash-commands/coins.js');
            await handleCoinsSlash(interaction);
        }
    }
};


