import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure fonts are registered
try {
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/Welcome Darling.otf'), 'Welcome Darling');
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/Super Squad.ttf'), 'Super Squad');
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/coines_market.ttf'), 'Coins Market');
} catch (err) {}

const formatNumber = (num) => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
};

export async function generateMarketImage(rolesData) {
    const width = 1200;
    const padding = 50;
    const boxWidth = 340;
    const boxHeight = 150;
    const gap = 40;

    const cols = 3;
    const rows = Math.ceil(rolesData.length / cols) || 1;
    
    // Add extra padding at the top if we want to write something, but we'll do it via embed
    const height = (rows * boxHeight) + ((rows - 1) * gap) + (padding * 2);
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background (Dark Theme + Image)
    try {
        const bgImage = await loadImage(path.join(__dirname, '../imgs/coin_bg.png'));
        ctx.drawImage(bgImage, 0, 0, width, height);
        // Add overlay
        ctx.fillStyle = 'rgba(30, 31, 34, 0.7)'; // Discord dark with transparency
        ctx.fillRect(0, 0, width, height);
    } catch (e) {
        ctx.fillStyle = '#1e1f22'; // Discord Dark
        ctx.fillRect(0, 0, width, height);
    }

    // Draw Grid
    rolesData.forEach((role, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        const x = padding + (col * (boxWidth + gap));
        const y = padding + (row * (boxHeight + gap));

        // Glassmorphism Box background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'; // Transparent glass effect
        ctx.beginPath();
        ctx.roundRect(x, y, boxWidth, boxHeight, 20);
        ctx.fill();

        const roleColor = role.color && role.color !== '#000000' ? role.color : '#99aab5';

        // Box border matching role color
        ctx.strokeStyle = roleColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Left color indicator
        ctx.fillStyle = roleColor;
        ctx.beginPath();
        ctx.roundRect(x, y, 15, boxHeight, [20, 0, 0, 20]);
        ctx.fill();

        // Role Name
        ctx.fillStyle = roleColor;
        ctx.font = '32px "Coins Market", Arial'; // Use specific font
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        let name = role.name;
        if (ctx.measureText(name).width > boxWidth - 50) {
            name = name.substring(0, 15) + '...';
        }
        ctx.fillText(name, x + 40, y + 50);

        // Price
        ctx.fillStyle = '#D3D3D3'; // Light gray
        ctx.font = 'lighter 26px "Coins Market", Arial';
        ctx.fillText(role.price.toString(), x + 40, y + 100); // Raw number with zeros
    });

    if (rolesData.length === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '40px "Super Squad", Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Market is empty', width / 2, height / 2);
    }

    return canvas.toBuffer('image/png');
}
