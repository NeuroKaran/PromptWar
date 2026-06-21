const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

const logoPath = path.join(__dirname, '..', 'Eco-pixel-Logo.png');
const appDir = path.join(__dirname, '..', 'src', 'app');
const publicDir = path.join(__dirname, '..', 'public');

async function generateIcons() {
  console.log('Generating web icons from Eco-pixel-Logo.png...');

  // 1. Generate src/app/icon.png (32x32)
  console.log('- Generating src/app/icon.png (32x32)...');
  await sharp(logoPath)
    .resize(32, 32)
    .png()
    .toFile(path.join(appDir, 'icon.png'));

  // 2. Generate src/app/apple-icon.png (180x180)
  console.log('- Generating src/app/apple-icon.png (180x180)...');
  await sharp(logoPath)
    .resize(180, 180)
    .png()
    .toFile(path.join(appDir, 'apple-icon.png'));

  // 3. Generate public/icon-192.png (192x192)
  console.log('- Generating public/icon-192.png (192x192)...');
  await sharp(logoPath)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));

  // 4. Generate public/icon-512.png (512x512)
  console.log('- Generating public/icon-512.png (512x512)...');
  await sharp(logoPath)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));

  // 5. Generate src/app/favicon.ico
  console.log('- Generating src/app/favicon.ico...');
  const pngBuffer = await sharp(logoPath)
    .resize(32, 32)
    .ensureAlpha()
    .png()
    .toBuffer();

  const icoHeader = Buffer.alloc(22);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Image type (1 = icon)
  icoHeader.writeUInt16LE(1, 4); // Number of images (1)

  icoHeader.writeUInt8(32, 6); // Width
  icoHeader.writeUInt8(32, 7); // Height
  icoHeader.writeUInt8(0, 8); // Color palette
  icoHeader.writeUInt8(0, 9); // Reserved
  icoHeader.writeUInt16LE(1, 10); // Color planes
  icoHeader.writeUInt16LE(32, 12); // Bits per pixel
  icoHeader.writeUInt32LE(pngBuffer.length, 14); // Size of image data
  icoHeader.writeUInt32LE(22, 18); // Offset of image data

  const icoBuffer = Buffer.concat([icoHeader, pngBuffer]);
  await fs.writeFile(path.join(appDir, 'favicon.ico'), icoBuffer);

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
