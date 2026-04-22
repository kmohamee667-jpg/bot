import { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { generateTimerImage } from './timerImage.js';
import TimerSession from '../models/TimerSession.js';
import TimerTheme from '../models/TimerTheme.js';
import PrivateVC from '../models/PrivateVC.js';
import Coin from '../models/Coin.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class TimerManager {
    constructor() {
        this.timers = new Map(); // channelId -> timeout/interval object
    }

    startRewardInterval(client) {
        // Run every minute (60000 ms)
        setInterval(async () => {
            try {
                // Find all active study sessions
                const activeSessions = await TimerSession.find({ status: 'study' });
                
                for (const session of activeSessions) {
                    const guild = client.guilds.cache.get(session.guildId);
                    if (!guild) continue;
                    
                    const channel = guild.channels.cache.get(session.voiceChannelId);
                    if (!channel || !channel.isVoiceBased()) continue;
                    
                    // For each member in the voice channel
                    for (const [, member] of channel.members) {
                        if (member.user.bot) continue; // Skip bots
                        
                        let reward = 1;
                        // Reward 2 if camera or stream is on
                        if (member.voice.selfVideo || member.voice.streaming) {
                            reward = 2;
                        }
                        
                        // Update Coin balance and studyTime
                        await Coin.findOneAndUpdate(
                            { guildId: guild.id, userId: member.id },
                            { $inc: { balance: reward, studyTime: 1 } },
                            { upsert: true }
                        );
                    }
                }
            } catch (err) {
                console.error('[Study Reward Error]:', err);
            }
        }, 60000);
    }

    async startTimer(interaction, config) {
        const { channel, user, guild } = interaction;
        const { studyTime, breakTime, totalCycles, themeName } = config;

        // Try to find theme in DB, fallback and seed if missing
        let theme = await TimerTheme.findOne({ name: themeName });
        
        // Auto-seed/Update default themes
        if (themeName === 'sunset') {
            theme = await TimerTheme.findOneAndUpdate(
                { name: 'sunset' },
                {
                    backgroundPath: path.join(__dirname, '../imgs/timer_sunset.png'),
                    circleColor: '#FFFFFF',
                    textColor: '#FFFFFF',
                    font: 'Welcome Darling',
                    showCircle: true,
                    motivationalText: 'KEEP GOING',
                    glowColor: 'rgba(255, 255, 255, 0)'
                },
                { upsert: true, returnDocument: 'after' }
            );
        } else if (themeName === 'focus') {
            theme = await TimerTheme.findOneAndUpdate(
                { name: 'focus' },
                {
                    backgroundPath: path.join(__dirname, '../imgs/timer_foucs.png'),
                    circleColor: '#FFFFFF',
                    textColor: '#FFFFFF',
                    font: 'Sports World',
                    showCircle: false,
                    motivationalText: 'STAY FOCUSED',
                    glowColor: 'rgba(255, 255, 255, 0)'
                },
                { upsert: true, returnDocument: 'after' }
            );
        }
        
        // Final fallback if still not found (e.g., custom theme name that doesn't exist)
        if (!theme) {
            theme = await TimerTheme.findOne({ name: themeName }) || { 
                name: 'sunset', 
                font: 'Welcome Darling', 
                showCircle: true, 
                motivationalText: 'KEEP GOING', 
                circleColor: '#FFFFFF', 
                textColor: '#FFFFFF' 
            };
        }

        // Clear any old session for this channel to prevent duplicate key error
        await TimerSession.deleteMany({ channelId: channel.id });

        const session = await TimerSession.create({
            guildId: guild.id,
            channelId: channel.id,
            voiceChannelId: channel.id, // In VC text chat, channel IS the VC
            startedBy: user.id,
            studyTime,
            breakTime,
            totalCycles,
            currentCycle: 1,
            status: 'study',
            endTime: new Date(Date.now() + studyTime * 60000),
            theme: theme.name
        });

        await this.runLoop(interaction, session, theme);
    }

    async runLoop(interaction, session, theme) {
        const interval = setInterval(async () => {
            const currentSession = await TimerSession.findById(session._id);
            if (!currentSession || currentSession.status === 'finished') {
                this.stopTimer(session.channelId);
                return;
            }

            const now = Date.now();
            let remaining = currentSession.endTime - now;

            if (remaining <= 0) {
                await this.handleTransition(interaction, currentSession, theme);
                return;
            }

            // Update Image & Message
            await this.updateMessage(interaction, currentSession, theme, remaining);
        }, 10000); // 10 seconds

        this.timers.set(session.channelId, interval);
    }

    async updateMessage(interaction, session, theme, remainingMs) {
        const totalDuration = (session.status === 'study' ? session.studyTime : session.breakTime) * 60000;
        const percentage = remainingMs / totalDuration;
        
        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.floor((remainingMs % 60000) / 1000);
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Fetch latest channel info for member count
        const channel = interaction.guild.channels.cache.get(interaction.channelId);
        const memberCount = channel?.members.size || 0;
        const channelName = channel?.name || 'الغرفة الصوتية';

        const imageBuffer = await generateTimerImage(timeString, percentage, theme);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'timer.png' });

        const themeIcon = theme.name === 'sunset' ? '🌅' : '⏱️';

        const embed = new EmbedBuilder()
            .setTitle(`⏱️ ${session.status === 'study' ? 'وقت الدراسة' : 'وقت الراحة'} - دورة ${session.currentCycle}/${session.totalCycles}`)
            .addFields(
                { name: '📍 الروم', value: `\`${channelName}\``, inline: true },
                { name: '👥 الأعضاء', value: `\`${memberCount}\` عضو`, inline: true },
                { name: '🎨 الثيم', value: `${themeIcon} \`${theme.name}\``, inline: true },
                { name: '👤 المنشئ', value: `<@${session.startedBy}>`, inline: true },
                { name: '⚙️ الحالة', value: session.status === 'study' ? '📖 دراسة بتركيز' : '☕ استراحة قصيرة', inline: false }
            )
            .setImage('attachment://timer.png')
            .setColor('#FFFFFF') 
            .setFooter({ text: `༺ مِـنْ أَثَـرِ الرَّاحَةِ فَاتَتْهُ الرَّاحَةُ ༻` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('vc_timer_stop').setLabel('إغلاق التايمر').setStyle(ButtonStyle.Danger)
        );

        try {
            if (session.messageId) {
                const msg = await interaction.channel.messages.fetch(session.messageId).catch(() => null);
                if (msg) {
                    await msg.edit({ embeds: [embed], files: [attachment], components: [row] });
                } else {
                    const newMsg = await interaction.channel.send({ embeds: [embed], files: [attachment], components: [row] });
                    session.messageId = newMsg.id;
                    await session.save();
                }
            } else {
                // First time or resending after transition
                try {
                    // Try to edit the original interaction (works for the first ~15 mins)
                    const reply = await interaction.editReply({ embeds: [embed], files: [attachment], components: [row] });
                    session.messageId = reply.id;
                } catch (err) {
                    // Fallback to sending a new message if interaction expired
                    const newMsg = await interaction.channel.send({ embeds: [embed], files: [attachment], components: [row] });
                    session.messageId = newMsg.id;
                }
                await session.save();
            }
        } catch (err) {
            console.error('[Timer Update Error]:', err);
        }
    }

    async handleTransition(interaction, session, theme) {
        // Delete the current timer message to resend a fresh one
        if (session.messageId) {
            try {
                const msg = await interaction.channel.messages.fetch(session.messageId).catch(() => null);
                if (msg) await msg.delete().catch(() => {});
            } catch (err) {}
            session.messageId = null; // Important: Clear ID so updateMessage sends new
        }

        if (session.status === 'study') {
            // Study ended -> Break started
            const vc = interaction.guild.channels.cache.get(session.voiceChannelId);
            const mentions = vc?.members.map(m => `<@${m.id}>`).join(' ') || '';
            
            const breakStartEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('☕ وقت الاستراحة')
                .setDescription('>>> **انتهى وقت الدراسة! خذ نفساً عميقاً واستمتع بالبريك الآن.**');

            await interaction.channel.send({ content: mentions, embeds: [breakStartEmbed] });

            session.status = 'break';
            session.endTime = new Date(Date.now() + session.breakTime * 60000);
        } else {
            // Break ended -> Study started
            if (session.currentCycle < session.totalCycles) {
                session.status = 'study';
                session.currentCycle += 1;
                session.endTime = new Date(Date.now() + session.studyTime * 60000);
                
                const vc = interaction.guild.channels.cache.get(session.voiceChannelId);
                const mentions = vc?.members.map(m => `<@${m.id}>`).join(' ') || '';

                const studyStartEmbed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setTitle(`🔔 العودة للعمل (دورة ${session.currentCycle})`)
                    .setDescription('>>> **انتهى وقت الراحة! حان الوقت للتركيز والعمل الجاد.** 🎯');

                await interaction.channel.send({ content: mentions, embeds: [studyStartEmbed] });
            } else {
                session.status = 'finished';
                const finishEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎉 مبروك!')
                    .setDescription('>>> **لقد أكملت جميع دورات المذاكرة بنجاح. استمتع بوقتك الآن!**');

                await interaction.channel.send({ embeds: [finishEmbed] });
                this.stopTimer(session.channelId);
            }
        }
        await session.save();

        // Send the new timer message immediately
        if (session.status !== 'finished') {
            const newRemaining = session.endTime - Date.now();
            await this.updateMessage(interaction, session, theme, newRemaining);
        }
    }

    stopTimer(channelId) {
        const interval = this.timers.get(channelId);
        if (interval) {
            clearInterval(interval);
            this.timers.delete(channelId);
        }
    }
}

export default new TimerManager();
