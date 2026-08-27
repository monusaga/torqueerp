package com.torqueerp.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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

/**
 * Settings — grouped sections with large icon rows (dark-first). All prior
 * functionality preserved: business switching/creation, full business profile
 * + GST editing, server endpoint, theme mode, logout, account deletion.
 */
@Composable
fun SettingsScreen(
    apiService: ApiService,
    activeBusinessId: String,
    activeBusinessName: String,
    userEmail: String,
    businesses: List<Business>,
    currentServerUrl: String,
    themeMode: String,
    onThemeModeChange: (String) -> Unit,
    onConfigureServerUrl: (url: String) -> Unit,
    onBusinessesLoaded: (List<Business>) -> Unit,
    onSwitchBusiness: (Business) -> Unit,
    onLogout: () -> Unit,
    onNavigateBack: () -> Unit
) {
    var statusMessage by remember { mutableStateOf<String?>(null) }
    var showDeleteConfirm by remember { mutableStateOf(false) }
    var deleteConfirmText by remember { mutableStateOf("") }
    var showCreateBusiness by remember { mutableStateOf(false) }
    var showServerDialog by remember { mutableStateOf(false) }
    var showThemeDialog by remember { mutableStateOf(false) }
    var showBusinessProfile by remember { mutableStateOf(false) }
    var showSwitcher by remember { mutableStateOf(false) }
    var infoDialog by remember { mutableStateOf<Pair<String, String>?>(null) }

    // Business profile form state (loaded from GET /businesses/current)
    var profileLoaded by remember { mutableStateOf(false) }
    var bizName by remember { mutableStateOf("") }
    var bizPhone by remember { mutableStateOf("") }
    var bizEmail by remember { mutableStateOf("") }
    var bizAddress by remember { mutableStateOf("") }
    var bizCity by remember { mutableStateOf("") }
    var bizState by remember { mutableStateOf("") }
    var bizPin by remember { mutableStateOf("") }
    var bizGstin by remember { mutableStateOf("") }
    var bizPan by remember { mutableStateOf("") }
    var invoicePrefix by remember { mutableStateOf("INV") }
    var defaultTaxRate by remember { mutableStateOf("18") }
    var allowNegativeStock by remember { mutableStateOf(false) }
    var isSaving by remember { mutableStateOf(false) }
    var serverUrlInput by remember { mutableStateOf(currentServerUrl) }

    val scope = rememberCoroutineScope()

    LaunchedEffect(activeBusinessId) {
        try {
            val res = apiService.getCurrentBusiness()
            val b = res.business
            bizName = b.name
            bizPhone = b.phone ?: ""
            bizEmail = b.email ?: ""
            bizAddress = b.address ?: ""
            bizCity = b.city ?: ""
            bizState = b.state ?: ""
            bizPin = b.pin ?: ""
            bizGstin = b.gstin ?: ""
            bizPan = b.pan ?: ""
            invoicePrefix = b.invoicePrefix ?: "INV"
            defaultTaxRate = (b.defaultTaxRate ?: 18.0).toString()
            allowNegativeStock = b.allowNegativeStock ?: false
            profileLoaded = true
        } catch (e: Exception) {
            statusMessage = "Could not load business profile: ${e.localizedMessage}"
        }
        try {
            val bl = apiService.getBusinesses()
            onBusinessesLoaded(bl.businesses)
        } catch (e: Exception) {
            // ignore
        }
    }

    fun saveProfile() {
        isSaving = true
        statusMessage = null
        scope.launch {
            try {
                apiService.updateCurrentBusiness(
                    UpdateBusinessRequest(
                        name = bizName.ifBlank { null },
                        phone = bizPhone.ifBlank { null },
                        email = bizEmail.ifBlank { null },
                        address = bizAddress.ifBlank { null },
                        city = bizCity.ifBlank { null },
                        state = bizState.ifBlank { null },
                        pin = bizPin.ifBlank { null },
                        gstin = bizGstin.ifBlank { null },
                        pan = bizPan.ifBlank { null },
                        invoicePrefix = invoicePrefix.ifBlank { null },
                        defaultTaxRate = defaultTaxRate.toDoubleOrNull(),
                        allowNegativeStock = allowNegativeStock
                    )
                )
                statusMessage = "✅ Business settings saved."
                showBusinessProfile = false
            } catch (e: Exception) {
                statusMessage = "Save failed: ${e.localizedMessage}"
            } finally {
                isSaving = false
            }
        }
    }

    val themeLabel = when (themeMode) {
        "light" -> "Light"
        "system" -> "System default"
        else -> "Dark"
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(SlateBackground)
            .verticalScroll(rememberScrollState())
    ) {
        TorqueTopBar("Settings", onBack = onNavigateBack)

        // ---- Profile header ----
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(58.dp)
                    .background(AmberGold, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    activeBusinessName.take(1).uppercase(),
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                    color = OnAccent
                )
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column {
                Text(activeBusinessName, fontSize = 17.sp, fontWeight = FontWeight.Black, color = TextWhite)
                Text(userEmail, fontSize = 12.sp, color = TextMuted)
            }
        }

        statusMessage?.let { msg ->
            Text(
                msg,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = if (msg.startsWith("✅")) EmeraldGreen else DangerRed,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp)
            )
        }

        Column(modifier = Modifier.padding(horizontal = 20.dp)) {

            TorqueSectionHeader("Account")
            TorqueGroup {
                TorqueListRow(
                    "🏢", "Switch Business",
                    if (businesses.size > 1) "${businesses.size} businesses" else "1 business",
                    onClick = { showSwitcher = true }
                )
                TorqueDivider()
                TorqueListRow("➕", "Create Additional Business", "New shop / branch tenant", onClick = { showCreateBusiness = true })
            }

            TorqueSectionHeader("Business")
            TorqueGroup {
                TorqueListRow(
                    "🏪", "Business Profile & GST",
                    listOfNotNull(bizGstin.ifBlank { null }, "Prefix $invoicePrefix", "GST $defaultTaxRate%").joinToString(" • "),
                    onClick = { showBusinessProfile = true }
                )
            }

            TorqueSectionHeader("App")
            TorqueGroup {
                TorqueListRow("🌙", "Appearance", themeLabel, onClick = { showThemeDialog = true })
                TorqueDivider()
                TorqueListRow("🌐", "API Server Endpoint", currentServerUrl, onClick = {
                    serverUrlInput = currentServerUrl
                    showServerDialog = true
                })
            }

            TorqueSectionHeader("Support")
            TorqueGroup {
                TorqueListRow("❓", "Help & FAQ", onClick = {
                    infoDialog = "Help & FAQ" to "• SELL: scan a part label — it is identified automatically and added to the cart.\n• PURCHASE: scan labels one after another, enter quantities, then Complete Stock Entry.\n• Unknown parts are read via OCR and prefilled for one-tap creation.\n• Invoices support A4 GST and 80mm thermal PDF sharing."
                })
                TorqueDivider()
                TorqueListRow("✉️", "Contact Support", onClick = {
                    infoDialog = "Contact Support" to "Email: monusagar247@gmail.com\n\nInclude your business name and a short description of the issue."
                })
                TorqueDivider()
                TorqueListRow("📄", "Terms & Privacy", onClick = {
                    infoDialog = "Terms & Privacy" to "Your business data belongs to you. It is stored on your configured Monu Sagar server and is never shared with third parties. Export everything anytime from Reports → CSV."
                })
            }

            TorqueSectionHeader("Account Actions")
            TorqueGroup {
                TorqueListRow("🚪", "Log Out", "Ends this session on all devices", onClick = {
                    scope.launch {
                        try { apiService.logout() } catch (_: Exception) { }
                        onLogout()
                    }
                })
                TorqueDivider()
                TorqueListRow(
                    "🗑️", "Delete Account & Data",
                    "Permanent — removes every record",
                    titleColor = DangerRed,
                    onClick = {
                        showDeleteConfirm = true
                        deleteConfirmText = ""
                    }
                )
            }

            Spacer(modifier = Modifier.height(30.dp))
        }
    }

    // ---- Business switcher ----
    if (showSwitcher) {
        AlertDialog(
            onDismissRequest = { showSwitcher = false },
            containerColor = SlateCard,
            shape = RoundedCornerShape(22.dp),
            title = { Text("Switch Business", color = TextWhite, fontWeight = FontWeight.Black) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    businesses.forEach { b ->
                        val isActive = b.id == activeBusinessId
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(if (isActive) ChipAmberBg else SlateRaised, RoundedCornerShape(12.dp))
                                .clickable {
                                    if (!isActive) {
                                        onSwitchBusiness(b)
                                        statusMessage = "✅ Switched to ${b.name}"
                                    }
                                    showSwitcher = false
                                }
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(b.name, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = if (isActive) AmberGold else TextWhite)
                                b.role?.let { r -> Text(r, fontSize = 10.sp, color = TextMuted) }
                            }
                            if (isActive) Text("ACTIVE", fontSize = 10.sp, fontWeight = FontWeight.Black, color = AmberGold)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showSwitcher = false }) { Text("Close", color = AmberGold, fontWeight = FontWeight.Bold) }
            }
        )
    }

    // ---- Business profile & GST dialog (full form) ----
    if (showBusinessProfile) {
        AlertDialog(
            onDismissRequest = { showBusinessProfile = false },
            containerColor = SlateCard,
            shape = RoundedCornerShape(22.dp),
            title = { Text("Business Profile & GST", color = TextWhite, fontWeight = FontWeight.Black) },
            text = {
                if (!profileLoaded) {
                    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = AmberGold, modifier = Modifier.size(26.dp))
                    }
                } else {
                    Column(
                        modifier = Modifier.verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(value = bizName, onValueChange = { bizName = it }, label = { Text("Business Name", fontSize = 11.sp) }, singleLine = true, colors = torqueFieldColors(), modifier = Modifier.fillMaxWidth())
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(value = bizPhone, onValueChange = { bizPhone = it }, label = { Text("Phone", fontSize = 11.sp) }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), colors = torqueFieldColors(), modifier = Modifier.weight(1f))
                            OutlinedTextField(value = bizEmail, onValueChange = { bizEmail = it }, label = { Text("Email", fontSize = 11.sp) }, singleLine = true, colors = torqueFieldColors(), modifier = Modifier.weight(1f))
                        }
                        OutlinedTextField(value = bizAddress, onValueChange = { bizAddress = it }, label = { Text("Address", fontSize = 11.sp) }, singleLine = true, colors = torqueFieldColors(), modifier = Modifier.fillMaxWidth())
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(value = bizCity, onValueChange = { bizCity = it }, label = { Text("City", fontSize = 11.sp) }, singleLine = true, colors = torqueFieldColors(), modifier = Modifier.weight(1f))
                            OutlinedTextField(value = bizState, onValueChange = { bizState = it }, label = { Text("State", fontSize = 11.sp) }, singleLine = true, colors = torqueFieldColors(), modifier = Modifier.weight(1f))
                            OutlinedTextField(value = bizPin, onValueChange = { bizPin = it }, label = { Text("PIN", fontSize = 11.sp) }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), colors = torqueFieldColors(), modifier = Modifier.weight(1f))
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(value = bizGstin, onValueChange = { bizGstin = it.uppercase() }, label = { Text("GSTIN", fontSize = 11.sp) }, singleLine = true, colors = torqueFieldColors(), modifier = Modifier.weight(1f))
                            OutlinedTextField(value = bizPan, onValueChange = { bizPan = it.uppercase() }, label = { Text("PAN", fontSize = 11.sp) }, singleLine = true, colors = torqueFieldColors(), modifier = Modifier.weight(1f))
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(value = invoicePrefix, onValueChange = { invoicePrefix = it.uppercase() }, label = { Text("Invoice Prefix", fontSize = 11.sp) }, singleLine = true, colors = torqueFieldColors(), modifier = Modifier.weight(1f))
                            OutlinedTextField(value = defaultTaxRate, onValueChange = { defaultTaxRate = it }, label = { Text("Default GST %", fontSize = 11.sp) }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), colors = torqueFieldColors(), modifier = Modifier.weight(1f))
                        }
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { allowNegativeStock = !allowNegativeStock },
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(checked = allowNegativeStock, onCheckedChange = { allowNegativeStock = it }, colors = CheckboxDefaults.colors(checkedColor = AmberGold))
                            Column {
                                Text("Allow Negative Stock", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                                Text("When off, sales are blocked if stock is insufficient.", fontSize = 10.sp, color = TextMuted)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { saveProfile() },
                    enabled = !isSaving && profileLoaded,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AmberGold)
                ) {
                    Text(if (isSaving) "Saving…" else "Save", color = OnAccent, fontWeight = FontWeight.Black)
                }
            },
            dismissButton = {
                TextButton(onClick = { showBusinessProfile = false }) { Text("Cancel", color = TextMuted) }
            }
        )
    }

    // ---- Appearance dialog ----
    if (showThemeDialog) {
        AlertDialog(
            onDismissRequest = { showThemeDialog = false },
            containerColor = SlateCard,
            shape = RoundedCornerShape(22.dp),
            title = { Text("Appearance", color = TextWhite, fontWeight = FontWeight.Black) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("dark" to "🌙 Dark (recommended)", "light" to "☀️ Light", "system" to "📱 System default").forEach { (mode, label) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(if (themeMode == mode) ChipAmberBg else SlateRaised, RoundedCornerShape(12.dp))
                                .clickable {
                                    onThemeModeChange(mode)
                                    showThemeDialog = false
                                }
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(label, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = if (themeMode == mode) AmberGold else TextWhite)
                            if (themeMode == mode) Text("✓", fontSize = 13.sp, fontWeight = FontWeight.Black, color = AmberGold)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showThemeDialog = false }) { Text("Close", color = AmberGold, fontWeight = FontWeight.Bold) }
            }
        )
    }

    // ---- Server endpoint dialog ----
    if (showServerDialog) {
        AlertDialog(
            onDismissRequest = { showServerDialog = false },
            containerColor = SlateCard,
            shape = RoundedCornerShape(22.dp),
            title = { Text("API Server Endpoint", color = TextWhite, fontWeight = FontWeight.Black) },
            text = {
                OutlinedTextField(
                    value = serverUrlInput,
                    onValueChange = { serverUrlInput = it },
                    label = { Text("Server Host Base URL", fontSize = 11.sp) },
                    singleLine = true,
                    colors = torqueFieldColors(),
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        onConfigureServerUrl(serverUrlInput.trim())
                        statusMessage = "✅ API endpoint updated."
                        showServerDialog = false
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AmberGold)
                ) { Text("Save", color = OnAccent, fontWeight = FontWeight.Black) }
            },
            dismissButton = {
                TextButton(onClick = { showServerDialog = false }) { Text("Cancel", color = TextMuted) }
            }
        )
    }

    // ---- Info dialogs (Support section) ----
    infoDialog?.let { (title, body) ->
        AlertDialog(
            onDismissRequest = { infoDialog = null },
            containerColor = SlateCard,
            shape = RoundedCornerShape(22.dp),
            title = { Text(title, color = TextWhite, fontWeight = FontWeight.Black) },
            text = { Text(body, fontSize = 13.sp, color = TextMuted, lineHeight = 19.sp) },
            confirmButton = {
                TextButton(onClick = { infoDialog = null }) { Text("Close", color = AmberGold, fontWeight = FontWeight.Bold) }
            }
        )
    }

    // ---- Create business ----
    if (showCreateBusiness) {
        var newBizName by remember { mutableStateOf("") }
        var newBizPhone by remember { mutableStateOf("") }
        var createError by remember { mutableStateOf<String?>(null) }

        AlertDialog(
            onDismissRequest = { showCreateBusiness = false },
            containerColor = SlateCard,
            shape = RoundedCornerShape(22.dp),
            title = { Text("Create Additional Business", color = TextWhite, fontWeight = FontWeight.Black) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(value = newBizName, onValueChange = { newBizName = it }, label = { Text("Business Name *", fontSize = 11.sp) }, singleLine = true, colors = torqueFieldColors(), modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(value = newBizPhone, onValueChange = { newBizPhone = it }, label = { Text("Phone (optional)", fontSize = 11.sp) }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), colors = torqueFieldColors(), modifier = Modifier.fillMaxWidth())
                    createError?.let { err -> Text(err, fontSize = 11.sp, color = DangerRed) }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newBizName.length < 2) {
                            createError = "Business name is required."
                            return@Button
                        }
                        scope.launch {
                            try {
                                apiService.createBusiness(CreateBusinessRequest(name = newBizName.trim(), phone = newBizPhone.ifBlank { null }))
                                val bl = apiService.getBusinesses()
                                onBusinessesLoaded(bl.businesses)
                                showCreateBusiness = false
                                statusMessage = "✅ Business \"${newBizName.trim()}\" created."
                            } catch (e: Exception) {
                                createError = e.localizedMessage
                            }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = AmberGold)
                ) { Text("Create", color = OnAccent, fontWeight = FontWeight.Black) }
            },
            dismissButton = {
                TextButton(onClick = { showCreateBusiness = false }) { Text("Cancel", color = TextMuted) }
            }
        )
    }

    // ---- Delete account (type DELETE) ----
    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            containerColor = SlateCard,
            shape = RoundedCornerShape(22.dp),
            title = { Text("Permanently Delete Account?", color = DangerRed, fontWeight = FontWeight.Black) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "This permanently deletes your account, businesses, products, sales and invoices. This cannot be undone.",
                        color = TextMuted, fontSize = 13.sp, lineHeight = 19.sp
                    )
                    Text("Type DELETE to confirm:", color = DangerRed, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    OutlinedTextField(
                        value = deleteConfirmText,
                        onValueChange = { deleteConfirmText = it },
                        placeholder = { Text("Type DELETE", fontSize = 12.sp, color = TextMuted) },
                        singleLine = true,
                        colors = torqueFieldColors(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    enabled = deleteConfirmText.trim().uppercase() == "DELETE",
                    onClick = {
                        scope.launch {
                            try {
                                apiService.deleteAccount()
                                showDeleteConfirm = false
                                onLogout()
                            } catch (e: Exception) {
                                statusMessage = e.localizedMessage
                            }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = DangerRed)
                ) { Text("Delete Everything", color = Color.White, fontWeight = FontWeight.Black) }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) { Text("Cancel", color = TextMuted) }
            }
        )
    }
}
