package com.youlove.app.ui.viewmodel

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.youlove.app.data.AppDatabase
import com.youlove.app.data.CoupleProfile
import com.youlove.app.data.MenstrualCycle
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class CoupleViewModel(application: Application) : AndroidViewModel(application) {

    private val coupleDao = AppDatabase.getDatabase(application).coupleDao()

    private val _profileState = MutableStateFlow<CoupleProfile?>(null)
    val profileState: StateFlow<CoupleProfile?> = _profileState.asStateFlow()

    private val _cyclesState = MutableStateFlow<List<MenstrualCycle>>(emptyList())
    val cyclesState: StateFlow<List<MenstrualCycle>> = _cyclesState.asStateFlow()

    private val _isLoadingState = MutableStateFlow(false)
    val isLoadingState: StateFlow<Boolean> = _isLoadingState.asStateFlow()

    // Temporary background selection state for previewing adjustments
    private val _draftBackgroundState = MutableStateFlow<String?>(null)
    val draftBackgroundState: StateFlow<String?> = _draftBackgroundState.asStateFlow()

    private val _draftBgScale = MutableStateFlow(1.0f)
    val draftBgScale: StateFlow<Float> = _draftBgScale.asStateFlow()

    private val _draftBgOffsetX = MutableStateFlow(0.0f)
    val draftBgOffsetX: StateFlow<Float> = _draftBgOffsetX.asStateFlow()

    private val _draftBgOffsetY = MutableStateFlow(0.0f)
    val draftBgOffsetY: StateFlow<Float> = _draftBgOffsetY.asStateFlow()

    init {
        // Automatically start listening to profile changes from Room database
        viewModelScope.launch {
            _isLoadingState.value = true
            coupleDao.getProfileFlow().collectLatest { profile ->
                if (profile == null) {
                    // Seed initial empty profile if none exists
                    val defaultProfile = CoupleProfile()
                    coupleDao.insertOrUpdate(defaultProfile)
                    _profileState.value = defaultProfile
                } else {
                    _profileState.value = profile
                    
                    // Keep draft states synced with DB if not editing
                    if (_draftBackgroundState.value == null) {
                        _draftBackgroundState.value = profile.backgroundUri
                        _draftBgScale.value = profile.backgroundScale
                        _draftBgOffsetX.value = profile.backgroundOffsetX
                        _draftBgOffsetY.value = profile.backgroundOffsetY
                    }
                }
                _isLoadingState.value = false
            }
        }

        // Collect menstrual cycles Flow
        viewModelScope.launch {
            coupleDao.getAllCyclesFlow().collectLatest { cycles ->
                _cyclesState.value = cycles
            }
        }
    }

    /**
     * Updates avatar properties and immediately saves to the database.
     * URI points directly to Selected Media Uri (original source - no crop, no resize)
     */
    fun updateAvatar(uri: Uri, scale: Float = 1.0f, offsetX: Float = 0.0f, offsetY: Float = 0.0f) {
        viewModelScope.launch(Dispatchers.IO) {
            val current = _profileState.value ?: CoupleProfile()
            val updated = current.copy(
                avatarUri = uri.toString(),
                avatarScale = scale,
                avatarOffsetX = offsetX,
                avatarOffsetY = offsetY
            )
            coupleDao.insertOrUpdate(updated)
        }
    }

    /**
     * Adjusts the live transform parameters of avatar.
     */
    fun adjustAvatarTransform(scale: Float, offsetX: Float, offsetY: Float) {
        viewModelScope.launch(Dispatchers.IO) {
            val current = _profileState.value ?: return@launch
            val updated = current.copy(
                avatarScale = scale,
                avatarOffsetX = offsetX,
                avatarOffsetY = offsetY
            )
            coupleDao.insertOrUpdate(updated)
        }
    }

    /**
     * Set a background URI to draft state first to allow the user to view in Preview Screen.
     */
    fun selectBackgroundDraft(uri: Uri) {
        _draftBackgroundState.value = uri.toString()
        _draftBgScale.value = 1.0f
        _draftBgOffsetX.value = 0.0f
        _draftBgOffsetY.value = 0.0f
    }

    /**
     * Live adjust background offsets and scale.
     */
    fun adjustBackgroundDraftTransform(scale: Float, offsetX: Float, offsetY: Float) {
        _draftBgScale.value = scale
        _draftBgOffsetX.value = offsetX
        _draftBgOffsetY.value = offsetY
    }

    /**
     * Persist the background configurations into Room.
     */
    fun saveBackgroundDraft() {
        viewModelScope.launch(Dispatchers.IO) {
            val current = _profileState.value ?: CoupleProfile()
            val updated = current.copy(
                backgroundUri = _draftBackgroundState.value,
                backgroundScale = _draftBgScale.value,
                backgroundOffsetX = _draftBgOffsetX.value,
                backgroundOffsetY = _draftBgOffsetY.value
            )
            coupleDao.insertOrUpdate(updated)
        }
    }

    /**
     * Cancel edits and restore back to stored database parameters.
     */
    fun resetBackgroundDraft() {
        val current = _profileState.value
        _draftBackgroundState.value = current?.backgroundUri
        _draftBgScale.value = current?.backgroundScale ?: 1.0f
        _draftBgOffsetX.value = current?.backgroundOffsetX ?: 0.0f
        _draftBgOffsetY.value = current?.backgroundOffsetY ?: 0.0f
    }

    /**
     * Inserts a new menstrual cycle into Room, automatically calculating
     * period length (menstrualDays) and cycle length based on prior history.
     */
    fun saveMenstrualCycle(startDateStr: String, endDateStr: String) {
        viewModelScope.launch(Dispatchers.IO) {
            val start = java.time.LocalDate.parse(startDateStr)
            val end = java.time.LocalDate.parse(endDateStr)
            val menstrualDays = (java.time.temporal.ChronoUnit.DAYS.between(start, end) + 1).toInt()
            
            // Get all existing cycles to find the closest previous one
            val existing = coupleDao.getAllCyclesDirect()
            val priorCycle = existing
                .filter { java.time.LocalDate.parse(it.startDate).isBefore(start) }
                .maxByOrNull { it.startDate }
                
            val cycleLength = if (priorCycle != null) {
                java.time.temporal.ChronoUnit.DAYS.between(java.time.LocalDate.parse(priorCycle.startDate), start).toInt()
            } else {
                28 // Default cycle length
            }
            
            val newCycle = MenstrualCycle(
                startDate = startDateStr,
                endDate = endDateStr,
                menstrualDays = menstrualDays,
                cycleLength = cycleLength
            )
            coupleDao.insertCycle(newCycle)
        }
    }

    /**
     * Deletes a menstrual cycle from Room
     */
    fun deleteMenstrualCycle(cycle: MenstrualCycle) {
        viewModelScope.launch(Dispatchers.IO) {
            coupleDao.deleteCycle(cycle)
        }
    }
}
