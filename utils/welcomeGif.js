import { createCanvas, loadImage } from '@napi-rs/canvas';
import GIFEncoder from 'gif-encoder-2';

function easeOutExpo(x) {
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}
function easeInOutQuad(x) {
    return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export const generateWelcomeGif = async (username, avatarUrl) => {
    const width = 680;
    const height = 240;
    const frames = 120; // Extended to 120 frames (approx 5 seconds) to make the rotation last longer
    const fps = 25;

    const encoder = new GIFEncoder(width, height, 'neuquant', true);
    encoder.start();
    encoder.setRepeat(0);   
    encoder.setQuality(15); // Quality 15 to ensure fast encoding even with 120 frames

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    let avatarImg = null;
    if (avatarUrl) {
        try {
            avatarImg = await loadImage(avatarUrl);
        } catch(e) { console.error('Failed to load avatar', e); }
    }

    const particles = Array.from({ length: 20 }).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 1.5,
        speedY: (Math.random() - 0.5) * 1.5,
    }));

    for (let i = 0; i < frames; i++) {
        // Continuous animation without a long pause at the end
        encoder.setDelay(1000 / fps);

        ctx.fillStyle = '#0a0d16'; 
        ctx.fillRect(0, 0, width, height);

        // Tech grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < width; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
        for (let y = 0; y < height; y += 40) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
        ctx.stroke();

        const pulse = Math.sin((i / frames) * Math.PI) * 0.5 + 0.5;
        
        ctx.save();
        const grad1 = ctx.createRadialGradient(150, 120, 10, 150, 120, 300);
        grad1.addColorStop(0, `rgba(45, 85, 255, ${0.1 + pulse * 0.05})`);
        grad1.addColorStop(1, 'rgba(10, 13, 22, 0)');
        ctx.fillStyle = grad1;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        ctx.fillStyle = `rgba(100, 150, 255, ${0.3 + pulse * 0.2})`;
        particles.forEach(p => {
            p.x += p.speedX; p.y += p.speedY;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        });

        // Animations Progress
        const panelProgress = easeOutExpo(Math.max(0, Math.min(i / 25, 1)));
        const avatarProgress = easeOutExpo(Math.max(0, Math.min((i - 15) / 20, 1)));
        const textProgress = easeOutExpo(Math.max(0, Math.min((i - 25) / 25, 1)));
        const shProgress = easeInOutQuad(Math.max(0, Math.min((i - 30) / 25, 1)));

        // 1. Draw Glass Panel
        // Start from center width=0 to full width
        const fullPanelW = width - 40;
        const panelH = height - 40;
        const panelW = fullPanelW * panelProgress;
        const panelX = (width - panelW) / 2;
        const panelY = (height - panelH) / 2;

        if (panelProgress > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'; // subtle white
            ctx.strokeStyle = `rgba(100, 150, 255, ${0.1 + panelProgress * 0.2})`;
            ctx.lineWidth = 1;
            
            // Draw round rect manually
            const r = 15;
            ctx.beginPath();
            ctx.moveTo(panelX + r, panelY);
            ctx.lineTo(panelX + panelW - r, panelY);
            ctx.arcTo(panelX + panelW, panelY, panelX + panelW, panelY + r, r);
            ctx.lineTo(panelX + panelW, panelY + panelH - r);
            ctx.arcTo(panelX + panelW, panelY + panelH, panelX + panelW - r, panelY + panelH, r);
            ctx.lineTo(panelX + r, panelY + panelH);
            ctx.arcTo(panelX, panelY + panelH, panelX, panelY + panelH - r, r);
            ctx.lineTo(panelX, panelY + r);
            ctx.arcTo(panelX, panelY, panelX + r, panelY, r);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // 2. Avatar with dashed rotating border
        const avatarSize = 130;
        const avatarX = (width - fullPanelW) / 2 + 30; // Use static left pos so it doesn't move while panel expands
        const avatarY = (height - avatarSize) / 2;

        if (avatarProgress > 0) {
            // Rotating dashed border
            ctx.save();
            ctx.translate(avatarX + avatarSize / 2, avatarY + avatarSize / 2);
            ctx.rotate((i * 4 * Math.PI) / 180); 
            
            ctx.beginPath();
            ctx.arc(0, 0, (avatarSize / 2) + 12, 0, Math.PI * 2);
            ctx.setLineDash([15, 10]); 
            ctx.strokeStyle = `rgba(100, 200, 255, ${avatarProgress})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 0, (avatarSize / 2) + 5, 0, Math.PI * 2);
            ctx.setLineDash([]);
            ctx.strokeStyle = `rgba(50, 100, 255, ${avatarProgress * 0.5})`;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();

            // Draw Avatar
            ctx.save();
            ctx.globalAlpha = avatarProgress;
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.clip();
            if (avatarImg) {
                ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
            } else {
                ctx.fillStyle = '#5865F2';
                ctx.fill();
            }
            ctx.restore();
        }

        // 3. Text and Gradient Line
        if (textProgress > 0) {
            const textX = avatarX + avatarSize + 30;
            ctx.textAlign = 'left';
            
            ctx.fillStyle = `rgba(180, 190, 210, ${textProgress})`;
            ctx.font = 'bold 16px "Segoe UI", Arial';
            ctx.fillText('Welcome to the Study Here Community!', textX, avatarY + 40);

            ctx.fillStyle = `rgba(255, 255, 255, ${textProgress})`;
            ctx.font = 'bold 42px "Segoe UI", Arial';
            let displayUser = username.length > 15 ? username.slice(0, 15) + '...' : username;
            ctx.fillText(displayUser, textX, avatarY + 85);

            ctx.save();
            const lineWidth = 300 * textProgress;
            const lineY = avatarY + 105;
            const lineGrad = ctx.createLinearGradient(textX, lineY, textX + lineWidth, lineY);
            lineGrad.addColorStop(0, `rgba(100, 150, 255, ${textProgress})`);
            lineGrad.addColorStop(1, 'rgba(100, 150, 255, 0)'); 
            ctx.fillStyle = lineGrad;
            ctx.fillRect(textX, lineY, lineWidth, 3);
            ctx.restore();
        }

        // 4. S&H Logo at bottom right
        if (shProgress > 0) {
            const logoY = (height + panelH) / 2 - 30;
            const targetCenterX = (width + fullPanelW) / 2 - 50;
            
            ctx.font = 'italic bold 24px "Segoe UI", Arial';
            
            const sStartX = targetCenterX - 60;
            const sEndX = targetCenterX - 15;
            const sCurrentX = sStartX + (sEndX - sStartX) * shProgress;
            
            const hStartX = targetCenterX + 60;
            const hEndX = targetCenterX + 12;
            const hCurrentX = hStartX + (hEndX - hStartX) * shProgress;

            ctx.fillStyle = `rgba(150, 170, 255, ${shProgress})`;
            ctx.textAlign = 'center';
            ctx.fillText('&', targetCenterX, logoY);

            ctx.fillStyle = `rgba(255, 255, 255, ${shProgress})`;
            ctx.textAlign = 'right';
            ctx.fillText('S', sCurrentX, logoY);
            
            ctx.textAlign = 'left';
            ctx.fillText('H', hCurrentX, logoY);
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(targetCenterX, logoY - 8, 30, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(100, 150, 255, ${shProgress * 0.4})`;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }

        encoder.addFrame(ctx);

        if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    encoder.finish();
    return encoder.out.getData();
};
