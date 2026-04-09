import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const srcIcon = path.join(root, 'public/icons/icon-512x512.png');
const iosIconDir = path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
const iosSplashDir = path.join(root, 'ios/App/App/Assets.xcassets/Splash.imageset');

async function generateIcon() {
  // iOS needs 1024x1024 icon
  await sharp(srcIcon)
    .resize(1024, 1024, { fit: 'cover', kernel: 'lanczos3' })
    .png()
    .toFile(path.join(iosIconDir, 'AppIcon-512@2x.png'));
  console.log('✓ Generated iOS app icon (1024x1024)');
}

async function generateSplash() {
  const splashSize = 2732;
  const iconSize = 400;
  const bg = '#5A0A0A';

  const iconBuf = await sharp(srcIcon)
    .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const splash = await sharp({
    create: {
      width: splashSize,
      height: splashSize,
      channels: 4,
      background: bg,
    },
  })
    .composite([{
      input: iconBuf,
      gravity: 'centre',
    }])
    .png()
    .toBuffer();

  for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    await sharp(splash).toFile(path.join(iosSplashDir, name));
  }
  console.log('✓ Generated iOS splash screens (2732x2732)');
}

async function generateAndroidIcons() {
  const androidRes = path.join(root, 'android/app/src/main/res');

  // Standard launcher icon sizes per density
  const sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
  };

  // Foreground icon sizes (adaptive icon, 108dp base with padding)
  const fgSizes = {
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432,
  };

  for (const [folder, size] of Object.entries(sizes)) {
    const dir = path.join(androidRes, folder);
    // Standard icon
    await sharp(srcIcon).resize(size, size).png().toFile(path.join(dir, 'ic_launcher.png'));
    // Round icon
    await sharp(srcIcon).resize(size, size).png().toFile(path.join(dir, 'ic_launcher_round.png'));
  }

  for (const [folder, size] of Object.entries(fgSizes)) {
    const dir = path.join(androidRes, folder);
    // Foreground (icon on transparent bg, padded)
    const iconSize = Math.round(size * 0.65);
    const padded = await sharp(srcIcon)
      .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: Math.round((size - iconSize) / 2),
        bottom: Math.round((size - iconSize) / 2),
        left: Math.round((size - iconSize) / 2),
        right: Math.round((size - iconSize) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .resize(size, size)
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }

  console.log('✓ Generated Android launcher icons (all densities)');
}

async function generateAndroidSplash() {
  const androidRes = path.join(root, 'android/app/src/main/res');
  const bg = '#5A0A0A';

  const splashSizes = {
    'drawable': { w: 480, h: 800 },
    'drawable-land': { w: 800, h: 480 },
    'drawable-mdpi': { w: 320, h: 480 },
    'drawable-land-mdpi': { w: 480, h: 320 },
    'drawable-hdpi': { w: 480, h: 800 },
    'drawable-land-hdpi': { w: 800, h: 480 },
    'drawable-xhdpi': { w: 720, h: 1280 },
    'drawable-land-xhdpi': { w: 1280, h: 720 },
    'drawable-xxhdpi': { w: 960, h: 1600 },
    'drawable-land-xxhdpi': { w: 1600, h: 960 },
    'drawable-xxxhdpi': { w: 1280, h: 1920 },
    'drawable-land-xxxhdpi': { w: 1920, h: 1280 },
  };

  for (const [folder, { w, h }] of Object.entries(splashSizes)) {
    const dir = path.join(androidRes, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const iconSize = Math.min(w, h) * 0.3;
    const iconBuf = await sharp(srcIcon)
      .resize(Math.round(iconSize), Math.round(iconSize))
      .png()
      .toBuffer();

    await sharp({
      create: { width: w, height: h, channels: 4, background: bg },
    })
      .composite([{ input: iconBuf, gravity: 'centre' }])
      .png()
      .toFile(path.join(dir, 'splash.png'));
  }

  console.log('✓ Generated Android splash screens (all densities)');
}

async function main() {
  await generateIcon();
  await generateSplash();
  await generateAndroidIcons();
  await generateAndroidSplash();
  console.log('Done!');
}

main().catch(console.error);
