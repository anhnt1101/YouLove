package com.youlove.app.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.youlove.app.ui.components.GestureImage
import com.youlove.app.ui.viewmodel.CoupleViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BackgroundPreviewScreen(
    viewModel: CoupleViewModel,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val profile by viewModel.profileState.collectAsState()
    
    val bgUri by viewModel.draftBackgroundState.collectAsState()
    val bgScale by viewModel.draftBgScale.collectAsState()
    val bgOffsetX by viewModel.draftBgOffsetX.collectAsState()
    val bgOffsetY by viewModel.draftBgOffsetY.collectAsState()

    val pickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let { viewModel.selectBackgroundDraft(it) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        "Cài Đặt Hình Nền & Mô Phỏng 🎨", 
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    ) 
                },
                navigationIcon = {
                    IconButton(onClick = {
                        viewModel.resetBackgroundDraft()
                        onBack()
                    }) {
                        Icon(imageVector = Icons.Default.ArrowBack, contentDescription = "Trở lại")
                    }
                },
                actions = {
                    IconButton(
                        onClick = {
                            viewModel.saveBackgroundDraft()
                            onBack()
                        },
                        enabled = bgUri != null
                    ) {
                        Icon(
                            imageVector = Icons.Default.Check, 
                            contentDescription = "Áp dụng",
                            tint = if (bgUri != null) MaterialTheme.colorScheme.primary else Color.Gray
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
                .background(Color(0xFF121214)) // Elegant dark canvas background
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorAlignment,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            
            // MAIN EDITING IMMERSIVE PREVIEW CARD
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E22)),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.1f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "1. KHUNG THAO TÁC CĂN CHỈNH (DRAG & PINCH TO ZOOM)",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White.copy(alpha = 0.6f),
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(260.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color.Black)
                            .border(1.dp, Color.White.copy(alpha = 0.15f), RoundedCornerShape(16.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        if (bgUri != null) {
                            GestureImage(
                                imageUri = bgUri,
                                scale = bgScale,
                                offsetX = bgOffsetX,
                                offsetY = bgOffsetY,
                                onTransformChanged = { scale, x, y ->
                                    viewModel.adjustBackgroundDraftTransform(scale, x, y)
                                },
                                modifier = Modifier.fillMaxSize()
                            )
                        } else {
                            Column(
                                horizontalAlignment = Alignment.CenterHorAlignment,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Text(
                                    text = "Chưa thiết lập hình nền cá nhân",
                                    fontSize = 13.sp,
                                    color = Color.Gray,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(bottom = 12.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Button(
                            onClick = { pickerLauncher.launch("image/*") },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Thêm ảnh nền máy 📤", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }

                        IconButton(
                            onClick = { viewModel.adjustBackgroundDraftTransform(1.0f, 0.0f, 0.0f) },
                            enabled = bgUri != null
                        ) {
                            Icon(
                                imageVector = Icons.Default.Refresh, 
                                contentDescription = "Khôi phục",
                                tint = if (bgUri != null) Color.White else Color.Gray
                            )
                        }
                    }
                }
            }

            // DUAL PLATFORM PREVIEW SIMULATORS
            Text(
                text = "2. DUO SIMULATOR CẬP NHẬT THEO THỜI GIAN THỰC",
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
            )

            // SIMULATOR 1: ANDROID PHONE SCREEN (9:16 Profile Style)
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E22)),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.1f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "📱 PHIÊN BẢN ĐIỆN THOẠI ANDROID",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Green,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )

                    // Phone Frame aspect-ratio container
                    Box(
                        modifier = Modifier
                            .size(width = 180.dp, height = 320.dp)
                            .align(Alignment.CenterHorizontally)
                            .clip(RoundedCornerShape(24.dp))
                            .background(Color.Black)
                            .border(3.dp, Color.DarkGray, RoundedCornerShape(24.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        // Background simulator with exact transform coordinates
                        if (bgUri != null) {
                            AsyncImage(
                                model = ImageRequest.Builder(context).data(bgUri).build(),
                                contentDescription = null,
                                contentScale = ContentScale.Fit,
                                modifier = Modifier
                                    .fillMaxSize()
                                    .graphicsLayer(
                                        scaleX = bgScale,
                                        scaleY = bgScale,
                                        translationX = bgOffsetX * 0.4f, // scaled ratio for mini viewer
                                        translationY = bgOffsetY * 0.4f
                                    )
                            )
                        }

                        // App Overlay UI Simulator
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Black.copy(alpha = 0.45f))
                                .padding(12.dp)
                        ) {
                            // Header mockup
                            Column(
                                modifier = Modifier.fillMaxWidth().align(Alignment.TopCenter),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text("YOU LOVE", fontSize = 10.sp, color = Color.White.copy(alpha = 0.8f), fontWeight = FontWeight.Black)
                                Text("ĐANG YÊU", fontSize = 7.sp, color = Color.Pink, fontWeight = FontWeight.Bold)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("❤️ 243 Ngày", fontSize = 16.sp, color = Color.White, fontWeight = FontWeight.Black)
                            }

                            // Duo Avatars mockup
                            Row(
                                modifier = Modifier.fillMaxWidth().align(Alignment.Center),
                                horizontalArrangement = Arrangement.SpaceAround,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Male
                                Box(modifier = Modifier.size(24.dp).clip(CircleShape).border(1.dp, Color.Blue, CircleShape).background(Color.DarkGray))
                                // Heart bubble
                                Box(modifier = Modifier.size(14.dp).background(Color.White, CircleShape), contentAlignment = Alignment.Center) {
                                    Text("❤️", fontSize = 7.sp)
                                }
                                // Female
                                Box(modifier = Modifier.size(24.dp).clip(CircleShape).border(1.dp, Color.Magenta, CircleShape).background(Color.DarkGray))
                            }

                            // Footer timer block mock
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(28.dp)
                                    .align(Alignment.BottomCenter)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color.White.copy(alpha = 0.2f))
                                    .border(0.5.dp, Color.White.copy(alpha = 0.3f), RoundedCornerShape(8.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("Năm - Tháng - Tuần - Ngày", fontSize = 7.sp, color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // SIMULATOR 2: WEB/DESKTOP VIEWPORT (16:9 Landscape widescreen card)
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E22)),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.1f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "💻 PHIÊN BẢN GIAO DIỆN WEB/DESKTOP",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Cyan,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )

                    // Web layout Container Simulator
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color.Black)
                            .border(2.dp, Color.Gray, RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        if (bgUri != null) {
                            AsyncImage(
                                model = ImageRequest.Builder(context).data(bgUri).build(),
                                contentDescription = null,
                                contentScale = ContentScale.Fit,
                                modifier = Modifier
                                    .fillMaxSize()
                                    .graphicsLayer(
                                        scaleX = bgScale,
                                        scaleY = bgScale,
                                        translationX = bgOffsetX * 0.6f, // viewport ratio
                                        translationY = bgOffsetY * 0.6f
                                    )
                            )
                        }

                        // Web style card mock frame overlay
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(Color.Black.copy(alpha = 0.5f))
                                .padding(12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            // Centered Glassmorphic Love Card
                            Box(
                                modifier = Modifier
                                    .width(220.dp)
                                    .height(110.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color.White.copy(alpha = 0.15f))
                                    .border(1.dp, Color.White.copy(alpha = 0.25f), RoundedCornerShape(12.dp))
                                    .padding(8.dp)
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxSize()) {
                                    Text("You Love Web Dashboard", fontSize = 8.sp, color = Color.White, fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.height(4.dp))
                                    
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Box(modifier = Modifier.size(18.dp).clip(CircleShape).border(1.dp, Color.White, CircleShape))
                                            Text("Nam", fontSize = 6.sp, color = Color.White)
                                        }
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text("💕 Đã yêu", fontSize = 6.sp, color = Color.Pink)
                                            Text("243 ngày", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Black)
                                        }
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Box(modifier = Modifier.size(18.dp).clip(CircleShape).border(1.dp, Color.White, CircleShape))
                                            Text("Nữ", fontSize = 6.sp, color = Color.White)
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    
                                    // Custom visual layout row
                                    Row(
                                        modifier = Modifier.fillMaxWidth().height(14.dp).background(Color.White.copy(alpha = 0.1f), RoundedCornerShape(4.dp)),
                                        horizontalArrangement = Arrangement.SpaceAround,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text("Năm: 0", fontSize = 5.sp, color = Color.White)
                                        Text("Tháng: 7", fontSize = 5.sp, color = Color.White)
                                        Text("Tuần: 32", fontSize = 5.sp, color = Color.White)
                                        Text("Ngày lẻ: 23", fontSize = 5.sp, color = Color.White)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
