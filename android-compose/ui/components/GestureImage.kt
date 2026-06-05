package com.youlove.app.ui.components

import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest

/**
 * An interactive, highly responsive image component that allows the user
 * to pan (drag) and scale (pinch zoom) the image using multi-touch gestures.
 * Crucially, it displays the image via [ContentScale.Fit], meaning the original image
 * is *never* automatically cropped or compressed by the system.
 */
@Composable
fun GestureImage(
    imageUri: String?,
    scale: Float,
    offsetX: Float,
    offsetY: Float,
    onTransformChanged: (scale: Float, offsetX: Float, offsetY: Float) -> Unit,
    modifier: Modifier = Modifier,
    isEditable: Boolean = true,
    minScale: Float = 1.0f,
    maxScale: Float = 5.0f
) {
    var isLoading by remember { mutableStateOf(false) }
    val context = LocalContext.current

    Box(
        modifier = modifier
            .clipToBounds()
            .then(
                if (isEditable && imageUri != null) {
                    Modifier.pointerInput(Unit) {
                        detectTransformGestures(panZoomLock = true) { _, pan, zoom, _ ->
                            val newScale = (scale * zoom).coerceIn(minScale, maxScale)
                            
                            // Adjust drag offset to take current zoom into account
                            val newOffsetX = offsetX + pan.x
                            val newOffsetY = offsetY + pan.y
                            
                            onTransformChanged(newScale, newOffsetX, newOffsetY)
                        }
                    }
                } else Modifier
            ),
        contentAlignment = Alignment.Center
    ) {
        if (imageUri != null) {
            AsyncImage(
                model = ImageRequest.Builder(context)
                    .data(imageUri)
                    .crossfade(true)
                    .build(),
                contentDescription = "Gesture Image",
                contentScale = ContentScale.Fit, // Crucial: preserves the entire original image boundaries without auto-cropping
                onLoading = { isLoading = true },
                onSuccess = { isLoading = false },
                onError = { isLoading = false },
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer(
                        scaleX = scale,
                        scaleY = scale,
                        translationX = offsetX,
                        translationY = offsetY
                    )
            )
        }

        if (isLoading) {
            CircularProgressIndicator(
                color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.8f),
                strokeWidth = 2.dp
            )
        }
    }
}
