import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register Custom Fonts
try {
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/Welcome Darling.otf'), 'Welcome Darling');
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/Super Squad.ttf'), 'Super Squad');
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/Sports World-Regular.ttf'), 'Sports World');
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/coines_market.ttf'), 'Coins Market');
} catch (err) {
    console.error('[Font Registration Error in coinImage]:', err);
}

const formatNumber = (num) => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
};

const formatTime = (minutes) => {
    if (!minutes || minutes <= 0) return '0 دقيقه';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    let str = [];
    if (h > 0) {
        if (h === 1) str.push('ساعه');
        else if (h === 2) str.push('ساعتين');
        else if (h <= 10) str.push(`${h} ساعات`);
        else str.push(`${h} ساعه`);
    }
    if (m > 0) {
        if (m === 1) str.push('دقيقه');
        else if (m === 2) str.push('دقيقتين');
        else if (m <= 10) str.push(`${m} دقائق`);
        else str.push(`${m} دقيقه`);
    }
    return str.join(' و ');
};

export async function generateCoinCard(username, avatarURL, balance, studyTime = 0) {
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
        const avatarSize = 200; // Increased size
        const x = width / 2;
        const y = height / 2 - 40; // Moved slightly up

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, x - avatarSize / 2, y - avatarSize / 2, avatarSize, avatarSize);
        ctx.restore();

        // White Frame
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(x, y, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.stroke();
    } catch (e) {
        console.error('Error loading avatar:', e);
    }

    // Text Settings
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // --- Left Side: Coins ---
    const leftX = width * 0.25;
    
    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '35px "Coins Market", Arial';
    ctx.fillText('Coins', leftX, 320);

    // Value
    ctx.fillStyle = '#D3D3D3'; // Light gray
    ctx.font = '30px "Coins Market", Arial'; // Using second font
    const balanceText = formatNumber(balance);
    ctx.fillText(balanceText, leftX, 360);

    // --- Right Side: Study Time ---
    const rightX = width * 0.75;
    
    // Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '35px "Coins Market", Arial';
    ctx.fillText('Study Time', rightX, 320);

    // Value
    ctx.fillStyle = '#D3D3D3'; // Light gray
    ctx.font = '30px "Coins Market", Arial'; // Using second font
    const timeText = formatTime(studyTime);
    ctx.fillText(timeText, rightX, 360);

    return canvas.toBuffer('image/png');
}
