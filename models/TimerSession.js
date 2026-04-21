import mongoose from 'mongoose';

const TimerSessionSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true, unique: true }, // Restricted to 1 timer per channel
    voiceChannelId: { type: String },
    startedBy: { type: String, required: true },
    studyTime: { type: Number, required: true }, // in minutes
    breakTime: { type: Number, required: true },
    totalCycles: { type: Number, required: true },
    currentCycle: { type: Number, default: 1 },
    status: { type: String, enum: ['study', 'break', 'finished'], default: 'study' },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    theme: { type: String, default: 'sunset' },
    messageId: { type: String }
});

export default mongoose.model('TimerSession', TimerSessionSchema);
