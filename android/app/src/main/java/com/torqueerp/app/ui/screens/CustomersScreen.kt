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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.torqueerp.app.data.api.ApiService
import com.torqueerp.app.data.model.CreateCustomerRequest
import com.torqueerp.app.data.model.Customer
import com.torqueerp.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun CustomersScreen(
    apiService: ApiService,
    onNavigateBack: () -> Unit
) {
    var customers by remember { mutableStateOf<List<Customer>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var showAddDialog by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()

    fun loadCustomers() {
        isLoading = true
        scope.launch {
            try {
                val res = apiService.getCustomers(search = searchQuery.ifBlank { null })
                customers = res.data
            } catch (e: Exception) {
                // handle error
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(searchQuery) {
        loadCustomers()
    }

    Scaffold(
        containerColor = SlateBackground,
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                TorqueScreenHeader("Customers", onBack = onNavigateBack, padded = false) {
                    TorqueHeaderAction("＋", accent = true) { showAddDialog = true }
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search by name, phone or vehicle #…", fontSize = 12.sp, color = TextMuted) },
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
        } else if (customers.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("No customers registered yet.", color = TextMuted, fontSize = 13.sp)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(customers) { c ->
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
                                Text(c.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                                Text("📞 ${c.phone ?: "No Phone"}", fontSize = 11.sp, color = TextMuted)
                                if (!c.vehicleNumber.isNullOrBlank()) {
                                    Text("🚗 ${c.vehicleNumber} (${c.vehicleModel ?: ""})", fontSize = 11.sp, color = AmberGold)
                                } else if (!c.vehicleModel.isNullOrBlank()) {
                                    Text("🚗 ${c.vehicleModel}", fontSize = 11.sp, color = AmberGold)
                                }
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = "${c.count?.sales ?: 0} Invoices",
                                    fontSize = 12.sp,
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

    // Add Customer Dialog
    if (showAddDialog) {
        var name by remember { mutableStateOf("") }
        var phone by remember { mutableStateOf("") }
        var vehicleNo by remember { mutableStateOf("") }
        var vehicleModel by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            containerColor = SlateCard,
            title = { Text("Register New Customer", color = TextWhite, fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Customer Name *", color = TextMuted, fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        label = { Text("Phone Number", color = TextMuted, fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = vehicleNo,
                        onValueChange = { vehicleNo = it },
                        label = { Text("Vehicle Reg # (e.g. DL 01 AB 1234)", color = TextMuted, fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = vehicleModel,
                        onValueChange = { vehicleModel = it },
                        label = { Text("Vehicle Model (e.g. Royal Enfield Classic 350)", color = TextMuted, fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (name.isNotBlank()) {
                            scope.launch {
                                try {
                                    apiService.createCustomer(
                                        CreateCustomerRequest(
                                            name = name.trim(),
                                            phone = phone.ifBlank { null },
                                            vehicleNumber = vehicleNo.ifBlank { null },
                                            vehicleModel = vehicleModel.ifBlank { null }
                                        )
                                    )
                                    showAddDialog = false
                                    loadCustomers()
                                } catch (e: Exception) {
                                    // handle error
                                }
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AmberGold)
                ) {
                    Text("Save Customer", color = OnAccent, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddDialog = false }) {
                    Text("Cancel", color = TextMuted)
                }
            }
        )
    }
}
