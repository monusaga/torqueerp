import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

const APK_METADATA = {
  appName: 'Monu Sagar',
  version: '1.4.0',
  versionCode: 5,
  minAndroidVersion: 'Android 8.0 (Oreo / API Level 26)',
  targetAndroidVersion: 'Android 15 (Vanilla Ice Cream / API Level 35/36)',
  releaseDate: '2026-08-28',
  fileSizeMb: '71.4 MB',
  packageId: 'com.torqueerp.app',
  fileName: 'MonuSagar-v1.4.0.apk',
  sha256: '25c206ef12153873fd87c3ac9ebaf49c3f6afc7a36facc0649557676452b44f6',
};

// GET /api/v1/downloads/android/info - Version metadata
router.get('/android/info', (_req: Request, res: Response) => {
  res.json({
    app: APK_METADATA,
    downloadUrl: '/api/v1/downloads/android',
  });
});

// GET /api/v1/downloads/android - Secure direct APK file stream
router.get('/android', (req: Request, res: Response, next: NextFunction) => {
  try {
    const apkPath = path.resolve(process.cwd(), 'public', 'downloads', APK_METADATA.fileName);

    let servePath = apkPath;

    if (!fs.existsSync(servePath)) {
      const altPath = path.resolve(process.cwd(), '..', 'web', 'public', 'downloads', APK_METADATA.fileName);
      if (fs.existsSync(altPath)) {
        servePath = altPath;
      } else {
        // This route used to write a 37-byte stub here and stream it with a 200,
        // so a missing build was handed to users as a "successful" download of a
        // corrupt file. Report the outage honestly instead.
        res.status(503).json({
          error: {
            code: 'APK_NOT_AVAILABLE',
            message:
              'The Android build is not available on this server right now. Please try again later.',
          },
        });
        return;
      }
    }

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${APK_METADATA.fileName}"`);
    res.setHeader('X-App-Version', APK_METADATA.version);
    res.setHeader('X-Package-ID', APK_METADATA.packageId);

    const stream = fs.createReadStream(servePath);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
});

export default router;
