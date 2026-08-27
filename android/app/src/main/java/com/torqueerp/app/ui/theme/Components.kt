package com.torqueerp.app.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * TorqueERP shared design components — dark-first, JioSaavn-inspired density:
 * large touch rows, thin dividers, bold titles, one amber accent.
 */

@Composable
fun TorqueTopBar(
    title: String,
    onBack: (() -> Unit)? = null,
    trailing: @Composable RowScope.() -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (onBack != null) {
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .background(SlateRaised, CircleShape)
                    .clickable { onBack() },
                contentAlignment = Alignment.Center
            ) {
                Text("←", fontSize = 17.sp, color = TextWhite, fontWeight = FontWeight.Bold)
            }
            Spacer(modifier = Modifier.width(12.dp))
        }
        Text(
            title,
            fontSize = 22.sp,
            fontWeight = FontWeight.Black,
            color = TextWhite,
            modifier = Modifier.weight(1f)
        )
        trailing()
    }
}

/** Compact circular header action (42dp) — icon never wraps or clips. */
@Composable
fun TorqueHeaderAction(icon: String, accent: Boolean = false, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(42.dp)
            .background(if (accent) AmberGold else SlateRaised, CircleShape)
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Text(icon, fontSize = 17.sp, fontWeight = FontWeight.Black, color = if (accent) OnAccent else TextWhite)
    }
}

/**
 * Standard secondary-screen header: round back chip • single-line title •
 * compact circular actions. Long titles ellipsize — action buttons keep their
 * size and never squeeze into tall clipped rectangles.
 */
@Composable
fun TorqueScreenHeader(
    title: String,
    onBack: (() -> Unit)?,
    padded: Boolean = true,
    actions: @Composable RowScope.() -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = if (padded) 16.dp else 0.dp, vertical = if (padded) 12.dp else 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        if (onBack != null) {
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .background(SlateRaised, CircleShape)
                    .clickable { onBack() },
                contentAlignment = Alignment.Center
            ) {
                Text("←", fontSize = 17.sp, color = TextWhite, fontWeight = FontWeight.Bold)
            }
        }
        Text(
            title,
            fontSize = 20.sp,
            fontWeight = FontWeight.Black,
            color = TextWhite,
            maxLines = 1,
            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
        actions()
    }
}

@Composable
fun TorqueSectionHeader(title: String, modifier: Modifier = Modifier) {
    Text(
        title.uppercase(),
        fontSize = 11.sp,
        fontWeight = FontWeight.Black,
        color = TextMuted,
        letterSpacing = 1.2.sp,
        modifier = modifier.padding(top = 8.dp, bottom = 6.dp)
    )
}

/** Large settings-style row: icon • title • optional subtitle • chevron. */
@Composable
fun TorqueListRow(
    icon: String,
    title: String,
    subtitle: String? = null,
    titleColor: Color = TextWhite,
    trailing: String? = "›",
    onClick: (() -> Unit)? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .background(SlateRaised, RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text(icon, fontSize = 17.sp)
        }
        Spacer(modifier = Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = titleColor)
            if (subtitle != null) {
                Text(subtitle, fontSize = 12.sp, color = TextMuted, maxLines = 1)
            }
        }
        if (trailing != null) {
            Text(trailing, fontSize = 18.sp, color = TextMuted)
        }
    }
}

@Composable
fun TorqueDivider() {
    HorizontalDivider(color = SlateBorder, thickness = 0.7.dp)
}

/** Group container for rows: rounded dark surface with thin dividers inside. */
@Composable
fun TorqueGroup(content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(SlateCard, RoundedCornerShape(18.dp))
    ) {
        content()
    }
}

@Composable
fun TorquePrimaryButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(52.dp),
        shape = RoundedCornerShape(15.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = AmberGold,
            disabledContainerColor = SlateRaised
        )
    ) {
        Text(text, fontSize = 14.sp, fontWeight = FontWeight.Black, color = if (enabled) OnAccent else TextMuted)
    }
}

