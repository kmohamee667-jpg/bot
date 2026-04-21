import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Generates a Pomodoro Timer image with a circular progress bar and countdown text.
 * @param {string} timeString - Format "MM:SS"
 * @param {number} percentage - 0 to 1 representing progress (0 = full, 1 = empty)
 * @param {Object} theme - Theme configuration
 */
export async function generateTimerImage(timeString, percentage, theme = {}) {
    const width = 800; // Rectangular
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const {
        backgroundPath = path.join(__dirname, '../imgs/timer_sunset.png'),
        circleColor = '#FFFFFF', // Default White
        textColor = '#FFFFFF',
        font = 'Arial' // Use standard Arial
    } = theme;

    // 1. Background
    try {
        const background = await loadImage(backgroundPath);
        // Cover the whole rectangular area
        ctx.drawImage(background, 0, 0, width, height);
    } catch (e) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);
    }

    // 2. Stronger Dark Overlay for better contrast
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 160; // Adjusted for 400 height

    // 3. Draw Static Background Circle (Track)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Draw Progress Arc (White, No Glow)
    ctx.save();
    ctx.strokeStyle = circleColor;
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';

    const startAngle = -Math.PI / 2; // Top
    const endAngle = startAngle + (2 * Math.PI * percentage);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
    ctx.stroke();
    ctx.restore();

    // 5. Draw Countdown Text (Fix: Use standard font, and draw LAST to be on top)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    
    // Explicitly using Arial and providing a fail-proof string
    ctx.font = `bold 100px Arial`;
    
    // Extra shadow for the text itself to ensure visibility
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 0, 0, 1)';
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    
    ctx.fillText(timeString, centerX, centerY);

    return canvas.toBuffer('image/png');
}
