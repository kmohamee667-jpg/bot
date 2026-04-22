import mongoose from 'mongoose';

const coinSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    balance: { type: Number, default: 0 },
    studyTime: { type: Number, default: 0 }
}, { timestamps: true });

// Ensure unique record per user in a guild
coinSchema.index({ guildId: 1, userId: 1 }, { unique: true });

const Coin = mongoose.model('Coin', coinSchema);
export default Coin;
