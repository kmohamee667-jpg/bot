import AdminCommand from '../../models/AdminCommand.js';
import { EmbedBuilder } from 'discord.js';

export default async (message, args) => {
    // Perms check
    const command = await AdminCommand.findOne({ command: 'adi' });
    if (!command) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ خطأ')
            .setDescription('لم يتم ضبط صلاحيات هذا الأمر بعد.');
        return message.reply({ embeds: [errorEmbed] });
    }

    const isOwner = message.author.id === message.guild.ownerId;
    const hasRole = message.member.roles.cache.some(role => 
        ['معلم', 'معلمه'].includes(role.name.trim())
    );
    const allowedUser = command.users.find(u => u.id === message.author.id);

    if (!isOwner && !hasRole && !allowedUser) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ خطأ في الصلاحيات')
            .setDescription('ليس لديك صلاحية استخدام هذا الأمر.');
        return message.reply({ embeds: [errorEmbed] });
    }

    if (args.length < 2 || !message.mentions.members.first()) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('❌ خطأ في الصيغة')
            .setDescription('الصيغة: `ادي @عضو اسم_الرول`');
        return message.reply({ embeds: [errorEmbed] });
    }

    const targetMember = message.mentions.members.first();
    const roleName = args.slice(1).join(' ').trim();
    const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());

    if (!role) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ خطأ')
            .setDescription(`الرول \`${roleName}\` غير موجود.`);
        return message.reply({ embeds: [errorEmbed] });
    }

    // Hierarchy check: Executor's highest role >= target role
    const executorHighestRole = message.member.roles.highest.position;
    if (role.position >= executorHighestRole) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ خطأ في الصلاحيات')
            .setDescription('لا يمكن إعطاء رول أعلى أو مساوي لرولك الأعلى.');
        return message.reply({ embeds: [errorEmbed] });
    }

    // Check if already has role
    if (targetMember.roles.cache.has(role.id)) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('⚠️')
            .setDescription(`${targetMember} لديه هذا الرول بالفعل.`);
        return message.reply({ embeds: [errorEmbed] });
    }

    try {
        await targetMember.roles.add(role);
        
        const successEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setAuthor({
                name: targetMember.user.username,
                iconURL: targetMember.user.displayAvatarURL()
            })
            .setThumbnail('attachment://role.png')
            .setDescription(`✅ تم إعطاء الرول **\`${role.name}\`** لـ ${targetMember}`)
            .addFields(
                { name: 'بواسطة', value: `<@${message.author.id}>`, inline: true },
                { name: 'القناة', value: `<#${message.channel.id}>`, inline: true }
            )
            .setFooter({ text: `${message.guild.name} | ${message.client.user.username}`, iconURL: message.client.user.displayAvatarURL() })
            .setTimestamp();

        await message.channel.send({ embeds: [successEmbed], files: [{ attachment: 'imgs/role.png', name: 'role.png' }] });
        await message.delete().catch(() => {});
    } catch (error) {
        console.error('[Adi Role Error]:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ خطأ')
            .setDescription('فشل في إعطاء الرول (صلاحيات البوت؟).');
        message.reply({ embeds: [errorEmbed] });
    }
};
