package com.youlove.app.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.youlove.app.data.MenstrualCycle
import com.youlove.app.ui.viewmodel.CoupleViewModel
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

/**
 * Screen: Ghi nhận chu kỳ mới 🩸
 * Fully automated Date Range Selector with dynamic period calculation
 * and automatic cycle-length computation according to historical Database entries.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MenstrualCycleScreen(
    viewModel: CoupleViewModel,
    onBack: () -> Unit
) {
    val cycles by viewModel.cyclesState.collectAsState()
    
    // Calendar view states
    var currentMonthStart by remember { mutableStateOf(LocalDate.now().withDayOfMonth(1)) }
    
    // Period range states
    var selectedStartDate by remember { mutableStateOf<LocalDate?>(null) }
    var selectedEndDate by remember { mutableStateOf<LocalDate?>(null) }
    
    val formatter = remember { DateTimeFormatter.ofPattern("dd/MM/yyyy") }
    
    // Calculate menstrual period duration (Days count)
    val calculatedMenstrualDays = remember(selectedStartDate, selectedEndDate) {
        if (selectedStartDate != null && selectedEndDate != null) {
            (ChronoUnit.DAYS.between(selectedStartDate, selectedEndDate) + 1).toInt()
        } else if (selectedStartDate != null) {
            1
        } else {
            0
        }
    }
    
    // Calculate cycle length based on prior historical database records
    val calculatedCycleLength = remember(cycles, selectedStartDate) {
        if (selectedStartDate != null) {
            val start = selectedStartDate!!
            val priorCycle = cycles
                .filter { LocalDate.parse(it.startDate).isBefore(start) }
                .maxByOrNull { it.startDate }
            
            if (priorCycle != null) {
                ChronoUnit.DAYS.between(LocalDate.parse(priorCycle.startDate), start).toInt()
            } else {
                31 // Standard mockup example default or 31 days relative to last month
            }
        } else {
            31 // Mock/default indicator
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        text = "Ghi nhận chu kỳ mới 🩸",
                        fontWeight = FontWeight.Black,
                        color = Color(0xFFE91E63), // Pink red accent title
                        fontSize = 20.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Quay lại",
                            tint = Color(0xFFE91E63)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // STEP CARD: CALENDAR SELECTOR
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.Center
                ) {
                    Text(
                        text = "CHỌN NGÀY HÀNH KINH TRÊN LỊCH",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFE91E63).copy(alpha = 0.8f),
                        letterSpacing = 1.sp,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    
                    // Month slider header
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = { currentMonthStart = currentMonthStart.minusMonths(1) }) {
                            Icon(
                                imageVector = Icons.Default.KeyboardArrowLeft,
                                contentDescription = "Tháng trước",
                                tint = Color(0xFFE91E63)
                            )
                        }
                        
                        Text(
                            text = "Tháng ${currentMonthStart.monthValue.toString().padStart(2, '0')}, ${currentMonthStart.year}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Black,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        
                        IconButton(onClick = { currentMonthStart = currentMonthStart.plusMonths(1) }) {
                            Icon(
                                imageVector = Icons.Default.KeyboardArrowRight,
                                contentDescription = "Tháng sau",
                                tint = Color(0xFFE91E63)
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    // Days of week header line
                    val daysHeader = listOf("T2", "T3", "T4", "T5", "T6", "T7", "CN")
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        daysHeader.forEach { label ->
                            Text(
                                text = label,
                                modifier = Modifier.weight(1f),
                                textAlign = TextAlign.Center,
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                            )
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    // Dynamic Month Days Matrix calculation
                    val emptyPrefixCount = currentMonthStart.dayOfWeek.value - 1
                    val daysInMonth = currentMonthStart.lengthOfMonth()
                    val totalDaysList = List(emptyPrefixCount) { null } + List(daysInMonth) { currentMonthStart.plusDays(it.toLong()) }
                    val emptySuffixCount = (7 - (totalDaysList.size % 7)) % 7
                    val paddedDaysList = totalDaysList + List(emptySuffixCount) { null }
                    val weeksGrid = paddedDaysList.chunked(7)
                    
                    val today = LocalDate.now()
                    
                    weeksGrid.forEach { week ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceAround
                        ) {
                            week.forEach { date ->
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .aspectRatio(1f)
                                        .padding(vertical = 1.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (date != null) {
                                        val isStart = date == selectedStartDate
                                        val isEnd = date == selectedEndDate
                                        val isBetween = selectedStartDate != null && selectedEndDate != null &&
                                                date.isAfter(selectedStartDate) && date.isBefore(selectedEndDate)
                                        val isSelected = isStart || isEnd || isBetween
                                        
                                        // Shape and background configuration for range flow pill
                                        val rangeShape = when {
                                            isStart && isEnd -> CircleShape
                                            isStart -> RoundedCornerShape(topStart = 18.dp, bottomStart = 18.dp, topEnd = 0.dp, bottomEnd = 0.dp)
                                            isEnd -> RoundedCornerShape(topStart = 0.dp, bottomStart = 0.dp, topEnd = 18.dp, bottomEnd = 18.dp)
                                            isBetween -> RectangleShape
                                            else -> RectangleShape
                                        }
                                        
                                        val rangeBg = when {
                                            selectedEndDate == null -> Color.Transparent
                                            isStart || isEnd || isBetween -> Color(0xFFFF4081).copy(alpha = 0.16f)
                                            else -> Color.Transparent
                                        }
                                        
                                        if (isSelected) {
                                            Box(
                                                modifier = Modifier
                                                    .fillMaxSize()
                                                    .background(rangeBg, rangeShape)
                                            )
                                        }
                                        
                                        // Solid Circle background if endpoint
                                        val circleBgColor = if (isStart || isEnd) Color(0xFFE91E63) else Color.Transparent
                                        
                                        // Border highlights for actual physical current date
                                        val isActualToday = date == today
                                        val borderModifier = if (isActualToday && !isStart && !isEnd) {
                                            Modifier.border(1.5.dp, Color(0xFFE91E63), CircleShape)
                                        } else {
                                            Modifier
                                        }
                                        
                                        Box(
                                            modifier = Modifier
                                                .size(36.dp)
                                                .clip(CircleShape)
                                                .background(circleBgColor)
                                                .then(borderModifier)
                                                .clickable {
                                                    if (selectedStartDate == null || (selectedStartDate != null && selectedEndDate != null)) {
                                                        // First tap sets start point
                                                        selectedStartDate = date
                                                        selectedEndDate = null
                                                    } else {
                                                        // Second tap
                                                        if (date.isBefore(selectedStartDate!!)) {
                                                            selectedStartDate = date
                                                        } else {
                                                            selectedEndDate = date
                                                        }
                                                    }
                                                },
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text(
                                                text = date.dayOfMonth.toString(),
                                                style = MaterialTheme.typography.bodyMedium,
                                                fontWeight = if (isSelected || isActualToday) FontWeight.Bold else FontWeight.Normal,
                                                color = when {
                                                    isStart || isEnd -> Color.White
                                                    isBetween -> Color(0xFFE91E63)
                                                    isActualToday -> Color(0xFFE91E63)
                                                    else -> MaterialTheme.colorScheme.onSurface
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // DYNAMIC CALCULATIONS & METRICS PREVIEW CARD
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                border = BorderStroke(1.dp, Color(0xFFE91E63).copy(alpha = 0.15f)),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "KẾT QUẢ DỰ TÍNH TỰ ĐỘNG 🩸",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFFE91E63),
                        letterSpacing = 1.sp
                    )
                    
                    Divider(color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))
                    
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = "Ngày bắt đầu",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = selectedStartDate?.format(formatter) ?: "-- / -- / ----",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Bold,
                                color = if (selectedStartDate != null) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                            )
                        }
                        
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "Ngày kết thúc",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = selectedEndDate?.format(formatter) ?: "(Chờ chọn...)",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Bold,
                                color = if (selectedEndDate != null) MaterialTheme.colorScheme.onSurface else Color(0xFFE91E63).copy(alpha = 0.7f)
                            )
                        }
                    }
                    
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = "Số ngày hành kinh",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = if (calculatedMenstrualDays > 0) "$calculatedMenstrualDays ngày" else "-- ngày",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFFE91E63)
                                )
                            }
                        }
                        
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "Chu kỳ hiện tại",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = if (selectedStartDate != null) "$calculatedCycleLength ngày" else "-- ngày",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Black,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }

            // ACTION SAVE BUTTON
            Button(
                onClick = {
                    if (selectedStartDate != null && selectedEndDate != null) {
                        viewModel.saveMenstrualCycle(
                            startDateStr = selectedStartDate.toString(),
                            endDateStr = selectedEndDate.toString()
                        )
                        // Reset local selections and notify back navigation
                        selectedStartDate = null
                        selectedEndDate = null
                        onBack()
                    }
                },
                enabled = selectedStartDate != null && selectedEndDate != null,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(20.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFE91E63),
                    contentColor = Color.White,
                    disabledContainerColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f)
                ),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
            ) {
                Text(
                    text = "Lưu chu kỳ 💾",
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // HISTORICAL LOGS TITLE
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Nhật ký chu kỳ đã ghi nhận 🩸",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.onSurface
                )
                
                Badge(
                    containerColor = Color(0xFFE91E63).copy(alpha = 0.15f),
                    contentColor = Color(0xFFE91E63)
                ) {
                    Text(
                        text = "${cycles.size} lần",
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }
            
            if (cycles.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Chưa có lưu trữ lịch sử chu kỳ nào.\nHãy chọn ngày trên lịch và lưu lại.",
                        textAlign = TextAlign.Center,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                    )
                }
            } else {
                // List of historical recorded cycles (newest first)
                val orderedCycles = remember(cycles) {
                    cycles.sortedByDescending { it.startDate }
                }
                
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    orderedCycles.forEach { item ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f)
                            )
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text(
                                            text = LocalDate.parse(item.startDate).format(formatter),
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp
                                        )
                                        Text(
                                            text = "➡️",
                                            fontSize = 12.sp
                                        )
                                        Text(
                                            text = LocalDate.parse(item.endDate).format(formatter),
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp
                                        )
                                    }
                                    
                                    Spacer(modifier = Modifier.height(4.dp))
                                    
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "Kinh nguyệt: ${item.menstrualDays} ngày",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Color(0xFFE91E63),
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            text = "Chu kỳ: ${item.cycleLength} ngày",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.primary,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                                
                                IconButton(
                                    onClick = { viewModel.deleteMenstrualCycle(item) },
                                    colors = IconButtonDefaults.iconButtonColors(
                                        contentColor = MaterialTheme.colorScheme.error.copy(alpha = 0.8f)
                                    )
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Delete,
                                        contentDescription = "Xóa chu kỳ"
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
