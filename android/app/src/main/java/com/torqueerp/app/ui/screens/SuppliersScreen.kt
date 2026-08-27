package com.torqueerp.app.ui.screens

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.torqueerp.app.data.api.ApiService
import com.torqueerp.app.data.model.CreateSupplierRequest
import com.torqueerp.app.data.model.Supplier
import com.torqueerp.app.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun SuppliersScreen(
    apiService: ApiService,
    onNavigateBack: () -> Unit
) {
    var suppliers by remember { mutableStateOf<List<Supplier>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }
    var showAddDialog by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()

    fun loadSuppliers() {
        isLoading = true
        scope.launch {
            try {
                val res = apiService.getSuppliers(search = searchQuery.ifBlank { null })
                suppliers = res.data
            } catch (e: Exception) {
                // handle error
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(searchQuery) {
        loadSuppliers()
    }

    Scaffold(
        containerColor = SlateBackground,
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                TorqueScreenHeader("Suppliers", onBack = onNavigateBack, padded = false) {
                    TorqueHeaderAction("＋", accent = true) { showAddDialog = true }
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search supplier name, company or GSTIN…", fontSize = 12.sp, color = TextMuted) },
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
        } else if (suppliers.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("No suppliers registered yet.", color = TextMuted, fontSize = 13.sp)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(suppliers) { s ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, SlateBorder, RoundedCornerShape(14.dp)),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = SlateCard)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text(s.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                            s.company?.let { c ->
                                Text("Company: $c", fontSize = 11.sp, color = AmberGold, fontWeight = FontWeight.SemiBold)
                            }
                            s.contactPerson?.let { cp ->
                                Text("Contact: $cp", fontSize = 11.sp, color = TextMuted)
                            }
                            Text("📞 Phone: ${s.phone ?: "N/A"}", fontSize = 11.sp, color = TextMuted)
                            s.email?.let { e ->
                                Text("✉️ $e", fontSize = 10.sp, color = TextMuted)
                            }
                            s.gstin?.let { g ->
                                Text("GSTIN: $g", fontSize = 10.sp, color = TextMuted)
                            }
                            s.count?.purchases?.let { pc ->
                                Text("$pc purchases recorded", fontSize = 10.sp, color = EmeraldGreen)
                            }
                        }
                    }
                }
            }
        }
    }

    // Add Supplier Dialog
    if (showAddDialog) {
        var name by remember { mutableStateOf("") }
        var companyName by remember { mutableStateOf("") }
        var contactPerson by remember { mutableStateOf("") }
        var phone by remember { mutableStateOf("") }
        var email by remember { mutableStateOf("") }
        var address by remember { mutableStateOf("") }
        var gstin by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            containerColor = SlateCard,
            title = { Text("Add New Supplier", color = TextWhite, fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Supplier / Company Name *", color = TextMuted, fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = contactPerson,
                        onValueChange = { contactPerson = it },
                        label = { Text("Contact Person", color = TextMuted, fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = companyName,
                        onValueChange = { companyName = it },
                        label = { Text("Company / Agency Name", color = TextMuted, fontSize = 11.sp) },
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
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Email", color = TextMuted, fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = address,
                        onValueChange = { address = it },
                        label = { Text("Address", color = TextMuted, fontSize = 11.sp) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = gstin,
                        onValueChange = { gstin = it },
                        label = { Text("GSTIN (Optional)", color = TextMuted, fontSize = 11.sp) },
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
                                    apiService.createSupplier(
                                        CreateSupplierRequest(
                                            name = name.trim(),
                                            company = companyName.ifBlank { null },
                                            contactPerson = contactPerson.ifBlank { null },
                                            phone = phone.ifBlank { null },
                                            email = email.ifBlank { null },
                                            address = address.ifBlank { null },
                                            gstin = gstin.ifBlank { null }
                                        )
                                    )
                                    showAddDialog = false
                                    loadSuppliers()
                                } catch (e: Exception) {
                                    // handle error
                                }
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AmberGold)
                ) {
                    Text("Save Supplier", color = OnAccent, fontWeight = FontWeight.Bold)
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
