package com.torqueerp.app.util

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import okhttp3.ResponseBody
import java.io.File

object FileSharing {

    // Writes a downloaded API stream (PDF invoice, CSV export) into the app's
    // cache and returns the file so it can be opened or shared.
    fun saveToCache(context: Context, body: ResponseBody, fileName: String): File {
        val dir = File(context.cacheDir, "exports").apply { mkdirs() }
        val file = File(dir, fileName)
        body.byteStream().use { input ->
            file.outputStream().use { output ->
                input.copyTo(output)
            }
        }
        return file
    }

    fun openOrShare(context: Context, file: File, mimeType: String) {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val viewIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, mimeType)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        val chooser = Intent.createChooser(shareIntent, file.name).apply {
            putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(viewIntent))
        }
        context.startActivity(chooser)
    }
}
