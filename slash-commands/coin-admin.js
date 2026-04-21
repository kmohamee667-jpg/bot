import Coin from '../models/Coin.js';
import AdminCommand from '../models/AdminCommand.js';
import { EmbedBuilder, Colors } from 'discord.js';

export async function handleCoinAdminSlash(interaction) {
    const { commandName, options, guild, user: author, member } = interaction;

    // 1. Double check permissions
    const commandPerms = await AdminCommand.findOne({ command: 'coins_system' });
    const isAllowed = author.id === guild.ownerId || 
                      member.roles.cache.some(role => 
                          ['معلم', 'معلمه', 'اونر', 'OWNER'].includes(role.name) || 
                          (commandPerms && commandPerms.roles.includes(role.name))
                      );

    if (!isAllowed) {
        return interaction.reply({ content: '❌ لا تملك صلاحية استخدام هذا الأمر.', ephemeral: true });
    }

    await interaction.deferReply();

    try {
        if (commandName === 'add-coins') {
            const target = options.getUser('user');
            const amount = options.getInteger('amount');

            let coinData = await Coin.findOne({ guildId: guild.id, userId: target.id });
            if (!coinData) coinData = new Coin({ guildId: guild.id, userId: target.id, balance: 0 });

            const oldBalance = coinData.balance;
            coinData.balance += amount;
            await coinData.save();

            // Reply Embed
            const replyEmbed = new EmbedBuilder()
                .setTitle('🪙 تعديل رصيد الكوينات')
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .setColor(Colors.Green)
                .setDescription(`>>> **تـــم إضافة كوينات بنجاح**\n\n**العضو:** <@${target.id}>\n**المبلغ:** \`+${amount}\`\n**الحالة:** \`${oldBalance}\` ➔ \`${coinData.balance}\``)
                .setTimestamp();

            await interaction.editReply({ content: `<@${target.id}>`, embeds: [replyEmbed] });

            // DM
            const dmEmbed = new EmbedBuilder()
                .setTitle('💰 Coins Received')
                .setDescription(`>>> You have received **${amount}** coins from **${author.username}**.\n\n**Balance Update:** \`${oldBalance}\` ➔ \`${coinData.balance}\``)
                .setColor(Colors.Gold)
                .setThumbnail(author.displayAvatarURL({ dynamic: true }))
                .setTimestamp();
            await target.send({ embeds: [dmEmbed] }).catch(() => {});

            // Log
            const logChannel = guild.channels.cache.get('1496073653106905249');
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setAuthor({ name: `إضافة كوينات | ${target.username}`, iconURL: author.displayAvatarURL() })
                    .setColor(Colors.Green)
                    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                    .setDescription(`>>> **عملية إضافة كوينات**\n\n**المستلم:** <@${target.id}>\n**بواسطة:** <@${author.id}>\n**المبلغ:** \`+${amount}\`\n**الحالة:** \`${oldBalance}\` ➔ \`${coinData.balance}\``)
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
            return;
        }

        if (commandName === 'remove-coins') {
            const target = options.getUser('user');
            const amount = options.getInteger('amount');

            let coinData = await Coin.findOne({ guildId: guild.id, userId: target.id });
            if (!coinData || coinData.balance < amount) {
                return interaction.editReply('❌ رصيد العضو لا يكفي للخصم.');
            }

            const oldBalance = coinData.balance;
            coinData.balance -= amount;
            await coinData.save();

            // Reply Embed
            const replyEmbed = new EmbedBuilder()
                .setTitle('🪙 تعديل رصيد الكوينات')
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .setColor(Colors.Red)
                .setDescription(`>>> **تـــم خصم كوينات بنجاح**\n\n**العضو:** <@${target.id}>\n**المبلغ المخصوم:** \`-${amount}\`\n**الحالة:** \`${oldBalance}\` ➔ \`${coinData.balance}\``)
                .setTimestamp();

            await interaction.editReply({ content: `<@${target.id}>`, embeds: [replyEmbed] });

            // DM to user
            const dmEmbed = new EmbedBuilder()
                .setTitle('⚖️ Coins Removed')
                .setDescription(`>>> **${amount}** coins have been removed from your balance by **${author.username}**.\n\n**Balance Update:** \`${oldBalance}\` ➔ \`${coinData.balance}\``)
                .setColor(Colors.Red)
                .setThumbnail(author.displayAvatarURL({ dynamic: true }))
                .setTimestamp();
            await target.send({ embeds: [dmEmbed] }).catch(() => {});

            // Log
            const logChannel = guild.channels.cache.get('1496073806442397787');
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setAuthor({ name: `خصم كوينات | ${target.username}`, iconURL: author.displayAvatarURL() })
                    .setColor(Colors.Red)
                    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                    .setDescription(`>>> **عملية خصم كوينات**\n\n**العضو:** <@${target.id}>\n**بواسطة:** <@${author.id}>\n**المبلغ:** \`-${amount}\`\n**الحالة:** \`${oldBalance}\` ➔ \`${coinData.balance}\``)
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
            return;
        }

        if (commandName === 'reset-coins') {
            const target = options.getUser('user');
            const logChannel = guild.channels.cache.get('1496073806442397787');

            if (target) {
                let coinData = await Coin.findOne({ guildId: guild.id, userId: target.id });
                const oldBalance = coinData ? coinData.balance : 0;
                
                await Coin.findOneAndUpdate({ guildId: guild.id, userId: target.id }, { balance: 0 }, { upsert: true });
                
                // Reply Embed
                const replyEmbed = new EmbedBuilder()
                    .setTitle('🪙 تصفير رصيد الكوينات')
                    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                    .setColor(Colors.Black)
                    .setDescription(`>>> **تـــم تصفير رصيد العضو**\n\n**العضو:** <@${target.id}>\n**الحالة:** \`${oldBalance}\` ➔ \`0\``)
                    .setTimestamp();

                await interaction.editReply({ content: `<@${target.id}>`, embeds: [replyEmbed] });

                // Log
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setAuthor({ name: `تصفير كوينات | ${target.username}`, iconURL: author.displayAvatarURL() })
                        .setColor(Colors.Black)
                        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                        .setDescription(`>>> **عملية تصفير رصيد**\n\n**العضو:** <@${target.id}>\n**بواسطة:** <@${author.id}>\n**الحالة:** \`${oldBalance}\` ➔ \`0\``)
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }
            } else {
                const result = await Coin.updateMany({ guildId: guild.id }, { balance: 0 });
                
                const replyEmbed = new EmbedBuilder()
                    .setTitle('🪙 تصفير شامل')
                    .setColor(Colors.DarkRed)
                    .setDescription(`>>> **تـــم تصفير كوينات السيرفر بالكامل**\n\n**عدد الحسابات المتأثرة:** \`${result.modifiedCount}\``)
                    .setTimestamp();

                await interaction.editReply({ embeds: [replyEmbed] });

                // Log
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setAuthor({ name: `تصفير شامل للكوينات`, iconURL: author.displayAvatarURL() })
                        .setColor(Colors.DarkRed)
                        .setDescription(`>>> **عملية تصفير شامل**\n\n**بواسطة:** <@${author.id}>\n**عدد الحسابات مصفره:** \`${result.modifiedCount}\``)
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
        }

    } catch (error) {
        console.error('Coin Management Error:', error);
        return interaction.editReply('❌ حدث خطأ داخلي أثناء معالجة الأمر.');
    }
}
