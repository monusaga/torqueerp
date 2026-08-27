package com.torqueerp.app.ui.screens

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.torqueerp.app.data.api.ApiService
import com.torqueerp.app.data.model.Sale
import com.torqueerp.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun SalesScreen(
    apiService: ApiService,
    onNavigateBack: () -> Unit
) {
    var sales by remember { mutableStateOf<List<Sale>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }

    val scope = rememberCoroutineScope()

    fun loadSales() {
        isLoading = true
        scope.launch {
            try {
                val res = apiService.getSales(search = searchQuery.ifBlank { null }, limit = 100)
                sales = res.data
            } catch (e: Exception) {
                // handle error
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(searchQuery) {
        loadSales()
    }

    Scaffold(
        containerColor = SlateBackground,
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                TorqueScreenHeader("Sales Ledger", onBack = onNavigateBack, padded = false)

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search invoice number…", fontSize = 12.sp, color = TextMuted) },
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
            }
        }
    ) { padding ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AmberGold)
            }
        } else if (sales.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("No sales recorded yet. Open POS counter to make a sale!", color = TextMuted, fontSize = 13.sp)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(sales) { s ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, SlateBorder, RoundedCornerShape(14.dp)),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = SlateCard)
                    ) {
                        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(s.invoiceNumber, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                                    Text(
                                        s.customer?.name ?: "Walk-in Customer",
                                        fontSize = 11.sp,
                                        color = AmberGold
                                    )
                                    val vehicle = s.customer?.vehicleNumber
                                    if (!vehicle.isNullOrBlank()) {
                                        Text("🚗 $vehicle", fontSize = 10.sp, color = TextMuted)
                                    }
                                    Text(
                                        "${s.saleDate.take(10)} • ${s.paymentMethod} • ${s.paymentStatus}",
                                        fontSize = 10.sp,
                                        color = TextMuted
                                    )
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        "₹${String.format("%.2f", s.grandTotal)}",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Black,
                                        color = TextWhite
                                    )
                                    Text(
                                        "COGS ₹${String.format("%.2f", s.totalCostCOGS)}",
                                        fontSize = 10.sp,
                                        color = TextMuted
                                    )
                                    Text(
                                        "+₹${String.format("%.2f", s.grossProfit)} profit",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = EmeraldGreen
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
