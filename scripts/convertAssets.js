// Script to convert PNG assets to WebP for better compression
// Per Games-skills.md: "Asset compression - KTX2, Draco, WebP"
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '..', 'public', 'assets');
const files = ['Cafe.png', 'Home.png', 'Map.png', 'Office.png'];

async function convert() {
  for (const file of files) {
    const input = path.join(assetsDir, file);
    const output = path.join(assetsDir, file.replace('.png', '.webp'));
    
    if (!fs.existsSync(input)) {
      console.log(`Skipping ${file} - not found`);
      continue;
    }

    const inputSize = fs.statSync(input).size;
    
    await sharp(input)
      .webp({ quality: 85 })
      .toFile(output);
    
    const outputSize = fs.statSync(output).size;
    const savings = ((1 - outputSize / inputSize) * 100).toFixed(1);
    
    console.log(`${file} → ${file.replace('.png', '.webp')}: ${(inputSize/1024).toFixed(0)}KB → ${(outputSize/1024).toFixed(0)}KB (${savings}% smaller)`);
  }
  console.log('\nDone! WebP assets generated.');
}

convert().catch(console.error);
