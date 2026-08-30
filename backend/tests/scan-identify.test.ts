import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';
import { prisma } from '../src/lib/prisma.js';
import { LocalOCRService, normalizeCode } from '../src/services/ocrService.js';

const RUN = Date.now();
const EMAIL_A = `scan.owner.a.${RUN}@example.com`;
const EMAIL_B = `scan.owner.b.${RUN}@example.com`;

// Real Royal Enfield throttle-cable label text as produced by ML Kit on the
// physical Samsung S22 test device.
const RE_LABEL_TEXT = `ROYAL ENFIELD
REGD. OFFICE: 3RD FLOOR, SELECT CITY WALK,
A-3, DISTRICT CENTRE, SAKET, NEW DELHI - 110 017.
5032210D235608604J1826
CUSTOMER CODE: 3947
PART NO:580387/F
THROTTLE CABLE
MRP Rs. 240.00
(INCL. OF ALL TAXES) MFD 04/2023
COUNTRY OF ORIGIN:INDIA
NET QTY 1 NUMBER`;

const QR_SERIAL = '5032210D235608604J1826';

let tokenA = '';
let bizA = '';
let tokenB = '';
let bizB = '';
let productId = '';

const authA = () => ({ Authorization: `Bearer ${tokenA}`, 'x-business-id': bizA });
const authB = () => ({ Authorization: `Bearer ${tokenB}`, 'x-business-id': bizB });

beforeAll(async () => {
  const regA = await request(app).post('/api/v1/auth/register').send({
    name: 'Scan Owner A',
    email: EMAIL_A,
    password: 'password123',
    businessName: 'Scan Test Garage A',
  });
  tokenA = regA.body.token;
  bizA = regA.body.activeBusiness.id;

  const regB = await request(app).post('/api/v1/auth/register').send({
    name: 'Scan Owner B',
    email: EMAIL_B,
    password: 'password123',
    businessName: 'Scan Test Garage B',
  });
  tokenB = regB.body.token;
  bizB = regB.body.activeBusiness.id;

  // Product whose QR payload differs from the printed part number — the
  // critical Royal Enfield scenario. QR serial stored in qrCode.
  const create = await request(app).post('/api/v1/products').set(authA()).send({
    name: 'Throttle Cable',
    partNumber: '580387/F',
    qrCode: QR_SERIAL,
    brand: 'Royal Enfield',
    mrp: 240,
    purchaseCost: 150,
    sellingPrice: 220,
    initialStock: 10,
  });
  productId = create.body.product.id;
});

afterAll(async () => {
  // Clean both tenants completely.
  for (const [token, biz] of [[tokenA, bizA], [tokenB, bizB]] as const) {
    await request(app)
      .delete('/api/v1/auth/account')
      .set({ Authorization: `Bearer ${token}`, 'x-business-id': biz });
  }
});

