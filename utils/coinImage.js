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
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);
    }

    // 2. Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, width, height);

    // 3. User Avatar
    try {
        const avatar = await loadImage(avatarURL);
        const avatarSize = 150;
        const x = width / 2;
        const y = height / 2 - 50;

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, x - avatarSize / 2, y - avatarSize / 2, avatarSize, avatarSize);
        ctx.restore();

        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(x, y, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.stroke();
    } catch (e) {
        console.error('Error loading avatar:', e);
    }

    // Text Settings
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    // 4. "Coins" Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.fillText('Coins', width / 2, 270);

    // 5. Balance Text
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 80px Arial, sans-serif';
    
    // Add a strong stroke and shadow for maximum visibility
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 0, 0, 1)';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    const balanceText = balance.toLocaleString();
    ctx.strokeText(balanceText, width / 2, 350);
    ctx.fillText(balanceText, width / 2, 350);

    return canvas.toBuffer('image/png');
}
