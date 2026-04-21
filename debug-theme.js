import mongoose from 'mongoose';
import TimerTheme from './models/TimerTheme.js';
import 'dotenv/config';

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017/bot";

const debug = async () => {
    try {
        await mongoose.connect(mongoUrl);
        console.log('--- DB CONNECTION SUCCESS ---');
        const theme = await TimerTheme.findOne({ name: 'focus' });
        if (theme) {
            console.log('FOUND THEME:', JSON.stringify(theme, null, 2));
        } else {
            console.log('THEME "focus" NOT FOUND IN DB');
        }
        process.exit(0);
    } catch (err) {
        console.error('DEBUG ERROR:', err);
        process.exit(1);
    }
};

debug();