describe('OCR field extraction (LocalOCRService)', () => {
  const svc = new LocalOCRService();

  it('extracts part number, name, MRP, brand and serial barcode from the real RE label', () => {
    const d = svc.parseExtractedText(RE_LABEL_TEXT);
    expect(d.partNumber.value).toBe('580387/F');
    expect(d.partName.value).toBe('Throttle Cable');
    expect(d.mrp.value).toBe(240);
    expect(d.manufacturer.value).toBe('ROYAL ENFIELD');
    expect(d.barcode.value).toBe(QR_SERIAL);
  });

  it('extracts part numbers from labeled variants', () => {
    const svc2 = new LocalOCRService();
    for (const line of ['PART NO 580387/F', 'PART NO: 580387/F', 'PART NUMBER 580387/F', 'P/N 580387/F', 'ITEM NO: 580387/F']) {
      const d = svc2.parseExtractedText(line);
      expect(d.partNumber.value, `failed for: ${line}`).toBe('580387/F');
    }
  });

  it('extracts MRP from labeled variants', () => {
    for (const [line, expected] of [
      ['MRP ₹240', 240],
      ['MRP: Rs.240', 240],
      ['MRP 240.00', 240],
      ['MAXIMUM RETAIL PRICE Rs 240', 240],
      ['M.R.P. Rs. 1,450.00', 1450],
    ] as const) {
      const d = svc.parseExtractedText(String(line));
      expect(d.mrp.value, `failed for: ${line}`).toBe(expected);
    }
  });

  it('normalizes OCR spacing inside part numbers ("580387 / F" -> "580387/F")', () => {
    const d = svc.parseExtractedText('PART NO: 580387 / F');
    expect(d.partNumber.value).toBe('580387/F');
  });

  it('rejects OCR-garbled tax boilerplate and picks the real part name', () => {
    // Real capture from the Samsung S22: "(INCL. OF ALL TAXES)" came through
    // as "(Inncl Of All Takese" and was previously accepted as the part name.
    const d = svc.parseExtractedText(
      'PART NO:873150\nCLUTCH PLATE SET\n(Inncl Of All Takese\nMRP Rs. 310.00'
    );
    expect(d.partName.value).toBe('Clutch Plate Set');
  });

  it('returns no part name at all rather than tax boilerplate', () => {
    const d = svc.parseExtractedText('PART NO:873150\n(Inncl Of All Takese');
    expect(d.partName.value).toBeNull();
  });

  it('falls back to a bare decimal amount when the MRP label is unreadable', () => {
    const d = svc.parseExtractedText('PART NO:873150\nCLUTCH PLATE\n310.00');
    expect(d.mrp.value).toBe(310);
    expect(d.mrp.needsReview).toBe(true);
  });

  it('does not mistake a long serial/barcode for a bare MRP amount', () => {
    const d = svc.parseExtractedText('6153550H268296281G0213\nPART NO:873150');
    expect(d.mrp.value).toBeNull();
  });

  it('does not misreport boilerplate as a part number (no bare-first-word guessing)', () => {
    const d = svc.parseExtractedText('ROYAL ENFIELD GENUINE PARTS\nQUALITY ASSURED');
    expect(d.partNumber.value).toBeNull();
  });

  it('extracts part numbers from every major Indian OEM label format', () => {
    const labels: Array<[string, string, string]> = [
      // [brand, raw label text, expected part number]
      ['Honda', 'HONDA MOTORCYCLE\nPART NUMBER 91201-KTY-003\nOIL SEAL\nMRP Rs. 210.00', '91201-KTY-003'],
      ['Hero', 'HERO MOTOCORP\nPART NO 12345-KWW-900\nBRAKE SHOE\nMRP 450.00', '12345-KWW-900'],
      ['Bajaj', 'BAJAJ AUTO LTD\nPART CODE: JD11801\nCLUTCH CABLE\nM.R.P Rs 185.00', 'JD11801'],
      ['TVS', 'TVS MOTOR COMPANY\nMATERIAL NO A1234567\nAIR FILTER\nMRP: 320.00', 'A1234567'],
      ['KTM', 'KTM\nPART NO: 90113001000\nCHAIN SLIDER\nMRP Rs. 1,250.00', '90113001000'],
      ['Royal Enfield', 'ROYAL ENFIELD\nPART NO:580387/F\nTHROTTLE CABLE\nMRP Rs. 240.00', '580387/F'],
    ];
    for (const [brand, text, expected] of labels) {
      const d = svc.parseExtractedText(text);
      expect(d.partNumber.value, `part number failed for ${brand}`).toBe(expected);
      expect(d.mrp.value, `MRP failed for ${brand}`).toBeGreaterThan(0);
    }
  });

  it('detects the brand across OEMs and component makers', () => {
    const cases: Array<[string, string]> = [
      ['BAJAJ AUTO LTD\nPART CODE: JD11801', 'BAJAJ AUTO'],
      ['TVS MOTOR COMPANY\nMATERIAL NO A1234567', 'TVS MOTOR'],
      ['HERO MOTOCORP\nPART NO 12345-KWW-900', 'HERO MOTOCORP'],
      ['KTM\nPART NO: 90113001000', 'KTM'],
      ['UNO MINDA\nPART NO: MN-4471', 'UNO MINDA'],
      ['MRF TYRES\nPART NO: 9012', 'MRF'],
    ];
    for (const [text, expected] of cases) {
      expect(svc.parseExtractedText(text).manufacturer.value, `brand failed for ${expected}`).toBe(expected);
    }
  });

  it('never mistakes a manufacturing date or long serial for a part number', () => {
    const d = svc.parseExtractedText('MFD 04/2023\n6153550H268296281G0213\nCLUTCH PLATE');
    expect(d.partNumber.value).toBeNull();
  });

  // Captured from the physical S22: on a soft frame ML Kit reads
  // "MRP Rs. 350.00" as "VRP Rs. 35000" — the M becomes a V and the decimal
  // point disappears, which used to yield a price 100x the real one.
  it('prefers a price that kept its paise over one whose decimal OCR dropped', () => {
    const d = svc.parseExtractedText(
      'PART NO 888337\nVRP Rs. 35000\nBRAKE SHOE KIT WITH SPRING\nMRP Rs. 350.00'
    );
    expect(d.mrp.value).toBe(350);
    expect(d.mrp.needsReview).toBe(false);
  });

  it('flags a price for review when no clean decimal amount was read', () => {
    const d = svc.parseExtractedText('PART NO 888337\nBRAKE SHOE KIT\nVRP Rs. 35000');
    expect(d.mrp.needsReview).toBe(true);
    expect(d.mrp.confidence).toBeLessThan(85);
  });

  it('still reads a genuine whole-rupee MRP, but marks it for review', () => {
    const d = svc.parseExtractedText('PART NO:12345\nCLUTCH CABLE\nMRP Rs. 450');
    expect(d.mrp.value).toBe(450);
    expect(d.mrp.needsReview).toBe(true);
  });

  it('normalizeCode treats slash/hyphen/space variants as equal', () => {
    expect(normalizeCode('580387/F')).toBe(normalizeCode('580387 / F'));
    expect(normalizeCode('580387/F')).toBe(normalizeCode('580387-F'));
    expect(normalizeCode('580387/F')).toBe(normalizeCode('580387f'));
    expect(normalizeCode('580387/F')).not.toBe(normalizeCode('580388/F'));
  });
});

