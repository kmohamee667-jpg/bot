import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import GIFEncoder from 'gif-encoder-2';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/Cairo-Bold.ttf'), 'Cairo Bold');
GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/Cairo-Regular.ttf'), 'Cairo');

function easeOutExpo(x) {
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

export const generateTicketGif = async (guildName, guildIconUrl, selectOptions = ['💬 دعم عام']) => {
    // Highly optimized settings: Fast smooth entrance, pause at the end
    const width = 680;
    const height = 240;
    const frames = 50;  // 50 frames for slightly slower entrance animation
    const fps = 25;     // Smooth 25 fps

    const encoder = new GIFEncoder(width, height, 'neuquant', true);
    encoder.start();
    encoder.setRepeat(0);   
    encoder.setQuality(5); 

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    let guildImg = null;
    if (guildIconUrl) {
        try {
            guildImg = await loadImage(guildIconUrl);
        } catch(e) { console.error('Failed to load guild icon', e); }
    }

    // Pre-calculate some abstract particles for the background
    const particles = Array.from({ length: 15 }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 2,
        speedY: (Math.random() - 0.5) * 2,
    }));

    for (let i = 0; i < frames; i++) {
        // Normal frame delay
        if (i === frames - 1) {
            encoder.setDelay(5000); // 5 seconds pause at the very last frame!
        } else {
            encoder.setDelay(1000 / fps); // 40ms normal speed
        }

        // Background - Dark Navy
        ctx.fillStyle = '#0a0d16'; 
        ctx.fillRect(0, 0, width, height);

        // Background Grid Pattern (Tech vibe)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < width; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
        for (let y = 0; y < height; y += 40) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
        ctx.stroke();

        // Glowing Orbs
        const pulse = Math.sin((i / frames) * Math.PI) * 0.5 + 0.5; // Half pulse during entrance
        ctx.save();
        const grad1 = ctx.createRadialGradient(width - 150, 60, 10, width - 150, 60, 300);
        grad1.addColorStop(0, `rgba(45, 85, 255, ${0.15 + pulse * 0.1})`);
        grad1.addColorStop(1, 'rgba(10, 13, 22, 0)');
        ctx.fillStyle = grad1;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // Particles
        ctx.fillStyle = `rgba(100, 150, 255, ${0.3 + pulse * 0.2})`;
        particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Timing (50 frames total - approx 2.0 seconds)
        const iconProgress = Math.min(i / 25, 1);
        const iconEased = easeOutExpo(iconProgress);
        
        const textProgress = Math.max(0, Math.min((i - 15) / 25, 1));
        const textEased = easeOutExpo(textProgress);

        const optProgress = Math.max(0, Math.min((i - 25) / 25, 1));
        const optEased = easeOutExpo(optProgress);

        // 0. Left Thick Border (Banner style)
        ctx.fillStyle = '#3a6df0'; // Vibrant blue
        ctx.fillRect(0, 0, 15, height);

        // 1. Draw Icon (From Left to Right)
        if (guildImg) {
            const startX = -150;
            const endX = 50; 
            const currentX = startX + (endX - startX) * iconEased;
            const iconSize = 120; 
            const iconY = (height - iconSize) / 2;

            ctx.save();
            ctx.beginPath();
            ctx.arc(currentX + iconSize/2, iconY + iconSize/2, iconSize/2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(guildImg, currentX, iconY, iconSize, iconSize);
            ctx.restore();
            
            // Ring
            ctx.beginPath();
            ctx.arc(currentX + iconSize/2, iconY + iconSize/2, iconSize/2, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(80, 130, 255, ${iconEased * 0.9})`; 
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // 2. Texts
        const textX = 220; 
        ctx.textAlign = 'left';
        
        // Top subtitle
        ctx.fillStyle = `rgba(130, 140, 160, ${textEased})`;
        ctx.font = 'bold 12px "Segoe UI", Arial'; 
        ctx.fillText(`✦ ${guildName.toUpperCase()} TICKET SYSTEM`, textX, 50);

        // Main Title
        ctx.fillStyle = `rgba(255, 255, 255, ${textEased})`;
        ctx.font = 'bold 38px "Segoe UI", Arial'; 
        ctx.fillText('Ticket System', textX, 95);

        // Options Text
        ctx.fillStyle = `rgba(180, 185, 200, ${optEased})`;
        ctx.font = 'bold 16px "Cairo", "Segoe UI", Arial'; 
        ctx.fillText('اختر نوع التذكرة من القائمة المنسدلة', textX, 135);

        // Line separator
        ctx.beginPath();
        ctx.moveTo(textX, 150);
        ctx.lineTo(textX + 280 * optEased, 150);
        ctx.strokeStyle = `rgba(100, 150, 255, ${optEased * 0.3})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Options List (Dynamic Mapping)
        ctx.fillStyle = `rgba(160, 170, 190, ${optEased})`;
        ctx.font = '16px "Cairo", Arial'; 
        
        // Loop through options and draw them dynamically
        // Support up to 6 options spread across two columns
        selectOptions.forEach((opt, index) => {
            const col = index % 2; // 0 for Right Column (visually right but coordinates are absolute), 1 for Left Column
            const row = Math.floor(index / 2);
            // Actually let's just make it simple: 1 column if few, 2 columns if many
            // We'll draw them sequentially in a grid:
            // x-offset for columns (RTL so first column is on the right)
            const xOffset = col === 0 ? 160 : -10;
            const yOffset = 180 + (row * 25);
            ctx.fillText(opt, textX + xOffset, yOffset);
        });

        encoder.addFrame(ctx);

        // Prevent blocking the Node.js event loop completely
        if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    encoder.finish();
    return encoder.out.getData();
};
