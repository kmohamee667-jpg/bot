import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Register Custom Fonts
try {
    // ملاحظة: لم نعد نستخدم خط "Super Squad" أو "Sports World" للقيم الرقمية،
    // ولكن سنبقيها في التسجيل تحسباً لاستخدامها مستقبلاً في العناوين أو إذا تم التسجيل مسبقاً.
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/Welcome Darling.otf'), 'Welcome Darling');
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/Super Squad.ttf'), 'Super Squad');
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/Sports World-Regular.ttf'), 'Sports World');
    GlobalFonts.registerFromPath(path.join(__dirname, '../fonts/coines_market.ttf'), 'Coins Market');
} catch (err) {
    console.error('[Font Registration Error in coinImage]:', err);
}

// -- [ملاحظة]: الدوال التالية formatNumber و formatTime لم تعد مستخدمة في هذا الإصدار --
// -- لتماشيها مع التصميم الأخير الذي يظهر نواب مكان فارغة (placeholders) بدلاً من القيم --

const formatNumber = (num) => {
    // (لم تعد مستخدمة)
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
};

const formatTime = (minutes) => {
    // (لم تعد مستخدمة)
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
    // تحديث الأبعاد لتناسب تصميم الخلفية الجديد
    const width = 1920;
    const height = 1080;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Background (استخدام صورة الخلفية الجديدة المرفقة)
    try {
        // تأكد من أن ملف '../imgs/coin_bg.png' هو نفس صورة image_4.png وبدون تراكبات نصية مسبقة
        const background = await loadImage(path.join(__dirname, '../imgs/coines_bg.png'));
        ctx.drawImage(background, 0, 0, width, height);
    } catch (e) {
        // خلفية احتياطية بلون دافئ إذا فشل تحميل الصورة
        ctx.fillStyle = '#f6e7c1'; // Warm background
        ctx.fillRect(0, 0, width, height);
    }

    // (تمت إزالة تراكب Overlay ليبقى التصميم مشرقاً كما في الصورة)

    // 2. User Avatar (الصورة الشخصية)
    // تم تعديل الإحداثيات لوضعها في الإطار الدائري المضاء في المنتصف تماماً
    try {
        const avatar = await loadImage(avatarURL);
        const avatarSize = 330; // الحجم المناسب للإطار المضاء
        const x = width / 2;
        const y = height / 2 - 25; // تحريك طفيف لأعلى ليناسب موضع الإطار

        ctx.save();
        ctx.beginPath();
        // الإطار الدائري (يجب أن يغطي الإطار المضاء الموجود في الصورة)
        ctx.arc(x, y, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, x - avatarSize / 2, y - avatarSize / 2, avatarSize, avatarSize);
        ctx.restore();

        // تمت إزالة "White Frame" اليدوي لأن التصميم الجديد يحتوي بالفعل على إطار مضاء مدمج
    } catch (e) {
        console.error('Error loading avatar:', e);
    }

    // Text Settings (تم تحديثها لتناسب النص الجديد والمكان)
    ctx.textAlign = 'left'; // تغيير المحاذاة لليسار داخل الشريط
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'; // ظل أخف
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // إحداثيات شريط البيانات السفلي الجديد
    const barY = 900;
    const barFont = '32px "Coins Market", Arial'; // خط عناوين شريط البيانات

    // --- الجزء الأيسر: Coins Earned ---
    const coinsTextX = 220;
    
    // Text (Text and Placeholder)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = barFont;
    // إضافة نص التسمية ونائب المكان في سطر واحد
    ctx.fillText('COINS EARNED:', coinsTextX, barY);
    
    // كتابة نائب المكان (الخطوط) بلون أفتح أو شفافية لإعطاء تأثير الشريط
    const coinsPlaceholder = '';
    const labelWidthCoins = ctx.measureText('COINS EARNED: ').width;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // نائب مكان شفاف
    ctx.fillText(coinsPlaceholder, coinsTextX + labelWidthCoins, barY);

    // (لم نعد نرسم أي قيمة رقمية)

    // --- الجزء الأيمن: Total Study Time ---
    const studyTextX = width / 2 + 60; // محاذاة لليسار بعد خط المنتصف
    
    // Text (Text and Placeholder)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = barFont;
    ctx.fillText('TOTAL STUDY TIME:', studyTextX, barY);

    // كتابة نائب المكان (الخطوط)
    const timePlaceholder = '';
    const labelWidthTime = ctx.measureText('TOTAL STUDY TIME: ').width;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // نائب مكان شفاف
    ctx.fillText(timePlaceholder, studyTextX + labelWidthTime, barY);

    // (لم نعد نرسم أي قيمة زمنية)

    return canvas.toBuffer('image/png');
}