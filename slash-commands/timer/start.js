import { ChannelType, MessageFlags } from 'discord.js';
import TimerManager from '../../utils/TimerManager.js';
import TimerSession from '../../models/TimerSession.js';

export async function handleStartTimer(interaction) {
    const studyTime = interaction.options.getInteger('study_time');
    const breakTime = interaction.options.getInteger('break_time');
    const cycles = interaction.options.getInteger('cycles');
    const theme = interaction.options.getString('theme') || 'sunset';

    // 1. Restriction: Only in Voice Channel text chats
    if (interaction.channel.type !== ChannelType.GuildVoice) {
        return interaction.reply({ 
            content: '❌ هذا الأمر مخصص فقط لشات الروم الصوتي. يرجى استخدامه داخل شات الروم الذي تدرس فيه.', 
            flags: [MessageFlags.Ephemeral] 
        });
    }

    // 2. Prevent duplicate timers in the same channel
    const active = await TimerSession.findOne({ channelId: interaction.channel.id });
    if (active && active.status !== 'finished') {
        return interaction.reply({ 
            content: '❌ يوجد تايمر يعمل بالفعل في هذا الروم!', 
            flags: [MessageFlags.Ephemeral] 
        });
    }

    await interaction.deferReply();

    try {
        await TimerManager.startTimer(interaction, {
            studyTime,
            breakTime,
            totalCycles: cycles,
            themeName: theme
        });
    } catch (error) {
        console.error('Timer Start Error:', error);
        await interaction.editReply({ content: '❌ حدث خطأ أثناء تشغيل التايمر.' });
    }
}
