package com.torqueerp.app.data.api

import com.torqueerp.app.data.model.*
import okhttp3.OkHttpClient
import okhttp3.ResponseBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

interface ApiService {

    // Auth
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): LoginResponse

    @POST("auth/google")
    suspend fun googleLogin(@Body request: GoogleLoginRequest): LoginResponse

    @GET("auth/me")
    suspend fun getMe(): MeResponse

    @POST("auth/logout")
    suspend fun logout(): GenericSuccessResponse

    @DELETE("auth/account")
    suspend fun deleteAccount(): GenericSuccessResponse

    // Businesses (multi-tenant)
    @GET("businesses")
    suspend fun getBusinesses(): BusinessesResponse

    @POST("businesses")
    suspend fun createBusiness(@Body request: CreateBusinessRequest): BusinessResponse

    @GET("businesses/current")
    suspend fun getCurrentBusiness(): BusinessResponse

    @PUT("businesses/current")
    suspend fun updateCurrentBusiness(@Body request: UpdateBusinessRequest): BusinessResponse

    // Reports & Dashboard
    @GET("reports/dashboard")
    suspend fun getDashboard(): DashboardResponse

    @Streaming
    @GET("reports/export")
    suspend fun exportReportCsv(@Query("type") type: String): ResponseBody

    // Products Catalog
    @GET("products")
    suspend fun getProducts(
        @Query("search") search: String? = null,
        @Query("brand") brand: String? = null,
        @Query("category") category: String? = null,
        @Query("lowStock") lowStock: Boolean? = null,
        @Query("limit") limit: Int = 100
    ): ProductsResponse

    @GET("products/lookup/{code}")
    suspend fun lookupProduct(@Path("code") code: String): ProductResponse

    @POST("products/identify-scan")
    suspend fun identifyScan(@Body request: IdentifyScanRequest): IdentifyScanResponse

    @POST("products")
    suspend fun createProduct(@Body request: CreateProductRequest): ProductResponse

    @PUT("products/{id}")
    suspend fun updateProduct(@Path("id") id: String, @Body request: UpdateProductRequest): ProductResponse

    @DELETE("products/{id}")
    suspend fun deleteProduct(@Path("id") id: String): DeleteProductResponse

    // Inventory & Stock Ledger
    @POST("inventory/adjust")
    suspend fun adjustStock(@Body request: StockAdjustmentRequest): GenericSuccessResponse

    @GET("inventory/movements")
    suspend fun getStockMovements(
        @Query("movementType") movementType: String? = null,
        @Query("limit") limit: Int = 50
    ): StockLedgerResponse

    // Sales & POS
    @GET("sales")
    suspend fun getSales(
        @Query("search") search: String? = null,
        @Query("limit") limit: Int = 50
    ): SalesResponse

    @POST("sales")
    suspend fun createSale(@Body request: CreateSaleRequest): SaleResponse

    // Invoices
    @GET("invoices")
    suspend fun getInvoices(
        @Query("search") search: String? = null,
        @Query("limit") limit: Int = 50
    ): InvoicesResponse

    @Streaming
    @GET("invoices/{id}/pdf")
    suspend fun downloadInvoicePdf(
        @Path("id") id: String,
        @Query("format") format: String = "A4"
    ): ResponseBody

    // Purchases (Supplier Restock)
    @GET("purchases")
    suspend fun getPurchases(@Query("limit") limit: Int = 50): PurchasesResponse

    @POST("purchases")
    suspend fun createPurchase(@Body request: CreatePurchaseRequest): Map<String, Any>

    // Customers CRM
    @GET("customers")
    suspend fun getCustomers(@Query("search") search: String? = null, @Query("limit") limit: Int = 100): CustomersResponse

    @POST("customers")
    suspend fun createCustomer(@Body request: CreateCustomerRequest): Map<String, Customer>

    // Suppliers
    @GET("suppliers")
    suspend fun getSuppliers(@Query("search") search: String? = null, @Query("limit") limit: Int = 100): SuppliersResponse

    @POST("suppliers")
    suspend fun createSupplier(@Body request: CreateSupplierRequest): Map<String, Supplier>

    // Payments
    @GET("payments")
    suspend fun getPayments(@Query("limit") limit: Int = 50): PaymentsResponse

    @POST("payments")
    suspend fun createPayment(@Body request: CreatePaymentRequest): PaymentResponse

    // Notifications
    @GET("notifications")
    suspend fun getNotifications(): NotificationsResponse

    @PUT("notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: String): GenericSuccessResponse

    // OCR label extraction
    @POST("ocr/process")
    suspend fun processOcr(@Body request: OCRProcessRequest): OCRProcessResponse

    companion object {
        var customBaseUrl: String? = null
        // Default local loopback / LAN fallback
        // Production server by default, so a fresh install works out of the box.
        // Override at runtime from the login screen ("Configure API Server Host")
        // for local development, e.g. http://10.0.2.2:4000/api/v1/ (emulator) or
        // http://127.0.0.1:4000/api/v1/ with `adb reverse tcp:4000 tcp:4000`.
        const val DEFAULT_BASE_URL = "https://erp.monusagar.in/api/v1/"

        fun getBaseUrl(): String = customBaseUrl ?: DEFAULT_BASE_URL

        fun create(
            tokenProvider: () -> String?,
            businessIdProvider: () -> String?,
            baseUrlProvider: () -> String = { getBaseUrl() }
        ): ApiService {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val client = OkHttpClient.Builder()
                .addInterceptor(logging)
                .addInterceptor { chain ->
                    val original = chain.request()
                    val requestBuilder = original.newBuilder()

                    tokenProvider()?.let { token ->
                        if (token.isNotBlank()) {
                            requestBuilder.addHeader("Authorization", "Bearer $token")
                        }
                    }

                    businessIdProvider()?.let { bizId ->
                        if (bizId.isNotBlank()) {
                            requestBuilder.addHeader("x-business-id", bizId)
                        }
                    }

                    chain.proceed(requestBuilder.build())
                }
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build()

            return Retrofit.Builder()
                .baseUrl(baseUrlProvider())
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(ApiService::class.java)
        }
    }
}
