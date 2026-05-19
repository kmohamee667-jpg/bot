import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import fs from 'fs';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Download helper
async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

// Ensure fonts exist and register them
export async function initCairoFonts() {
    const fontsDir = path.join(__dirname, '../fonts');
    if (!fs.existsSync(fontsDir)) {
        fs.mkdirSync(fontsDir, { recursive: true });
    }

    const regularDest = path.join(fontsDir, 'Cairo-Regular.ttf');
    const boldDest = path.join(fontsDir, 'Cairo-Bold.ttf');

    const regularUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/static/Cairo-Regular.ttf';
    const boldUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/static/Cairo-Bold.ttf';

    try {
        if (!fs.existsSync(regularDest)) {
            console.log('[PVC Image] Downloading Cairo-Regular.ttf...');
            await downloadFile(regularUrl, regularDest);
        }
        if (!fs.existsSync(boldDest)) {
            console.log('[PVC Image] Downloading Cairo-Bold.ttf...');
            await downloadFile(boldUrl, boldDest);
        }

        // Register with canvas
        GlobalFonts.registerFromPath(regularDest, 'Cairo');
        GlobalFonts.registerFromPath(boldDest, 'Cairo Bold');
        console.log('[PVC Image] Cairo fonts loaded successfully.');
    } catch (err) {
        console.error('[PVC Image] Font initialization failed (falling back to system fonts):', err);
    }
}

// Generate the beautiful Guide Image
export async function generatePVCGuideImage() {
    // Canvas dimensions
    const width = 1200;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Dark Slate Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0c0c16');
    bgGrad.addColorStop(0.5, '#08080f');
    bgGrad.addColorStop(1, '#050508');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Outer Soft Neon/Purple Border
    ctx.save();
    ctx.strokeStyle = 'rgba(128, 90, 213, 0.15)'; // Soft purple border
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(15, 15, width - 30, height - 30, 24);
    ctx.stroke();
    ctx.restore();

    // 3. Center Header Title: "🎧 لوحة تحكم الغرفة الملكية"
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px "Cairo Bold", "Cairo", "Segoe UI", Arial';
    
    // Add text shadow for glowing/premium effect
    ctx.shadowColor = 'rgba(255, 255, 255, 0.15)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.fillText('👑 أدوات التحكم بالغرفة الملكية', width / 2, 70);
    ctx.restore();

    // Categories structure (dynamic categories and items)
    const categories = [
        {
            title: "إعدادات الغرفة",
            items: [
                { emoji: "📝", label: "تعديل الاسم", color: "rgba(0, 191, 255, 0.35)" },
                { emoji: "🛡️", label: "الخصوصية", color: "rgba(0, 255, 127, 0.35)" },
                { emoji: "👥", label: "الحد الأقصى", color: "rgba(186, 85, 211, 0.35)" },
                { emoji: "📊", label: "عرض الحالة", color: "rgba(255, 215, 0, 0.35)" }
            ]
        },
        {
            title: "الصلاحيات",
            items: [
                { emoji: "🤝", label: "إضافة ثقة", color: "rgba(0, 255, 255, 0.35)" },
                { emoji: "📜", label: "الموثوقين", color: "rgba(238, 130, 238, 0.35)" }
            ]
        },
        {
            title: "الملكية والإشراف",
            items: [
                { emoji: "👑", label: "نقل الملكية", color: "rgba(255, 165, 0, 0.35)" },
                { emoji: "🚫", label: "حظر عضو", color: "rgba(255, 69, 0, 0.35)" }
            ]
        }
    ];

    // Coordinates setup for 3 columns
    const columnWidth = 365;
    const columnHeight = 350;
    const columnTop = 120;
    const gap = 20;
    const startX = 30;

    categories.forEach((cat, index) => {
        const colX = startX + index * (columnWidth + gap);

        // A. Column Card Background (translucent dark panels)
        ctx.save();
        ctx.fillStyle = 'rgba(16, 16, 28, 0.65)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(colX, columnTop, columnWidth, columnHeight, 18);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // B. Column Title (Centered inside column)
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 20px "Cairo Bold", "Cairo", "Segoe UI", Arial';
        ctx.fillText(cat.title, colX + columnWidth / 2, columnTop + 25);
        ctx.restore();

        // C. Column Title Separator Line
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(colX + 30, columnTop + 65);
        ctx.lineTo(colX + columnWidth - 30, columnTop + 65);
        ctx.stroke();
        ctx.restore();

        // D. Draw Items Inside Column
        const itemCount = cat.items.length;
        const itemWidth = columnWidth / itemCount;

        cat.items.forEach((item, itemIndex) => {
            const centerX = colX + itemIndex * itemWidth + itemWidth / 2;
            const centerY = columnTop + 175;

            // 1. Draw glowing outer aura
            ctx.save();
            ctx.shadowColor = item.color;
            ctx.shadowBlur = 24;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 36, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // 2. Draw Emoji centered
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // Emojis need larger sizes to be crystal clear
            ctx.font = '38px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Arial';
            ctx.fillText(item.emoji, centerX, centerY);
            ctx.restore();

            // 3. Draw Arabic Label below it using Cairo
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#a0aec0';
            ctx.font = 'bold 15px "Cairo", "Segoe UI", Arial';
            ctx.fillText(item.label, centerX, centerY + 65);
            ctx.restore();
        });
    });

    return canvas.toBuffer('image/png');
}