@Composable
fun TorqueSecondaryButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(52.dp),
        shape = RoundedCornerShape(15.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = InkButton,
            disabledContainerColor = SlateRaised
        )
    ) {
        Text(text, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = if (TorqueTheme.isDark || !enabled) TextWhite else Color.White)
    }
}

/** Compact KPI metric — value-forward, no heavy box. */
@Composable
fun TorqueMetric(
    label: String,
    value: String,
    valueColor: Color = TextWhite,
    sub: String? = null,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        Text(label, fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.SemiBold)
        Text(value, fontSize = 20.sp, fontWeight = FontWeight.Black, color = valueColor)
        if (sub != null) {
            Text(sub, fontSize = 10.sp, color = TextMuted)
        }
    }
}

@Composable
fun TorqueEmptyState(icon: String, title: String, subtitle: String? = null) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 36.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(icon, fontSize = 34.sp)
        Spacer(modifier = Modifier.height(8.dp))
        Text(title, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextWhite)
        if (subtitle != null) {
            Text(
                subtitle,
                fontSize = 12.sp,
                color = TextMuted,
                modifier = Modifier.padding(top = 4.dp, start = 24.dp, end = 24.dp)
            )
        }
    }
}

@Composable
fun TorqueStatusChip(text: String, tone: String = "success") {
    val (bg, fg) = when (tone) {
        "success" -> ChipGreenBg to EmeraldGreen
        "warning" -> ChipAmberBg to AlertAmber
        "danger" -> ChipRedBg to DangerRed
        else -> SlateRaised to TextMuted
    }
    Box(
        modifier = Modifier
            .background(bg, RoundedCornerShape(8.dp))
            .padding(horizontal = 8.dp, vertical = 3.dp)
    ) {
        Text(text, fontSize = 10.sp, fontWeight = FontWeight.Black, color = fg)
    }
}

/**
 * Quantity stepper: [−] [editable value] [+]. Minimum is always 1; the upper
 * bound is whatever the user types or taps up to.
 */
@Composable
fun TorqueQtyStepper(
    value: String,
    onValueChange: (String) -> Unit,
    label: String = "Quantity",
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        Text(label, fontSize = 11.sp, color = TextMuted, fontWeight = FontWeight.SemiBold)
        Spacer(modifier = Modifier.height(6.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(SlateRaised, RoundedCornerShape(14.dp))
                .padding(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(InkButton, RoundedCornerShape(11.dp))
                    .clickable {
                        val current = value.toIntOrNull() ?: 1
                        onValueChange(maxOf(1, current - 1).toString())
                    },
                contentAlignment = Alignment.Center
            ) {
                Text("−", fontSize = 22.sp, fontWeight = FontWeight.Black, color = if (TorqueTheme.isDark) TextWhite else Color.White)
            }
            androidx.compose.foundation.text.BasicTextField(
                value = value,
                onValueChange = { input ->
                    val digits = input.filter { it.isDigit() }.take(5)
                    onValueChange(digits)
                },
                singleLine = true,
                textStyle = androidx.compose.ui.text.TextStyle(
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Black,
                    color = TextWhite,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                ),
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                ),
                cursorBrush = androidx.compose.ui.graphics.SolidColor(AmberGold),
                modifier = Modifier.weight(1f)
            )
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(AmberGold, RoundedCornerShape(11.dp))
                    .clickable {
                        val current = value.toIntOrNull() ?: 0
                        onValueChange((current + 1).toString())
                    },
                contentAlignment = Alignment.Center
            ) {
                Text("+", fontSize = 22.sp, fontWeight = FontWeight.Black, color = OnAccent)
            }
        }
    }
}

/** Consistent OutlinedTextField colors for all screens. */
@Composable
fun torqueFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = TextWhite,
    unfocusedTextColor = TextWhite,
    focusedBorderColor = AmberGold,
    unfocusedBorderColor = SlateBorder,
    focusedContainerColor = SlateCard,
    unfocusedContainerColor = SlateCard,
    cursorColor = AmberGold,
    focusedLabelColor = AmberGold,
    unfocusedLabelColor = TextMuted
)
