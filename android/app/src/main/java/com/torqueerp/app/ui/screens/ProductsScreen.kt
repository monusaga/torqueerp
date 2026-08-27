package com.torqueerp.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.torqueerp.app.data.api.ApiService
import com.torqueerp.app.data.model.*
import com.torqueerp.app.ui.theme.*
import kotlinx.coroutines.launch

private val SPARE_CATEGORIES = listOf(
    "Braking System",
    "Engine & Cylinder",
    "Clutch & Transmission",
    "Electrical & Battery",
    "Suspension & Shock Absorbers",
    "Filters (Air / Oil / Fuel)",
    "Oils & Lubricants",
    "Body Parts & Mudguards",
    "Lighting & Indicators",
    "Exhaust & Silencer",
    "Handlebar & Controls",
    "Tires, Tubes & Wheels",
    "Chassis & Frame",
    "Accessories & Luggage"
)

@Composable
fun ProductsScreen(
    apiService: ApiService,
    ocrPrefill: ExtractedOCRData?,
    onOcrConsumed: () -> Unit,
    onNavigateBack: () -> Unit,
    onOpenScan: () -> Unit
) {
    var products by remember { mutableStateOf<List<Product>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedBrand by remember { mutableStateOf("All") }
    var lowStockOnly by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(true) }
    var showAddDialog by remember { mutableStateOf(false) }
    var editingProduct by remember { mutableStateOf<Product?>(null) }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    var pendingOcr by remember { mutableStateOf<ExtractedOCRData?>(null) }

    val scope = rememberCoroutineScope()
    val brands = listOf(
        "All", "Royal Enfield", "Hero MotoCorp", "Honda 2-Wheelers", "Bajaj Auto", "TVS Motor",
        "Yamaha", "Suzuki 2-Wheelers", "KTM", "Maruti Suzuki", "Hyundai", "Tata Motors", "Mahindra", "Toyota"
    )

    // OCR scan handoff from camera screen -> open Add dialog prefilled
    LaunchedEffect(ocrPrefill) {
        if (ocrPrefill != null) {
            pendingOcr = ocrPrefill
            showAddDialog = true
            onOcrConsumed()
        }
    }

    fun loadProducts() {
        isLoading = true
        scope.launch {
            try {
                val brandQuery = if (selectedBrand == "All") null else selectedBrand
                val res = apiService.getProducts(
                    search = searchQuery.ifBlank { null },
                    brand = brandQuery,
                    lowStock = if (lowStockOnly) true else null,
                    limit = 100
                )
                products = res.data
            } catch (e: Exception) {
                statusMessage = "Error loading products: ${e.localizedMessage}"
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(selectedBrand, searchQuery, lowStockOnly) {
        loadProducts()
    }

    Scaffold(
        containerColor = SlateBackground,
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                TorqueScreenHeader("Catalog", onBack = onNavigateBack, padded = false) {
                    TorqueHeaderAction("📷") { onOpenScan() }
                    TorqueHeaderAction("＋", accent = true) { showAddDialog = true }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Search Bar
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search name, part #, barcode or vehicle model…", fontSize = 12.sp, color = TextMuted) },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextWhite,
                        unfocusedTextColor = TextWhite,
                        focusedBorderColor = AmberGold,
                        unfocusedBorderColor = SlateBorder
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    FilterChip(
                        selected = lowStockOnly,
                        onClick = { lowStockOnly = !lowStockOnly },
                        label = { Text("⚠️ Low Stock Only", fontSize = 10.sp) }
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    // Brand Filter Pills
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(brands) { brand ->
                            val isSelected = selectedBrand == brand
                            Box(
                                modifier = Modifier
                                    .background(
                                        if (isSelected) AmberGold else SlateCard,
                                        RoundedCornerShape(20.dp)
                                    )
                                    .border(1.dp, if (isSelected) AmberGold else SlateBorder, RoundedCornerShape(20.dp))
                                    .clickable { selectedBrand = brand }
                                    .padding(horizontal = 12.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = brand,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSelected) InkButton else TextMuted
                                )
                            }
                        }
                    }
                }
            }
        }
    ) { padding ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AmberGold)
            }
        } else if (products.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("No products found matching filters.", color = TextMuted, fontSize = 13.sp)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(products) { prod ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, SlateBorder, RoundedCornerShape(14.dp))
                            .clickable { editingProduct = prod },
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = SlateCard)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = prod.name,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextWhite
                                    )
                                    Text(
                                        text = "Part #: ${prod.partNumber}" + (prod.barcode?.let { " • $it" } ?: ""),
                                        fontSize = 11.sp,
                                        color = AmberGold,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        "${prod.brand ?: "Universal"} • ${prod.category ?: "General"}",
                                        fontSize = 10.sp,
                                        color = TextMuted
                                    )
                                    prod.vehicleCompatibility?.let { v ->
                                        Text("🚗 $v", fontSize = 10.sp, color = TextMuted, maxLines = 1)
                                    }
                                }

                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "₹${prod.sellingPrice}",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Black,
                                        color = EmeraldGreen
                                    )
                                    Text(
                                        text = "Cost ₹${prod.purchaseCost} • MRP ₹${prod.mrp}",
                                        fontSize = 10.sp,
                                        color = TextMuted
                                    )
                                    Box(
                                        modifier = Modifier
                                            .padding(top = 4.dp)
                                            .background(
                                                when {
                                                    prod.currentStock == 0 -> ChipRedBg
                                                    prod.currentStock <= prod.minStock -> ChipAmberBg
                                                    else -> ChipGreenBg
                                                },
                                                RoundedCornerShape(6.dp)
                                            )
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text(
                                            text = "Stock: ${prod.currentStock}",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = when {
                                                prod.currentStock == 0 -> DangerRed
                                                prod.currentStock <= prod.minStock -> AlertAmber
                                                else -> EmeraldGreen
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Add / Edit Product Dialog
    if (showAddDialog || editingProduct != null) {
        val isEditing = editingProduct != null
        val initial = editingProduct
        val ocr = pendingOcr
        var name by remember { mutableStateOf(initial?.name ?: ocr?.partName?.value ?: "") }
        var partNo by remember { mutableStateOf(initial?.partNumber ?: ocr?.partNumber?.value ?: "") }
        var barcode by remember { mutableStateOf(initial?.barcode ?: ocr?.barcode?.value ?: "") }
        var brand by remember { mutableStateOf(initial?.brand ?: "Royal Enfield") }
        var category by remember { mutableStateOf(initial?.category ?: SPARE_CATEGORIES.first()) }
        var categoryExpanded by remember { mutableStateOf(false) }
        var mrp by remember { mutableStateOf(initial?.mrp?.toString() ?: ocr?.mrp?.value ?: "") }
        var cost by remember { mutableStateOf(initial?.purchaseCost?.toString() ?: "") }
        var price by remember { mutableStateOf(initial?.sellingPrice?.toString() ?: "") }
        var stock by remember { mutableStateOf(if (isEditing) "" else "0") }
        var minStock by remember { mutableStateOf(initial?.minStock?.toString() ?: "5") }
        var comp by remember { mutableStateOf(initial?.vehicleCompatibility ?: "") }

        fun closeDialog() {
            showAddDialog = false
            editingProduct = null
            pendingOcr = null
        }

        AlertDialog(
            onDismissRequest = { closeDialog() },
            containerColor = SlateCard,
            title = {
                Text(
                    if (isEditing) "Edit Product" else "Add New Spare Part",
                    color = TextWhite,
                    fontWeight = FontWeight.Bold
                )
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (!isEditing && ocr != null) {
                        Text(
                            "Prefilled from OCR label scan — review before saving.",
                            fontSize = 10.sp,
                            color = AmberGold,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Part Name *", color = TextMuted, fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = partNo,
                        onValueChange = { partNo = it },
                        label = { Text("Part Number *", color = TextMuted, fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = barcode,
                        onValueChange = { barcode = it },
                        label = { Text("Barcode / QR", color = TextMuted, fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = brand,
                        onValueChange = { brand = it },
                        label = { Text("Brand / OEM", color = TextMuted, fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Category dropdown
                    Box {
                        OutlinedTextField(
                            value = category,
                            onValueChange = { },
                            readOnly = true,
                            label = { Text("Spare Part Category", color = TextMuted, fontSize = 11.sp) },
                            trailingIcon = {
                                Text("▾", color = TextMuted, modifier = Modifier.clickable { categoryExpanded = true })
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { categoryExpanded = true }
                        )
                        DropdownMenu(
                            expanded = categoryExpanded,
                            onDismissRequest = { categoryExpanded = false }
                        ) {
                            SPARE_CATEGORIES.forEach { cat ->
                                DropdownMenuItem(
                                    text = { Text(cat, fontSize = 12.sp) },
                                    onClick = {
                                        category = cat
                                        categoryExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = comp,
                        onValueChange = { comp = it },
                        label = { Text("Vehicle Compatibility (e.g. Classic 350, Hunter 350)", color = TextMuted, fontSize = 11.sp) },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = cost,
                            onValueChange = { cost = it },
                            label = { Text("Cost ₹", color = TextMuted, fontSize = 11.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = price,
                            onValueChange = { price = it },
                            label = { Text("Selling ₹ *", color = TextMuted, fontSize = 11.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = mrp,
                            onValueChange = { mrp = it },
                            label = { Text("MRP ₹", color = TextMuted, fontSize = 11.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                        if (!isEditing) {
                            OutlinedTextField(
                                value = stock,
                                onValueChange = { stock = it },
                                label = { Text("Opening Stock", color = TextMuted, fontSize = 11.sp) },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f)
                            )
                        }
                        OutlinedTextField(
                            value = minStock,
                            onValueChange = { minStock = it },
                            label = { Text("Min Alert", color = TextMuted, fontSize = 11.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                    }
                    statusMessage?.let { msg ->
                        Text(msg, fontSize = 11.sp, color = DangerRed)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            try {
                                if (isEditing) {
                                    apiService.updateProduct(
                                        initial!!.id,
                                        UpdateProductRequest(
                                            name = name,
                                            partNumber = partNo,
                                            barcode = barcode.ifBlank { null },
                                            brand = brand.ifBlank { null },
                                            category = category.ifBlank { null },
                                            mrp = mrp.toDoubleOrNull() ?: 0.0,
                                            purchaseCost = cost.toDoubleOrNull() ?: 0.0,
                                            sellingPrice = price.toDoubleOrNull() ?: 0.0,
                                            minStock = minStock.toIntOrNull() ?: 5,
                                            vehicleCompatibility = comp.ifBlank { null }
                                        )
                                    )
                                } else {
                                    apiService.createProduct(
                                        CreateProductRequest(
                                            name = name,
                                            partNumber = partNo,
                                            barcode = barcode.ifBlank { null },
                                            brand = brand.ifBlank { null },
                                            category = category.ifBlank { null },
                                            mrp = mrp.toDoubleOrNull() ?: 0.0,
                                            purchaseCost = cost.toDoubleOrNull() ?: 0.0,
                                            sellingPrice = price.toDoubleOrNull() ?: 0.0,
                                            initialStock = stock.toIntOrNull() ?: 0,
                                            minStock = minStock.toIntOrNull() ?: 5,
                                            vehicleCompatibility = comp.ifBlank { null }
                                        )
                                    )
                                }
                                statusMessage = null
                                closeDialog()
                                loadProducts()
                            } catch (e: Exception) {
                                statusMessage = e.localizedMessage
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AmberGold)
                ) {
                    Text(if (isEditing) "Update" else "Save Product", color = OnAccent, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { closeDialog() }) {
                    Text("Cancel", color = TextMuted)
                }
            }
        )
    }
}
