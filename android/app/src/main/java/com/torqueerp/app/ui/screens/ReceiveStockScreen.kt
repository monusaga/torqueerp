package com.torqueerp.app.ui.screens

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.snapshots.SnapshotStateList
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
import com.torqueerp.app.ui.theme.*
import kotlinx.coroutines.launch

data class ReceiveLine(
    val product: Product,
    val quantity: Int
)

/**
 * Batch stock receiving driven by the smart scanner:
 *   SCAN PRODUCT -> product identified (or created from its label) ->
 *   enter quantity -> ADD PRODUCT -> repeat -> COMPLETE STOCK ENTRY.
 * Each line commits as an ADJUSTMENT_IN movement through the existing
 * /inventory/adjust contract. The draft list lives in MainActivity state so it
 * survives round-trips to the camera screen.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReceiveStockScreen(
    apiService: ApiService,
    draft: SnapshotStateList<ReceiveLine>,
    pendingScannedProduct: Product?,
    onScanConsumed: () -> Unit,
    onOpenScan: () -> Unit,
    onNavigateBack: () -> Unit
) {
    var currentProduct by remember { mutableStateOf<Product?>(null) }
    var qtyInput by remember { mutableStateOf("1") }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    var isCommitting by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()

    // Product handed back by the scanner becomes the pending entry card.
    LaunchedEffect(pendingScannedProduct) {
        val p = pendingScannedProduct ?: return@LaunchedEffect
        onScanConsumed()
        currentProduct = p
        qtyInput = "1"
        statusMessage = null
    }

    fun completeEntry() {
        if (draft.isEmpty() || isCommitting) return
        isCommitting = true
        statusMessage = null
        scope.launch {
            var ok = 0
            var failed = 0
            val lines = draft.toList()
            for (line in lines) {
                try {
                    apiService.adjustStock(
                        StockAdjustmentRequest(
                            productId = line.product.id,
                            movementType = "ADJUSTMENT_IN",
                            quantity = line.quantity,
                            notes = "Stock received via label scan"
                        )
                    )
                    ok++
                    draft.remove(line)
                } catch (e: Exception) {
                    failed++
                }
            }
            statusMessage = if (failed == 0) {
                "✅ Stock entry complete — $ok product${if (ok == 1) "" else "s"} updated."
            } else {
                "⚠️ $ok added, $failed failed (kept in the list — check connection and retry)."
            }
            isCommitting = false
        }
    }

    Scaffold(
        containerColor = SlateBackground,
        topBar = {
            TorqueScreenHeader("Receive Stock", onBack = onNavigateBack)
        },
        bottomBar = {
            Surface(color = SlateCard, modifier = Modifier.border(1.dp, SlateBorder)) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    statusMessage?.let { msg ->
                        Text(
                            msg,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (msg.startsWith("✅")) EmeraldGreen else AlertAmber
                        )
                    }
                    Button(
                        onClick = { completeEntry() },
                        enabled = draft.isNotEmpty() && !isCommitting,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                    ) {
                        Text(
                            if (isCommitting) "Updating Stock…" else "COMPLETE STOCK ENTRY (${draft.sumOf { it.quantity }} units)",
                            color = Color.White,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Scan button / pending product entry card
            item {
                if (currentProduct == null) {
                    Button(
                        onClick = onOpenScan,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(64.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = InkButton)
                    ) {
                        Text(
                            if (draft.isEmpty()) "📷 SCAN PRODUCT" else "📷 + ADD ANOTHER PRODUCT",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )
                    }
                } else {
                    val p = currentProduct!!
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, EmeraldGreen, RoundedCornerShape(16.dp)),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = SlateCard)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text("📦 SCANNED PRODUCT", fontSize = 10.sp, fontWeight = FontWeight.Black, color = EmeraldGreen)
                            Text(p.name, fontSize = 16.sp, fontWeight = FontWeight.Black, color = TextWhite)
                            Text("Part No: ${p.partNumber}", fontSize = 12.sp, color = AmberGold, fontWeight = FontWeight.Bold)
                            Text("MRP: ₹${p.mrp} • Current Stock: ${p.currentStock}", fontSize = 11.sp, color = TextMuted)

                            TorqueQtyStepper(
                                value = qtyInput,
                                onValueChange = { qtyInput = it },
                                label = "Quantity (min 1)"
                            )

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = {
                                        val qty = qtyInput.toIntOrNull() ?: 0
                                        if (qty > 0) {
                                            draft.add(ReceiveLine(p, qty))
                                            currentProduct = null
                                            statusMessage = null
                                        } else {
                                            statusMessage = "Enter a quantity above zero."
                                        }
                                    },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                                ) {
                                    Text("ADD PRODUCT", color = Color.White, fontWeight = FontWeight.Black)
                                }
                                OutlinedButton(
                                    onClick = { currentProduct = null },
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Text("Cancel", color = TextMuted, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }

            // Added products list
            item {
                Text(
                    "Added Products (${draft.size})",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Black,
                    color = TextWhite
                )
            }

            if (draft.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, SlateBorder, RoundedCornerShape(12.dp))
                            .padding(vertical = 22.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "No products added yet. Scan a part label to begin.",
                            fontSize = 12.sp,
                            color = TextMuted
                        )
                    }
                }
            }

            items(draft.size) { idx ->
                val line = draft[idx]
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
                                "${idx + 1}. ${line.product.name}",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextWhite
                            )
                            Text(
                                "${line.product.partNumber} × ${line.quantity}",
                                fontSize = 11.sp,
                                color = AmberGold,
                                fontWeight = FontWeight.Bold
                            )
                            Text("MRP ₹${line.product.mrp}", fontSize = 10.sp, color = TextMuted)
                        }
                        TextButton(onClick = { draft.removeAt(idx) }) {
                            Text("✕", fontSize = 14.sp, color = DangerRed)
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(12.dp)) }
        }
    }
}
