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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.torqueerp.app.data.api.ApiService
import com.torqueerp.app.data.model.Invoice
import com.torqueerp.app.ui.theme.*
import com.torqueerp.app.util.FileSharing
import kotlinx.coroutines.launch

@Composable
fun InvoicesScreen(
    apiService: ApiService,
    onNavigateBack: () -> Unit
) {
    var invoices by remember { mutableStateOf<List<Invoice>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var downloadingId by remember { mutableStateOf<String?>(null) }
    var statusMessage by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    fun loadInvoices() {
        isLoading = true
        scope.launch {
            try {
                val res = apiService.getInvoices(search = searchQuery.ifBlank { null }, limit = 100)
                invoices = res.data
            } catch (e: Exception) {
                statusMessage = e.localizedMessage
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(searchQuery) {
        loadInvoices()
    }

    fun downloadPdf(inv: Invoice, format: String) {
        downloadingId = inv.id + format
        statusMessage = null
        scope.launch {
            try {
                val body = apiService.downloadInvoicePdf(inv.id, format)
                val file = FileSharing.saveToCache(
                    context,
                    body,
                    "${inv.invoiceNumber}_${format.lowercase()}.pdf"
                )
                FileSharing.openOrShare(context, file, "application/pdf")
            } catch (e: Exception) {
                statusMessage = "PDF download failed: ${e.localizedMessage}"
            } finally {
                downloadingId = null
            }
        }
    }

    Scaffold(
        containerColor = SlateBackground,
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                TorqueScreenHeader("Invoices", onBack = onNavigateBack, padded = false)

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

                statusMessage?.let { msg ->
                    Text(msg, fontSize = 11.sp, color = DangerRed, modifier = Modifier.padding(top = 6.dp))
                }
            }
        }
    ) { padding ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AmberGold)
            }
        } else if (invoices.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("No sales invoices generated yet.", color = TextMuted, fontSize = 13.sp)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(invoices) { inv ->
                    val isPaid = inv.paymentStatus == "PAID"
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, SlateBorder, RoundedCornerShape(14.dp)),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = SlateCard)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(inv.invoiceNumber, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                                    Text(
                                        "Customer: ${inv.customerName ?: inv.customer?.name ?: "Walk-in Customer"}",
                                        fontSize = 11.sp,
                                        color = AmberGold
                                    )
                                    Text("Date: ${inv.invoiceDate.take(10)}", fontSize = 10.sp, color = TextMuted)
                                    Text(
                                        "Paid ₹${String.format("%.2f", inv.amountPaid)}",
                                        fontSize = 10.sp,
                                        color = TextMuted
                                    )
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "₹${String.format("%.2f", inv.grandTotal)}",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Black,
                                        color = EmeraldGreen
                                    )
                                    Text(
                                        text = if (isPaid) "PAID" else "DUE ₹${String.format("%.2f", inv.balanceDue)}",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isPaid) EmeraldGreen else AlertAmber
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            // PDF download actions (A4 GST invoice / 80mm thermal receipt)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    onClick = { downloadPdf(inv, "A4") },
                                    enabled = downloadingId == null,
                                    shape = RoundedCornerShape(10.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text(
                                        if (downloadingId == inv.id + "A4") "Generating…" else "📄 A4 GST PDF",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextWhite
                                    )
                                }
                                OutlinedButton(
                                    onClick = { downloadPdf(inv, "THERMAL") },
                                    enabled = downloadingId == null,
                                    shape = RoundedCornerShape(10.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text(
                                        if (downloadingId == inv.id + "THERMAL") "Generating…" else "🖨️ Thermal 80mm",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextWhite
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
