export interface ExtractedField<T> {
  value: T;
  confidence: number; // 0 to 100
  needsReview: boolean;
}

export interface ExtractedProductData {
  rawText: string;
  partNumber: ExtractedField<string | null>;
  partName: ExtractedField<string | null>;
  mrp: ExtractedField<number | null>;
  manufacturer: ExtractedField<string | null>;
  barcode: ExtractedField<string | null>;
  invoiceNumber: ExtractedField<string | null>;
  quantity: ExtractedField<number | null>;
}

export interface OCRProvider {
  processImage(imageBuffer: Buffer | string): Promise<ExtractedProductData>;
}

/**
 * Canonical form for comparing part numbers / SKUs / barcodes across OCR noise:
 * uppercase with every non-alphanumeric character removed, so
 * "580387/F", "580387 / F", "580387-F" and "580387:F" all compare equal.
 * Deterministic — no fuzzy edit-distance matching that could pick a wrong part.
 */
export function normalizeCode(value: string | null | undefined): string {
  if (!value) return '';
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Lines that are label boilerplate, never a part name.
const NAME_BLACKLIST =
  /REGD|OFFICE|DISTRICT|COUNTRY|ORIGIN|MFD|MFG|NET\s*QTY|CUSTOMER|CODE|TAXES|INCL|WWW\.|\bLTD\b|\bPVT\b|BATCH|DATE|MADE\s+IN|WARRANTY|HELPLINE|EMAIL|PHONE|ADDRESS|FLOOR|WALK|CENTRE|CENTER|GST|CIN\b/i;

const KNOWN_BRANDS = [
  'ROYAL ENFIELD', 'HERO', 'HONDA', 'BAJAJ', 'TVS', 'YAMAHA', 'SUZUKI', 'KTM',
  'MARUTI', 'HYUNDAI', 'TATA', 'MAHINDRA', 'TOYOTA',
  'BOSCH', 'MINDA', 'ENDURANCE', 'GABRIEL', 'LUMAX', 'PRICOL', 'EXIDE',
  'AMARON', 'CASTROL', 'MOTUL', 'NGK', 'MRF', 'CEAT',
];

export class LocalOCRService implements OCRProvider {
  /**
   * Extracts text and structured fields from an image using heuristic text parsing.
   * Safe, zero-cost, deterministic, and supports review workflows.
   */
  async processImage(imageBuffer: Buffer | string): Promise<ExtractedProductData> {
    // In production or web client, Tesseract.js / Android ML Kit delivers the OCR text.
    // This service parses the text stream with regex & confidence analysis.
    let text = '';
    if (typeof imageBuffer === 'string') {
      text = imageBuffer;
    } else {
      text = imageBuffer.toString('utf-8');
    }

    return this.parseExtractedText(text);
  }

  parseExtractedText(text: string): ExtractedProductData {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // ------------------------------------------------------------------
    // 1. Part Number — prioritized: an explicit label always beats a guess.
    //    Handles: PART NO 580387/F | PART NO:580387/F | PART NUMBER 580387/F
    //             P/N 580387/F | P.NO 580387/F | ITEM NO 580387/F | SKU AB-123
    //    OCR noise tolerated: "580387 / F", "580387- F".
    // ------------------------------------------------------------------
    let detectedPartNo: string | null = null;
    let partNoConfidence = 0;
    let partNoLineIdx = -1;

    const labeledPartNo =
      /(?:PART\s*(?:NO|NUMBER|#)\.?|P\s*[/.]\s*N(?:O)?\.?|ITEM\s*(?:NO|#)\.?|SKU)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9 /\-.]{2,})/i;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(labeledPartNo);
      if (match && match[1]) {
        // Collapse OCR spacing around separators: "580387 / F" -> "580387/F"
        const cleaned = match[1].toUpperCase().replace(/\s*([/\-.])\s*/g, '$1').replace(/\s+/g, ' ').trim();
        if (normalizeCode(cleaned).length >= 3) {
          detectedPartNo = cleaned;
          partNoConfidence = 92;
          partNoLineIdx = i;
          break;
        }
      }
    }

    // Fallback: a standalone token that LOOKS like a part number (digits + suffix
    // letter separated by / or -, e.g. 580387/F, RAH00140/B, 145214-C).
    if (!detectedPartNo) {
      const bareCandidate = /\b([A-Z]{0,4}\d{4,}\s*[/-]\s*[A-Z0-9]{1,3})\b/;
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(bareCandidate);
        if (match && match[1]) {
          detectedPartNo = match[1].toUpperCase().replace(/\s*([/-])\s*/g, '$1');
          partNoConfidence = 70;
          partNoLineIdx = i;
          break;
        }
      }
    }

    // ------------------------------------------------------------------
    // 2. MRP — labeled forms first (MRP / M.R.P / MAX RETAIL PRICE), then
    //    generic price markers. "MRP ₹240", "MRP: Rs.240", "MRP 240.00",
    //    "MAXIMUM RETAIL PRICE Rs 240", "MRP Rs. 240.00 (INCL. OF ALL TAXES)".
    // ------------------------------------------------------------------
    let detectedMrp: number | null = null;
    let mrpConfidence = 0;

    const labeledMrp =
      /(?:M\.?\s*R\.?\s*P\.?|MAX(?:IMUM)?\s*RETAIL\s*PRICE|RETAIL\s*PRICE)\s*[:.\-]?\s*(?:₹|RS\.?|INR)?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i;
    const genericPrice = /(?:PRICE|RS\.?|₹|INR)\s*[:.\-]?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i;

    for (const line of lines) {
      const match = line.match(labeledMrp);
      if (match && match[1]) {
        const val = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) {
          detectedMrp = val;
          mrpConfidence = 95;
          break;
        }
      }
    }
    if (detectedMrp === null) {
      for (const line of lines) {
        const match = line.match(genericPrice);
        if (match && match[1]) {
          const val = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(val) && val > 0) {
            detectedMrp = val;
            mrpConfidence = 70;
            break;
          }
        }
      }
    }

    // ------------------------------------------------------------------
    // 3. Manufacturer / Brand
    // ------------------------------------------------------------------
    let detectedMfg: string | null = null;
    let mfgConfidence = 0;
    for (const line of lines) {
      const upper = line.toUpperCase();
      const found = KNOWN_BRANDS.find(b => upper.includes(b));
      if (found) {
        detectedMfg = found;
        mfgConfidence = 90;
        break;
      }
    }

    // ------------------------------------------------------------------
    // 4. Part Name — labeled first, else the letter-dominant line adjacent to
    //    the part-number line (real labels print the description next to it).
    // ------------------------------------------------------------------
    let detectedName: string | null = null;
    let nameConfidence = 0;
    const nameRegex = /(?:NAME|DESC(?:RIPTION)?|ITEM)\s*[:.\-]\s*(.+)/i;
    for (const line of lines) {
      const match = line.match(nameRegex);
      if (match && match[1] && match[1].trim().length > 3) {
        detectedName = match[1].trim();
        nameConfidence = 85;
        break;
      }
    }

    const looksLikeName = (l: string): boolean => {
      if (l.length < 4 || l.length > 48) return false;
      if (NAME_BLACKLIST.test(l)) return false;
      if (labeledMrp.test(l) || labeledPartNo.test(l)) return false;
      const letters = (l.match(/[A-Za-z]/g) || []).length;
      const digits = (l.match(/[0-9]/g) || []).length;
      return letters >= 4 && letters > digits * 2;
    };

    if (!detectedName && partNoLineIdx >= 0) {
      // Prefer the line right after the part number, then right before it.
      for (const idx of [partNoLineIdx + 1, partNoLineIdx - 1, partNoLineIdx + 2]) {
        if (idx >= 0 && idx < lines.length && looksLikeName(lines[idx])) {
          detectedName = lines[idx].trim();
          nameConfidence = 72;
          break;
        }
      }
    }
    if (!detectedName) {
      const candidate = lines.find(looksLikeName);
      if (candidate) {
        detectedName = candidate;
        nameConfidence = 55;
      }
    }
    // Title-case shouty OCR names for readability ("THROTTLE CABLE" -> "Throttle Cable")
    if (detectedName && detectedName === detectedName.toUpperCase()) {
      detectedName = detectedName
        .toLowerCase()
        .replace(/\b[a-z]/g, c => c.toUpperCase());
    }

    // ------------------------------------------------------------------
    // 5. Barcode — standard EAN/UPC digit runs, plus long alphanumeric
    //    serial codes printed under QR codes (e.g. 5032210D235608604J1826).
    // ------------------------------------------------------------------
    let detectedBarcode: string | null = null;
    let barcodeConfidence = 0;
    const digitBarcode = /\b(\d{8}|\d{12}|\d{13}|\d{14})\b/;
    const serialBarcode = /\b([A-Z0-9]{16,32})\b/;
    for (const line of lines) {
      const match = line.match(digitBarcode);
      if (match && match[1]) {
        detectedBarcode = match[1];
        barcodeConfidence = 98;
        break;
      }
    }
    if (!detectedBarcode) {
      for (const line of lines) {
        const match = line.toUpperCase().match(serialBarcode);
        if (match && match[1] && /\d/.test(match[1])) {
          detectedBarcode = match[1];
          barcodeConfidence = 80;
          break;
        }
      }
    }

    // 6. Invoice Number Detection (e.g., INV-001, BILL NO: 4589)
    let detectedInvoiceNo: string | null = null;
    let invConfidence = 0;
    const invRegex = /(?:INV(?:OICE)?\s*(?:NO|#)?|BILL\s*(?:NO|#)?|TAX\s*INVOICE)[:.\s]*([A-Z0-9\-_/]+)/i;
    for (const line of lines) {
      const match = line.match(invRegex);
      if (match && match[1] && match[1].length >= 3) {
        detectedInvoiceNo = match[1].toUpperCase();
        invConfidence = 88;
        break;
      }
    }

    return {
      rawText: text,
      partNumber: {
        value: detectedPartNo,
        confidence: partNoConfidence,
        needsReview: partNoConfidence < 85,
      },
      partName: {
        value: detectedName,
        confidence: nameConfidence,
        needsReview: nameConfidence < 80,
      },
      mrp: {
        value: detectedMrp,
        confidence: mrpConfidence,
        needsReview: mrpConfidence < 85,
      },
      manufacturer: {
        value: detectedMfg,
        confidence: mfgConfidence,
        needsReview: mfgConfidence < 80,
      },
      barcode: {
        value: detectedBarcode,
        confidence: barcodeConfidence,
        needsReview: barcodeConfidence < 90,
      },
      invoiceNumber: {
        value: detectedInvoiceNo,
        confidence: invConfidence,
        needsReview: invConfidence < 85,
      },
      quantity: {
        value: 1,
        confidence: 90,
        needsReview: false,
      },
    };
  }
}
