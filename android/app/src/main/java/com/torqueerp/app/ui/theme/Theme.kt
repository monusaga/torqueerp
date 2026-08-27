package com.torqueerp.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color

/**
 * TorqueERP theme engine — dark-first (AMOLED-friendly) with Light and System
 * modes. Every legacy color name (SlateBackground, TextWhite, …) is a computed
 * property that resolves against the active palette, so all screens restyle
 * without per-screen changes. TorqueERP identity: amber/gold accent.
 */
object TorqueTheme {
    // "dark" | "light" | "system"
    var mode by mutableStateOf("dark")

    // Effective flag, refreshed by TorqueERPTheme on composition.
    var isDark by mutableStateOf(true)
}

// ---------------------------------------------------------------------------
// Palette (dark-first). Names kept from the original light theme so existing
// screens keep compiling; values are theme-aware.
// ---------------------------------------------------------------------------

/** Near-black app background. */
val SlateBackground: Color get() = if (TorqueTheme.isDark) Color(0xFF0A0A0F) else Color(0xFFF8FAFC)

/** Card / elevated surface. */
val SlateCard: Color get() = if (TorqueTheme.isDark) Color(0xFF16161E) else Color(0xFFFFFFFF)

/** Slightly raised surface (chips, pills, inline panels). */
val SlateRaised: Color get() = if (TorqueTheme.isDark) Color(0xFF1E1E28) else Color(0xFFF1F5F9)

/** Hairline borders / dividers. */
val SlateBorder: Color get() = if (TorqueTheme.isDark) Color(0xFF262635) else Color(0xFFE2E8F0)

/** Primary text. */
val TextWhite: Color get() = if (TorqueTheme.isDark) Color(0xFFF5F6FA) else Color(0xFF0F172A)

/** Secondary text. */
val TextMuted: Color get() = if (TorqueTheme.isDark) Color(0xFF8E93A3) else Color(0xFF64748B)

/** Success / money-positive. */
val EmeraldGreen: Color get() = if (TorqueTheme.isDark) Color(0xFF22C55E) else Color(0xFF059669)

/** Warning / low stock. */
val AlertAmber: Color get() = if (TorqueTheme.isDark) Color(0xFFFBBF24) else Color(0xFFD97706)

/** TorqueERP brand accent (amber/gold). */
val AmberGold: Color get() = if (TorqueTheme.isDark) Color(0xFFF6A821) else Color(0xFFD97706)

val AmberGoldLight: Color get() = Color(0xFFFBBF24)

/** Danger / destructive. */
val DangerRed: Color get() = if (TorqueTheme.isDark) Color(0xFFF87171) else Color(0xFFDC2626)

/** Dark "ink" button surface — charcoal in dark mode, navy in light mode. */
val InkButton: Color get() = if (TorqueTheme.isDark) Color(0xFF23232F) else Color(0xFF0F172A)

/** Text/icon color placed on top of the amber accent. */
val OnAccent: Color get() = Color(0xFF141414)

/** Subtle success chip background. */
val ChipGreenBg: Color get() = if (TorqueTheme.isDark) Color(0xFF0E2B1D) else Color(0xFFD1FAE5)

/** Subtle warning chip background. */
val ChipAmberBg: Color get() = if (TorqueTheme.isDark) Color(0xFF2E230C) else Color(0xFFFEF3C7)

/** Subtle danger chip background. */
val ChipRedBg: Color get() = if (TorqueTheme.isDark) Color(0xFF2E1414) else Color(0xFFFEE2E2)

// Legacy aliases still referenced in a few places.
val REGold: Color get() = AmberGold
val REGoldLight: Color get() = AmberGoldLight
val RERed: Color get() = DangerRed
val REDark: Color get() = if (TorqueTheme.isDark) Color(0xFF16161E) else Color(0xFF0F172A)
val RECharcoal: Color get() = SlateCard
val REBorder: Color get() = SlateBorder

@Composable
fun TorqueERPTheme(content: @Composable () -> Unit) {
    val systemDark = isSystemInDarkTheme()
    TorqueTheme.isDark = when (TorqueTheme.mode) {
        "light" -> false
        "system" -> systemDark
        else -> true
    }

    val scheme = if (TorqueTheme.isDark) {
        darkColorScheme(
            primary = AmberGold,
            onPrimary = OnAccent,
            primaryContainer = AmberGold,
            background = SlateBackground,
            surface = SlateCard,
            surfaceVariant = SlateRaised,
            onBackground = TextWhite,
            onSurface = TextWhite,
            onSurfaceVariant = TextMuted,
            outline = SlateBorder,
            error = DangerRed
        )
    } else {
        lightColorScheme(
            primary = Color(0xFF0F172A),
            onPrimary = Color.White,
            primaryContainer = Color(0xFFD97706),
            background = SlateBackground,
            surface = SlateCard,
            surfaceVariant = SlateRaised,
            onBackground = TextWhite,
            onSurface = TextWhite,
            onSurfaceVariant = TextMuted,
            outline = SlateBorder,
            error = DangerRed
        )
    }

    MaterialTheme(
        colorScheme = scheme,
        content = content
    )
}
