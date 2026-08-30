package com.torqueerp.app

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.torqueerp.app.data.api.ApiService
import com.torqueerp.app.data.model.Business
import com.torqueerp.app.data.model.ExtractedOCRData
import com.torqueerp.app.data.model.Product
import com.torqueerp.app.ui.screens.*
import com.torqueerp.app.ui.theme.*
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private val prefs by lazy {
        getSharedPreferences("torque_erp_prefs", Context.MODE_PRIVATE)
    }

    private val gson = Gson()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Apply the persisted theme before first composition (dark-first default).
        TorqueTheme.mode = prefs.getString("theme_mode", "dark") ?: "dark"

        setContent {
            TorqueERPTheme {
                val navController = rememberNavController()
                val appContext = LocalContext.current
                val scope = rememberCoroutineScope()

                var token by remember { mutableStateOf(prefs.getString("auth_token", "") ?: "") }
                var userEmail by remember { mutableStateOf(prefs.getString("user_email", "") ?: "") }
                var businessId by remember { mutableStateOf(prefs.getString("business_id", "") ?: "") }
                var businessName by remember { mutableStateOf(prefs.getString("business_name", "Monu Sagar Shop") ?: "Monu Sagar Shop") }
                var serverUrl by remember { mutableStateOf(prefs.getString("server_url", ApiService.DEFAULT_BASE_URL) ?: ApiService.DEFAULT_BASE_URL) }
                var themeMode by remember { mutableStateOf(TorqueTheme.mode) }
                var businesses by remember {
                    mutableStateOf(loadSavedBusinesses())
                }

                // Cross-screen handoff:
                //  - POS batch selling: scanner keeps running and streams products
                //    into posScanQueue; POS drains the queue into the cart.
                //  - Receive Stock: scanner pops back with one product for qty entry.
                //  - OCR label -> catalog prefill.
                var pendingScannedProduct by remember { mutableStateOf<Product?>(null) }
                var scanDestination by remember { mutableStateOf("pos") }
                var pendingOcr by remember { mutableStateOf<ExtractedOCRData?>(null) }
                val receiveDraft = remember { mutableStateListOf<ReceiveLine>() }
                val posScanQueue = remember { mutableStateListOf<Product>() }
                val posCart = remember { mutableStateListOf<AndroidCartItem>() }

                val apiService = remember(token, businessId, serverUrl) {
                    ApiService.create(
                        tokenProvider = { token },
                        businessIdProvider = { businessId },
                        baseUrlProvider = { serverUrl }
                    )
                }

                fun persistBusinesses(list: List<Business>) {
                    businesses = list
                    prefs.edit().putString("businesses_json", gson.toJson(list)).apply()
                }

                fun saveSession(t: String, email: String, bizId: String, bizName: String, bizList: List<Business>) {
                    token = t
                    userEmail = email
                    businessId = bizId
                    businessName = bizName
                    prefs.edit()
                        .putString("auth_token", t)
                        .putString("user_email", email)
                        .putString("business_id", bizId)
                        .putString("business_name", bizName)
                        .apply()
                    persistBusinesses(bizList)
                }

                fun switchBusiness(biz: Business) {
                    businessId = biz.id
                    businessName = biz.name
                    posScanQueue.clear()
                    posCart.clear()
                    receiveDraft.clear()
                    prefs.edit()
                        .putString("business_id", biz.id)
                        .putString("business_name", biz.name)
                        .apply()
                }

                fun clearSession() {
                    token = ""
                    userEmail = ""
                    businessId = ""
                    businessName = "Monu Sagar Shop"
                    businesses = emptyList()
                    posScanQueue.clear()
                    posCart.clear()
                    receiveDraft.clear()
                    prefs.edit()
                        .remove("auth_token")
                        .remove("user_email")
                        .remove("business_id")
                        .remove("business_name")
                        .remove("businesses_json")
                        .apply()
                    navController.navigate("login") {
                        popUpTo(0) { inclusive = true }
                    }
                }

                // After the server has permanently deleted the account we also
                // drop the cached Google credential. Without this, tapping
                // "Continue with Google" on the login screen can auto-return the
                // previous token, the server provisions a brand-new account for
                // that email, and it looks like the deletion never happened.
                fun clearSessionAfterDeletion() {
                    scope.launch {
                        try {
                            CredentialManager.create(appContext)
                                .clearCredentialState(ClearCredentialStateRequest())
                        } catch (_: Exception) {
                            // Best effort: a stale credential must never block sign-out.
                        }
                    }
                    clearSession()
                }

                fun updateServerUrl(url: String) {
                    val formatted = if (url.endsWith("/")) url else "$url/"
                    serverUrl = formatted
                    prefs.edit().putString("server_url", formatted).apply()
                }

                fun updateThemeMode(mode: String) {
                    themeMode = mode
                    TorqueTheme.mode = mode
                    prefs.edit().putString("theme_mode", mode).apply()
                }

                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route
                val showBottomNav = token.isNotBlank() && currentRoute in listOf("home", "pos", "products", "inventory", "scan")

                Scaffold(
                    containerColor = SlateBackground,
                    bottomBar = {
                        if (showBottomNav) {
                            NavigationBar(containerColor = SlateCard) {
                                val navItems = listOf(
                                    Triple("home", "Home", "🏠"),
                                    Triple("pos", "POS", "⚡"),
                                    Triple("products", "Catalog", "📦"),
                                    Triple("inventory", "Stock", "📊"),
                                    Triple("scan", "Scan", "📷")
                                )
                                navItems.forEach { (route, label, icon) ->
                                    val selected = currentRoute == route
                                    NavigationBarItem(
                                        selected = selected,
                                        onClick = {
                                            if (route == "scan") scanDestination = "pos"
                                            navController.navigate(route)
                                        },
                                        label = {
                                            Text(
                                                label,
                                                fontSize = 11.sp,
                                                fontWeight = if (selected) FontWeight.Black else FontWeight.SemiBold,
                                                color = if (selected) AmberGold else TextMuted
                                            )
                                        },
                                        icon = { Text(icon, fontSize = 18.sp) },
                                        colors = NavigationBarItemDefaults.colors(
                                            indicatorColor = ChipAmberBg
                                        )
                                    )
                                }
                            }
                        }
                    }
                ) { padding ->
                    NavHost(
                        navController = navController,
                        startDestination = if (token.isNotBlank()) "home" else "login",
                        modifier = Modifier.padding(padding)
                    ) {
                        composable("login") {
                            LoginScreen(
                                apiService = apiService,
                                onLoginSuccess = { res ->
                                    val biz = res.activeBusiness
                                    saveSession(
                                        res.token,
                                        res.user.email,
                                        biz?.id ?: "",
                                        biz?.name ?: "Monu Sagar Shop",
                                        res.businesses ?: listOfNotNull(biz)
                                    )
                                    navController.navigate("home") {
                                        popUpTo("login") { inclusive = true }
                                    }
                                },
                                onConfigureServerUrl = { updateServerUrl(it) },
                                currentServerUrl = serverUrl
                            )
                        }

                        composable("home") {
                            HomeScreen(
                                apiService = apiService,
                                activeBusinessName = businessName,
                                onNavigateToPOS = { navController.navigate("pos") },
                                onNavigateToReceive = { navController.navigate("receive") },
                                onNavigateToScan = {
                                    scanDestination = "pos"
                                    navController.navigate("scan")
                                },
                                onNavigateToProducts = { navController.navigate("products") },
                                onNavigateToPurchases = { navController.navigate("purchases") },
                                onNavigateToInventory = { navController.navigate("inventory") },
                                onNavigateToSales = { navController.navigate("sales") },
                                onNavigateToInvoices = { navController.navigate("invoices") },
                                onNavigateToCustomers = { navController.navigate("customers") },
                                onNavigateToSuppliers = { navController.navigate("suppliers") },
                                onNavigateToPayments = { navController.navigate("payments") },
                                onNavigateToReports = { navController.navigate("reports") },
                                onNavigateToSettings = { navController.navigate("settings") }
                            )
                        }

                        composable("pos") {
                            POSScreen(
                                apiService = apiService,
                                cart = posCart,
                                scanQueue = posScanQueue,
                                onOpenScan = {
                                    scanDestination = "pos"
                                    navController.navigate("scan")
                                },
                                onSaleCompleted = { }
                            )
                        }

                        composable("scan") {
                            CameraScanScreen(
                                apiService = apiService,
                                cartBadge = if (scanDestination == "pos") posScanQueue.size + posCart.sumOf { it.quantity } else null,
                                onGoToCart = if (scanDestination == "pos") {
                                    { navController.navigate("pos") }
                                } else null,
                                onProductIdentified = { product ->
                                    if (scanDestination == "pos") {
                                        // Batch selling: stay in the scanner, keep adding.
                                        posScanQueue.add(product)
                                    } else {
                                        // Receive Stock: back to the draft for qty entry.
                                        pendingScannedProduct = product
                                        navController.popBackStack()
                                    }
                                },
                                onOcrForCatalog = { extracted ->
                                    pendingOcr = extracted
                                    navController.navigate("products")
                                }
                            )
                        }

                        composable("receive") {
                            ReceiveStockScreen(
                                apiService = apiService,
                                draft = receiveDraft,
                                pendingScannedProduct = pendingScannedProduct,
                                onScanConsumed = { pendingScannedProduct = null },
                                onOpenScan = {
                                    scanDestination = "receive"
                                    navController.navigate("scan")
                                },
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable("products") {
                            ProductsScreen(
                                apiService = apiService,
                                ocrPrefill = pendingOcr,
                                onOcrConsumed = { pendingOcr = null },
                                onNavigateBack = { navController.popBackStack() },
                                onOpenScan = {
                                    scanDestination = "pos"
                                    navController.navigate("scan")
                                }
                            )
                        }

                        composable("purchases") {
                            PurchasesScreen(
                                apiService = apiService,
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable("inventory") {
                            InventoryScreen(
                                apiService = apiService,
                                onOpenReceive = { navController.navigate("receive") },
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable("sales") {
                            SalesScreen(
                                apiService = apiService,
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable("invoices") {
                            InvoicesScreen(
                                apiService = apiService,
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable("customers") {
                            CustomersScreen(
                                apiService = apiService,
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable("suppliers") {
                            SuppliersScreen(
                                apiService = apiService,
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable("payments") {
                            PaymentsScreen(
                                apiService = apiService,
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable("reports") {
                            ReportsScreen(
                                apiService = apiService,
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable("settings") {
                            SettingsScreen(
                                apiService = apiService,
                                activeBusinessId = businessId,
                                activeBusinessName = businessName,
                                userEmail = userEmail,
                                businesses = businesses,
                                currentServerUrl = serverUrl,
                                themeMode = themeMode,
                                onThemeModeChange = { updateThemeMode(it) },
                                onConfigureServerUrl = { updateServerUrl(it) },
                                onBusinessesLoaded = { persistBusinesses(it) },
                                onSwitchBusiness = { switchBusiness(it) },
                                onLogout = { clearSession() },
                                onAccountDeleted = { clearSessionAfterDeletion() },
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }
                    }
                }
            }
        }
    }

    private fun loadSavedBusinesses(): List<Business> {
        val json = prefs.getString("businesses_json", null) ?: return emptyList()
        return try {
            val type = object : TypeToken<List<Business>>() {}.type
            gson.fromJson(json, type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }
}
