import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';

async function test() {
    const canvas = createCanvas(400, 200);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 400, 200);
    
    ctx.fillStyle = 'black';
    ctx.font = '30px Arial';
    ctx.fillText('Test Text Rendering', 50, 100);
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('font_test.png', buffer);
    console.log('font_test.png generated');
}

test();
