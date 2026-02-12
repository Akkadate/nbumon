// Convert Sarabun font (Thai + Latin subsets) to base64 for jsPDF
const fs = require('fs');
const path = require('path');

// Read both Thai and Latin subsets
const thaiPath = path.join(__dirname, '..', 'node_modules', '@fontsource', 'sarabun', 'files', 'sarabun-thai-400-normal.woff');
const latinPath = path.join(__dirname, '..', 'node_modules', '@fontsource', 'sarabun', 'files', 'sarabun-latin-400-normal.woff');
const ttfPath = path.join(__dirname, '..', 'public', 'fonts', 'Sarabun-Regular.ttf');

const thai = fs.readFileSync(thaiPath);
const latin = fs.readFileSync(latinPath);
const ttf = fs.readFileSync(ttfPath);

console.log('Thai woff size:', thai.length, 'bytes');
console.log('Latin woff size:', latin.length, 'bytes');
console.log('TTF size:', ttf.length, 'bytes');

// Check headers
console.log('Thai header (hex):', thai.slice(0, 4).toString('hex'));
console.log('Latin header (hex):', latin.slice(0, 4).toString('hex'));
console.log('TTF header (hex):', ttf.slice(0, 4).toString('hex'));

// TTF header starts with 00010000
// WOFF header starts with 774F4646 ('wOFF')
console.log('TTF is valid TTF:', ttf.slice(0, 4).toString('hex') === '00010000');

// The downloaded TTF from Google Fonts API should contain Thai+Latin glyphs
// Let's check if it contains Thai unicode range U+0E01-U+0E3A
const ttfStr = ttf.toString('binary');
// Search for Thai character patterns
let hasThaiChars = false;
for (let i = 0; i < ttf.length - 3; i++) {
    // Look for cmap table encoding Thai range
    if (ttf[i] === 0x0E && ttf[i + 1] >= 0x01 && ttf[i + 1] <= 0x3A) {
        hasThaiChars = true;
        break;
    }
}
console.log('TTF likely has Thai chars:', hasThaiChars);

// Create base64 from TTF
const base64 = ttf.toString('base64');
console.log('Base64 length:', base64.length);

const outputPath = path.join(__dirname, '..', 'lib', 'sarabun-font.ts');
const content = `// Auto-generated: Sarabun Regular font as base64
// Source: Google Fonts (Sarabun Regular 400)  
// Size: ${ttf.length} bytes
export const SARABUN_FONT_BASE64 = "${base64}";
`;
fs.writeFileSync(outputPath, content);
console.log('Saved base64 module to:', outputPath);
