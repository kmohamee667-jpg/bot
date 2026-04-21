import mongoose from 'mongoose';

const TimerThemeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    backgroundPath: { type: String, required: true },
    circleColor: { type: String, default: '#FFFFFF' }, // Default White
    textColor: { type: String, default: '#FFFFFF' },
    font: { type: String, default: 'Welcome Darling' },
    showCircle: { type: Boolean, default: true },
    motivationalText: { type: String, default: 'KEEP GOING' },
    glowColor: { type: String, default: 'rgba(255, 255, 255, 0)' }
});

export default mongoose.model('TimerTheme', TimerThemeSchema);
