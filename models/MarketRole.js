import mongoose from 'mongoose';

const marketRoleSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    roleId: { type: String, required: true, unique: true },
    price: { type: Number, required: true }
});

const MarketRole = mongoose.model('MarketRole', marketRoleSchema);

export default MarketRole;
