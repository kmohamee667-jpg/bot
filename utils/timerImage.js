import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register Custom Font
try {
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/Welcome Darling.otf'), 'Welcome Darling');
} catch (err) {
    console.error('[Font Registration Error]:', err);
}

/**
 * Generates a Pomodoro Timer image with a circular progress bar and countdown text.
 * @param {string} timeString - Format "MM:SS"
 * @param {number} percentage - 0 to 1 representing progress (0 = full, 1 = empty)
 * @param {Object} theme - Theme configuration
 */
export async function generateTimerImage(timeString, percentage, theme = {}) {
    const width = 800; // Rectangular
    const height = 450;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const {
        backgroundPath = path.join(__dirname, '../imgs/timer_sunset.png'),
        circleColor = '#FFFFFF', // Default White
        textColor = '#FFFFFF',
        font = 'Welcome Darling' // Use our new premium font!
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 180; // Larger circle

    // 3. Draw Static Background Circle (Track)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Draw Progress Arc (White, No Glow)
    ctx.save();
    ctx.strokeStyle = circleColor;
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';

    const startAngle = -Math.PI / 2; // Top
    const endAngle = startAngle + (2 * Math.PI * percentage);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
    ctx.stroke();
    ctx.restore();

    // 5. Text Rendering
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    
    // Shadows for maximum visibility
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(0, 0, 0, 1)';
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // A. Countdown Timer (Smaller Font)
    ctx.font = `bold 110px "${font}", Arial`; 
    ctx.fillText(timeString, centerX, centerY - 10);

    // B. Motivational Text "KEEP GOING" (Smaller Font)
    ctx.font = `italic 32px "${font}", Arial`;
    ctx.fillText('KEEP GOING', centerX, centerY + 80);

    return canvas.toBuffer('image/png');
}
