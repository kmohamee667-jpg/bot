import mongoose from 'mongoose';

const PrivateVCSchema = new mongoose.Schema({
    channelId: { type: String, unique: true, sparse: true }, // Changed to sparse because it can be null when inactive
    ownerId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true },
    name: { type: String },
    limit: { type: Number, default: 0 },
    trustedUsers: [{ type: String }],
    blockedUsers: [{ type: String }],
    isLocked: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false }
});

export default mongoose.model('PrivateVC', PrivateVCSchema);
