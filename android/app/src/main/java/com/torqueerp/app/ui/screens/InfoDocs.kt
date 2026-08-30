package com.torqueerp.app.ui.screens

/**
 * Long-form Help, Support, Terms and Privacy text shown from Settings.
 *
 * Kept out of SettingsScreen so the screen stays readable, and structured as
 * sections rather than one string so the dialog can lay it out properly instead
 * of running paragraphs together.
 */
data class InfoSection(
    val heading: String,
    /** Free-flowing paragraphs, rendered before the bullets. */
    val body: List<String> = emptyList(),
    /** Bullet points. */
    val points: List<String> = emptyList()
)

data class InfoDoc(
    val title: String,
    val intro: String,
    val sections: List<InfoSection>,
    val footNote: String? = null
)

object InfoDocs {

    val help = InfoDoc(
        title = "❓ Help & FAQ",
        intro = "How the everyday jobs work. Each section follows the order you would actually do them at the counter.",
        sections = listOf(
            InfoSection(
                heading = "Selling at the counter",
                points = listOf(
                    "Tap SELL on the home screen to open the counter.",
                    "Scan a part label — it is identified and added to the cart automatically. Keep scanning to add more.",
                    "Or search by part number, name or barcode if the box is not to hand.",
                    "Enter the customer name, phone and vehicle number if you want them on the bill.",
                    "Pick the GST rate, then tap Complete Sale. Stock is reduced and the invoice is created."
                )
            ),
            InfoSection(
                heading = "Taking stock in",
                points = listOf(
                    "Tap PURCHASE on the home screen.",
                    "Scan labels one after another — the carton can be worked through without stopping.",
                    "Set the quantity for each line, then tap Complete Stock Entry.",
                    "Stock goes up and the movement is written to the audit ledger."
                )
            ),
            InfoSection(
                heading = "Adding a part that is not in the catalog",
                body = listOf(
                    "When a scanned part is unknown, a form opens with the part number, name, brand and MRP already read from the label. Check them and save — the part is matched instantly next time."
                ),
                points = listOf(
                    "Gallery — run the same recognition on a photo you already have, useful when a supplier sends a picture of a label.",
                    "Manual Add — type the part number, name and MRP yourself when a label will not scan at all.",
                    "Brand and selling price are optional. Selling price defaults to the MRP if you leave it blank."
                )
            ),
            InfoSection(
                heading = "Getting a better scan",
                points = listOf(
                    "Fill the green frame with the label — closer means larger characters for the camera.",
                    "Avoid glare. A reflection across the MRP line is the most common cause of a missed price.",
                    "Hold still for a moment. Several frames are merged, so brief stillness noticeably improves the result.",
                    "If the MRP field turns red and says \"check!\", the price could not be read cleanly — type it in before saving."
                )
            ),
            InfoSection(
                heading = "Invoices",
                points = listOf(
                    "Invoices are produced as PDFs: A4 and A5 for a regular printer, 80mm for a thermal roll.",
                    "The 80mm receipt has no fixed length, so a long bill keeps printing instead of being cut off.",
                    "The grand total is printed in a highlighted band, with the amount also written out in words."
                )
            ),
            InfoSection(
                heading = "Stock and reports",
                points = listOf(
                    "Stock shows current quantities and flags anything at or below its minimum.",
                    "The audit ledger records every movement — who changed what, and when.",
                    "Reports exports your catalog, stock ledger, sales, customers and suppliers to CSV."
                )
            )
        )
    )

    val support = InfoDoc(
        title = "✉️ Technical Support",
        intro = "Common problems and what to try first. If none of these match, email us and we will take a look.",
        sections = listOf(
            InfoSection(
                heading = "Email us",
                body = listOf("monusagar247@gmail.com"),
                points = listOf(
                    "Your business name, so we can find the account.",
                    "Whether it happened in this app or on the website.",
                    "The app version, shown on the website's Download page.",
                    "What you were doing, and what you expected instead.",
                    "A screenshot of the error if there was one."
                )
            ),
            InfoSection(
                heading = "\"Network error — could not reach the server\"",
                points = listOf(
                    "Check the phone has working internet by opening any website.",
                    "Open Settings → API Server Endpoint and confirm the address is right and ends with /api/v1/.",
                    "On shop Wi-Fi, try mobile data — some routers block outbound connections.",
                    "If it still fails, the server may be down. Email us with the time it started."
                )
            ),
            InfoSection(
                heading = "The scanner misses fields",
                points = listOf(
                    "Move closer so the label fills the frame, and tilt away from glare.",
                    "Hold steady for a second so several frames can be merged.",
                    "A red \"check!\" on MRP means the price was unclear — type it in.",
                    "Use Manual Add for a damaged or unreadable label."
                )
            ),
            InfoSection(
                heading = "Google sign-in problems",
                points = listOf(
                    "Make sure at least one Google account is added under the phone's Settings → Accounts.",
                    "On the website, do a hard reload and allow pop-ups.",
                    "If you deleted your account and signed in again, a fresh empty account is created — that is expected, the old data is gone."
                )
            ),
            InfoSection(
                heading = "Updating the app",
                points = listOf(
                    "Download the newest APK from the website's Download page and install it over the old one.",
                    "Nothing is lost — your data lives on the server, not on the phone."
                )
            )
        )
    )

