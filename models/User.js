import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    allowedGuilds: {
        type: [String], // Array of Guild IDs
        default: []
    },
    permissions: {
        canManageUsers: { type: Boolean, default: false },
        canToggleBot: { type: Boolean, default: false },
        canManageCommands: { type: Boolean, default: false }
    },
    name: {
        type: String,
        default: 'مستخدم'
    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
