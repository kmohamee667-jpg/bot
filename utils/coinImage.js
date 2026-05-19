import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register Custom Fonts
try {
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/Welcome Darling.otf'), 'Welcome Darling');
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/Super Squad.ttf'), 'Super Squad');
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/Sports World-Regular.ttf'), 'Sports World');
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/coines_market.ttf'), 'Coins Market');
    
    // Register Cairo Fonts for perfect Arabic rendering
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/Cairo-Regular.ttf'), 'Cairo');
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/Cairo-Bold.ttf'), 'Cairo Bold');
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
    if (!minutes || minutes <= 0) return '0 دقيقة';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    let str = [];
    if (h > 0) {
        if (h === 1) str.push('ساعة');
        else if (h === 2) str.push('ساعتين');
        else if (h <= 10) str.push(`${h} ساعات`);
        else str.push(`${h} ساعة`);
    }
    if (m > 0) {
        if (m === 1) str.push('دقيقة');
        else if (m === 2) str.push('دقيقتين');
        else if (m <= 10) str.push(`${m} دقائق`);
        else str.push(`${m} دقيقة`);
    }
    return str.join(' و ');
};

// Calculate Study Rank (Clean text)
const getStudyRank = (minutes) => {
    if (minutes < 60) return 'EXPLORER';
    if (minutes < 300) return 'STRIVER';
    if (minutes < 600) return 'ELITE (I)';
    if (minutes < 1200) return 'MASTER (III)';
    return 'CHAMPION (V)';
};

// Helper: Custom vector hexagon drawing for badges
function drawHexagonBadge(ctx, cx, cy, size, isUnlocked) {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + Math.PI / 6;
        const x = cx + size * Math.cos(angle);
        const y = cy + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();

    if (isUnlocked) {
        ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(0, 240, 255, 0.4)';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.stroke();
    } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
    }
    ctx.restore();
}

// Helper: Draw vector shield badge icon
function drawShieldBadge(ctx, cx, cy, size) {
    ctx.save();
    
    // Draw outer glowing shield
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size, cy - size * 0.7);
    ctx.lineTo(cx + size, cy + size * 0.2);
    ctx.quadraticCurveTo(cx + size, cy + size * 0.8, cx, cy + size * 1.1);
    ctx.quadraticCurveTo(cx - size, cy + size * 0.8, cx - size, cy + size * 0.2);
    ctx.lineTo(cx - size, cy - size * 0.7);
    ctx.closePath();
    
    const shieldGrad = ctx.createLinearGradient(cx - size, cy - size, cx + size, cy + size);
    shieldGrad.addColorStop(0, '#00bfff');
    shieldGrad.addColorStop(1, '#9d4edd');
    ctx.fillStyle = shieldGrad;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.stroke();
    
    // Inner emblem letter 'V'
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Cairo Bold", Arial';
    ctx.fillText('V', cx, cy + 1);
    
    ctx.restore();
}

// Helper: Draw native gold coin vector
function drawNativeGoldCoin(ctx, cx, cy, radius) {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    
    const goldGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
    goldGrad.addColorStop(0, '#fff5b0');
    goldGrad.addColorStop(0.6, '#ffd700');
    goldGrad.addColorStop(1, '#d4af37');
    ctx.fillStyle = goldGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner embossed circle
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
    ctx.stroke();

    // Embossed 'C'
    ctx.fillStyle = '#9e7800';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 10px "Coins Market", Arial';
    ctx.fillText('C', cx, cy);
    
    ctx.restore();
}

