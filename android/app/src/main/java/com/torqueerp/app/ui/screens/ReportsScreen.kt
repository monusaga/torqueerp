package com.torqueerp.app.ui.screens

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.torqueerp.app.data.api.ApiService
import com.torqueerp.app.data.model.DashboardResponse
import com.torqueerp.app.ui.theme.*
import com.torqueerp.app.util.FileSharing
import kotlinx.coroutines.launch

@Composable
fun ReportsScreen(
    apiService: ApiService,
    onNavigateBack: () -> Unit
) {
    var dashboardData by remember { mutableStateOf<DashboardResponse?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var exporting by remember { mutableStateOf<String?>(null) }
    var exportError by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    fun exportCsv(type: String) {
        exporting = type
        exportError = null
        scope.launch {
            try {
                val body = apiService.exportReportCsv(type)
                val file = FileSharing.saveToCache(context, body, "${type}_export.csv")
                FileSharing.openOrShare(context, file, "text/csv")
            } catch (e: Exception) {
                exportError = "Export failed: ${e.localizedMessage}"
            } finally {
                exporting = null
            }
        }
    }

    LaunchedEffect(Unit) {
        scope.launch {
            try {
                dashboardData = apiService.getDashboard()
            } catch (e: Exception) {
                // handle error
            } finally {
                isLoading = false
            }
        }
    }

    Scaffold(
        containerColor = SlateBackground,
        topBar = {
            TorqueScreenHeader("Reports", onBack = onNavigateBack)
        }
    ) { padding ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AmberGold)
            }
        } else {
            val summary = dashboardData?.summary
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, SlateBorder, RoundedCornerShape(16.dp)),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = SlateCard)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("📊 SALES & PROFIT OVERVIEW", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AmberGold)

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Today's Gross Sales:", color = TextMuted, fontSize = 13.sp)
                                Text("₹${String.format("%.2f", summary?.todaySales ?: 0.0)}", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            }

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Today's Realized Profit:", color = TextMuted, fontSize = 13.sp)
                                Text("₹${String.format("%.2f", summary?.todayGrossProfit ?: 0.0)}", color = EmeraldGreen, fontWeight = FontWeight.Black, fontSize = 14.sp)
                            }

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Today's Purchases Restock:", color = TextMuted, fontSize = 13.sp)
                                Text("₹${String.format("%.2f", summary?.todayPurchases ?: 0.0)}", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            }
                        }
                    }
                }

                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, SlateBorder, RoundedCornerShape(16.dp)),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = SlateCard)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("📦 INVENTORY VALUATION", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AmberGold)

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Total Catalog SKUs:", color = TextMuted, fontSize = 13.sp)
                                Text("${summary?.totalProducts ?: 0} Products", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            }

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Valuation at Purchase Cost:", color = TextMuted, fontSize = 13.sp)
                                Text("₹${String.format("%.2f", summary?.stockValueCost ?: 0.0)}", color = TextWhite, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            }

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Valuation at Selling Price:", color = TextMuted, fontSize = 13.sp)
                                Text("₹${String.format("%.2f", summary?.stockValueRetail ?: 0.0)}", color = EmeraldGreen, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            }

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Items Below Min Threshold:", color = TextMuted, fontSize = 13.sp)
                                Text("${summary?.lowStockCount ?: 0} Alert Items", color = AlertAmber, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            }

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Out of Stock SKUs:", color = TextMuted, fontSize = 13.sp)
                                Text("${summary?.outOfStockCount ?: 0} Items", color = DangerRed, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            }

                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Outstanding Receivables:", color = TextMuted, fontSize = 13.sp)
                                Text(
                                    "₹${String.format("%.2f", summary?.totalReceivables ?: 0.0)}",
                                    color = AlertAmber,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                            }
                        }
                    }
                }

                // CSV data exports — parity with the web Reports & Export page
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, SlateBorder, RoundedCornerShape(16.dp)),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = SlateCard)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("📤 DATA EXPORT (100% DATA OWNERSHIP)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AmberGold)
                            Text(
                                "Download your complete catalog or sales ledger as CSV and share via any app.",
                                fontSize = 11.sp,
                                color = TextMuted
                            )
                            exportError?.let { err ->
                                Text(err, fontSize = 11.sp, color = DangerRed)
                            }
                            Button(
                                onClick = { exportCsv("products") },
                                enabled = exporting == null,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(46.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = InkButton)
                            ) {
                                Text(
                                    if (exporting == "products") "Generating CSV…" else "⬇️ Export Products Master (CSV)",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                            Button(
                                onClick = { exportCsv("sales") },
                                enabled = exporting == null,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(46.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                            ) {
                                Text(
                                    if (exporting == "sales") "Generating CSV…" else "⬇️ Export Sales & Gross Profit (CSV)",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
