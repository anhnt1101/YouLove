package com.youlove.app.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "app_profile")
data class CoupleProfile(
    @PrimaryKey
    val id: String = "current_user",
    
    // Background wallpaper fields
    val backgroundUri: String? = null,
    val backgroundScale: Float = 1.0f,
    val backgroundOffsetX: Float = 0.0f,
    val backgroundOffsetY: Float = 0.0f,
    
    // Avatar fields
    val avatarUri: String? = null,
    val avatarScale: Float = 1.0f,
    val avatarOffsetX: Float = 0.0f,
    val avatarOffsetY: Float = 0.0f,
    
    // Partner avatar fields (to replicate You Love app dual avatar feature)
    val partnerAvatarUri: String? = null,
    val partnerAvatarScale: Float = 1.0f,
    val partnerAvatarOffsetX: Float = 0.0f,
    val partnerAvatarOffsetY: Float = 0.0f,
    
    // Other meta fields
    val maleName: String = "Nam",
    val femaleName: String = "Nữ",
    val loveDate: String = "2025-10-03"
)
