import config from '../config/config.js';
import { EmbedBuilder } from 'discord.js';

export default (member) => {
    const allowedServers = process.env.ALLOW_SERVER?.split(',') || [];
    if (!allowedServers.includes(member.guild.id)) return;

    const channel = member.guild.channels.cache.get(config.welcomeChannel);
    if (!channel) {
        console.log(`Welcome channel ${config.welcomeChannel} not found`);
        return;
    }

        const mentionChannels = [
            '1494164521038905403',
            '1494164521378517068',
            '1494164521378517064'
        ];

        const mentionStrings = mentionChannels.map(id => `<#${id}>`);


        channel.send({ content: member.toString() });

        const serverIcon = member.guild.iconURL({ dynamic: true, size: 4096 });

        const embed = new EmbedBuilder()
            .setDescription(`
                ✧･ﾟ: *✧･ﾟ:* 　　 *:･ﾟ✧*:･ﾟ✧
            
                ︵‿︵‿୨♡୧‿︵‿︵
                𝓢𝓣𝓤𝓓𝓨 𝓗𝓔𝓡𝓔
                ︶‿︶‿୨♡୧‿︶‿︶
            
                ˚ ༘♡ ⋆｡˚˱ 𓈒 𓈊 ┈ 𓈒 ˲ˏˋ°
            
                𝐖𝐞𝐥𝐜𝐨𝐦𝐞 𝐭𝐨  𝐬𝐭𝐮𝐝𝐲 𝐡𝐞𝐫𝐞 ${member} :heart:
            
                .𖥔 ݁ ˖ ✦ 𝐓𝐚𝐤𝐞 𝐲𝐨𝐮𝐫 𝐭𝐢𝐦𝐞, 𝐬𝐭𝐚𝐫𝐭 𝐬𝐦𝐚𝐥𝐥, 𝐤𝐞𝐞𝐩 𝐠𝐨𝐢𝐧 ✦ ˖ 𖥔.
            
                ${mentionStrings.join('\n            ')}
            
                ‧₊˚ 𝐘𝐨𝐮’𝐫𝐞 𝐡𝐞𝐫𝐞 𝐭𝐨 𝐠𝐫𝐨𝐰, 𝐧𝐨𝐭 𝐭𝐨 𝐫𝐮𝐬𝐡 — 𝐣𝐮𝐬𝐭 𝐞𝐧𝐣𝐨𝐲 𝐭𝐡𝐞 𝐯𝐢𝐛𝐞 ˚₊‧ 
            
                ✧･ﾟ: *✧･ﾟ:* 　　 *:･ﾟ✧*:･ﾟ✧
            `)
            .setColor('#001741')
            .setThumbnail(serverIcon);

        channel.send({ embeds: [embed] }).catch(console.error);
};