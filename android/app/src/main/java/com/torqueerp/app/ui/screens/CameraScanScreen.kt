package com.torqueerp.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.util.Size
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.core.resolutionselector.AspectRatioStrategy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
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
import com.google.android.gms.tasks.Task
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * A frame worth sending to the identifier: one where the OCR text contains an
 * OEM part-number field, not just whatever else was in shot.
 */
private val PART_LABEL_HINT = Regex(
    """PART\s*(NO|NUMBER|CODE)|\bP\s*/?\s*N\b|PT\s*NO|MATERIAL|MAT\s*NO""",
    RegexOption.IGNORE_CASE
)

/**
 * A cleanly-read price: rupees and paise. Deliberately strict — a frame that
 * only shows a price *label* is not good enough. On a soft frame ML Kit reads
 * "MRP Rs. 350.00" as "VRP Rs. 35000", and accepting that made the scanner
 * report a hundred-times-wrong price. Waiting for the decimal is what
 * distinguishes a usable read from a damaged one.
 */
private val PRICE_HINT = Regex("""\d+\.\d{2}""")

/**
 * Samples the live OCR stream and merges the distinct lines every frame
 * contributes.
 *
 * A single frame usually has part of the label sharp and part of it blurred, so
 * using one frame's text drops whichever field happened to be soft — the cause
 * of half-filled scan results. Merging across frames lets the part number come
 * from one frame and the MRP from another. Sampling stops as soon as the merged
 * text carries both, and otherwise runs for the full window.
 */
private suspend fun collectLabelText(
    read: () -> String,
    windowMs: Long = 6000,
    stepMs: Long = 200
): String {
    val lines = LinkedHashSet<String>()
    var lastFrame = ""
    var waited = 0L
    while (waited < windowMs) {
        val current = read()
        if (current.isNotBlank() && current != lastFrame) {
            lastFrame = current
            current.lineSequence()
                .map { it.trim() }
                .filter { it.isNotEmpty() }
                .forEach { lines.add(it) }

            val merged = lines.joinToString("\n")
            if (PART_LABEL_HINT.containsMatchIn(merged) && PRICE_HINT.containsMatchIn(merged)) {
                return merged
            }
        }
        delay(stepMs)
        waited += stepMs
    }
    return lines.joinToString("\n")
}

/**
 * Awaits a Play-services Task from a coroutine without pulling in the
 * kotlinx-coroutines-play-services artifact.
 */
