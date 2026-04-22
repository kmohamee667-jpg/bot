import { EmbedBuilder } from 'discord.js';
import AdminCommand from '../../models/AdminCommand.js';

export default async function lockCommand(message, args, action) {
    const adminData = await AdminCommand.findOne({ command: 'lock' });
    
    let allowedRoles = [
        'OWNER', 'معلم', 'معلمه',
        '1496373075086803045', '1494164519910510602', '1494164519927156868',
        '1494164520015499394', '1494164519994392741', '1494164519994392740', '1494164519994392739'
    ];
    let allowedUsers = [];

    if (adminData) {
        allowedRoles = adminData.roles || allowedRoles;
        allowedUsers = adminData.users || [];
    }

    const isOwner = message.author.id === message.guild.ownerId;
    const hasRole = message.member.roles.cache.some(r => allowedRoles.includes(r.name) || allowedRoles.includes(r.id));
    const isAllowedUser = allowedUsers.some(u => u.id === message.author.id);
    
    if (!isOwner && !hasRole && !isAllowedUser) return;

    try {
        const channel = message.channel;
        const everyoneRole = message.guild.roles.everyone;

        if (action === 'lock') {
            const embed = new EmbedBuilder()
                .setColor('#aa0808')
                .setDescription('🔒 تم إغلاق الشات بنجاح');
            
            // Execute reply and permissions concurrently for maximum speed
            const promises = [
                message.reply({ embeds: [embed] }),
                channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false })
            ];
            
            // Re-allow the allowed roles concurrently
            for (const roleIdOrName of allowedRoles) {
                const role = message.guild.roles.cache.find(r => r.id === roleIdOrName || r.name === roleIdOrName);
                if (role) {
                    promises.push(channel.permissionOverwrites.edit(role, { SendMessages: true }));
                }
            }

            await Promise.all(promises);
        } else if (action === 'unlock') {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setDescription('🔓 تم فتح الشات بنجاح');
            
            // Execute concurrently
            await Promise.all([
                message.reply({ embeds: [embed] }),
                channel.permissionOverwrites.edit(everyoneRole, { SendMessages: null })
            ]);
        }
    } catch (err) {
        console.error('Error in lock command:', err);
        message.reply({ content: '❌ حدث خطأ أثناء تنفيذ الأمر. تأكد من صلاحيات البوت.' }).catch(() => {});
    }
}
