import mongoose from 'mongoose';

const TimerThemeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    backgroundPath: { type: String, required: true },
    circleColor: { type: String, default: '#FFD700' },
    textColor: { type: String, default: '#FFFFFF' },
    font: { type: String, default: 'Candara' },
    glowColor: { type: String, default: 'rgba(255, 215, 0, 0.5)' }
});

export default mongoose.model('TimerTheme', TimerThemeSchema);
