package com.torqueerp.app.data.model

import com.google.gson.annotations.SerializedName

data class User(
    val id: String,
    val name: String,
    val email: String,
    val phone: String?
)

data class Business(
    val id: String,
    val name: String,
    val slug: String?,
    val role: String? = null,
    val currency: String?,
    val gstin: String? = null,
    val phone: String? = null,
    val address: String? = null
)

// Full business profile as returned by GET /businesses/current
data class BusinessDetail(
    val id: String,
    val name: String,
    val phone: String?,
    val email: String?,
    val address: String?,
    val city: String?,
    val state: String?,
    val pin: String?,
    val gstin: String?,
    val pan: String?,
    val currency: String?,
    val invoicePrefix: String?,
    val defaultTaxRate: Double?,
    val allowNegativeStock: Boolean?
)

data class BusinessResponse(
    val business: BusinessDetail
)

data class BusinessesResponse(
    val businesses: List<Business>
)

data class UpdateBusinessRequest(
    val name: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val pin: String? = null,
    val gstin: String? = null,
    val pan: String? = null,
    val invoicePrefix: String? = null,
    val defaultTaxRate: Double? = null,
    val allowNegativeStock: Boolean? = null
)

data class CreateBusinessRequest(
    val name: String,
    val phone: String? = null,
    val gstin: String? = null
)

data class LoginResponse(
    val token: String,
    val user: User,
    val activeBusiness: Business?,
    val businesses: List<Business>?
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    val businessName: String,
    val phone: String? = null
)

// Google sign-in requires a Google-issued ID token (obtained via Firebase Auth /
// Credential Manager). The backend verifies it cryptographically; a plain email
// address is never accepted as proof of identity.
data class GoogleLoginRequest(
    val credential: String,
    val businessName: String? = null
)

data class MeResponse(
    val user: User,
    val activeBusiness: Business?,
    val businesses: List<Business>?
)

data class Product(
    val id: String,
    val name: String,
    val partNumber: String,
    val sku: String?,
    val barcode: String?,
    val brand: String?,
    val category: String?,
    val mrp: Double,
    val purchaseCost: Double,
    val sellingPrice: Double,
    val taxRate: Double?,
    val currentStock: Int,
    val minStock: Int,
    val vehicleCompatibility: String?
)

data class ProductsResponse(
    val data: List<Product>
)

data class ProductResponse(
    val product: Product
)

data class CreateProductRequest(
    val name: String,
    val partNumber: String,
    val barcode: String? = null,
    val qrCode: String? = null,
    val brand: String? = null,
    val category: String? = null,
    val mrp: Double,
    val purchaseCost: Double,
    val sellingPrice: Double,
    val taxRate: Double? = null,
    val initialStock: Int = 0,
    val minStock: Int = 5,
    val vehicleCompatibility: String? = null
)

// POST /products/identify-scan — structured scanner identification.
data class IdentifyScanRequest(
    val barcode: String? = null,
    val ocrText: String? = null
)

data class SuggestedProduct(
    val partNumber: String?,
    val name: String?,
    val mrp: Double?,
    val sellingPrice: Double?,
    val brand: String?,
    val barcode: String?
)

data class IdentifyScanResponse(
    val status: String, // MATCHED_PRODUCT | AMBIGUOUS_MATCH | NEW_PRODUCT | NOT_IDENTIFIED
    val matchedBy: String?,
    val product: Product?,
    val candidates: List<Product>?,
    val extracted: ExtractedOCRData?,
    val suggested: SuggestedProduct?
)

// PUT /products/:id must NOT include initialStock — the backend passes the
// payload straight to the DB update, and initialStock is not a column.
data class UpdateProductRequest(
    val name: String? = null,
    val partNumber: String? = null,
    val barcode: String? = null,
    val brand: String? = null,
    val category: String? = null,
    val mrp: Double? = null,
    val purchaseCost: Double? = null,
    val sellingPrice: Double? = null,
    val taxRate: Double? = null,
    val minStock: Int? = null,
    val vehicleCompatibility: String? = null
)

data class DashboardSummary(
    val todaySales: Double,
    val todayGrossProfit: Double,
    val todayPurchases: Double,
    val totalProducts: Int,
    val stockValueCost: Double,
    val stockValueRetail: Double,
    val lowStockCount: Int,
    val outOfStockCount: Int,
    val totalReceivables: Double?
)

data class DashboardResponse(
    val summary: DashboardSummary,
    val recentSales: List<Sale>?,
    val lowStockProducts: List<Product>?
)

data class SaleItemRequest(
    val productId: String,
    val quantity: Int,
    val unitPrice: Double,
    val discountAmount: Double = 0.0,
    val taxRate: Double = 0.0
)

data class CreateSaleRequest(
    val customerName: String?,
    val customerPhone: String?,
    val customerVehicle: String?,
    val amountPaid: Double,
    val paymentMethod: String,
    val items: List<SaleItemRequest>
)

data class SaleCustomer(
    val id: String?,
    val name: String?,
    val phone: String? = null,
    val vehicleNumber: String? = null
)

data class SaleItem(
    val id: String?,
    val productName: String?,
    val partNumber: String?,
    val quantity: Int,
    val unitPrice: Double,
    val totalAmount: Double
)