    val terms = InfoDoc(
        title = "📄 Terms & Conditions",
        intro = "These terms cover your use of the Monu Sagar app, the website and the server behind them.",
        sections = listOf(
            InfoSection(
                heading = "Your account",
                points = listOf(
                    "Keep your password private — you are responsible for activity under your login.",
                    "Signing out ends every session on every device.",
                    "The account owner is responsible for what staff members do under the business account.",
                    "Do not share one login between people who should have separate access."
                )
            ),
            InfoSection(
                heading = "Your data belongs to you",
                body = listOf(
                    "Products, prices, customers, suppliers, invoices and stock history remain yours. They are not sold or shared with advertisers. Export to CSV any time, and delete everything permanently from Settings."
                )
            ),
            InfoSection(
                heading = "Acceptable use",
                points = listOf(
                    "Follow the law that applies to your business, including tax and consumer law.",
                    "Do not try to reach another business's records or test the server's security without permission.",
                    "Do not issue invoices that misstate what was sold or at what price."
                )
            ),
            InfoSection(
                heading = "Invoices and pricing accuracy",
                body = listOf(
                    "The app calculates totals from the figures you enter and the GST rate you pick, but it does not decide what is correct for your business. The GST rate, the GSTIN and every price remain your responsibility.",
                    "Label scanning is a convenience, not a guarantee. Always check a scanned price before saving it."
                )
            ),
            InfoSection(
                heading = "Availability and backups",
                body = listOf(
                    "We aim to keep the service running but cannot promise uninterrupted availability. Keep your own CSV exports of anything you cannot afford to lose."
                )
            ),
            InfoSection(
                heading = "Liability",
                body = listOf(
                    "The software is provided as it is. To the extent the law allows, we are not liable for lost profits, lost sales or lost data. Nothing here limits liability that cannot be limited by law."
                )
            )
        ),
        footNote = "Written in good faith to describe how the software behaves. Not legal advice — have a professional review it against the law that applies to your business."
    )

    val privacy = InfoDoc(
        title = "🔒 Privacy Policy",
        intro = "What this app collects, why, and what control you have. This describes what the software genuinely does.",
        sections = listOf(
            InfoSection(
                heading = "What is stored",
                points = listOf(
                    "Your name, email, and a password kept only as a bcrypt hash — never in readable form.",
                    "Your shop details: name, address, phone, GSTIN and invoice settings.",
                    "Your operational records: products, stock, purchases, sales, invoices, payments, customers and suppliers."
                )
            ),
            InfoSection(
                heading = "The camera and your photos",
                body = listOf(
                    "Camera permission is used to scan barcodes, QR codes and printed labels. Reading happens on your phone.",
                    "The photograph itself is never uploaded — only the text extracted from it, with any scanned code, is sent so the part can be matched against your catalog.",
                    "Gallery import uses the Android system picker, which gives the app access only to the single image you choose. It cannot see the rest of your gallery."
                )
            ),
            InfoSection(
                heading = "Signing in with Google",
                body = listOf(
                    "Google sends a signed identity token which the server verifies with Google. Only your Google account ID, email and display name are read from it.",
                    "An email address alone is never accepted as proof of identity. The app never sees your Google password and asks for no access to Gmail, Drive or contacts."
                )
            ),
            InfoSection(
                heading = "Where it is stored",
                body = listOf(
                    "Your records live on the Monu Sagar server this app is configured to use. The phone itself stores only your session token and a few preferences such as the theme and server address — signing out clears them."
                )
            ),
            InfoSection(
                heading = "Kept apart from other businesses",
                body = listOf(
                    "Every record carries the business that owns it, and every request is checked against the business you are signed in to. A request for another business's record is refused. Automated tests cover this and block a release if they fail."
                )
            ),
            InfoSection(
                heading = "Who it is shared with",
                points = listOf(
                    "Nobody for advertising. Your data is not sold.",
                    "The hosting provider, purely because the server runs there.",
                    "Google, only to verify your sign-in token is genuine.",
                    "Where a valid legal obligation requires it."
                )
            ),
            InfoSection(
                heading = "Your choices",
                points = listOf(
                    "Export everything to CSV from Reports, whenever you like.",
                    "Correct any record by editing it directly.",
                    "Delete your account and all its data permanently from Settings → Delete Account & Data.",
                    "Revoke camera or photo access in the phone's app settings — scanning stops, nothing else is affected."
                )
            )
        ),
        footNote = "Questions about privacy, export or deletion: monusagar247@gmail.com"
    )
}
