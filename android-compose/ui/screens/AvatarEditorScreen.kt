package com.youlove.app.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.youlove.app.ui.components.GestureImage
import com.youlove.app.ui.viewmodel.CoupleViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AvatarEditorScreen(
    viewModel: CoupleViewModel,
    onBack: () -> Unit
) {
    val profile by viewModel.profileState.collectAsState()
    
    // Manage temporary edit properties
    var editUri by remember { mutableStateOf<Uri?>(null) }
    var editScale by remember { mutableStateOf(1.0f) }
    var editOffsetX by remember { mutableStateOf(0.0f) }
    var editOffsetY by remember { mutableStateOf(0.0f) }

    // Sync state with Database values when loaded
    LaunchedEffect(profile) {
        profile?.let {
            if (editUri == null) {
                editUri = it.avatarUri?.let { uriStr -> Uri.parse(uriStr) }
                editScale = it.avatarScale
                editOffsetX = it.avatarOffsetX
                editOffsetY = it.avatarOffsetY
            }
        }
    }

    // Media registration picker launcher (100% preserves original, NO automated cropping or resizing)
    val pickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uriStr: Uri? ->
        uriStr?.let {
            editUri = it
            editScale = 1.0f
            editOffsetX = 0.0f
            editOffsetY = 0.0f
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        "Chỉnh Sửa Ảnh Đại Diện 👦👧", 
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    ) 
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Trở lại")
                    }
                },
                actions = {
                    IconButton(
                        onClick = {
                            editUri?.let {
                                viewModel.updateAvatar(it, editScale, editOffsetX, editOffsetY)
                            }
                            onBack()
                        },
                        enabled = editUri != null
                    ) {
                        Icon(
                            imageVector = Icons.Default.Check, 
                            contentDescription = "Lưu lại",
                            tint = if (editUri != null) MaterialTheme.colorScheme.primary else Color.Gray
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorAlignment,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorAlignment,
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "Hãy di chuyển và Zoom để căn chỉnh ảnh đại diện.",
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 32.dp)
                )

                // Circle Frame boundary
                Box(
                    modifier = Modifier
                        .size(240.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.1f))
                        .border(4.dp, MaterialTheme.colorScheme.primary, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    if (editUri != null) {
                        GestureImage(
                            imageUri = editUri.toString(),
                            scale = editScale,
                            offsetX = editOffsetX,
                            offsetY = editOffsetY,
                            onTransformChanged = { scale, x, y ->
                                editScale = scale
                                editOffsetX = x
                                editOffsetY = y
                            },
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        Text(
                            text = "Chưa có ảnh\nĐại diện",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            textAlign = TextAlign.Center
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = { pickerLauncher.launch("image/*") },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
                    modifier = Modifier.height(48.dp)
                ) {
                    Icon(imageVector = Icons.Default.Edit, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Chọn ảnh từ thư viện 📸", fontWeight = FontWeight.Black)
                }
            }

            // Quick instruction hints
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f)
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.Start
                ) {
                    Text(
                        text = "💡 Nguyên tắc bảo toàn ảnh gốc:",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(bottom = 4.dp)
                    )
                    Text(
                        text = "• Ảnh gốc luôn được giữ nguyên dung lượng và tỷ lệ, không bị tự động crop bẹt.\n• Ứng dụng chỉ lưu trữ tham số tỉ lệ (Scale) và toạ độ (Offset) của thao tác điều chỉnh.",
                        fontSize = 12.sp,
                        lineHeight = 16.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