export async function generateCoinCard(username, avatarURL, balance, studyTime = 0, stats = {}) {
    // Extract dynamic statistics from the command args
    const dailyStreak = stats.dailyStreak || 0;
    const messageCount = stats.messageCount || 0;
    const voiceTime = stats.voiceTime || 0;
    const weeklyActivity = stats.weeklyActivity || [0, 0, 0, 0, 0, 0, 0];

    const width = 1024;
    const height = 576;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Futuristic Cyber space gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#06050e');
    bgGrad.addColorStop(0.5, '#0c081d');
    bgGrad.addColorStop(1, '#050308');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. High-Tech Cyber Grid Overlay Lines
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.022)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    ctx.restore();

    // 3. Diagonal glowing tech circuit lines in background
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.035)';
    ctx.lineWidth = 1.5;
    // Top-Left Circuit Line
    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(60, 200);
    ctx.lineTo(140, 280);
    ctx.stroke();
    // Bottom-Right Circuit Line
    ctx.beginPath();
    ctx.moveTo(964, 576);
    ctx.lineTo(964, 380);
    ctx.lineTo(884, 300);
    ctx.stroke();
    ctx.restore();

    // 4. Glowing Cyber Dust Particles
    ctx.save();
    const stars = [
        {x: 100, y: 80, r: 2}, {x: 450, y: 150, r: 1.5}, {x: 820, y: 120, r: 2},
        {x: 200, y: 350, r: 1.5}, {x: 600, y: 480, r: 2}, {x: 950, y: 250, r: 1.5}
    ];
    ctx.fillStyle = 'rgba(0, 240, 255, 0.28)';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 4;
    for (const star of stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // 5. Card Main Outer Sleek Neon Tech Border
    ctx.save();
    const borderGrad = ctx.createLinearGradient(20, 20, width - 20, height - 20);
    borderGrad.addColorStop(0, '#00f0ff');
    borderGrad.addColorStop(0.5, '#9d4edd');
    borderGrad.addColorStop(1, '#ff007f');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(157, 78, 221, 0.18)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.roundRect(20, 20, width - 40, height - 40, 24);
    ctx.stroke();

    // Corner futuristic decorative tech accent plates
    ctx.fillStyle = '#00f0ff';
    // Top-Left corner accent
    ctx.beginPath();
    ctx.moveTo(25, 60); ctx.lineTo(35, 60); ctx.lineTo(35, 35); ctx.lineTo(60, 35); ctx.lineTo(60, 25);
    ctx.lineTo(25, 25); ctx.closePath(); ctx.fill();
    
    // Bottom-Right corner accent
    ctx.fillStyle = '#ff007f';
    ctx.beginPath();
    ctx.moveTo(999, 516); ctx.lineTo(989, 516); ctx.lineTo(989, 541); ctx.lineTo(964, 541); ctx.lineTo(964, 551);
    ctx.lineTo(999, 551); ctx.closePath(); ctx.fill();
    ctx.restore();

    // 6. User Avatar (Center X: 165, Y: 145) with dual circular neon rings
    const avatarX = 165;
    const avatarY = 145;
    const avatarRad = 76;

    // Double Glowing circular border
    ctx.save();
    // Inner cyan frame
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.6)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRad, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    // Outer dashed purple ring
    ctx.strokeStyle = 'rgba(157, 78, 221, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRad + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    try {
        const avatar = await loadImage(avatarURL);
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarRad, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX - avatarRad, avatarY - avatarRad, avatarRad * 2, avatarRad * 2);
        ctx.restore();
    } catch (e) {
        console.error('Error drawing avatar:', e);
    }

    // Level parameters calculation
    const level = Math.floor(studyTime / 60) + 1;
    const currentLevelMins = studyTime % 60;
    const nextLevelProgress = currentLevelMins / 60;
    const rankName = getStudyRank(studyTime);

    // 7. Embossed Level Badge overlaying the bottom-right of the avatar
    ctx.save();
    const lvlX = 220;
    const lvlY = 195;
    const lvlRad = 24;
    
    ctx.fillStyle = '#06050e';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(lvlX, lvlY, lvlRad, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a0aec0';
    ctx.font = 'bold 11px "Cairo", Arial';
    ctx.fillText('LVL', lvlX, lvlY - 4);
    
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 15px "Cairo Bold", "Cairo", Arial';
    ctx.fillText(level.toString(), lvlX, lvlY + 12);
    ctx.restore();

    // 8. Username Translucent Console Panel Box
    const uBoxX = 280;
    const uBoxY = 70;
    const uBoxW = 360;
    const uBoxH = 105;

    ctx.save();
    ctx.fillStyle = 'rgba(12, 10, 20, 0.72)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(uBoxX, uBoxY, uBoxW, uBoxH, 12);
    ctx.fill();
    ctx.stroke();

    // Left neon accent border
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(uBoxX + 1, uBoxY + 10);
    ctx.lineTo(uBoxX + 1, uBoxY + uBoxH - 10);
    ctx.stroke();

    // Label: "USERNAME"
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#718096';
    ctx.font = 'bold 11px "Cairo Bold", "Cairo", Arial';
    ctx.fillText('USERNAME', uBoxX + 25, uBoxY + 36);

    // Value: User actual username
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Cairo Bold", "Cairo", Arial';
    ctx.fillText(username, uBoxX + 25, uBoxY + 68);
    ctx.restore();

    // 9. Rank & Level Translucent Card (Top Right)
    const rBoxX = 660;
    const rBoxY = 70;
    const rBoxW = 294;
    const rBoxH = 105;

    ctx.save();
    ctx.fillStyle = 'rgba(12, 10, 20, 0.72)';
    ctx.strokeStyle = 'rgba(157, 78, 221, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(rBoxX, rBoxY, rBoxW, rBoxH, 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Draw native glowing Shield Emblem badge
    drawShieldBadge(ctx, rBoxX + 36, rBoxY + 52, 18);

    // Labels & values
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px "Cairo Bold", "Cairo", Arial';

    // Rank label
    ctx.textAlign = 'left';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = 'rgba(0, 240, 255, 0.3)';
    ctx.shadowBlur = 6;
    ctx.fillText(`RANK: ${rankName}`, rBoxX + 75, rBoxY + 32);

    // Level label
    ctx.textAlign = 'right';
    ctx.fillStyle = '#a0aec0';
    ctx.shadowBlur = 0;
    ctx.fillText(`Level ${level}`, rBoxX + rBoxW - 20, rBoxY + 32);

    // Segmented progress bar background
    const xpBarX = rBoxX + 75;
    const xpBarY = rBoxY + 48;
    const xpBarW = 194;
    const xpBarH = 13;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.roundRect(xpBarX, xpBarY, xpBarW, xpBarH, 6);
    ctx.fill();

    // Fill segmented XP progress
    if (nextLevelProgress > 0) {
        const segCount = 10;
        const spacing = 2;
        const filledSegs = Math.ceil(nextLevelProgress * segCount);
        const segW = (xpBarW - (segCount - 1) * spacing) / segCount;

        for (let i = 0; i < filledSegs; i++) {
            const segX = xpBarX + i * (segW + spacing);
            const fillGrad = ctx.createLinearGradient(segX, 0, segX + segW, 0);
            fillGrad.addColorStop(0, '#00bfff');
            fillGrad.addColorStop(1, '#9d4edd');
            ctx.fillStyle = fillGrad;
            ctx.shadowColor = 'rgba(0, 240, 255, 0.5)';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.roundRect(segX, xpBarY, segW, xpBarH, 2);
            ctx.fill();
        }
    }

    // XP Numeric Label
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#718096';
    ctx.font = 'bold 10px "Cairo Bold", "Cairo", Arial';
    const xpVal = currentLevelMins * 100;
    ctx.fillText(`XP: ${formatNumber(xpVal)} / 6,000`, xpBarX, rBoxY + 80);
    ctx.restore();

    // 10. Bottom Left: WEEKLY ACTIVITY TREND Panel
    const chBoxX = 60;
    const chBoxY = 230;
    const chBoxW = 580;
    const chBoxH = 290;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 20, 0.75)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(chBoxX, chBoxY, chBoxW, chBoxH, 16);
    ctx.fill();
    ctx.stroke();

    // Header Title
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#a0aec0';
    ctx.font = 'bold 14px "Cairo Bold", "Cairo", Arial';
    ctx.fillText('WEEKLY ACTIVITY TREND', chBoxX + 25, chBoxY + 30);

    // Separator line
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chBoxX + 25, chBoxY + 50);
    ctx.lineTo(chBoxX + chBoxW - 25, chBoxY + 50);
    ctx.stroke();
    ctx.restore();

    // Grid lines & Y-axis labels
    const chartYPoints = [315, 355, 395, 435, 475];
    const chartYLabels = ['400', '300', '200', '100', '0'];
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#718096';
    ctx.font = 'bold 10px "Cairo Bold", "Cairo", Arial';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;

    for (let i = 0; i < 5; i++) {
        const y = chartYPoints[i];
        ctx.fillText(chartYLabels[i], chBoxX + 45, y);
        
        ctx.beginPath();
        ctx.moveTo(chBoxX + 60, y);
        ctx.lineTo(chBoxX + chBoxW - 25, y);
        ctx.stroke();
    }
    ctx.restore();

    // Day labels
    const chartXCoords = [125, 185, 245, 305, 365, 425, 485, 545, 605];
    const chartDays = ['MON', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#718096';
    ctx.font = 'bold 10px "Cairo Bold", Arial';
    for (let i = 0; i < 9; i++) {
        ctx.fillText(chartDays[i], chartXCoords[i], chBoxY + chBoxH - 24);
    }
    ctx.restore();

    // Smooth quadratic bezier activity wave chart
    let actData = weeklyActivity;
    if (actData.every(v => v === 0)) {
        if (studyTime === 0) {
            // If studyTime is 0, graph is 100% flat at zero
            actData = [0, 0, 0, 0, 0, 0, 0];
        } else {
            // Distribute actual studyTime proportionally across days to create a custom realistic graph
            const share = Math.round(studyTime / 7);
            actData = [
                Math.round(share * 0.8),
                Math.round(share * 1.2),
                Math.round(share * 0.9),
                Math.round(share * 1.4),
                Math.round(share * 0.7),
                Math.round(share * 1.1),
                Math.round(share * 1.0)
            ];
        }
    }

    const cValues = [
        actData[0], actData[1], actData[0], actData[1],
        actData[2], actData[3], actData[4], actData[5], actData[6]
    ];

    const points = [];
    for (let i = 0; i < 9; i++) {
        const val = cValues[i] || 0;
        const pct = Math.min(1.0, val / 400);
        // Map Y from 475 (0 value) to 315 (400 value)
        const y = 475 - pct * 160;
        points.push({ x: chartXCoords[i], y });
    }

    // A. Wave chart gradient fill
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, 475);
    ctx.lineTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i+1].x) / 2;
        const yc = (points[i].y + points[i+1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(points[points.length - 1].x, 475);
    ctx.closePath();

    const chartFillGrad = ctx.createLinearGradient(0, 315, 0, 475);
    chartFillGrad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
    chartFillGrad.addColorStop(0.5, 'rgba(157, 78, 221, 0.15)');
    chartFillGrad.addColorStop(1, 'rgba(12, 10, 20, 0.0)');
    ctx.fillStyle = chartFillGrad;
    ctx.fill();
    ctx.restore();

    // B. Wave chart stroke line
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i+1].x) / 2;
        const yc = (points[i].y + points[i+1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.7)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();

    // 11. Middle Right: COINS BALANCE Card
    const cbX = 660;
    const cbY = 190;
    const cbW = 294;
    const cbH = 165;

    ctx.save();
    ctx.fillStyle = 'rgba(12, 10, 20, 0.72)';
    ctx.strokeStyle = 'rgba(255, 0, 127, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cbX, cbY, cbW, cbH, 16);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#a0aec0';
    ctx.font = 'bold 12px "Cairo Bold", "Cairo", Arial';
    ctx.fillText('COINS BALANCE', cbX + 20, cbY + 28);
    ctx.restore();

    // Massive balance value (Centered)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Cairo Bold", "Cairo", Arial';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = 10;
    ctx.direction = 'rtl';
    ctx.fillText(`${formatNumber(balance)} كوين`, cbX + cbW / 2 + 10, cbY + 68);
    ctx.restore();

    // Gold Coin + Dynamic Study Time
    drawNativeGoldCoin(ctx, cbX + 38, cbY + 120, 16);

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "Cairo Bold", "Cairo", Arial';
    ctx.direction = 'rtl';
    const stText = formatTime(studyTime);
    ctx.fillText(`الدراسة: ${stText}`, cbX + 68, cbY + 120);
    ctx.restore();

    // 12. Bottom Right: Expanded Completed Cycles BADGES Panel (Filling the entire space!)
    const bBoxX = 660;
    const bBoxY = 370;
    const bBoxW = 294;
    const bBoxH = 150;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 20, 0.75)';
    ctx.strokeStyle = 'rgba(157, 78, 221, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bBoxX, bBoxY, bBoxW, bBoxH, 16);
    ctx.fill();
    ctx.stroke();

    // Header
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#718096';
    ctx.font = 'bold 11px "Cairo Bold", "Cairo", Arial';
    ctx.fillText('COMPLETED CYCLES BADGES', bBoxX + 16, bBoxY + 24);
    ctx.restore();

    // Draw Hexagonal Badges grid (all in a single premium row!)
    const completedCycles = stats.completedCycles || 0;
    const badgesActive = [
        completedCycles >= 1,
        completedCycles >= 3,
        completedCycles >= 6,
        completedCycles >= 10,
        completedCycles >= 15,
        completedCycles >= 25
    ];

    const badgeCount = 6;
    const startX = bBoxX + 27;
    const spacing = (bBoxW - 54) / (badgeCount - 1); // 240 / 5 = 48px spacing
    const cy = bBoxY + 70;
    const bSize = 16;

    for (let i = 0; i < badgeCount; i++) {
        const cx = startX + i * spacing;
        const active = badgesActive[i] || false;
        
        drawHexagonBadge(ctx, cx, cy, bSize, active);
        
        // Draw cycle count target below each badge
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = active ? '#00f0ff' : '#718096';
        ctx.font = 'bold 10px "Cairo Bold", Arial';
        
        const targets = [1, 3, 6, 10, 15, 25];
        ctx.fillText(`${targets[i]}⏳`, cx, cy + 22);
        ctx.restore();
    }

    return canvas.toBuffer('image/png');
}
