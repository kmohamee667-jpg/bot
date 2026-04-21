import Coin from '../models/Coin.js';
import AdminCommand from '../models/AdminCommand.js';
import { generateCoinCard } from '../utils/coinImage.js';
import { AttachmentBuilder, EmbedBuilder, Colors, MessageFlags } from 'discord.js';

export async function handleCoinsSlash(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const isSelf = targetUser.id === interaction.user.id;

    // 1. Permission Check for viewing others
    if (!isSelf) {
        const commandPerms = await AdminCommand.findOne({ command: 'coins_system' });
        const isAllowed = interaction.user.id === interaction.guild.ownerId || 
                          interaction.member.roles.cache.some(role => 
                              ['معلم', 'معلمه', 'OWNER'].includes(role.name) || 
                              (commandPerms && commandPerms.roles.includes(role.name))
                          );
        
        if (!isAllowed) {
            return interaction.reply({ content: '❌ لا تملك صلاحية رؤية كوينات الأعضاء الآخرين.', flags: [MessageFlags.Ephemeral] });
        }
    }

    await interaction.deferReply();

    try {
        // 2. Get Balance with robust fetching
        let coinData = await Coin.findOne({ guildId: interaction.guild.id, userId: targetUser.id }).lean();
        const balance = coinData ? Math.floor(coinData.balance) : 0;
        
        console.log(`[Coins Debug] Fetched balance for ${targetUser.id} in ${interaction.guild.id}: ${balance}`);

        // 3. Generate Image
        const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
        const imageBuffer = await generateCoinCard(targetUser.username, avatarURL, balance);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'coins.png' });

        // 4. Create Embed
        const embed = new EmbedBuilder()
            .setTitle(`💰 رصيد الكوينات - ${targetUser.username}`)
            .setDescription(`>>> **الرصيد الحالي:** \`${balance}\` كوين`)
            .setImage('attachment://coins.png')
            .setColor(Colors.Gold)
            .setFooter({ text: `طلب بواسطة: ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed], files: [attachment] });

    } catch (error) {
        console.error('Coins slash error:', error);
        await interaction.editReply({ content: '❌ حدث خطأ أثناء جلب الرصيد.' });
    }
}
