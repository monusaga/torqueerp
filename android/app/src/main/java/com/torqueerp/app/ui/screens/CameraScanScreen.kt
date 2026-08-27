package com.torqueerp.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.torqueerp.app.data.api.ApiService
import com.torqueerp.app.data.model.*
import com.torqueerp.app.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Smart spare-parts scanner:
 *  1. Barcode/QR detected -> backend lookup (barcode/partNumber/SKU/qrCode).
 *  2. No match -> automatic ML Kit OCR of the same label -> /products/identify-scan
 *     matches by extracted part number (exact + normalized).
 *  3. Still unknown but label readable -> "New Product Detected" prefill dialog.
 *  4. Nothing readable -> friendly retry message; never a raw error dead-end.
 * The identified product is handed back to the caller (POS cart / Inventory).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CameraScanScreen(
    apiService: ApiService,
    cartBadge: Int? = null,
    onGoToCart: (() -> Unit)? = null,
    onProductIdentified: (Product) -> Unit,
    onOcrForCatalog: (ExtractedOCRData) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasCameraPermission = isGranted
    }

    LaunchedEffect(Unit) {
        if (!hasCameraPermission) {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    // 0 = Auto Scan (barcode -> OCR fallback), 1 = manual OCR label -> catalog prefill
    var scanMode by remember { mutableStateOf(0) }
    val scanModeState = rememberUpdatedState(scanMode)
    var latestOcrText by remember { mutableStateOf("") }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    var isIdentifying by remember { mutableStateOf(false) }
    var newProductSuggestion by remember { mutableStateOf<SuggestedProduct?>(null) }
    var newProductScannedCode by remember { mutableStateOf<String?>(null) }
    var ambiguousCandidates by remember { mutableStateOf<List<Product>?>(null) }
    var isProcessingOcr by remember { mutableStateOf(false) }
    var ocrResult by remember { mutableStateOf<ExtractedOCRData?>(null) }

    // Debounce: process one code at a time; ignore repeats of the same code
    // for a cooldown window so 30fps camera frames trigger exactly one scan.
    val busy = remember { AtomicBoolean(false) }
    var lastCode by remember { mutableStateOf("") }
    var lastCodeAt by remember { mutableStateOf(0L) }

    val scope = rememberCoroutineScope()

    fun handleDetectedCode(code: String) {
        val now = System.currentTimeMillis()
        if (code == lastCode && now - lastCodeAt < 4000) return
        if (!busy.compareAndSet(false, true)) return
        lastCode = code
        lastCodeAt = now
        isIdentifying = true
        statusMessage = "Scanning…"

        scope.launch {
            try {
                // STEP 1: direct scanned-code lookup.
                val direct = apiService.identifyScan(IdentifyScanRequest(barcode = code))
                if (direct.status == "MATCHED_PRODUCT" && direct.product != null) {
                    statusMessage = if (cartBadge != null)
                        "✅ Added to cart: ${direct.product.name} — keep scanning"
                    else
                        "✅ Product found: ${direct.product.name}"
                    onProductIdentified(direct.product)
                    return@launch
                }

                // STEP 2: automatic OCR fallback on the same label.
                statusMessage = "Reading part label…"
                var waited = 0L
                while (latestOcrText.isBlank() && waited < 3000) {
                    delay(300)
                    waited += 300
                }
                val ocrText = latestOcrText

                val res = apiService.identifyScan(IdentifyScanRequest(barcode = code, ocrText = ocrText.ifBlank { null }))
                when (res.status) {
                    "MATCHED_PRODUCT" -> {
                        if (res.product != null) {
                            statusMessage = "✅ Product found: ${res.product.name}"
                            onProductIdentified(res.product)
                        }
                    }
                    "AMBIGUOUS_MATCH" -> {
                        statusMessage = "Multiple parts match — please choose."
                        ambiguousCandidates = res.candidates
                    }
                    "NEW_PRODUCT" -> {
                        statusMessage = "🆕 New part detected"
                        newProductScannedCode = code
                        newProductSuggestion = res.suggested
                    }
                    else -> {
                        statusMessage = "Couldn't identify this part. Hold the label steady with the part number visible."
                    }
                }
            } catch (e: Exception) {
                statusMessage = "Network error — could not reach server. Retrying scan…"
            } finally {
                isIdentifying = false
                // Cooldown before the next detection can fire.
                delay(2000)
                busy.set(false)
            }
        }
    }

    fun processManualOcr() {
        val text = latestOcrText
        if (text.isBlank()) {
            statusMessage = "No label text detected yet. Hold the part label steady in the frame."
            return
        }
        isProcessingOcr = true
        statusMessage = null
        scope.launch {
            try {
                val res = apiService.processOcr(OCRProcessRequest(text = text))
                if (res.extracted != null) {
                    ocrResult = res.extracted
                } else {
                    statusMessage = "Could not extract part fields from the label."
                }
            } catch (e: Exception) {
                statusMessage = e.localizedMessage ?: "OCR processing failed."
            } finally {
                isProcessingOcr = false
            }
        }
    }

    Scaffold(
        containerColor = SlateBackground,
        topBar = {
            Column {
                TopAppBar(
                    title = { Text("Camera Scanner & OCR", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = SlateCard,
                        titleContentColor = TextWhite
                    )
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SlateCard)
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(SlateBackground, RoundedCornerShape(12.dp))
                            .padding(4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .background(if (scanMode == 0) EmeraldGreen else Color.Transparent, RoundedCornerShape(8.dp))
                                .clickable { scanMode = 0; busy.set(false) }
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                "⚡ Auto Scan",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (scanMode == 0) Color.White else TextMuted
                            )
                        }
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .background(if (scanMode == 1) AmberGold else Color.Transparent, RoundedCornerShape(8.dp))
                                .clickable { scanMode = 1; busy.set(false) }
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                "🏷️ OCR Label → Catalog",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (scanMode == 1) InkButton else TextMuted
                            )
                        }
                    }
                }
            }
        },
        bottomBar = {
            if (scanMode == 1 && hasCameraPermission) {
                Surface(color = SlateCard, modifier = Modifier.border(1.dp, SlateBorder)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Button(
                            onClick = { processManualOcr() },
                            enabled = !isProcessingOcr,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = AmberGold)
                        ) {
                            Text(
                                if (isProcessingOcr) "Extracting Part Fields…" else "📷 Capture Label & Extract Fields",
                                color = OnAccent,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            } else if (scanMode == 0 && hasCameraPermission && cartBadge != null && cartBadge > 0 && onGoToCart != null) {
                // Batch selling: running cart count with a direct jump to checkout.
                Surface(color = SlateCard, modifier = Modifier.border(1.dp, SlateBorder)) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Button(
                            onClick = { onGoToCart() },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                        ) {
                            Text(
                                "🛒 Go to Cart ($cartBadge item${if (cartBadge == 1) "" else "s"}) ➔",
                                color = Color.White,
                                fontWeight = FontWeight.Black
                            )
                        }
                    }
                }
            }
        }
    ) { padding ->
        if (hasCameraPermission) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                AndroidView(
                    factory = { ctx ->
                        val previewView = PreviewView(ctx)
                        val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                        val executor = Executors.newSingleThreadExecutor()
                        val barcodeScanner = BarcodeScanning.getClient()
                        val textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

                        cameraProviderFuture.addListener({
                            val cameraProvider = cameraProviderFuture.get()
                            val preview = Preview.Builder().build().also {
                                it.setSurfaceProvider(previewView.surfaceProvider)
                            }

                            val imageAnalysis = ImageAnalysis.Builder()
                                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                .build()

                            imageAnalysis.setAnalyzer(executor) { imageProxy ->
                                val mediaImage = imageProxy.image
                                if (mediaImage == null) {
                                    imageProxy.close()
                                    return@setAnalyzer
                                }
                                val image = InputImage.fromMediaImage(
                                    mediaImage,
                                    imageProxy.imageInfo.rotationDegrees
                                )

                                // Text recognition runs continuously in BOTH modes so
                                // the OCR fallback has fresh label text the moment a
                                // barcode lookup misses.
                                textRecognizer.process(image)
                                    .addOnSuccessListener { visionText ->
                                        if (visionText.text.isNotBlank()) {
                                            latestOcrText = visionText.text
                                        }
                                    }
                                    .addOnCompleteListener {
                                        if (scanModeState.value != 0) {
                                            imageProxy.close()
                                        } else {
                                            barcodeScanner.process(image)
                                                .addOnSuccessListener { barcodes ->
                                                    barcodes.firstOrNull()?.rawValue?.let { code ->
                                                        handleDetectedCode(code)
                                                    }
                                                }
                                                .addOnCompleteListener {
                                                    imageProxy.close()
                                                }
                                        }
                                    }
                            }

                            try {
                                cameraProvider.unbindAll()
                                cameraProvider.bindToLifecycle(
                                    lifecycleOwner,
                                    CameraSelector.DEFAULT_BACK_CAMERA,
                                    preview,
                                    imageAnalysis
                                )
                            } catch (e: Exception) {
                                // ignore
                            }
                        }, ContextCompat.getMainExecutor(ctx))

                        previewView
                    },
                    modifier = Modifier.fillMaxSize()
                )

                // Overlay reticle
                Box(
                    modifier = Modifier
                        .size(260.dp)
                        .border(2.dp, if (scanMode == 0) EmeraldGreen else AmberGold, RoundedCornerShape(20.dp))
                        .align(Alignment.Center)
                )

                if (isIdentifying) {
                    CircularProgressIndicator(
                        color = EmeraldGreen,
                        modifier = Modifier
                            .align(Alignment.Center)
                            .size(44.dp)
                    )
                }

                // Live status / helper text
                Text(
                    text = statusMessage ?: if (scanMode == 0)
                        "Point camera at barcode or part label — the part will be identified automatically"
                    else
                        "Align the part label, then tap Capture to extract Part No / Name / MRP",
                    color = TextWhite,
                    fontSize = 12.sp,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 32.dp, start = 16.dp, end = 16.dp)
                        .background(SlateCard, RoundedCornerShape(12.dp))
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
        } else {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Text("Camera permission required to scan spare parts.", color = TextMuted)
            }
        }
    }

    // ---- New Product Detected: prefilled, editable, saved via existing POST /products ----
    newProductSuggestion?.let { sug ->
        var partNo by remember(sug) { mutableStateOf(sug.partNumber ?: "") }
        var name by remember(sug) { mutableStateOf(sug.name ?: "") }
        var mrp by remember(sug) { mutableStateOf(sug.mrp?.let { v -> if (v % 1.0 == 0.0) v.toInt().toString() else v.toString() } ?: "") }
        var selling by remember(sug) { mutableStateOf(sug.sellingPrice?.let { v -> if (v % 1.0 == 0.0) v.toInt().toString() else v.toString() } ?: "") }
        var brand by remember(sug) { mutableStateOf(sug.brand ?: "") }
        var qty by remember(sug) { mutableStateOf("1") }
        var saveError by remember(sug) { mutableStateOf<String?>(null) }
        var saving by remember(sug) { mutableStateOf(false) }

        fun dismiss() {
            newProductSuggestion = null
            newProductScannedCode = null
            statusMessage = null
        }

        AlertDialog(
            onDismissRequest = { dismiss() },
            containerColor = SlateCard,
            title = { Text("🆕 New Product Detected", color = TextWhite, fontWeight = FontWeight.Black) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        "Extracted from the label — review and confirm.",
                        fontSize = 11.sp,
                        color = AmberGold,
                        fontWeight = FontWeight.Bold
                    )
                    newProductScannedCode?.let { c ->
                        Text("Scanned code: $c", fontSize = 10.sp, color = TextMuted)
                    }
                    OutlinedTextField(
                        value = partNo, onValueChange = { partNo = it },
                        label = { Text("Part Number *", color = TextMuted, fontSize = 11.sp) },
                        singleLine = true, modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = name, onValueChange = { name = it },
                        label = { Text("Part Name *", color = TextMuted, fontSize = 11.sp) },
                        singleLine = true, modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = brand, onValueChange = { brand = it },
                        label = { Text("Brand", color = TextMuted, fontSize = 11.sp) },
                        singleLine = true, modifier = Modifier.fillMaxWidth()
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = mrp, onValueChange = { mrp = it },
                            label = { Text("MRP ₹", color = TextMuted, fontSize = 11.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = selling, onValueChange = { selling = it },
                            label = { Text("Selling ₹ *", color = TextMuted, fontSize = 11.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                    }
                    TorqueQtyStepper(
                        value = qty,
                        onValueChange = { qty = it },
                        label = "Opening Quantity (min 1)"
                    )
                    saveError?.let { err ->
                        Text(err, fontSize = 11.sp, color = DangerRed)
                    }
                }
            },
            confirmButton = {
                Button(
                    enabled = !saving,
                    onClick = {
                        if (partNo.isBlank() || name.isBlank() || (selling.toDoubleOrNull() ?: 0.0) <= 0.0) {
                            saveError = "Part number, name and selling price are required."
                            return@Button
                        }
                        saving = true
                        scope.launch {
                            try {
                                val scanned = newProductScannedCode
                                val isPlainDigits = scanned != null && scanned.matches(Regex("^\\d{8,14}$"))
                                val res = apiService.createProduct(
                                    CreateProductRequest(
                                        name = name.trim(),
                                        partNumber = partNo.trim(),
                                        // QR payloads that differ from the part number are
                                        // stored in qrCode; plain EAN digit runs in barcode.
                                        barcode = if (isPlainDigits) scanned else sug.barcode?.takeIf { it.matches(Regex("^\\d{8,14}$")) },
                                        qrCode = if (!isPlainDigits) scanned else null,
                                        brand = brand.ifBlank { null },
                                        mrp = mrp.toDoubleOrNull() ?: 0.0,
                                        purchaseCost = 0.0,
                                        sellingPrice = selling.toDoubleOrNull() ?: 0.0,
                                        initialStock = qty.toIntOrNull() ?: 1,
                                        minStock = 3
                                    )
                                )
                                statusMessage = "✅ Product created: ${res.product.name}"
                                dismiss()
                                onProductIdentified(res.product)
                            } catch (e: Exception) {
                                saveError = e.localizedMessage ?: "Failed to save product."
                            } finally {
                                saving = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                ) {
                    Text(if (saving) "Saving…" else "Save & Continue ➔", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { dismiss() }) {
                    Text("Rescan", color = TextMuted)
                }
            }
        )
    }

    // ---- Ambiguous match: user picks the right part, never auto-guessed ----
    ambiguousCandidates?.let { cands ->
        AlertDialog(
            onDismissRequest = { ambiguousCandidates = null; statusMessage = null },
            containerColor = SlateCard,
            title = { Text("Multiple Parts Match", color = TextWhite, fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Select the correct spare part:", fontSize = 12.sp, color = TextMuted)
                    cands.forEach { p ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, SlateBorder, RoundedCornerShape(10.dp))
                                .clickable {
                                    ambiguousCandidates = null
                                    statusMessage = "✅ Product selected: ${p.name}"
                                    onProductIdentified(p)
                                },
                            colors = CardDefaults.cardColors(containerColor = SlateBackground)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text(p.name, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                                Text("Part: ${p.partNumber} • ₹${p.sellingPrice} • Stock ${p.currentStock}", fontSize = 10.sp, color = TextMuted)
                            }
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { ambiguousCandidates = null; statusMessage = null }) {
                    Text("Cancel", color = TextMuted)
                }
            }
        )
    }

    // ---- Manual OCR mode result (catalog prefill) ----
    ocrResult?.let { extracted ->
        AlertDialog(
            onDismissRequest = { ocrResult = null },
            containerColor = SlateCard,
            title = { Text("🏷️ Extracted Label Fields", color = TextWhite, fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    OcrFieldRow("Part Number", extracted.partNumber?.value, extracted.partNumber?.confidence)
                    OcrFieldRow("Part Name", extracted.partName?.value, extracted.partName?.confidence)
                    OcrFieldRow("MRP ₹", extracted.mrp?.value, extracted.mrp?.confidence)
                    OcrFieldRow("Barcode", extracted.barcode?.value, extracted.barcode?.confidence)
                    Text(
                        "Extracted fields are suggestions — review before saving.",
                        fontSize = 10.sp,
                        color = TextMuted,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val res = ocrResult
                        ocrResult = null
                        if (res != null) onOcrForCatalog(res)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AmberGold)
                ) {
                    Text("Use in Product Catalog ➔", color = OnAccent, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { ocrResult = null }) {
                    Text("Rescan", color = TextMuted)
                }
            }
        )
    }
}

@Composable
private fun OcrFieldRow(label: String, value: String?, confidence: Int?) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, fontSize = 12.sp, color = TextMuted)
        Column(horizontalAlignment = Alignment.End) {
            Text(
                value ?: "— not found —",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = if (value != null) TextWhite else TextMuted
            )
            confidence?.let {
                Text("$it% confidence", fontSize = 9.sp, color = if (it >= 70) EmeraldGreen else AlertAmber)
            }
        }
    }
}
