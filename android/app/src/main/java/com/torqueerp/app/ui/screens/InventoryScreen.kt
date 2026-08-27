package com.torqueerp.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
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
import com.torqueerp.app.data.model.Product
import com.torqueerp.app.data.model.StockAdjustmentRequest
import com.torqueerp.app.data.model.StockMovement
import com.torqueerp.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun InventoryScreen(
    apiService: ApiService,
    onOpenReceive: () -> Unit,
    onNavigateBack: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) } // 0 = Stock Overview, 1 = Stock Ledger Audit
    var products by remember { mutableStateOf<List<Product>>(emptyList()) }
    var stockMovements by remember { mutableStateOf<List<StockMovement>>(emptyList()) }
    var onlyLowStock by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(true) }
    var adjustingProduct by remember { mutableStateOf<Product?>(null) }
    var statusMessage by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()

    fun loadInventory() {
        isLoading = true
        scope.launch {
            try {
                if (selectedTab == 0) {
                    val res = apiService.getProducts(lowStock = if (onlyLowStock) true else null, limit = 100)
                    products = res.data
                } else {
                    val res = apiService.getStockMovements(limit = 50)
                    stockMovements = res.data
                }
            } catch (e: Exception) {
                statusMessage = e.localizedMessage
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(selectedTab, onlyLowStock) {
        loadInventory()
    }

    Scaffold(
        containerColor = SlateBackground,
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                TorqueScreenHeader("Inventory", onBack = onNavigateBack, padded = false) {
                    TorqueHeaderAction("📥", accent = true) { onOpenReceive() }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Tabs: Stock vs Ledger
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SlateCard, RoundedCornerShape(12.dp))
                        .padding(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .background(
                                if (selectedTab == 0) AmberGold else Color.Transparent,
                                RoundedCornerShape(8.dp)
                            )
                            .clickable { selectedTab = 0 }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "Stock Health",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (selectedTab == 0) InkButton else TextMuted
                        )
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .background(
                                if (selectedTab == 1) AmberGold else Color.Transparent,
                                RoundedCornerShape(8.dp)
                            )
                            .clickable { selectedTab = 1 }
                            .padding(vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "Audit Ledger",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (selectedTab == 1) InkButton else TextMuted
                        )
                    }
                }
            }
        }
    ) { padding ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AmberGold)
            }
        } else if (selectedTab == 0) {
            // Stock Health View
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Current Stock Items", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                        FilterChip(
                            selected = onlyLowStock,
                            onClick = { onlyLowStock = !onlyLowStock },
                            label = { Text("⚠️ Low Stock Only", fontSize = 10.sp) }
                        )
                    }
                }

                items(products) { prod ->
                    val isLow = prod.currentStock <= prod.minStock
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, if (isLow) AlertAmber.copy(alpha = 0.5f) else SlateBorder, RoundedCornerShape(14.dp)),
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
                                Text(prod.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                                Text("Part: ${prod.partNumber}", fontSize = 11.sp, color = AmberGold)
                                Text("Min Threshold: ${prod.minStock} units", fontSize = 10.sp, color = TextMuted)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = "${prod.currentStock} units",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Black,
                                    color = if (isLow) AlertAmber else EmeraldGreen
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Button(
                                    onClick = { adjustingProduct = prod },
                                    colors = ButtonDefaults.buttonColors(containerColor = InkButton),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    Text("Adjust ±", fontSize = 10.sp, color = TextWhite, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // Stock Ledger View
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(stockMovements) { mov ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
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
                                Text(
                                    text = mov.product?.name ?: "Stock Movement",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextWhite
                                )
                                Text(
                                    text = "${mov.movementType} • ${mov.createdAt.take(10)}",
                                    fontSize = 10.sp,
                                    color = TextMuted
                                )
                                if (mov.beforeQuantity != null && mov.afterQuantity != null) {
                                    Text(
                                        text = "Balance: ${mov.beforeQuantity} → ${mov.afterQuantity}",
                                        fontSize = 10.sp,
                                        color = TextMuted
                                    )
                                }
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = "${if (mov.quantity >= 0) "+" else ""}${mov.quantity}",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Black,
                                    color = if (mov.quantity >= 0) EmeraldGreen else AlertAmber
                                )
                                mov.unitCost?.let { uc ->
                                    if (uc > 0) {
                                        Text("₹${String.format("%.2f", uc)}/unit", fontSize = 9.sp, color = TextMuted)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Stock Adjustment Dialog — movementType values must match the backend enum
    adjustingProduct?.let { prod ->
        var movementType by remember { mutableStateOf("ADJUSTMENT_IN") }
        var quantityInput by remember { mutableStateOf("5") }
        var reasonInput by remember { mutableStateOf("Manual stock count") }
        val movementLabels = listOf(
            "ADJUSTMENT_IN" to "➕ Add",
            "ADJUSTMENT_OUT" to "➖ Remove",
            "DAMAGE" to "⚠️ Damage"
        )

        AlertDialog(
            onDismissRequest = { adjustingProduct = null },
            containerColor = SlateCard,
            title = { Text("Adjust Stock: ${prod.name}", color = TextWhite, fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Select Adjustment Action:", fontSize = 11.sp, color = TextMuted)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        movementLabels.forEach { (type, label) ->
                            Button(
                                onClick = { movementType = type },
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (movementType == type) AmberGold else InkButton
                                ),
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    label,
                                    fontSize = 10.sp,
                                    color = if (movementType == type) InkButton else TextWhite,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = quantityInput,
                        onValueChange = { quantityInput = it },
                        label = { Text("Adjustment Quantity", color = TextMuted, fontSize = 11.sp) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = reasonInput,
                        onValueChange = { reasonInput = it },
                        label = { Text("Reason / Note", color = TextMuted, fontSize = 11.sp) },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val qty = quantityInput.toIntOrNull() ?: 1
                        scope.launch {
                            try {
                                apiService.adjustStock(
                                    StockAdjustmentRequest(
                                        productId = prod.id,
                                        movementType = movementType,
                                        quantity = qty,
                                        notes = reasonInput
                                    )
                                )
                                adjustingProduct = null
                                loadInventory()
                            } catch (e: Exception) {
                                statusMessage = e.localizedMessage
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AmberGold)
                ) {
                    Text("Apply Adjustment", color = OnAccent, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { adjustingProduct = null }) {
                    Text("Cancel", color = TextMuted)
                }
            }
        )
    }
}
