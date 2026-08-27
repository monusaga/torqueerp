import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('Android App Distribution & Download API Tests', () => {
  it('returns valid Android APK release metadata and version info', async () => {
    const res = await request(app).get('/api/v1/downloads/android/info');

    expect(res.status).toBe(200);
    expect(res.body.app).toBeDefined();
    expect(res.body.app.appName).toBe('Monu Sagar');
    // Version- and brand-agnostic: assert a valid semver and a filename derived
    // from it, so release bumps and product renames don't break the contract.
    expect(res.body.app.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(res.body.app.packageId).toBe('com.torqueerp.app');
    expect(res.body.app.fileName).toMatch(new RegExp(`-v${res.body.app.version.replace(/\./g, '\\.')}\\.apk$`));
    expect(res.body.app.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(res.body.downloadUrl).toBe('/api/v1/downloads/android');
  });

  // Streaming the ~74 MB release APK through supertest takes ~4-6s on a
  // typical dev machine — the default 5s test timeout is too tight for it.
  it('streams the Android APK binary package with correct MIME type and headers', { timeout: 30_000 }, async () => {
    const info = await request(app).get('/api/v1/downloads/android/info');
    const { version, fileName } = info.body.app;

    const res = await request(app).get('/api/v1/downloads/android');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/vnd.android.package-archive');
    expect(res.headers['content-disposition']).toContain(fileName);
    expect(res.headers['x-app-version']).toBe(version);
    expect(res.headers['x-package-id']).toBe('com.torqueerp.app');
  });
});
