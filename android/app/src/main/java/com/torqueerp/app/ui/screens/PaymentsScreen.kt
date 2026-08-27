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
import com.torqueerp.app.data.model.CreatePaymentRequest
import com.torqueerp.app.data.model.Payment
import com.torqueerp.app.data.model.Sale
import com.torqueerp.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun PaymentsScreen(
    apiService: ApiService,
    onNavigateBack: () -> Unit
) {
    var payments by remember { mutableStateOf<List<Payment>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showRecordPaymentDialog by remember { mutableStateOf(false) }
    var unpaidSales by remember { mutableStateOf<List<Sale>>(emptyList()) }
    var statusMessage by remember { mutableStateOf<String?>(null) }

    val scope = rememberCoroutineScope()

    fun loadPayments() {
        isLoading = true
        scope.launch {
            try {
                val res = apiService.getPayments(limit = 100)
                payments = res.data
            } catch (e: Exception) {
                statusMessage = e.localizedMessage
            } finally {
                isLoading = false
            }
        }
    }

    fun openRecordDialog() {
        scope.launch {
            try {
                val res = apiService.getSales(limit = 100)
                unpaidSales = res.data.filter { it.paymentStatus != "PAID" }
                showRecordPaymentDialog = true
            } catch (e: Exception) {
                statusMessage = "Failed to load unpaid invoices: ${e.localizedMessage}"
            }
        }
    }

    LaunchedEffect(Unit) {
        loadPayments()
    }

    Scaffold(
        containerColor = SlateBackground,
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                TorqueScreenHeader("Payments", onBack = onNavigateBack, padded = false) {
                    TorqueHeaderAction("＋", accent = true) { openRecordDialog() }
                }
                statusMessage?.let { msg ->
                    Text(msg, fontSize = 11.sp, color = DangerRed, modifier = Modifier.padding(top = 6.dp))
                }
            }
        }
    ) { padding ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = EmeraldGreen)
            }
        } else if (payments.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("No payment transactions found.", color = TextMuted, fontSize = 13.sp)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(payments) { p ->
                    val isSupplierPayout = p.referenceType == "PURCHASE" || p.referenceType == "SUPPLIER_BALANCE"
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
                                    p.customer?.name ?: p.supplier?.name ?: "Walk-in Party",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextWhite
                                )
                                Text(
                                    if (isSupplierPayout) "SUPPLIER PAID" else "CUSTOMER RECEIVED",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isSupplierPayout) AlertAmber else EmeraldGreen
                                )
                                Text(
                                    "${p.method ?: "CASH"} • ${p.createdAt.take(10)}" +
                                        (p.referenceNumber?.let { " • Ref: $it" } ?: ""),
                                    fontSize = 10.sp,
                                    color = TextMuted
                                )
                                p.notes?.let { n ->
                                    Text(n, fontSize = 10.sp, color = TextMuted, maxLines = 1)
                                }
                            }
                            Text(
                                text = "${if (isSupplierPayout) "-" else "+"}₹${String.format("%.2f", p.amount)}",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Black,
                                color = if (isSupplierPayout) AlertAmber else EmeraldGreen
                            )
                        }
                    }
                }
            }
        }
    }

    // Record Payment Dialog — settles an unpaid/partially-paid sale invoice
    if (showRecordPaymentDialog) {
        var selectedSale by remember { mutableStateOf<Sale?>(null) }
        var amountInput by remember { mutableStateOf("") }
        var methodInput by remember { mutableStateOf("CASH") }
        var notesInput by remember { mutableStateOf("Udhaar settlement") }
        var dialogError by remember { mutableStateOf<String?>(null) }

        AlertDialog(
            onDismissRequest = { showRecordPaymentDialog = false },
            containerColor = SlateCard,
            title = { Text("Record Customer Payment", color = TextWhite, fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (unpaidSales.isEmpty()) {
                        Text(
                            "No unpaid invoices — all sales are fully settled. 🎉",
                            fontSize = 12.sp,
                            color = EmeraldGreen
                        )
                    } else {
                        Text("Select Unpaid Invoice:", fontSize = 11.sp, color = TextMuted)
                        LazyColumn(modifier = Modifier.height(140.dp)) {
                            items(unpaidSales) { s ->
                                val isSelected = selectedSale?.id == s.id
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(
                                            if (isSelected) EmeraldGreen.copy(alpha = 0.15f) else Color.Transparent,
                                            RoundedCornerShape(8.dp)
                                        )
                                        .clickable {
                                            selectedSale = s
                                            amountInput = String.format("%.2f", s.balanceDue ?: 0.0)
                                        }
                                        .padding(8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
                                        Text(
                                            s.invoiceNumber,
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (isSelected) EmeraldGreen else TextWhite
                                        )
                                        Text(
                                            s.customer?.name ?: "Walk-in",
                                            fontSize = 10.sp,
                                            color = TextMuted
                                        )
                                    }
                                    Text(
                                        "Due ₹${String.format("%.2f", s.balanceDue ?: 0.0)}",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = AlertAmber
                                    )
                                }
                            }
                        }
                        OutlinedTextField(
                            value = amountInput,
                            onValueChange = { amountInput = it },
                            label = { Text("Received Amount ₹ *", color = TextMuted, fontSize = 11.sp) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth()
                        )
                        Text("Payment Method:", fontSize = 11.sp, color = TextMuted)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf("CASH", "UPI", "CARD", "BANK_TRANSFER").forEach { m ->
                                Button(
                                    onClick = { methodInput = m },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (methodInput == m) EmeraldGreen else InkButton
                                    ),
                                    shape = RoundedCornerShape(8.dp),
                                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        if (m == "BANK_TRANSFER") "BANK" else m,
                                        fontSize = 9.sp,
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                        OutlinedTextField(
                            value = notesInput,
                            onValueChange = { notesInput = it },
                            label = { Text("Notes / Reference", color = TextMuted, fontSize = 11.sp) },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    dialogError?.let { err ->
                        Text(err, fontSize = 11.sp, color = DangerRed)
                    }
                }
            },
            confirmButton = {
                if (unpaidSales.isNotEmpty()) {
                    Button(
                        onClick = {
                            val amt = amountInput.toDoubleOrNull() ?: 0.0
                            val sale = selectedSale
                            when {
                                sale == null -> dialogError = "Select an unpaid invoice first."
                                amt <= 0 -> dialogError = "Enter a payment amount above zero."
                                else -> scope.launch {
                                    try {
                                        apiService.createPayment(
                                            CreatePaymentRequest(
                                                referenceType = "SALE",
                                                referenceId = sale.id,
                                                amount = amt,
                                                method = methodInput,
                                                notes = notesInput.ifBlank { null }
                                            )
                                        )
                                        showRecordPaymentDialog = false
                                        loadPayments()
                                    } catch (e: Exception) {
                                        dialogError = e.localizedMessage
                                    }
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                    ) {
                        Text("Record Payment", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showRecordPaymentDialog = false }) {
                    Text("Close", color = TextMuted)
                }
            }
        )
    }
}
