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
    const width = 600;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const {
        backgroundPath = path.join(__dirname, '../imgs/timer_sunset.png'),
        circleColor = '#FFD700',
        textColor = '#FFFFFF',
        glowColor = 'rgba(255, 215, 0, 0.6)',
        font = 'Candara'
    } = theme;

    // 1. Background
    try {
        const background = await loadImage(backgroundPath);
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
    const radius = 220;

    // 3. Draw Static Background Circle (Track)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Draw Glowing Progress Arc
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = glowColor;
    ctx.strokeStyle = circleColor;
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';

    const startAngle = -Math.PI / 2; // Top
    const endAngle = startAngle + (2 * Math.PI * percentage);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
    ctx.stroke();
    ctx.restore();

    // 5. Draw Countdown Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    
    // Attempt to use theme font or fallback
    ctx.font = `bold 120px ${font}, sans-serif`;
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    
    ctx.fillText(timeString, centerX, centerY);

    return canvas.toBuffer('image/png');
}
