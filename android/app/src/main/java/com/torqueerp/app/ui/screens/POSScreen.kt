package com.torqueerp.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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

data class AndroidCartItem(
    val product: Product,
    val quantity: Int
)

data class CompletedReceipt(
    val invoiceNumber: String,
    val customerName: String,
    val items: List<AndroidCartItem>,
    val subtotal: Double,
    val discount: Double,
    val cgst: Double,
    val sgst: Double,
    val taxRate: Double,
    val grandTotal: Double,
    val amountPaid: Double,
    val paymentMethod: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun POSScreen(
    apiService: ApiService,
    cart: androidx.compose.runtime.snapshots.SnapshotStateList<AndroidCartItem>,
    scanQueue: androidx.compose.runtime.snapshots.SnapshotStateList<Product>,
    onOpenScan: () -> Unit,
    onSaleCompleted: (String) -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var searchResults by remember { mutableStateOf<List<Product>>(emptyList()) }
    var customerName by remember { mutableStateOf("") }
    var customerPhone by remember { mutableStateOf("") }
    var customerVehicle by remember { mutableStateOf("") }
    var paymentMethod by remember { mutableStateOf("CASH") }
    var taxRate by remember { mutableStateOf(18.0) }
    var discountPercent by remember { mutableStateOf("") }
    var amountPaidInput by remember { mutableStateOf("") }
    var isCheckingOut by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    var receipt by remember { mutableStateOf<CompletedReceipt?>(null) }
    val scope = rememberCoroutineScope()

    fun addToCart(p: Product) {
        val existing = cart.find { it.product.id == p.id }
        if (existing != null) {
            if (existing.quantity + 1 > p.currentStock) {
                errorMsg = "Only ${p.currentStock} units available for ${p.name}."
                return
            }
            cart[cart.indexOf(existing)] = existing.copy(quantity = existing.quantity + 1)
        } else {
            if (p.currentStock < 1) {
                errorMsg = "\"${p.name}\" is currently out of stock."
                return
            }
            cart.add(AndroidCartItem(p, 1))
        }
        errorMsg = null
    }

    // Products identified during batch scanning — drained into the cart.
    // Scanning the same item twice increments its quantity via addToCart.
    LaunchedEffect(scanQueue.size) {
        while (scanQueue.isNotEmpty()) {
            addToCart(scanQueue.removeAt(0))
        }
    }

    // Trigger search when query changes
    LaunchedEffect(searchQuery) {
        if (searchQuery.length >= 2) {
            try {
                val res = apiService.getProducts(search = searchQuery, limit = 10)
                searchResults = res.data
            } catch (e: Exception) {
                // ignore
            }
        } else {
            searchResults = emptyList()
        }
    }

    // GST & discount math mirrors the web POS terminal
    val rawSubtotal = cart.sumOf { it.product.sellingPrice * it.quantity }
    val discPct = discountPercent.toDoubleOrNull()?.coerceIn(0.0, 100.0) ?: 0.0
    val totalDiscount = rawSubtotal * discPct / 100.0
    val taxableAmount = (rawSubtotal - totalDiscount).coerceAtLeast(0.0)
    val gstAmount = taxableAmount * taxRate / 100.0
    val cgst = gstAmount / 2
    val sgst = gstAmount / 2
    val grandTotal = Math.round((taxableAmount + gstAmount) * 100.0) / 100.0
    val amountPaid = amountPaidInput.toDoubleOrNull() ?: grandTotal
    val balanceDue = (grandTotal - amountPaid).coerceAtLeast(0.0)

    fun checkout() {
        if (cart.isEmpty()) return
        isCheckingOut = true
        errorMsg = null
        val itemsSnapshot = cart.toList()
        scope.launch {
            try {
                val req = CreateSaleRequest(
                    customerName = customerName.ifBlank { "Retail Walk-in Customer" },
                    customerPhone = customerPhone.ifBlank { null },
                    customerVehicle = customerVehicle.ifBlank { null },
                    amountPaid = amountPaid,
                    paymentMethod = paymentMethod,
                    items = itemsSnapshot.map {
                        SaleItemRequest(
                            productId = it.product.id,
                            quantity = it.quantity,
                            unitPrice = it.product.sellingPrice,
                            discountAmount = it.product.sellingPrice * discPct / 100.0,
                            taxRate = taxRate
                        )
                    }
                )
                val res = apiService.createSale(req)
                receipt = CompletedReceipt(
                    invoiceNumber = res.invoice.invoiceNumber,
                    customerName = customerName.ifBlank { "Cash Customer" },
                    items = itemsSnapshot,
                    subtotal = rawSubtotal,
                    discount = totalDiscount,
                    cgst = cgst,
                    sgst = sgst,
                    taxRate = taxRate,
                    grandTotal = grandTotal,
                    amountPaid = amountPaid,
                    paymentMethod = paymentMethod
                )
                cart.clear()
                customerName = ""
                customerPhone = ""
                customerVehicle = ""
                amountPaidInput = ""
                discountPercent = ""
                onSaleCompleted(res.invoice.invoiceNumber)
            } catch (e: Exception) {
                errorMsg = e.localizedMessage ?: "Checkout failed. Check stock availability."
            } finally {
                isCheckingOut = false
            }
        }
    }

    Scaffold(
        containerColor = SlateBackground,
        topBar = {
            TopAppBar(
                title = { Text("POS Counter Checkout", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
                actions = {
                    Button(
                        onClick = onOpenScan,
                        colors = ButtonDefaults.buttonColors(containerColor = InkButton),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        modifier = Modifier.padding(end = 12.dp)
                    ) {
                        Text("📷 Scan", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = SlateCard,
                    titleContentColor = TextWhite
                )
            )
        },
        bottomBar = {
            Surface(
                color = SlateCard,
                modifier = Modifier.border(1.dp, SlateBorder)
            ) {
                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Net Grand Total:", color = TextMuted, fontSize = 13.sp)
                        Text(
                            "₹${String.format("%.2f", grandTotal)}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = EmeraldGreen
                        )
                    }
                    if (balanceDue > 0) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Balance Due (Udhaar):", color = AlertAmber, fontSize = 11.sp)
                            Text("₹${String.format("%.2f", balanceDue)}", color = AlertAmber, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = { checkout() },
                        enabled = cart.isNotEmpty() && !isCheckingOut,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                    ) {
                        Text(
                            if (isCheckingOut) "Processing Sale..." else "Complete Sale • ₹${String.format("%.2f", grandTotal)}",
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            // Search Input
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search part number, name or barcode...", fontSize = 13.sp, color = TextMuted) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = posFieldColors()
            )

            // Search Results
            if (searchResults.isNotEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SlateCard, RoundedCornerShape(12.dp))
                        .border(1.dp, SlateBorder, RoundedCornerShape(12.dp))
                        .padding(8.dp)
                ) {
                    searchResults.take(6).forEach { p ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    addToCart(p)
                                    searchQuery = ""
                                    searchResults = emptyList()
                                }
                                .padding(8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(p.name, fontSize = 12.sp, color = TextWhite, fontWeight = FontWeight.SemiBold)
                                Text("${p.partNumber} • Stock: ${p.currentStock}", fontSize = 10.sp, color = EmeraldGreen)
                            }
                            Text("₹${p.sellingPrice}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                        }
                    }
                }
            }

            errorMsg?.let { msg ->
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, DangerRed, RoundedCornerShape(12.dp)),
                    colors = CardDefaults.cardColors(containerColor = ChipRedBg)
                ) {
                    Row(
                        modifier = Modifier.padding(10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(msg, fontSize = 11.sp, color = DangerRed, modifier = Modifier.weight(1f))
                        Text(
                            "✕",
                            fontSize = 12.sp,
                            color = DangerRed,
                            modifier = Modifier.clickable { errorMsg = null }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Customer Details
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = customerName,
                    onValueChange = { customerName = it },
                    placeholder = { Text("Customer Name", fontSize = 11.sp, color = TextMuted) },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = posFieldColors()
                )
                OutlinedTextField(
                    value = customerPhone,
                    onValueChange = { customerPhone = it },
                    placeholder = { Text("Phone", fontSize = 11.sp, color = TextMuted) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = posFieldColors()
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = customerVehicle,
                onValueChange = { customerVehicle = it },
                placeholder = { Text("Vehicle No / Model (e.g. Classic 350 / TN 09 BX 4520)", fontSize = 11.sp, color = TextMuted) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = posFieldColors()
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Cart Items
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Cart Items (${cart.sumOf { it.quantity }})",
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = TextWhite
                )
                if (cart.isNotEmpty()) {
                    Text(
                        "Clear Cart",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = DangerRed,
                        modifier = Modifier.clickable { cart.clear() }
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            if (cart.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, SlateBorder, RoundedCornerShape(12.dp))
                        .padding(vertical = 24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No parts in cart. Search or scan to add.", fontSize = 12.sp, color = TextMuted)
                }
            }

            cart.forEachIndexed { idx, item ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp)
                        .border(1.dp, SlateBorder, RoundedCornerShape(12.dp)),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = SlateCard)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.product.name, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextWhite)
                            Text(
                                "₹${item.product.sellingPrice} × ${item.quantity} = ₹${String.format("%.2f", item.product.sellingPrice * item.quantity)}",
                                fontSize = 10.sp,
                                color = TextMuted
                            )
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            TextButton(onClick = {
                                if (item.quantity > 1) cart[idx] = item.copy(quantity = item.quantity - 1)
                                else cart.removeAt(idx)
                            }) { Text("−", fontSize = 16.sp, color = TextWhite) }
                            Text("${item.quantity}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                            TextButton(onClick = {
                                if (item.quantity + 1 > item.product.currentStock) {
                                    errorMsg = "Cannot exceed available stock (${item.product.currentStock})."
                                } else {
                                    cart[idx] = item.copy(quantity = item.quantity + 1)
                                }
                            }) { Text("+", fontSize = 16.sp, color = TextWhite) }
                            TextButton(onClick = { cart.removeAt(idx) }) {
                                Text("🗑", fontSize = 13.sp)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Payment Method Selector
            Text("Payment Method", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted)
            Spacer(modifier = Modifier.height(4.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("CASH", "UPI", "CARD", "CREDIT").forEach { m ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .background(if (paymentMethod == m) InkButton else SlateCard, RoundedCornerShape(10.dp))
                            .border(1.dp, if (paymentMethod == m) InkButton else SlateBorder, RoundedCornerShape(10.dp))
                            .clickable { paymentMethod = m }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            m,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (paymentMethod == m) Color.White else TextMuted
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // GST Rate + Discount
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("GST Rate", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted)
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        listOf(0.0, 5.0, 12.0, 18.0, 28.0).forEach { r ->
                            Box(
                                modifier = Modifier
                                    .background(if (taxRate == r) AmberGold else SlateCard, RoundedCornerShape(8.dp))
                                    .border(1.dp, if (taxRate == r) AmberGold else SlateBorder, RoundedCornerShape(8.dp))
                                    .clickable { taxRate = r }
                                    .padding(horizontal = 8.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    "${r.toInt()}%",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (taxRate == r) InkButton else TextMuted
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = discountPercent,
                    onValueChange = { discountPercent = it },
                    label = { Text("Discount %", fontSize = 11.sp, color = TextMuted) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = posFieldColors()
                )
                OutlinedTextField(
                    value = amountPaidInput,
                    onValueChange = { amountPaidInput = it },
                    label = { Text("Amount Paid ₹ (blank = full)", fontSize = 11.sp, color = TextMuted) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = posFieldColors()
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Tax Breakdown Card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, SlateBorder, RoundedCornerShape(14.dp)),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = SlateCard)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    SummaryRow("Subtotal (Items):", "₹${String.format("%.2f", rawSubtotal)}")
                    if (discPct > 0) {
                        SummaryRow("Discount ($discPct%):", "-₹${String.format("%.2f", totalDiscount)}", EmeraldGreen)
                    }
                    if (taxRate > 0) {
                        SummaryRow("CGST (${String.format("%.1f", taxRate / 2)}%):", "₹${String.format("%.2f", cgst)}")
                        SummaryRow("SGST (${String.format("%.1f", taxRate / 2)}%):", "₹${String.format("%.2f", sgst)}")
                    }
                    HorizontalDivider(color = SlateBorder)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("NET GRAND TOTAL", fontSize = 12.sp, fontWeight = FontWeight.Black, color = TextMuted)
                        Text(
                            "₹${String.format("%.2f", grandTotal)}",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black,
                            color = TextWhite
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }

    // Receipt Dialog after completed sale
    receipt?.let { r ->
        AlertDialog(
            onDismissRequest = { receipt = null },
            containerColor = SlateCard,
            title = {
                Text("✅ Sale Completed!", color = EmeraldGreen, fontWeight = FontWeight.Black)
            },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text("TAX INVOICE: ${r.invoiceNumber}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                    Text("Customer: ${r.customerName}", fontSize = 11.sp, color = TextMuted)
                    Text("Payment: ${r.paymentMethod}", fontSize = 11.sp, color = TextMuted)
                    HorizontalDivider(color = SlateBorder, modifier = Modifier.padding(vertical = 6.dp))
                    r.items.forEach { item ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("${item.quantity}× ${item.product.name}", fontSize = 11.sp, color = TextWhite, modifier = Modifier.weight(1f))
                            Text(
                                "₹${String.format("%.2f", item.product.sellingPrice * item.quantity)}",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextWhite
                            )
                        }
                    }
                    HorizontalDivider(color = SlateBorder, modifier = Modifier.padding(vertical = 6.dp))
                    SummaryRow("Subtotal:", "₹${String.format("%.2f", r.subtotal)}")
                    if (r.discount > 0) SummaryRow("Discount:", "-₹${String.format("%.2f", r.discount)}", EmeraldGreen)
                    if (r.taxRate > 0) {
                        SummaryRow("CGST (${String.format("%.1f", r.taxRate / 2)}%):", "₹${String.format("%.2f", r.cgst)}")
                        SummaryRow("SGST (${String.format("%.1f", r.taxRate / 2)}%):", "₹${String.format("%.2f", r.sgst)}")
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("GRAND TOTAL:", fontSize = 13.sp, fontWeight = FontWeight.Black, color = TextWhite)
                        Text("₹${String.format("%.2f", r.grandTotal)}", fontSize = 13.sp, fontWeight = FontWeight.Black, color = EmeraldGreen)
                    }
                    Text(
                        "Download the A4 / thermal PDF anytime from the Invoices screen.",
                        fontSize = 10.sp,
                        color = TextMuted,
                        modifier = Modifier.padding(top = 6.dp)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { receipt = null },
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                ) {
                    Text("Next Sale ➔", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        )
    }
}

@Composable
private fun SummaryRow(label: String, value: String, valueColor: Color = TextWhite) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 11.sp, color = TextMuted)
        Text(value, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = valueColor)
    }
}

@Composable
private fun posFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedContainerColor = SlateCard,
    unfocusedContainerColor = SlateCard,
    focusedBorderColor = EmeraldGreen,
    unfocusedBorderColor = SlateBorder,
    focusedTextColor = TextWhite,
    unfocusedTextColor = TextWhite
)
