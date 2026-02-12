// Download Sarabun full TTF from multiple sources
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function download(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const urlObj = new URL(url);
        client.get({
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*'
            }
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                console.log('  Redirect:', res.headers.location.substring(0, 80));
                return download(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                reject(new Error('HTTP ' + res.statusCode));
                return;
            }
            const chunks = [];
            res.on('data', d => chunks.push(d));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

async function main() {
    const fontsDir = path.join(__dirname, '..', 'public', 'fonts');
    if (!fs.existsSync(fontsDir)) {
        fs.mkdirSync(fontsDir, { recursive: true });
    }

    // Try multiple sources for full Sarabun TTF
    const sources = [
        {
            name: 'Google Fonts GitHub (static)',
            url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/sarabun/Sarabun-Regular.ttf'
        },
        {
            name: 'Google Fonts GitHub (static) v2',
            url: 'https://raw.githubusercontent.com/googlefonts/sarabun/main/fonts/ttf/Sarabun-Regular.ttf'
        },
        {
            name: 'jsDelivr (google/fonts)',
            url: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sarabun/Sarabun-Regular.ttf'
        }
    ];

    for (const source of sources) {
        console.log('Trying:', source.name);
        console.log('  URL:', source.url);
        try {
            const data = await download(source.url);

            // Verify it's a valid TTF
            const header = data.slice(0, 4).toString('hex');
            const isTTF = header === '00010000' || header === '4f54544f'; // TTF or OTF
            console.log('  Size:', data.length, 'bytes');
            console.log('  Header:', header, isTTF ? '(valid font)' : '(NOT a valid font)');

            if (data.length > 50000 && isTTF) {
                const outPath = path.join(fontsDir, 'Sarabun-Regular.ttf');
                fs.writeFileSync(outPath, data);
                console.log('  SUCCESS! Saved to:', outPath);

                // Generate base64 module
                const base64 = data.toString('base64');
                const libDir = path.join(__dirname, '..', 'lib');
                const content = '// Auto-generated: Sarabun Regular font as base64\n// Size: ' + data.length + ' bytes\nexport const SARABUN_FONT_BASE64 = "' + base64 + '";\n';
                fs.writeFileSync(path.join(libDir, 'sarabun-font.ts'), content);
                console.log('  Base64 module saved (' + base64.length + ' chars)');
                return;
            }
        } catch (err) {
            console.log('  Failed:', err.message);
        }
    }

    console.log('\nAll sources failed. Using Noto Sans Thai as fallback...');
    // Try Noto Sans Thai
    try {
        const notoUrl = 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansthai/NotoSansThai%5Bwdth%2Cwght%5D.ttf';
        console.log('Trying Noto Sans Thai...');
        const data = await download(notoUrl);
        console.log('Size:', data.length);
        if (data.length > 50000) {
            const outPath = path.join(fontsDir, 'NotoSansThai.ttf');
            fs.writeFileSync(outPath, data);
            console.log('Saved Noto Sans Thai to:', outPath);
        }
    } catch (err) {
        console.log('Noto Sans Thai also failed:', err.message);
    }
}

main().catch(err => { console.error(err); process.exit(1); });
