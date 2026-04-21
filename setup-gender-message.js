import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import config from './config/config.js';

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

client.once('ready', async () => {
  console.log('Bot ready for gender message setup!');
  
  const channelId = '1494164521038905398';
  const channel = await client.channels.fetch(channelId);
  if (!channel) {
    console.error('Channel not found!');
    process.exit(1);
  }

  const embed = new EmbedBuilder()
    .setTitle('🎭 حدد جنسك')
    .setDescription('اضغط على الزر أدناه لتحديد جنسك (للخصوصية الصوتية)')
    .setColor('#00ff00');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('gender_male').setLabel('ولد 👨').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('gender_female').setLabel('بنت 👩').setStyle(ButtonStyle.Secondary)
  );

  await channel.send({ content: '@everyone', embeds: [embed], components: [row] });
  console.log('✅ Gender selection message sent!');
  process.exit(0);
});

client.login(config.token);
