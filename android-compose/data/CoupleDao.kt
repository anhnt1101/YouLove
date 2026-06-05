package com.youlove.app.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface CoupleDao {
    @Query("SELECT * FROM app_profile WHERE id = :id LIMIT 1")
    fun getProfileFlow(id: String = "current_user"): Flow<CoupleProfile?>

    @Query("SELECT * FROM app_profile WHERE id = :id LIMIT 1")
    suspend fun getProfileDirect(id: String = "current_user"): CoupleProfile?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(profile: CoupleProfile)

    @Update
    suspend fun update(profile: CoupleProfile)

    @Query("DELETE FROM app_profile WHERE id = :id")
    suspend fun deleteProfile(id: String = "current_user")
}
