import mongoose from 'mongoose';

const warningSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, required: true },
    warningId: { type: Number, required: true }, // Sequential ID per user in this guild
    pointsAtTime: { type: Number, required: true },
    status: { type: String, enum: ['active', 'resolved'], default: 'active' },
    resolvedBy: { type: String },
    resolutionReason: { type: String, default: 'No reason provided' },
    createdAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date }
});

// Index for fast lookups
warningSchema.index({ guildId: 1, userId: 1, warningId: 1 }, { unique: true });

const Warning = mongoose.model('Warning', warningSchema);
export default Warning;
