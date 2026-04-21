import mongoose from 'mongoose';
import TimerTheme from './models/TimerTheme.js';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017/bot";

const seed = async () => {
    try {
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB');

        // 1. Sunset Theme
        await TimerTheme.findOneAndUpdate(
            { name: 'sunset' },
            {
                name: 'sunset',
                backgroundPath: path.join(__dirname, './imgs/timer_sunset.png'),
                circleColor: '#FFFFFF',
                textColor: '#FFFFFF',
                font: 'Welcome Darling',
                showCircle: true,
                motivationalText: 'KEEP GOING',
                glowColor: 'rgba(255, 255, 255, 0)'
            },
            { upsert: true, new: true }
        );
        console.log('✅ Sunset Theme Seeded');

        // 2. Focus Theme
        await TimerTheme.findOneAndUpdate(
            { name: 'focus' },
            {
                name: 'focus',
                backgroundPath: path.join(__dirname, './imgs/timer_foucs.png'),
                circleColor: '#FFFFFF',
                textColor: '#FFFFFF',
                font: 'Super Squad',
                showCircle: false,
                motivationalText: 'STAY FOCUSED',
                glowColor: 'rgba(255, 255, 255, 0)'
            },
            { upsert: true, new: true }
        );
        console.log('✅ Focus Theme Seeded');

        console.log('All themes seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Seed Error:', err);
        process.exit(1);
    }
};

seed();
