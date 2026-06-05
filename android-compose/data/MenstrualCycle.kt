package com.youlove.app.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "menstrual_cycle")
data class MenstrualCycle(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val startDate: String, // Format: YYYY-MM-DD
    val endDate: String,   // Format: YYYY-MM-DD
    val menstrualDays: Int, // Auto-calculated (endDate - startDate + 1)
    val cycleLength: Int   // Auto-calculated (current startDate - prior startDate)
)