private suspend fun <T> Task<T>.awaitResult(): T = suspendCancellableCoroutine { cont ->
    addOnSuccessListener { result -> if (cont.isActive) cont.resume(result) }
    addOnFailureListener { error -> if (cont.isActive) cont.resumeWithException(error) }
    addOnCanceledListener { cont.cancel() }
}

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
    // Manual entry opens the same product form with blank fields.
    var manualEntry by remember { mutableStateOf(false) }
    // Set when the backend read a price it is not confident about — typically a
    // label whose decimal point was lost. The prefilled MRP is then shown with
    // a warning instead of looking like a verified value.
    var mrpNeedsReview by remember { mutableStateOf(false) }
    // Read by the camera analyzer, which outlives any single recomposition.
    val manualEntryState = rememberUpdatedState(manualEntry)

    // Debounce: process one code at a time; ignore repeats of the same code
    // for a cooldown window so 30fps camera frames trigger exactly one scan.
    val busy = remember { AtomicBoolean(false) }
    var lastCode by remember { mutableStateOf("") }
    var lastCodeAt by remember { mutableStateOf(0L) }

    val scope = rememberCoroutineScope()

    fun handleDetectedCode(code: String) {
        // While the user is typing a part in by hand, a code drifting through
        // the viewfinder must not overwrite what they have entered.
        if (manualEntryState.value) return
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
                // Taking the first non-blank frame reads whatever happened to be
                // sharp at that instant — often the surroundings rather than the
                // label, which produced an empty part number and a name lifted
                // from background text. Keep sampling until a frame actually
                // shows a part-number field, and otherwise keep the richest read.
                statusMessage = "Reading part label…"
                val ocrText = collectLabelText(read = { latestOcrText })

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
                        // A scan arriving while the manual form is open replaces
                        // its contents, so the dialog must stop calling itself
                        // "manual" and show the scanned code it prefilled from.
                        manualEntry = false
                        newProductScannedCode = code
                        mrpNeedsReview = res.extracted?.mrp?.needsReview == true
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

    // Gallery import: run the same barcode -> OCR -> identify pipeline on a
    // saved photo, so a label photographed earlier (or sent by a supplier)
    // can be added without re-scanning the physical part.
    fun processGalleryImage(uri: Uri) {
        isIdentifying = true
        statusMessage = "Reading photo…"
        scope.launch {
            try {
                val image = InputImage.fromFilePath(context, uri)

                val barcodeValue = try {
                    val barcodes = BarcodeScanning.getClient().process(image).awaitResult()
                    barcodes.firstOrNull()?.rawValue
                } catch (e: Exception) {
                    null
                }

                val text = try {
                    TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
                        .process(image).awaitResult().text
                } catch (e: Exception) {
                    ""
                }

                if (barcodeValue == null && text.isBlank()) {
                    statusMessage = "Couldn't read anything from that photo. Try a sharper, closer shot of the label."
                    return@launch
                }

                latestOcrText = text
                val res = apiService.identifyScan(
                    IdentifyScanRequest(barcode = barcodeValue, ocrText = text.ifBlank { null })
                )
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
                        statusMessage = "🆕 New part detected from photo"
                        manualEntry = false
                        newProductScannedCode = barcodeValue
                        mrpNeedsReview = res.extracted?.mrp?.needsReview == true
                        newProductSuggestion = res.suggested
                    }
                    else -> {
                        statusMessage = "Couldn't identify this part from the photo. Add it manually below."
                    }
                }
            } catch (e: Exception) {
                statusMessage = e.localizedMessage ?: "Could not process that photo."
            } finally {
                isIdentifying = false
            }
        }
    }

    val galleryPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) processGalleryImage(uri)
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
            } else if (scanMode == 0) {
                // Alternatives to live scanning: import a saved label photo, or
                // type the part in by hand. Both end in the same product form.
                Surface(color = SlateCard, modifier = Modifier.border(1.dp, SlateBorder)) {
                    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                        if (cartBadge != null && cartBadge > 0 && onGoToCart != null) {
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
                            Spacer(modifier = Modifier.height(8.dp))
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            OutlinedButton(
                                onClick = { galleryPicker.launch("image/*") },
                                enabled = !isIdentifying,
                                modifier = Modifier
                                    .weight(1f)
                                    .height(46.dp),
                                shape = RoundedCornerShape(13.dp)
                            ) {
                                Text("🖼️ Gallery", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                            }
                            OutlinedButton(
                                onClick = {
                                    manualEntry = true
                                    newProductScannedCode = null
                                    newProductSuggestion = SuggestedProduct(
                                        partNumber = null, name = null, mrp = null,
                                        sellingPrice = null, brand = null, barcode = null
                                    )
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(46.dp),
                                shape = RoundedCornerShape(13.dp)
                            ) {
                                Text("✏️ Manual Add", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                            }
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

                            // CameraX defaults image analysis to 640x480. Part
                            // numbers and MRP are small print on an OEM label and
                            // come out garbled or half-read at that size, so ask
                            // for 1080p and let CameraX pick the nearest higher
                            // resolution the device actually supports.
                            val resolutionSelector = ResolutionSelector.Builder()
                                .setAspectRatioStrategy(AspectRatioStrategy.RATIO_16_9_FALLBACK_AUTO_STRATEGY)
                                .setResolutionStrategy(
                                    ResolutionStrategy(
                                        Size(1920, 1080),
                                        ResolutionStrategy.FALLBACK_RULE_CLOSEST_HIGHER_THEN_LOWER
                                    )
                                )
                                .build()

                            val imageAnalysis = ImageAnalysis.Builder()
                                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                .setResolutionSelector(resolutionSelector)
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
            manualEntry = false
            mrpNeedsReview = false
            statusMessage = null
        }

        AlertDialog(
            onDismissRequest = { dismiss() },
            containerColor = SlateCard,
            title = {
                Text(
                    if (manualEntry) "✏️ Add Product Manually" else "🆕 New Product Detected",
                    color = TextWhite,
                    fontWeight = FontWeight.Black
                )
            },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        when {
                            manualEntry ->
                                "Type the part number, name and MRP. Brand and selling price are optional."
                            mrpNeedsReview ->
                                "⚠️ The price on this label was hard to read — check the MRP before saving."
                            else -> "Extracted from the label — review and confirm."
                        },
                        fontSize = 11.sp,
                        color = if (mrpNeedsReview && !manualEntry) DangerRed else AmberGold,
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
                            label = {
                                Text(
                                    if (mrpNeedsReview) "MRP ₹ — check!" else "MRP ₹",
                                    color = if (mrpNeedsReview) DangerRed else TextMuted,
                                    fontSize = 11.sp
                                )
                            },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = selling,
                            onValueChange = { selling = it },
                            label = { Text("Selling ₹", color = TextMuted, fontSize = 11.sp) },
                            placeholder = {
                                Text(
                                    if (mrp.isNotBlank()) "= MRP $mrp" else "optional",
                                    color = TextMuted,
                                    fontSize = 11.sp
                                )
                            },
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
                        // Only the identity fields are mandatory. Brand, MRP and
                        // selling price are optional and can be filled in later
                        // from the catalog; selling defaults to MRP when blank.
                        if (partNo.isBlank() || name.isBlank()) {
                            saveError = "Part number and part name are required."
                            return@Button
                        }
                        val mrpValue = mrp.toDoubleOrNull() ?: 0.0
                        val sellingValue = selling.toDoubleOrNull() ?: mrpValue
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
                                        mrp = mrpValue,
                                        purchaseCost = 0.0,
                                        sellingPrice = sellingValue,
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
                    Text(if (manualEntry) "Cancel" else "Rescan", color = TextMuted)
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
