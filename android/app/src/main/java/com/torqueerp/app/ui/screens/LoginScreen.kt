package com.torqueerp.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.torqueerp.app.R
import com.torqueerp.app.data.api.ApiService
import com.torqueerp.app.data.model.GoogleLoginRequest
import com.torqueerp.app.data.model.LoginRequest
import com.torqueerp.app.data.model.LoginResponse
import com.torqueerp.app.data.model.RegisterRequest
import com.torqueerp.app.ui.theme.*
import kotlinx.coroutines.launch
import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException

@Composable
fun LoginScreen(
    apiService: ApiService,
    onLoginSuccess: (LoginResponse) -> Unit,
    onConfigureServerUrl: (url: String) -> Unit,
    currentServerUrl: String
) {
    var isRegisterMode by remember { mutableStateOf(false) }

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }
    var businessNameInput by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }

    var isLoading by remember { mutableStateOf(false) }
    var isGoogleLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showServerConfigDialog by remember { mutableStateOf(false) }
    var showForgotPassword by remember { mutableStateOf(false) }
    var serverUrlInput by remember { mutableStateOf(currentServerUrl) }

    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    fun performLogin(targetEmail: String, targetPass: String) {
        isLoading = true
        errorMessage = null
        scope.launch {
            try {
                val res = apiService.login(LoginRequest(targetEmail.trim(), targetPass))
                onLoginSuccess(res)
            } catch (e: Exception) {
                errorMessage = e.localizedMessage ?: "Login failed. Check credentials or server connection."
            } finally {
                isLoading = false
            }
        }
    }

    fun performRegister() {
        if (fullName.isBlank() || email.isBlank() || password.length < 6 || businessNameInput.isBlank()) {
            errorMessage = "Fill name, email, business name; password needs 6+ characters."
            return
        }
        isLoading = true
        errorMessage = null
        scope.launch {
            try {
                val res = apiService.register(
                    RegisterRequest(
                        name = fullName.trim(),
                        email = email.trim(),
                        password = password,
                        businessName = businessNameInput.trim(),
                        phone = phone.ifBlank { null }
                    )
                )
                onLoginSuccess(res)
            } catch (e: Exception) {
                errorMessage = e.localizedMessage ?: "Registration failed. Email may already be in use."
            } finally {
                isLoading = false
            }
        }
    }

    // Real Google Sign-In: Credential Manager asks Google Play services for a
    // Google-issued ID token (audience = this Firebase project's web client id,
    // from the google-services.json-generated default_web_client_id resource).
    // The token is verified server-side by /auth/google — a typed email address
    // is never accepted as proof of identity.
    fun performGoogleSignIn() {
        if (isGoogleLoading || isLoading) return
        isGoogleLoading = true
        errorMessage = null
        scope.launch {
            try {
                val credentialManager = CredentialManager.create(context)
                val googleIdOption = GetGoogleIdOption.Builder()
                    .setServerClientId(context.getString(R.string.default_web_client_id))
                    .setFilterByAuthorizedAccounts(false)
                    .setAutoSelectEnabled(false)
                    .build()
                val request = GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
                    .build()

                val result = credentialManager.getCredential(context, request)
                val cred = result.credential
                if (cred is CustomCredential &&
                    cred.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                ) {
                    val idToken = GoogleIdTokenCredential.createFrom(cred.data).idToken
                    val res = apiService.googleLogin(GoogleLoginRequest(credential = idToken))
                    onLoginSuccess(res)
                } else {
                    errorMessage = "Google returned an unsupported credential type. Please try again."
                }
            } catch (e: GetCredentialCancellationException) {
                // User dismissed the Google account chooser — not an error.
            } catch (e: NoCredentialException) {
                errorMessage = "No Google account is available on this device. Add one in Android Settings and retry."
            } catch (e: GetCredentialException) {
                errorMessage = "Google sign-in failed: ${e.message ?: e.type}"
            } catch (e: HttpException) {
                errorMessage = parseApiError(e) ?: "The server rejected the Google credential."
            } catch (e: IOException) {
                errorMessage = "Network error — could not reach the Monu Sagar server."
            } catch (e: Exception) {
                errorMessage = e.localizedMessage ?: "Google sign-in failed. Please try again."
            } finally {
                isGoogleLoading = false
            }
        }
    }

    Scaffold(
        containerColor = SlateBackground
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(20.dp))

            // Brand Header
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .background(InkButton, RoundedCornerShape(20.dp))
                    .border(1.dp, SlateBorder, RoundedCornerShape(20.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text("⚡", fontSize = 28.sp)
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "MONU SAGAR",
                fontSize = 24.sp,
                fontWeight = FontWeight.Black,
                color = TextWhite,
                letterSpacing = 1.sp
            )
            Text(
                text = "Spare Parts, Billing & POS",
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                color = AmberGold
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Login / Register mode toggle
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SlateCard, RoundedCornerShape(12.dp))
                    .border(1.dp, SlateBorder, RoundedCornerShape(12.dp))
                    .padding(4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .background(if (!isRegisterMode) AmberGold else Color.Transparent, RoundedCornerShape(8.dp))
                        .clickable { isRegisterMode = false; errorMessage = null }
                        .padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "Sign In",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (!isRegisterMode) InkButton else TextMuted
                    )
                }
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .background(if (isRegisterMode) AmberGold else Color.Transparent, RoundedCornerShape(8.dp))
                        .clickable { isRegisterMode = true; errorMessage = null }
                        .padding(vertical = 10.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "Create Account",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isRegisterMode) InkButton else TextMuted
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Error Notice
            errorMessage?.let { msg ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp)
                        .border(1.dp, DangerRed, RoundedCornerShape(12.dp)),
                    colors = CardDefaults.cardColors(containerColor = ChipRedBg)
                ) {
                    Text(
                        text = msg,
                        fontSize = 12.sp,
                        color = DangerRed,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            if (isRegisterMode) {
                OutlinedTextField(
                    value = fullName,
                    onValueChange = { fullName = it },
                    label = { Text("Your Full Name", color = TextMuted) },
                    singleLine = true,
                    colors = loginFieldColors(),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = businessNameInput,
                    onValueChange = { businessNameInput = it },
                    label = { Text("Shop / Business Name", color = TextMuted) },
                    singleLine = true,
                    colors = loginFieldColors(),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("Phone (optional)", color = TextMuted) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    colors = loginFieldColors(),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Email Field
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email Address", color = TextMuted) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                colors = loginFieldColors(),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Password Field
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text(if (isRegisterMode) "Password (6+ chars)" else "Password", color = TextMuted) },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                colors = loginFieldColors(),
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp)
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Submit Button
            Button(
                onClick = {
                    if (isRegisterMode) performRegister() else performLogin(email, password)
                },
                enabled = !isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AmberGold)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = OnAccent)
                } else {
                    Text(
                        text = if (isRegisterMode) "Create Account & Business ➔" else "Sign In to ERP Dashboard ➔",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = OnAccent
                    )
                }
            }

            if (!isRegisterMode) {
                TextButton(onClick = { showForgotPassword = true }) {
                    Text("Forgot password?", fontSize = 12.sp, color = TextMuted, fontWeight = FontWeight.SemiBold)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Divider
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                HorizontalDivider(modifier = Modifier.weight(1f), color = SlateBorder)
                Text(
                    "  OR  ",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextMuted
                )
                HorizontalDivider(modifier = Modifier.weight(1f), color = SlateBorder)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Real Google Sign-In (Credential Manager -> /auth/google)
            OutlinedButton(
                onClick = { performGoogleSignIn() },
                enabled = !isGoogleLoading && !isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.outlinedButtonColors(containerColor = SlateCard)
            ) {
                if (isGoogleLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = AmberGold)
                    Spacer(modifier = Modifier.width(10.dp))
                    Text("Authenticating with Google…", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                } else {
                    Text("G", fontSize = 16.sp, fontWeight = FontWeight.Black, color = Color(0xFF4285F4))
                    Spacer(modifier = Modifier.width(10.dp))
                    Text("Continue with Google", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Server URL Config Shortcut
            TextButton(onClick = { showServerConfigDialog = true }) {
                Text(
                    text = "⚙️ Configure API Server Host",
                    fontSize = 11.sp,
                    color = TextMuted,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }

    if (showForgotPassword) {
        AlertDialog(
            onDismissRequest = { showForgotPassword = false },
            containerColor = SlateCard,
            shape = RoundedCornerShape(22.dp),
            title = { Text("Reset Password", color = TextWhite, fontWeight = FontWeight.Black) },
            text = {
                Text(
                    "Password reset is handled by your Monu Sagar administrator. Contact monusagar247@gmail.com with your registered email, or sign in with Google if your account uses the same email address.",
                    fontSize = 13.sp,
                    color = TextMuted,
                    lineHeight = 19.sp
                )
            },
            confirmButton = {
                TextButton(onClick = { showForgotPassword = false }) {
                    Text("OK", color = AmberGold, fontWeight = FontWeight.Bold)
                }
            }
        )
    }

    // Server Config Dialog
    if (showServerConfigDialog) {
        AlertDialog(
            onDismissRequest = { showServerConfigDialog = false },
            containerColor = SlateCard,
            title = { Text("API Server Endpoint", color = TextWhite, fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text(
                        "Set backend URL (Cloud or Local LAN IP):",
                        fontSize = 12.sp,
                        color = TextMuted,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    OutlinedTextField(
                        value = serverUrlInput,
                        onValueChange = { serverUrlInput = it },
                        singleLine = true,
                        colors = loginFieldColors(),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onConfigureServerUrl(serverUrlInput.trim())
                        showServerConfigDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = AmberGold)
                ) {
                    Text("Save URL", color = OnAccent, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showServerConfigDialog = false }) {
                    Text("Cancel", color = TextMuted)
                }
            }
        )
    }
}

// Extracts the human-readable message from a backend error body
// ({"error":{"message":"..."}}), falling back to null.
private fun parseApiError(e: HttpException): String? {
    return try {
        val body = e.response()?.errorBody()?.string() ?: return null
        JSONObject(body).optJSONObject("error")?.optString("message")?.takeIf { it.isNotBlank() }
    } catch (ex: Exception) {
        null
    }
}

@Composable
private fun loginFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = TextWhite,
    unfocusedTextColor = TextWhite,
    focusedBorderColor = AmberGold,
    unfocusedBorderColor = SlateBorder
)
