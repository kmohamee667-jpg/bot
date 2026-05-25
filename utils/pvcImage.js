import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
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
    const height = 450;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Solid Background (Dark Navy/Slate for premium look)
    ctx.fillStyle = '#1a1d27';
    ctx.fillRect(0, 0, width, height);

    // Add Wave Design (Organic, shallow corner shapes)
    ctx.fillStyle = '#252936';
    
    // Top-Left Smooth Wave
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(350, 0);
    // A shallow, elegant curve
    ctx.bezierCurveTo(200, 30, 80, 150, 0, 300);
    ctx.fill();

    // Top-Right Smooth Wave
    ctx.beginPath();
    ctx.moveTo(width, 0);
    ctx.lineTo(width - 350, 0);
    // Mirrored on the right
    ctx.bezierCurveTo(width - 200, 30, width - 80, 150, width, 300);
    ctx.fill();

    // 2. Center Header Title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 38px "Cairo Bold", "Cairo", "Segoe UI", Arial';
    ctx.fillText('ادوات التحكم في الغرفه الصوتيه', width / 2, 65);
    ctx.restore();

    const items = [
        { label: "تعديل الاسم", emojiId: "1508307894720921770" },
        { label: "تراست عضو", emojiId: "1508309775018885181" },
        { label: "حظر عضو", emojiId: "1508308168390742017" },
        { label: "نقل ملكية", emojiId: "1508309385670164622" },
        { label: "الخصوصية", emojiId: "1508308707690283110" },
        { label: "حالة الغرفة", emojiId: "1508310210198900806" },
        { label: "الموثوقين", emojiId: "1508310598260097076" },
        { label: "الحد الأقصى", emojiId: "1508311004252078230" }
    ];

    // load emojis
    for (let item of items) {
        if (item.emojiId) {
            try {
                item.img = await loadImage(`https://cdn.discordapp.com/emojis/${item.emojiId}.png`);
            } catch(e) {
                console.error('Failed to load emoji', item.emojiId);
            }
        }
    }

    // Grid Layout (4 columns x 2 rows)
    const cols = 4;
    const rectWidth = 275; // Increased button width
    const rectHeight = 78; // Increased button height
    const gapX = 18;       // Slightly smaller gap to fit larger buttons
    const gapY = 28;
    
    // Center the grid
    const startX = (width - (cols * rectWidth + (cols - 1) * gapX)) / 2;
    const startY = 160;

    items.forEach((item, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        const x = startX + col * (rectWidth + gapX);
        const y = startY + row * (rectHeight + gapY);

        // Box background
        ctx.save();
        ctx.fillStyle = '#14161d'; // Very dark background for boxes
        ctx.strokeStyle = '#2d3142'; // Subtle border
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.roundRect(x, y, rectWidth, rectHeight, 18); // Increased border radius
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Icon on the LEFT
        const iconSize = 42; // Increased icon size
        const iconX = x + 20; // 20px padding from left
        const iconY = y + (rectHeight - iconSize) / 2;

        if (item.img) {
            ctx.drawImage(item.img, iconX, iconY, iconSize, iconSize);
        }

        // Draw Text on the RIGHT
        ctx.save();
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f8fafc'; // Crisp white/gray text
        ctx.font = 'bold 24px "Cairo Bold", "Cairo", "Segoe UI", Arial'; // Increased font size
        ctx.fillText(item.label, x + rectWidth - 20, y + rectHeight / 2); // 20px padding from right
        ctx.restore();
    });

    return canvas.toBuffer('image/png');
}
