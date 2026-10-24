const fs = require('fs');
const path = require('path');

// Simple PNG header for a basic 16x16 transparent PNG
const createSimplePNG = (width, height) => {
  // This is a minimal PNG header - in production you'd use a proper icon generation tool
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // Very basic IHDR chunk for a transparent PNG
  const ihdrLength = Buffer.alloc(4);
  ihdrLength.writeUInt32BE(13, 0);
  const ihdrType = Buffer.from('IHDR');
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);   // width
  ihdrData.writeUInt32BE(height, 4);  // height
  ihdrData.writeUInt8(8, 8);          // bit depth
  ihdrData.writeUInt8(6, 9);          // color type (RGBA)
  ihdrData.writeUInt8(0, 10);         // compression
  ihdrData.writeUInt8(0, 11);         // filter
  ihdrData.writeUInt8(0, 12);         // interlace

  // Simple CRC calculation (placeholder)
  const crc32 = (data) => {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ ((crc & 1) * 0xEDB88320);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  };

  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(crc32(Buffer.concat([ihdrType, ihdrData])), 0);

  // IDAT chunk (minimal compressed data for transparent image)
  const idatData = Buffer.from('789c626001000000ffff', 'hex'); // minimal zlib compressed transparent data
  const idatLength = Buffer.alloc(4);
  idatLength.writeUInt32BE(idatData.length, 0);
  const idatType = Buffer.from('IDAT');
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(crc32(Buffer.concat([idatType, idatData])), 0);

  // IEND chunk
  const iendLength = Buffer.alloc(4);
  iendLength.writeUInt32BE(0, 0);
  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(crc32(iendType), 0);

  return Buffer.concat([
    pngSignature,
    ihdrLength, ihdrType, ihdrData, ihdrCrc,
    idatLength, idatType, idatData, idatCrc,
    iendLength, iendType, iendCrc
  ]);
};

const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
const iconDir = path.join(__dirname, '..', 'build', 'icons');

if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Generate PNG icons
sizes.forEach(size => {
  const pngBuffer = createSimplePNG(size, size);
  const filename = path.join(iconDir, `icon_${size}x${size}.png`);
  fs.writeFileSync(filename, pngBuffer);
  console.log(`Generated: ${filename}`);
});

// Copy PNG source for icon generation
const pngSource = path.join(__dirname, '..', 'public', 'app.png');
const icoDest = path.join(iconDir, 'icon.ico');

if (fs.existsSync(pngSource)) {
  // For now, create a simple ICO from the PNG
  // In production, use a proper icon conversion tool
  const pngBuffer = fs.readFileSync(pngSource);

  // Create a simple ICO file (Windows icon format)
  // This is a minimal implementation - for production use proper icon tools
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // Type (1 = ICO)
  icoHeader.writeUInt16LE(1, 4); // Number of images

  // ICO directory entry for 256x256 PNG
  const icoDirEntry = Buffer.alloc(16);
  icoDirEntry.writeUInt8(0, 0); // Width (0 = 256)
  icoDirEntry.writeUInt8(0, 1); // Height (0 = 256)
  icoDirEntry.writeUInt8(0, 2); // Color count
  icoDirEntry.writeUInt8(0, 3); // Reserved
  icoDirEntry.writeUInt16LE(1, 4); // Color planes
  icoDirEntry.writeUInt16LE(32, 6); // Bits per pixel
  icoDirEntry.writeUInt32LE(pngBuffer.length, 8); // Image size
  icoDirEntry.writeUInt32LE(22, 12); // Image offset

  // Combine header, directory entry, and PNG data
  const icoBuffer = Buffer.concat([icoHeader, icoDirEntry, pngBuffer]);
  fs.writeFileSync(icoDest, icoBuffer);

  console.log(`Generated ICO from app.png: ${icoDest}`);
} else {
  console.log('Warning: app.png not found in public directory');
}

console.log('\nIcon generation complete!');
console.log('NOTE: These are placeholder icons. For production, replace with proper branded icons.');
console.log('Recommended tool: https://icon.kitchen/ or https://www.favicon-generator.org/');
