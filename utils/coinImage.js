import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function generateCoinCard(username, avatarURL, balance) {
    const width = 800;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Background
    try {
        const background = await loadImage(path.join(__dirname, '../imgs/coin_bg.png'));
        ctx.drawImage(background, 0, 0, width, height);
    } catch (e) {
        // Fallback color if image fails
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);
    }

    // 2. Add Blur Effect (Transparent overlay)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, width, height);

    // 3. User Avatar
    try {
        const avatar = await loadImage(avatarURL);
        const avatarSize = 150;
        const x = width / 2;
        const y = height / 2 - 40;

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, x - avatarSize / 2, y - avatarSize / 2, avatarSize, avatarSize);
        ctx.restore();

        // Avatar Border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(x, y, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.stroke();
    } catch (e) {
        console.error('Error loading avatar for canvas:', e);
    }

    // 4. Text: COINS
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COINS', width / 2, height / 2 + 100);

    // 5. Text: Balance
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 60px sans-serif';
    ctx.fillText(balance.toLocaleString(), width / 2, height / 2 + 160);

    return canvas.toBuffer('image/png');
}
