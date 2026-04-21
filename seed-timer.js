import mongoose from 'mongoose';
import TimerTheme from './models/TimerTheme.js';
import 'dotenv/config';

async function seed() {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to DB');

    await TimerTheme.findOneAndUpdate(
        { name: 'sunset' },
        {
            name: 'sunset',
            backgroundPath: 'imgs/timer_sunset.png',
            circleColor: '#FF4500',
            textColor: '#FFFFFF',
            font: 'Candara',
            glowColor: 'rgba(255, 69, 0, 0.6)'
        },
        { upsert: true, new: true }
    );

    console.log('✅ Sunset theme seeded');
    await mongoose.connection.close();
}

seed();
