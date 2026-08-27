package com.torqueerp.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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

private data class DraftPurchaseItem(
    val product: Product,
    val quantity: Int,
    val mrp: Double,
    val discountPercent: Double
)

@Composable
fun PurchasesScreen(
    apiService: ApiService,
    onNavigateBack: () -> Unit
) {
    var purchases by remember { mutableStateOf<List<Purchase>>(emptyList()) }
    var products by remember { mutableStateOf<List<Product>>(emptyList()) }
    var suppliers by remember { mutableStateOf<List<Supplier>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showNewPurchaseDialog by remember { mutableStateOf(false) }
    var statusMessage by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()

    fun loadData() {
        isLoading = true
        scope.launch {
            try {
                val pRes = apiService.getPurchases(limit = 50)
                purchases = pRes.data
                val prodRes = apiService.getProducts(limit = 100)
                products = prodRes.data
                val suppRes = apiService.getSuppliers(limit = 100)
                suppliers = suppRes.data
            } catch (e: Exception) {
                statusMessage = "Failed to load purchases: ${e.localizedMessage}"
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    Scaffold(
        containerColor = SlateBackground,
        topBar = {
            TorqueScreenHeader("Purchases", onBack = onNavigateBack) {
                TorqueHeaderAction("＋", accent = true) { showNewPurchaseDialog = true }
            }
        }
    ) { padding ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = EmeraldGreen)
            }
        } else if (purchases.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("No supplier purchases logged yet.", color = TextMuted, fontSize = 13.sp)
                    Spacer(modifier = Modifier.height(10.dp))
                    Button(
                        onClick = { showNewPurchaseDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                    ) {
                        Text("Record First Purchase Invoice", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(purchases) { pur ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, SlateBorder, RoundedCornerShape(14.dp)),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = SlateCard)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = pur.invoiceNumber,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextWhite
                                )
                                Text(
                                    text = "Supplier: ${pur.supplier?.name ?: "Direct Stock Inflow"}",
                                    fontSize = 11.sp,
                                    color = AmberGold
                                )
                                Text(
                                    text = "Date: ${pur.purchaseDate.take(10)} • ${pur.items?.size ?: 0} parts",
                                    fontSize = 10.sp,
                                    color = TextMuted
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = "₹${String.format("%.2f", pur.grandTotal)}",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Black,
                                    color = EmeraldGreen
                                )
                                Text(
                                    text = "RECEIVED",
                                    fontSize = 10.sp,
                                    color = EmeraldGreen,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Record Inward Purchase Dialog — supplier selection + multi-item shipment + freight
    if (showNewPurchaseDialog) {
        var invoiceNo by remember { mutableStateOf("PUR-${System.currentTimeMillis().toString().takeLast(6)}") }
        var selectedSupplier by remember { mutableStateOf<Supplier?>(null) }
        var supplierExpanded by remember { mutableStateOf(false) }
        var freight by remember { mutableStateOf("0") }
        val draftItems = remember { mutableStateListOf<DraftPurchaseItem>() }

        // Item-being-added state
        var pickingProduct by remember { mutableStateOf(false) }
        var itemProduct by remember { mutableStateOf<Product?>(null) }
        var itemQty by remember { mutableStateOf("10") }
        var itemMrp by remember { mutableStateOf("") }
        var itemDisc by remember { mutableStateOf("20") }
        var dialogError by remember { mutableStateOf<String?>(null) }

        AlertDialog(
            onDismissRequest = { showNewPurchaseDialog = false },
            containerColor = SlateCard,
            title = { Text("Record Inward Stock Shipment", color = TextWhite, fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = invoiceNo,
                        onValueChange = { invoiceNo = it },
                        label = { Text("Supplier Invoice #", color = TextMuted, fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Supplier picker
                    Box {
                        OutlinedTextField(
                            value = selectedSupplier?.name ?: "— No supplier (direct inflow) —",
                            onValueChange = { },
                            readOnly = true,
                            label = { Text("Supplier", color = TextMuted, fontSize = 11.sp) },
                            trailingIcon = {
                                Text("▾", color = TextMuted, modifier = Modifier.clickable { supplierExpanded = true })
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { supplierExpanded = true }
                        )
                        DropdownMenu(
                            expanded = supplierExpanded,
                            onDismissRequest = { supplierExpanded = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("— No supplier (direct inflow) —", fontSize = 12.sp) },
                                onClick = {
                                    selectedSupplier = null
                                    supplierExpanded = false
                                }
                            )
                            suppliers.forEach { s ->
                                DropdownMenuItem(
                                    text = { Text(s.name, fontSize = 12.sp) },
                                    onClick = {
                                        selectedSupplier = s
                                        supplierExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = freight,
                        onValueChange = { freight = it },
                        label = { Text("Freight Charges ₹", color = TextMuted, fontSize = 11.sp) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    HorizontalDivider(color = SlateBorder)

                    Text("Shipment Items (${draftItems.size})", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextWhite)

                    draftItems.forEachIndexed { idx, item ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(SlateBackground, RoundedCornerShape(8.dp))
                                .padding(8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.product.name, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                                Text(
                                    "${item.quantity} × ₹${item.mrp} @ -${item.discountPercent}%",
                                    fontSize = 10.sp,
                                    color = TextMuted
                                )
                            }
                            Text(
                                "✕",
                                fontSize = 13.sp,
                                color = DangerRed,
                                modifier = Modifier.clickable { draftItems.removeAt(idx) }
                            )
                        }
                    }

                    // Add item inline form
                    Box {
                        OutlinedTextField(
                            value = itemProduct?.name ?: "Select spare part…",
                            onValueChange = { },
                            readOnly = true,
                            label = { Text("Part", color = TextMuted, fontSize = 11.sp) },
                            trailingIcon = {
                                Text("▾", color = TextMuted, modifier = Modifier.clickable { pickingProduct = true })
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { pickingProduct = true }
                        )
                        DropdownMenu(
                            expanded = pickingProduct,
                            onDismissRequest = { pickingProduct = false },
                            modifier = Modifier.heightIn(max = 240.dp)
                        ) {
                            products.forEach { p ->
                                DropdownMenuItem(
                                    text = { Text("${p.name} (stock ${p.currentStock})", fontSize = 12.sp) },
                                    onClick = {
                                        itemProduct = p
                                        itemMrp = p.mrp.toString()
                                        pickingProduct = false
                                    }
                                )
                            }
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        OutlinedTextField(
                            value = itemQty,
                            onValueChange = { itemQty = it },
                            label = { Text("Qty", color = TextMuted, fontSize = 10.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = itemMrp,
                            onValueChange = { itemMrp = it },
                            label = { Text("MRP ₹", color = TextMuted, fontSize = 10.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = itemDisc,
                            onValueChange = { itemDisc = it },
                            label = { Text("Disc %", color = TextMuted, fontSize = 10.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(1f)
                        )
                    }
                    OutlinedButton(
                        onClick = {
                            val p = itemProduct
                            if (p == null) {
                                dialogError = "Pick a spare part for the line item."
                            } else {
                                draftItems.add(
                                    DraftPurchaseItem(
                                        product = p,
                                        quantity = itemQty.toIntOrNull() ?: 1,
                                        mrp = itemMrp.toDoubleOrNull() ?: p.mrp,
                                        discountPercent = itemDisc.toDoubleOrNull() ?: 0.0
                                    )
                                )
                                itemProduct = null
                                itemQty = "10"
                                itemMrp = ""
                                dialogError = null
                            }
                        },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("+ Add Line Item", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AmberGold)
                    }

                    dialogError?.let { err ->
                        Text(err, fontSize = 11.sp, color = DangerRed)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (draftItems.isEmpty()) {
                            dialogError = "Add at least one line item to the shipment."
                            return@Button
                        }
                        scope.launch {
                            try {
                                apiService.createPurchase(
                                    CreatePurchaseRequest(
                                        invoiceNumber = invoiceNo,
                                        supplierId = selectedSupplier?.id,
                                        freightCharges = freight.toDoubleOrNull() ?: 0.0,
                                        items = draftItems.map {
                                            PurchaseItemRequest(
                                                productId = it.product.id,
                                                quantity = it.quantity,
                                                mrp = it.mrp,
                                                discountPercent = it.discountPercent
                                            )
                                        }
                                    )
                                )
                                showNewPurchaseDialog = false
                                loadData()
                            } catch (e: Exception) {
                                dialogError = e.localizedMessage
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                ) {
                    Text("Save Shipment & Add Stock", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showNewPurchaseDialog = false }) {
                    Text("Cancel", color = TextMuted)
                }
            }
        )
    }
}