data class Sale(
    val id: String,
    val invoiceNumber: String,
    val saleDate: String,
    val subtotal: Double?,
    val taxAmount: Double?,
    val grandTotal: Double,
    val totalCostCOGS: Double,
    val grossProfit: Double,
    val amountPaid: Double?,
    val balanceDue: Double?,
    val paymentStatus: String,
    val paymentMethod: String,
    val customer: SaleCustomer? = null,
    val items: List<SaleItem>? = null
)

data class SaleResponse(
    val sale: Sale,
    val invoice: Invoice
)

data class SalesResponse(
    val data: List<Sale>
)

data class Invoice(
    val id: String,
    val invoiceNumber: String,
    val invoiceDate: String,
    val customerName: String?,
    val customerPhone: String?,
    val grandTotal: Double,
    val amountPaid: Double,
    val balanceDue: Double,
    val paymentStatus: String,
    val customer: SaleCustomer? = null
)

data class InvoicesResponse(
    val data: List<Invoice>
)

data class Customer(
    val id: String,
    val name: String,
    val phone: String?,
    val email: String?,
    val vehicleNumber: String?,
    val vehicleModel: String?,
    val address: String? = null,
    val notes: String? = null,
    @SerializedName("_count") val count: CustomerCount? = null
)

data class CustomerCount(
    val sales: Int?
)

data class CustomersResponse(
    val data: List<Customer>
)

data class CreateCustomerRequest(
    val name: String,
    val phone: String? = null,
    val vehicleNumber: String? = null,
    val vehicleModel: String? = null,
    val address: String? = null,
    val notes: String? = null
)

data class Supplier(
    val id: String,
    val name: String,
    val company: String?,
    val contactPerson: String?,
    val phone: String?,
    val email: String?,
    val gstin: String?,
    val address: String? = null,
    @SerializedName("_count") val count: SupplierCount? = null
)

data class SupplierCount(
    val purchases: Int?,
    val products: Int?
)

data class SuppliersResponse(
    val data: List<Supplier>
)

data class CreateSupplierRequest(
    val name: String,
    val company: String? = null,
    val contactPerson: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val gstin: String? = null,
    val address: String? = null
)

data class PurchaseItemRequest(
    val productId: String,
    val quantity: Int,
    val mrp: Double,
    val discountPercent: Double = 0.0,
    val taxRate: Double = 0.0
)

data class CreatePurchaseRequest(
    val invoiceNumber: String,
    val supplierId: String? = null,
    val freightCharges: Double = 0.0,
    val items: List<PurchaseItemRequest>
)

data class PurchaseItem(
    val id: String?,
    val quantity: Int,
    val product: PurchaseItemProduct? = null
)

data class PurchaseItemProduct(
    val id: String?,
    val name: String?,
    val partNumber: String?
)

data class Purchase(
    val id: String,
    val invoiceNumber: String,
    val purchaseDate: String,
    val grandTotal: Double,
    val supplier: Supplier? = null,
    val items: List<PurchaseItem>? = null
)

data class PurchasesResponse(
    val data: List<Purchase>
)

// POST /inventory/adjust contract: movementType is one of
// ADJUSTMENT_IN, ADJUSTMENT_OUT, DAMAGE, RETURN_IN, RETURN_OUT.
data class StockAdjustmentRequest(
    val productId: String,
    val movementType: String,
    val quantity: Int,
    val notes: String
)

data class StockMovement(
    val id: String,
    val movementType: String,
    val quantity: Int,
    val beforeQuantity: Int?,
    val afterQuantity: Int?,
    val unitCost: Double?,
    val referenceType: String?,
    val notes: String?,
    val createdAt: String,
    val product: PurchaseItemProduct? = null
)

data class StockLedgerResponse(
    val data: List<StockMovement>
)

data class Payment(
    val id: String,
    val referenceType: String?,
    val amount: Double,
    val method: String?,
    val referenceNumber: String?,
    val status: String?,
    val notes: String?,
    val createdAt: String,
    val customer: SaleCustomer? = null,
    val supplier: SaleCustomer? = null
)

data class PaymentsResponse(
    val data: List<Payment>
)

// POST /payments contract: payment is recorded against a SALE or PURCHASE reference.
data class CreatePaymentRequest(
    val referenceType: String,
    val referenceId: String,
    val amount: Double,
    val method: String,
    val referenceNumber: String? = null,
    val notes: String? = null
)

data class PaymentResponse(
    val payment: Payment
)

data class AppNotification(
    val id: String,
    val type: String?,
    val title: String,
    val message: String,
    val isRead: Boolean,
    val createdAt: String
)

data class NotificationsResponse(
    val data: List<AppNotification>,
    val unreadCount: Int
)

data class OCRProcessRequest(
    val text: String
)

data class OCRField(
    val value: String?,
    val confidence: Int,
    val needsReview: Boolean
)

data class ExtractedOCRData(
    val partNumber: OCRField?,
    val partName: OCRField?,
    val mrp: OCRField?,
    val barcode: OCRField?
)

data class OCRProcessResponse(
    val success: Boolean,
    val extracted: ExtractedOCRData?,
    val safetyNotice: String?
)

data class GenericSuccessResponse(
    val success: Boolean,
    val message: String?
)

/**
 * A transacted product is archived rather than deleted, so past invoices keep
 * their lines. `action` says which happened: DELETED | ARCHIVED | ALREADY_ARCHIVED.
 */
data class DeleteProductResponse(
    val success: Boolean,
    val action: String,
    val message: String?
)