describe('POST /products/identify-scan', () => {
  it('matches a product directly by its QR serial (QR value != part number)', async () => {
    const res = await request(app)
      .post('/api/v1/products/identify-scan')
      .set(authA())
      .send({ barcode: QR_SERIAL });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('MATCHED_PRODUCT');
    expect(res.body.matchedBy).toBe('barcode');
    expect(res.body.product.partNumber).toBe('580387/F');
  });

  it('GET /products/lookup also resolves the QR serial via the qrCode field', async () => {
    const res = await request(app)
      .get(`/api/v1/products/lookup/${encodeURIComponent(QR_SERIAL)}`)
      .set(authA());
    expect(res.status).toBe(200);
    expect(res.body.product.id).toBe(productId);
  });

  it('falls back to OCR text and matches by extracted part number when the scanned code is unknown', async () => {
    // Simulate: QR not stored on the product record, only OCR text available.
    const res = await request(app)
      .post('/api/v1/products/identify-scan')
      .set(authA())
      .send({ barcode: 'UNKNOWN-CODE-XYZ-000', ocrText: RE_LABEL_TEXT });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('MATCHED_PRODUCT');
    expect(res.body.product.id).toBe(productId);
    expect(res.body.extracted.mrp.value).toBe(240);
  });

  it('matches with normalized part number ("580387 / F" vs stored "580387/F")', async () => {
    const res = await request(app)
      .post('/api/v1/products/identify-scan')
      .set(authA())
      .send({ ocrText: 'PART NO: 580387 - F\nTHROTTLE CABLE\nMRP Rs 240' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('MATCHED_PRODUCT');
    expect(res.body.product.id).toBe(productId);
  });

  it('returns NEW_PRODUCT with a prefill suggestion for an unknown part with a readable label', async () => {
    const res = await request(app)
      .post('/api/v1/products/identify-scan')
      .set(authA())
      .send({
        barcode: '9999888877776666',
        ocrText: 'ROYAL ENFIELD\nPART NO: 999111/Z\nCLUTCH LEVER ASSEMBLY\nMRP Rs. 380.00',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('NEW_PRODUCT');
    expect(res.body.suggested.partNumber).toBe('999111/Z');
    expect(res.body.suggested.name).toBe('Clutch Lever Assembly');
    expect(res.body.suggested.mrp).toBe(380);
    expect(res.body.suggested.brand).toBe('ROYAL ENFIELD');
    expect(res.body.suggested.barcode).toBe('9999888877776666');
  });

  it('returns NOT_IDENTIFIED (never 404) for an unknown code with useless OCR text', async () => {
    const res = await request(app)
      .post('/api/v1/products/identify-scan')
      .set(authA())
      .send({ barcode: 'TOTALLY-UNKNOWN-1', ocrText: 'blur blur blur' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('NOT_IDENTIFIED');
  });

  it('returns NOT_IDENTIFIED for an empty scan payload', async () => {
    const res = await request(app)
      .post('/api/v1/products/identify-scan')
      .set(authA())
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('NOT_IDENTIFIED');
  });

  it('returns AMBIGUOUS_MATCH with candidates instead of silently guessing', async () => {
    // Two distinct products whose identifiers normalize to the same code.
    await request(app).post('/api/v1/products').set(authA()).send({
      name: 'Brake Lever Type 1',
      partNumber: 'AB-777',
      mrp: 100, purchaseCost: 50, sellingPrice: 90,
    });
    await request(app).post('/api/v1/products').set(authA()).send({
      name: 'Brake Lever Type 2',
      partNumber: 'AB777-X',
      sku: 'AB/777',
      mrp: 110, purchaseCost: 55, sellingPrice: 95,
    });

    const res = await request(app)
      .post('/api/v1/products/identify-scan')
      .set(authA())
      .send({ ocrText: 'PART NO: AB 777\nBRAKE LEVER' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('AMBIGUOUS_MATCH');
    expect(res.body.candidates.length).toBe(2);
  });

  it('enforces tenant isolation — tenant B cannot identify tenant A products', async () => {
    const res = await request(app)
      .post('/api/v1/products/identify-scan')
      .set(authB())
      .send({ barcode: QR_SERIAL, ocrText: RE_LABEL_TEXT });

    expect(res.status).toBe(200);
    expect(res.body.status).not.toBe('MATCHED_PRODUCT');
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/v1/products/identify-scan')
      .send({ barcode: QR_SERIAL });
    expect(res.status).toBe(401);
  });

  it('duplicate prevention: creating the same part number again is rejected with 409', async () => {
    const res = await request(app).post('/api/v1/products').set(authA()).send({
      name: 'Throttle Cable Duplicate Attempt',
      partNumber: '580387/F',
      mrp: 240, purchaseCost: 150, sellingPrice: 220,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_PRODUCT');
  });

  it('after creating a previously-unknown product, the same scan immediately matches it', async () => {
    await request(app).post('/api/v1/products').set(authA()).send({
      name: 'Clutch Lever Assembly',
      partNumber: '999111/Z',
      qrCode: '9999888877776666',
      mrp: 380, purchaseCost: 250, sellingPrice: 360,
    });

    const res = await request(app)
      .post('/api/v1/products/identify-scan')
      .set(authA())
      .send({ barcode: '9999888877776666' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('MATCHED_PRODUCT');
    expect(res.body.product.partNumber).toBe('999111/Z');
  });
});
