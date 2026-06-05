# Hướng Dẫn Tích Hợp Chức Năng Avatar & Background Editor Cho Jetpack Compose 👦👧🎨

Thư mục này chưa mã nguồn hoàn chỉnh (Production-ready), được viết bằng **Kotlin** hỗ trợ **Jetpack Compose** giúp bạn tích hợp tính năng tải, lưu ảnh đại diện (avatar) và hình nền cặp đôi (background wallpaper) với nguyên lý giữ nguyên ảnh gốc (không crop bẹt, không giảm chất lượng) và thực hiện zoom/pan trực quan giống hệt mạng xã hội Facebook.

---

## 1. Cấu Trúc Các File Khởi Tạo 📂

Các thành phần đã được dựng hoàn hảo trong thư mục hiện tại:
*   **`data/CoupleProfile.kt`**: Thực thể (Room Entity) lưu giữ thông tin hồ sơ chứa các trường toạ độ, tỷ lệ của cả Avatar, Đối tác và Hình nền.
*   **`data/CoupleDao.kt`**: Các câu lệnh truy cập dữ liệu (Room DAO) để thực hiện Flow cập nhật thời gian thực.
*   **`data/AppDatabase.kt`**: Cơ sở dữ liệu Android Room SQLite Singleton.
*   **`ui/components/GestureImage.kt`**: Component tùy biến nâng cao sử dụng `detectTransformGestures` hỗ trợ đa chạm zoom & drag mượt mà, render bằng Coil AsyncImage đảm bảo tỷ lệ gốc không bị sai lệch.
*   **`ui/screens/AvatarEditorScreen.kt`**: Màn hình thiết lập & xoay chỉnh ảnh Avatar trực quan của người dùng.
*   **`ui/screens/BackgroundPreviewScreen.kt`**: Màn hình xem trước hình nền với **Duo Real-time Simulators** mô phỏng chính xác khung hình trên Mobile (Phone) và Web (Desktop/Computer) khi người dùng di dời toạ độ.
*   **`ui/viewmodel/CoupleViewModel.kt`**: Bộ điều khiển trạng thái (ViewModel/UDF) lưu trữ dữ liệu sang Room qua Thread nền IO không gây lag UI chính.

---

## 2. Các Đóng Gói Thư Viện Cần Thiết (Build Gradle) 🛠️

Hãy thêm các dependencies sau vào file `build.gradle` (Module: app) để ứng dụng biên dịch tối ưu (Hỗ trợ Android 8.0 trở lên):

```groovy
dependencies {
    // Room Database
    def room_version = "2.6.1"
    implementation "androidx.room:room-runtime:$room_version"
    implementation "androidx.room:room-ktx:$room_version"
    annotationProcessor "androidx.room:room-compiler:$room_version"
    kapt "androidx.room:room-compiler:$room_version" // Hoặc ksp nếu sử dụng Kotlin Symbol Processing

    // Coil Image Loading (Hỗ trợ AsyncImage nạp URI gallery mượt mà)
    implementation "io.coil-kt:coil-compose:2.5.0"

    // Material 3 & M3 Icons
    implementation "androidx.compose.material3:material3:1.2.0"
    implementation "androidx.compose.material:material-icons-extended:1.6.1"

    // Jetpack Lifecycle & ViewModel
    implementation "androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0"
}
```

---

## 3. Cách Thức Tích Hợp Trên Jetpack Compose App 🚀

Sử dụng thư viện Navigation Compose, bạn có thể thiết lập điều hướng trực quan:

```kotlin
// MainActivity.kt
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.youlove.app.ui.screens.AvatarEditorScreen
import com.youlove.app.ui.screens.BackgroundPreviewScreen
import com.youlove.app.ui.viewmodel.CoupleViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val navController = rememberNavController()
            val coupleViewModel: CoupleViewModel = viewModel()

            NavHost(navController = navController, startDestination = "main_screen") {
                composable("main_screen") {
                    // Màn hình chính của bạn, hiển thị Avatar và Background nhận dạng từ database
                    MainLoveDashboard(
                        viewModel = coupleViewModel,
                        onGoToEditAvatar = { navController.navigate("edit_avatar") },
                        onGoToEditBackground = { navController.navigate("edit_background") }
                    )
                }
                composable("edit_avatar") {
                    AvatarEditorScreen(
                        viewModel = coupleViewModel,
                        onBack = { navController.popBackStack() }
                    )
                }
                composable("edit_background") {
                    BackgroundPreviewScreen(
                        viewModel = coupleViewModel,
                        onBack = { navController.popBackStack() }
                    )
                }
            }
        }
    }
}
```

---

## 4. Các Quy Chuẩn Đặc Biệt Được Tuân Thủ 🌟

1.  **Chống Biến Dạng / Bảo Toàn Ảnh:** Coil `AsyncImage` sử dụng `ContentScale.Fit` bảo đảm toàn vẹn chất lượng xuất điểm, phân dải tối đa của bức ảnh do máy ảnh điện thoại chụp.
2.  **Xem Trước Song Song Web & Mobile:** Bộ xem trước `BackgroundPreviewScreen` tạo dựng hai khung mô phỏng tự động đồng bộ hoá khi pan/zoom giúp người dùng có tầm nhìn bao quát của ảnh nền trên mọi thiết bị.
3.  **Tối Ưu Hoá Bộ Nhớ:** Chỉ toạ độ phân giải hiển thị được cập nhật vào Room, không thực hiện ghi đè hoặc tạo các bản sao vật lý của file ảnh gốc trong thiết bị, tiết kiệm dung lượng hoàn hảo.
