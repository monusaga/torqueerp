package com.torqueerp.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
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
import com.torqueerp.app.data.model.AppNotification
import com.torqueerp.app.data.model.DashboardResponse
import com.torqueerp.app.ui.theme.*
import kotlinx.coroutines.launch

/**
 * Dark-first dashboard. The two primary business actions — SELL and PURCHASE —
 * lead the screen as large columns; KPIs are a compact value-forward strip.
 */
@Composable
fun HomeScreen(
    apiService: ApiService,
    activeBusinessName: String,
    onNavigateToPOS: () -> Unit,
    onNavigateToReceive: () -> Unit,
    onNavigateToScan: () -> Unit,
    onNavigateToProducts: () -> Unit,
    onNavigateToPurchases: () -> Unit,
    onNavigateToInventory: () -> Unit,
    onNavigateToSales: () -> Unit,
    onNavigateToInvoices: () -> Unit,
    onNavigateToCustomers: () -> Unit,
    onNavigateToSuppliers: () -> Unit,
    onNavigateToPayments: () -> Unit,
    onNavigateToReports: () -> Unit,
    onNavigateToSettings: () -> Unit
) {
    var dashboardData by remember { mutableStateOf<DashboardResponse?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var notifications by remember { mutableStateOf<List<AppNotification>>(emptyList()) }
    var unreadCount by remember { mutableStateOf(0) }
    var showNotifications by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun loadNotifications() {
        scope.launch {
            try {
                val res = apiService.getNotifications()
                notifications = res.data
                unreadCount = res.unreadCount
            } catch (e: Exception) {
                // ignore
            }
        }
    }

    fun loadDashboard() {
        isLoading = true
        scope.launch {
            try {
                dashboardData = apiService.getDashboard()
            } catch (e: Exception) {
                // fallback
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadDashboard()
        loadNotifications()
    }

    val summary = dashboardData?.summary

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(SlateBackground),
        verticalArrangement = Arrangement.spacedBy(0.dp)
    ) {
        // ---- Header: brand, business, bell, settings ----
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "MONU SAGAR",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black,
                        color = TextWhite,
                        letterSpacing = 0.5.sp
                    )
                    Text(
                        activeBusinessName,
                        fontSize = 13.sp,
                        color = AmberGold,
                        fontWeight = FontWeight.Bold
                    )
                }

                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(SlateRaised, CircleShape)
                        .clickable {
                            showNotifications = true
                            loadNotifications()
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Text("🔔", fontSize = 16.sp)
                    if (unreadCount > 0) {
                        Box(
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(4.dp)
                                .size(9.dp)
                                .background(DangerRed, CircleShape)
                        )
                    }
                }
                Spacer(modifier = Modifier.width(10.dp))
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .background(SlateRaised, CircleShape)
                        .clickable { onNavigateToSettings() },
                    contentAlignment = Alignment.Center
                ) {
                    Text("⚙️", fontSize = 16.sp)
                }
            }
        }

        // ---- Primary actions: SELL | PURCHASE ----
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .background(AmberGold, RoundedCornerShape(20.dp))
                        .clickable { onNavigateToPOS() }
                        .padding(vertical = 22.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("🛒", fontSize = 28.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("SELL", fontSize = 17.sp, fontWeight = FontWeight.Black, color = OnAccent)
                    Text("POS • Scan & Bill", fontSize = 11.sp, color = OnAccent.copy(alpha = 0.75f), fontWeight = FontWeight.SemiBold)
                }

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .background(SlateCard, RoundedCornerShape(20.dp))
                        .border(1.dp, SlateBorder, RoundedCornerShape(20.dp))
                        .clickable { onNavigateToReceive() }
                        .padding(vertical = 22.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("📥", fontSize = 28.sp)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("PURCHASE", fontSize = 17.sp, fontWeight = FontWeight.Black, color = TextWhite)
                    Text("Scan & Receive Stock", fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.SemiBold)
                }
            }
        }

        // ---- KPI strip ----
        item {
            Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                Spacer(modifier = Modifier.height(20.dp))
                TorqueSectionHeader("Today")
                Row(modifier = Modifier.fillMaxWidth()) {
                    TorqueMetric(
                        "Sales",
                        "₹${String.format("%.0f", summary?.todaySales ?: 0.0)}",
                        modifier = Modifier.weight(1f)
                    )
                    TorqueMetric(
                        "Gross Profit",
                        "₹${String.format("%.0f", summary?.todayGrossProfit ?: 0.0)}",
                        valueColor = EmeraldGreen,
                        modifier = Modifier.weight(1f)
                    )
                    TorqueMetric(
                        "Receivables",
                        "₹${String.format("%.0f", summary?.totalReceivables ?: 0.0)}",
                        valueColor = AlertAmber,
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(modifier = Modifier.height(14.dp))
                TorqueDivider()
                Spacer(modifier = Modifier.height(14.dp))
                Row(modifier = Modifier.fillMaxWidth()) {
                    TorqueMetric(
                        "Stock Value",
                        "₹${String.format("%.0f", summary?.stockValueCost ?: 0.0)}",
                        sub = "Retail ₹${String.format("%.0f", summary?.stockValueRetail ?: 0.0)}",
                        modifier = Modifier.weight(1f)
                    )
                    TorqueMetric(
                        "Low Stock",
                        "${summary?.lowStockCount ?: 0}",
                        valueColor = if ((summary?.lowStockCount ?: 0) > 0) AlertAmber else TextWhite,
                        sub = "${summary?.outOfStockCount ?: 0} out of stock",
                        modifier = Modifier.weight(1f)
                    )
                    TorqueMetric(
                        "Products",
                        "${summary?.totalProducts ?: 0}",
                        sub = "in catalog",
                        modifier = Modifier.weight(1f)
                    )
                }
                Spacer(modifier = Modifier.height(20.dp))
            }
        }

        // ---- Quick actions ----
        item {
            Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                TorqueSectionHeader("Operations")
                TorqueGroup {
                    TorqueListRow("📦", "Products", "Catalog, prices & barcodes", onClick = onNavigateToProducts)
                    TorqueDivider()
                    TorqueListRow("📊", "Inventory", "Stock health & audit ledger", onClick = onNavigateToInventory)
                    TorqueDivider()
                    TorqueListRow("💰", "Sales Ledger", "COGS & profit per sale", onClick = onNavigateToSales)
                    TorqueDivider()
                    TorqueListRow("🧾", "Invoices", "GST bills & PDF receipts", onClick = onNavigateToInvoices)
                    TorqueDivider()
                    TorqueListRow("📥", "Purchase History", "Supplier shipments", onClick = onNavigateToPurchases)
                    TorqueDivider()
                    TorqueListRow("💳", "Payments", "Cashflow & settlements", onClick = onNavigateToPayments)
                    TorqueDivider()
                    TorqueListRow("👥", "Customers", "CRM & vehicle history", onClick = onNavigateToCustomers)
                    TorqueDivider()
                    TorqueListRow("🏭", "Suppliers", "Distributors & vendors", onClick = onNavigateToSuppliers)
                    TorqueDivider()
                    TorqueListRow("📈", "Reports", "KPIs & CSV export", onClick = onNavigateToReports)
                }
                Spacer(modifier = Modifier.height(20.dp))
            }
        }

        // ---- Recent sales ----
        val recent = dashboardData?.recentSales ?: emptyList()
        item {
            Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TorqueSectionHeader("Recent Sales")
                    Text(
                        "View all →",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = AmberGold,
                        modifier = Modifier.clickable { onNavigateToSales() }
                    )
                }
            }
        }

        if (recent.isEmpty()) {
            item {
                Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                    TorqueGroup {
                        TorqueEmptyState("🧾", "No sales yet today", "Tap SELL to start billing.")
                    }
                }
            }
        } else {
            item {
                Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                    TorqueGroup {
                        recent.forEachIndexed { i, s ->
                            if (i > 0) TorqueDivider()
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(s.invoiceNumber, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                                    Text(
                                        "${s.customer?.name ?: "Cash Customer"} • ${s.items?.size ?: 1} items",
                                        fontSize = 11.sp,
                                        color = TextMuted
                                    )
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        "₹${String.format("%.0f", s.grandTotal)}",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Black,
                                        color = TextWhite
                                    )
                                    Text(
                                        "+₹${String.format("%.0f", s.grossProfit)}",
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

        item { Spacer(modifier = Modifier.height(28.dp)) }
    }

    // Notifications dialog
    if (showNotifications) {
        AlertDialog(
            onDismissRequest = { showNotifications = false },
            containerColor = SlateCard,
            shape = RoundedCornerShape(22.dp),
            title = { Text("Alerts ($unreadCount unread)", color = TextWhite, fontWeight = FontWeight.Black) },
            text = {
                if (notifications.isEmpty()) {
                    TorqueEmptyState("🔕", "No notifications", "You're all caught up.")
                } else {
                    LazyColumn(
                        modifier = Modifier.heightIn(max = 340.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(notifications.size) { idx ->
                            val n = notifications[idx]
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(
                                        if (n.isRead) SlateRaised else ChipAmberBg,
                                        RoundedCornerShape(12.dp)
                                    )
                                    .clickable {
                                        if (!n.isRead) {
                                            scope.launch {
                                                try {
                                                    apiService.markNotificationRead(n.id)
                                                    loadNotifications()
                                                } catch (e: Exception) {
                                                    // ignore
                                                }
                                            }
                                        }
                                    }
                                    .padding(10.dp)
                            ) {
                                Text(n.title, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                                Text(n.message, fontSize = 11.sp, color = TextMuted)
                                Text(n.createdAt.take(10), fontSize = 9.sp, color = TextMuted)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showNotifications = false }) {
                    Text("Close", color = AmberGold, fontWeight = FontWeight.Bold)
                }
            }
        )
    }
}
