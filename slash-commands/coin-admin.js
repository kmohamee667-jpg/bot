import Coin from '../models/Coin.js';
import AdminCommand from '../models/AdminCommand.js';
import { EmbedBuilder, Colors } from 'discord.js';

export async function handleCoinAdminSlash(interaction) {
    const { commandName, options, guild, user: author, member } = interaction;

    // 1. Double check permissions
    const commandPerms = await AdminCommand.findOne({ command: 'coins_system' });
    const isAllowed = author.id === guild.ownerId || 
                      member.roles.cache.some(role => 
                          ['معلم', 'معلمه', 'OWNER'].includes(role.name) || 
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

            coinData.balance += amount;
            await coinData.save();

            // DM
            const dmEmbed = new EmbedBuilder()
                .setTitle('💰 Coins Received')
                .setDescription(`You have received **${amount}** coins from **${author.username}**.`)
                .addFields(
                    { name: 'Sender', value: author.username, inline: true },
                    { name: 'Amount Received', value: `${amount} coins`, inline: true },
                    { name: 'Current Balance', value: `${coinData.balance} coins`, inline: false }
                )
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
                    .addFields(
                        { name: '👤 المستلم', value: `<@${target.id}>`, inline: true },
                        { name: '👮 بواسطة', value: `<@${author.id}>`, inline: true },
                        { name: '💰 المبلغ', value: `+${amount}`, inline: true },
                        { name: '📊 الرصيد الجديد', value: `${coinData.balance}`, inline: true }
                    ).setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

            return interaction.editReply(`✅ تم إضافة **${amount}** كوين لـ <@${target.id}> بنجاح.`);
        }

        if (commandName === 'remove-coins') {
            const target = options.getUser('user');
            const amount = options.getInteger('amount');

            let coinData = await Coin.findOne({ guildId: guild.id, userId: target.id });
            if (!coinData || coinData.balance < amount) {
                return interaction.editReply('❌ رصيد العضو لا يكفي للخصم.');
            }

            coinData.balance -= amount;
            await coinData.save();

            // Log
            const logChannel = guild.channels.cache.get('1496073806442397787');
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setAuthor({ name: `خصم كوينات | ${target.username}`, iconURL: author.displayAvatarURL() })
                    .setColor(Colors.Red)
                    .addFields(
                        { name: '👤 العضو', value: `<@${target.id}>`, inline: true },
                        { name: '👮 بواسطة', value: `<@${author.id}>`, inline: true },
                        { name: '💰 المبلغ المخصوم', value: `-${amount}`, inline: true },
                        { name: '📊 الرصيد الجديد', value: `${coinData.balance}`, inline: true }
                    ).setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

            return interaction.editReply(`✅ تم خصم **${amount}** كوين من <@${target.id}> بنجاح.`);
        }

        if (commandName === 'reset-coins') {
            const target = options.getUser('user');
            const logChannel = guild.channels.cache.get('1496073806442397787');

            if (target) {
                await Coin.findOneAndUpdate({ guildId: guild.id, userId: target.id }, { balance: 0 }, { upsert: true });
                // Log
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setAuthor({ name: `تصفير كوينات | ${target.username}`, iconURL: author.displayAvatarURL() })
                        .setColor(Colors.Black)
                        .addFields(
                            { name: '👤 العضو', value: `<@${target.id}>`, inline: true },
                            { name: '👮 بواسطة', value: `<@${author.id}>`, inline: true }
                        ).setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }
                return interaction.editReply(`✅ تم تصفير كوينات <@${target.id}> بنجاح.`);
            } else {
                const result = await Coin.updateMany({ guildId: guild.id }, { balance: 0 });
                // Log
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setAuthor({ name: `تصفير شامل للكوينات`, iconURL: author.displayAvatarURL() })
                        .setColor(Colors.DarkRed)
                        .setDescription(`قام <@${author.id}> بتصفير كوينات **جميع** أعضاء السيرفر.`)
                        .addFields({ name: '📊 عدد الحسابات', value: `${result.modifiedCount}`, inline: true })
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }
                return interaction.editReply(`⚠️ تم تصفير كوينات **جميع** الأعضاء بنجاح.`);
            }
        }

    } catch (error) {
        console.error('Coin Management Error:', error);
        return interaction.editReply('❌ حدث خطأ داخلي أثناء معالجة الأمر.');
    }
}
