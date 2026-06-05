import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Heart,
  Calendar,
  Edit3,
  Camera,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  X,
  Info,
  RotateCw,
  Smile,
  AlertCircle,
  TrendingUp,
  Shield,
  Loader2,
  Copy,
  Check,
  Link,
  Palette
} from 'lucide-react';
import { CoupleUtils } from './utils/CoupleUtils';
import { MenstrualUtils, MenstrualCycle, DayStatus, DayStatusTranslation } from './utils/MenstrualUtils';
import { GeminiService, GeminiAnalysisResult } from './utils/GeminiService';
import { useCouple } from './hooks/useCouple';
import { GestureImageEditor } from './components/GestureImageEditor';
import { ScaledAvatar } from './components/ScaledAvatar';
import { Smartphone } from 'lucide-react';

// Interfaces for local React profiles matching Kotlin entity structures
interface CoupleProfile {
  id: number;
  maleName: string;
  femaleName: string;
  maleBirthday: string;
  femaleBirthday: string;
  maleAvatar: string | null; // base64 representation
  femaleAvatar: string | null; // base64 representation
  maleZodiac: string;
  femaleZodiac: string;
  loveDate: string;
  backgroundImage: string | null; // preset or base64 representation
  maleScale: number;
  maleOffsetX: number;
  maleOffsetY: number;
  femaleScale: number;
  femaleOffsetX: number;
  femaleOffsetY: number;
  bgScale: number;
  bgOffsetX: number;
  bgOffsetY: number;
  bgRotation: number;
}

// Default states mirroring Kotlin seeds
const INITIAL_PROFILE: CoupleProfile = {
  id: 1,
  maleName: "Bạn Nam",
  femaleName: "Bạn Nữ",
  maleBirthday: "2000-01-01",
  femaleBirthday: "2000-01-01",
  maleAvatar: null,
  femaleAvatar: null,
  maleZodiac: "Ma Kết",
  femaleZodiac: "Ma Kết",
  loveDate: "2026-01-01",
  backgroundImage: "preset_3",
  maleScale: 1.0,
  maleOffsetX: 0,
  maleOffsetY: 0,
  femaleScale: 1.0,
  femaleOffsetX: 0,
  femaleOffsetY: 0,
  bgScale: 1.0,
  bgOffsetX: 0,
  bgOffsetY: 0,
  bgRotation: 0
};

const INITIAL_CYCLES: MenstrualCycle[] = [
  {
    id: 1,
    startDate: "2026-06-01",
    cycleLength: 28,
    periodLength: 5,
    lhTestResult: "Không có",
    bbt: 36.6,
    cervicalMucus: "Bình thường"
  }
];

export default function App() {
  // -------------------------------------------------------------
  // STATES
  // -------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<'love' | 'menstrual'>('love');

  const [profile, setProfile] = useState<CoupleProfile>(() => {
    const saved = localStorage.getItem('youlove_couple_profile');
    return saved ? JSON.parse(saved) : INITIAL_PROFILE;
  });
  const [cycles, setCycles] = useState<MenstrualCycle[]>(() => {
    const saved = localStorage.getItem('youlove_menstrual_cycles');
    return saved ? JSON.parse(saved) : INITIAL_CYCLES;
  });

  // Self-repair: detect and automatically compress any oversized base64 images inside the profile state to respect Firestore 1MB limits.
  useEffect(() => {
    let isCancelled = false;
    const inspectAndCompress = async () => {
      let needsCompression = false;
      
      const maleAvatarLen = profile.maleAvatar?.length || 0;
      const femaleAvatarLen = profile.femaleAvatar?.length || 0;
      const bgImgLen = profile.backgroundImage?.length || 0;

      const shouldCompressMale = !!(profile.maleAvatar?.startsWith('data:image/') && maleAvatarLen > 150000);
      const shouldCompressFemale = !!(profile.femaleAvatar?.startsWith('data:image/') && femaleAvatarLen > 150000);
      const shouldCompressBg = !!(profile.backgroundImage?.startsWith('data:image/') && bgImgLen > 150000);

      if (shouldCompressMale || shouldCompressFemale || shouldCompressBg) {
        needsCompression = true;
      }

      if (needsCompression && !isCancelled) {
        const compressedProfile = { ...profile };
        if (shouldCompressMale && profile.maleAvatar) {
          compressedProfile.maleAvatar = await CoupleUtils.compressAndResizeImage(profile.maleAvatar, 1200, 1200, 0.75);
        }
        if (shouldCompressFemale && profile.femaleAvatar) {
          compressedProfile.femaleAvatar = await CoupleUtils.compressAndResizeImage(profile.femaleAvatar, 1200, 1200, 0.75);
        }
        if (shouldCompressBg && profile.backgroundImage) {
          compressedProfile.backgroundImage = await CoupleUtils.compressAndResizeImage(profile.backgroundImage, 1200, 1200, 0.75);
        }

        if (!isCancelled) {
          setProfile(compressedProfile);
        }
      }
    };

    inspectAndCompress();

    return () => {
      isCancelled = true;
    };
  }, [profile]);

  // Current system clock updating
  const [currentTime, setCurrentTime] = useState<string>('');

  // Dialog / Popup visibility
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);
  const [showWallpaperDialog, setShowWallpaperDialog] = useState(false);
  const [showMilestonesDialog, setShowMilestonesDialog] = useState(false);
  const [showLogCycleDialog, setShowLogCycleDialog] = useState(false);

  // Gesture Editor active state
  const [activeGestureEditor, setActiveGestureEditor] = useState<{
    type: 'avatar_male' | 'avatar_female' | 'background';
    imageUrl: string;
    initialScale?: number;
    initialOffsetX?: number;
    initialOffsetY?: number;
  } | null>(null);

  const handleSaveGestureCorrection = (scale: number, offsetX: number, offsetY: number) => {
    if (!activeGestureEditor || !editProfileDraft) return;
    
    setEditProfileDraft(prev => {
      if (!prev) return null;
      if (activeGestureEditor.type === 'avatar_male') {
        return {
          ...prev,
          maleAvatar: activeGestureEditor.imageUrl,
          maleScale: scale,
          maleOffsetX: offsetX,
          maleOffsetY: offsetY
        };
      } else if (activeGestureEditor.type === 'avatar_female') {
        return {
          ...prev,
          femaleAvatar: activeGestureEditor.imageUrl,
          femaleScale: scale,
          femaleOffsetX: offsetX,
          femaleOffsetY: offsetY
        };
      } else {
        return {
          ...prev,
          backgroundImage: activeGestureEditor.imageUrl,
          bgScale: scale,
          bgOffsetX: offsetX,
          bgOffsetY: offsetY
        };
      }
    });
    setActiveGestureEditor(null);
  };

  // State inside Edit Profile Dialog holding draft changes
  const [editProfileDraft, setEditProfileDraft] = useState<CoupleProfile | null>(null);

  // Calendar variables
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());
  const [calendarMode, setCalendarMode] = useState<'month' | 'year'>('month');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Cycle Logging fields
  const [logId, setLogId] = useState<number | null>(null);
  const [logStartDate, setLogStartDate] = useState('');
  const [logCycleLength, setLogCycleLength] = useState(28);
  const [logPeriodLength, setLogPeriodLength] = useState(5);
  const [logLhTest, setLogLhTest] = useState('Không có');
  const [logBbt, setLogBbt] = useState<number | string>('36.6');
  const [logMucus, setLogMucus] = useState('Bình thường');
  const [logError, setLogError] = useState<string | null>(null);

  // Gemini AI prediction integration state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiProgressText, setAiProgressText] = useState('');
  const [aiResult, setAiResult] = useState<GeminiAnalysisResult | null>(() => {
    const saved = localStorage.getItem('youlove_ai_result');
    return saved ? JSON.parse(saved) : null;
  });

  // Couple Sharing state & hook variables
  const lastSyncedRef = useRef<{ profile: any; cycles: any[]; aiResult: any | null } | null>(null);
  const [enteredJoinCode, setEnteredJoinCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Reactive subscription hook using our services
  const {
    coupleId,
    isCreating,
    isJoining,
    isSyncing,
    error: firebaseError,
    setError: setFirebaseError,
    createRoom,
    joinRoom,
    updateRoom,
    disconnectRoom,
    shareLink
  } = useCouple((data) => {
    lastSyncedRef.current = {
      profile: data.profile,
      cycles: data.cycles || [],
      aiResult: data.aiResult || null
    };
    if (data.profile) setProfile(data.profile);
    if (data.cycles) setCycles(data.cycles);
    if (data.aiResult !== undefined) setAiResult(data.aiResult);
  });

  // Save to localStorage whenever states change
  useEffect(() => {
    localStorage.setItem('youlove_couple_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('youlove_menstrual_cycles', JSON.stringify(cycles));
    setSelectedCalendarDate(null);
  }, [cycles]);

  useEffect(() => {
    if (aiResult) {
      localStorage.setItem('youlove_ai_result', JSON.stringify(aiResult));
    } else {
      localStorage.removeItem('youlove_ai_result');
    }
  }, [aiResult]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error("Unable to copy share link:", err);
      alert(`Sao chép link thất bại. Bạn có thể sao chép thủ công:\n${shareLink}`);
    }
  };

  const handleCopyCoupleId = async () => {
    if (!coupleId) return;
    try {
      await navigator.clipboard.writeText(coupleId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (err) {
      console.error("Unable to copy Room Code:", err);
      alert(`Sao chép mã thất bại. Bạn có thể sao chép thủ công:\n${coupleId}`);
    }
  };

  const handleCreateNewCouple = async () => {
    try {
      await createRoom({
        profile,
        cycles,
        aiResult: aiResult || null,
        settings: null
      });
    } catch (err: any) {
      console.error("Failed to create room: ", err);
    }
  };

  const handleJoinExistingCouple = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredJoinCode.trim()) {
      setFirebaseError("Vui lòng nhập mã phòng trước khi nhấn tham gia!");
      return;
    }
    try {
      await joinRoom(enteredJoinCode.trim());
      setEnteredJoinCode('');
    } catch (err: any) {
      console.error("Failed to join room: ", err);
    }
  };

  // Clock ticks
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hrs}:${mins}:${secs}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync edit states on edit triggers
  const openEditProfile = () => {
    setEditProfileDraft({ ...profile });
    setShowEditProfileDialog(true);
  };

  const openWallpaperEditor = () => {
    setEditProfileDraft({ ...profile });
    setShowWallpaperDialog(true);
  };

  const handleSaveProfile = () => {
    if (!editProfileDraft) return;
    const mZ = CoupleUtils.getZodiacSign(editProfileDraft.maleBirthday || "2000-01-01");
    const fZ = CoupleUtils.getZodiacSign(editProfileDraft.femaleBirthday || "2000-01-01");
    const updatedProfile = {
      ...editProfileDraft,
      maleZodiac: mZ,
      femaleZodiac: fZ
    };
    setProfile(updatedProfile);
    if (coupleId) {
      updateRoom({ profile: updatedProfile });
    }
    setShowEditProfileDialog(false);
    setShowWallpaperDialog(false);
  };

  const handleUploadDraftFile = (field: 'maleAvatar' | 'femaleAvatar' | 'backgroundImage', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Hình ảnh quá dung lượng lớn hơn 2MB. Vui lòng chọn ảnh nhẹ hơn để lưu giữ được tốt.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Str = reader.result as string;
        const width = 1200;
        const height = 1200;
        const compressed = await CoupleUtils.compressAndResizeImage(base64Str, width, height, 0.75);
        
        // Auto trigger full screen gesture editor for selected image
        const editorType = field === 'maleAvatar' ? 'avatar_male' : field === 'femaleAvatar' ? 'avatar_female' : 'background';
        setActiveGestureEditor({
          type: editorType,
          imageUrl: compressed,
          initialScale: 1.0,
          initialOffsetX: 0,
          initialOffsetY: 0
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // -------------------------------------------------------------
  // CALCULATIONS / DERIVED VALUES
  // -------------------------------------------------------------
  const loveDays = useMemo(() => {
    return CoupleUtils.countLoveDays(profile.loveDate);
  }, [profile.loveDate]);

  const loveBreakdown = useMemo(() => {
    return CoupleUtils.getLoveBreakdown(profile.loveDate);
  }, [profile.loveDate]);

  const maleAge = useMemo(() => CoupleUtils.calculateAge(profile.maleBirthday), [profile.maleBirthday]);
  const femaleAge = useMemo(() => CoupleUtils.calculateAge(profile.femaleBirthday), [profile.femaleBirthday]);

  const maleNextBirthdayCountdown = useMemo(() => {
    return CoupleUtils.daysToNextBirthday(profile.maleBirthday);
  }, [profile.maleBirthday]);

  const femaleNextBirthdayCountdown = useMemo(() => {
    return CoupleUtils.daysToNextBirthday(profile.femaleBirthday);
  }, [profile.femaleBirthday]);

  // Generate background style gradient / file
  const backgroundStyle = useMemo(() => {
    const bg = profile.backgroundImage;
    if (!bg) {
      // default peach pastel
      return { background: 'linear-gradient(135deg, #FF8DA1, #FFB5C5, #FFE5EC)' };
    }
    if (bg === 'preset_1') {
      return { background: 'linear-gradient(135deg, #8E2DE2, #4A00E0)' };
    }
    if (bg === 'preset_2') {
      return { background: 'linear-gradient(135deg, #FF9966, #FF5E62)' };
    }
    if (bg === 'preset_3') {
      return { background: 'linear-gradient(135deg, #CDB4DB, #FFC8DD, #FFA2B6)' };
    }
    // Base64 configuration with custom cropping offsets
    return {
      backgroundImage: `url(${bg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      transform: `scale(${profile.bgScale}) translate(${profile.bgOffsetX}px, ${profile.bgOffsetY}px) rotate(${profile.bgRotation}deg)`,
      transformOrigin: 'center center'
    };
  }, [profile.backgroundImage, profile.bgScale, profile.bgOffsetX, profile.bgOffsetY, profile.bgRotation]);

  // Menstrual cycle calendars and analytics
  const menstrualStats = useMemo(() => {
    return MenstrualUtils.calculateMenstrualFormula(cycles);
  }, [cycles]);

  const cycleMap = useMemo(() => {
    return MenstrualUtils.getCombinedCycleEvents(cycles, 24);
  }, [cycles]);

  // Dynamic status of today's menstrual cycle
  const currentCycleStatus = useMemo(() => {
    if (cycles.length === 0) return { title: 'Bình thường', description: 'Chưa có dữ liệu chu kỳ' };
    const todayStr = CoupleUtils.formatDate(new Date());
    const status = cycleMap[todayStr] || 'NONE';

    if (status === 'PERIOD') {
      return {
        title: 'Đang trong kỳ kinh',
        color: 'text-rose-600 bg-rose-50 border-rose-200',
        description: 'Uống nhiều nước ấm, chườm ấm và nghỉ ngơi nhé ❤️'
      };
    }
    if (status === 'UPCOMING') {
      return {
        title: 'Kỳ kinh dự kiến cận kề',
        color: 'text-pink-600 bg-pink-50 border-pink-200',
        description: 'Hãy chuẩn bị sẵn đồ dùng cá nhân cần thiết nhé'
      };
    }
    if (status === 'FERTILE') {
      return {
        title: 'Cửa sổ thụ thai (Màu mỡ)',
        color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
        description: 'Thời điểm khả năng thụ thai tự nhiên cao'
      };
    }
    if (status === 'OVULATION') {
      return {
        title: 'Ngày rụng trứng rực rỡ',
        color: 'text-purple-650 bg-purple-50 border-purple-200',
        description: 'Khả năng thụ thai đạt đỉnh điểm hôm nay ✨'
      };
    }
    if (status === 'SAFE') {
      return {
        title: 'Ngày an toàn tự nhiên',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        description: 'Thời điểm tránh thai tự nhiên tương đối tốt'
      };
    }
    return {
      title: 'Trạng thái bình ổn',
      color: 'text-text-secondary bg-background-alt border-border-color',
      description: 'Chỉ số sức khỏe đang ở mức bình thường'
    };
  }, [cycles, cycleMap]);

  // Computes the timeline milestones chronologically
  const calculatedMilestones = useMemo(() => {
    const list: Array<{ title: string; date: Date; daysRemaining: number; dateStr: string }> = [];
    const love = CoupleUtils.parseDate(profile.loveDate) || new Date();
    const maleBirth = CoupleUtils.parseDate(profile.maleBirthday) || new Date(2000, 0, 1);
    const femaleBirth = CoupleUtils.parseDate(profile.femaleBirthday) || new Date(2000, 0, 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Standard days milestone
    const milestonesDays = [100, 200, 300, 500, 1000, 1500, 2000, 3000];
    milestonesDays.forEach(days => {
      const target = new Date(love);
      target.setDate(target.getDate() + days);
      const diffTime = target.getTime() - today.getTime();
      const diff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      list.push({
        title: `${days} Ngày Bên Nhau ❤️`,
        date: target,
        daysRemaining: diff,
        dateStr: CoupleUtils.formatDate(target)
      });
    });

    // Standard years milestones
    const milestoneYears = [1, 2, 3, 5, 7, 10, 15];
    milestoneYears.forEach(yr => {
      const target = new Date(love);
      target.setFullYear(target.getFullYear() + yr);
      const diffTime = target.getTime() - today.getTime();
      const diff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      list.push({
        title: `${yr} Năm Kỷ Niệm Ngày Yêu 💍`,
        date: target,
        daysRemaining: diff,
        dateStr: CoupleUtils.formatDate(target)
      });
    });

    // Birthday count
    let nextMale = new Date(today.getFullYear(), maleBirth.getMonth(), maleBirth.getDate());
    if (nextMale < today) nextMale.setFullYear(today.getFullYear() + 1);
    const maleDiff = Math.ceil((nextMale.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    list.push({
      title: `Sinh nhật ${profile.maleName} 🎉`,
      date: nextMale,
      daysRemaining: maleDiff,
      dateStr: CoupleUtils.formatDate(nextMale)
    });

    let nextFemale = new Date(today.getFullYear(), femaleBirth.getMonth(), femaleBirth.getDate());
    if (nextFemale < today) nextFemale.setFullYear(today.getFullYear() + 1);
    const femaleDiff = Math.ceil((nextFemale.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    list.push({
      title: `Sinh nhật ${profile.femaleName} 🎂`,
      date: nextFemale,
      daysRemaining: femaleDiff,
      dateStr: CoupleUtils.formatDate(nextFemale)
    });

    // Sort chronologically
    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [profile]);

  // Find nearest upcoming milestone
  const nearestMilestoneIndex = useMemo(() => {
    return calculatedMilestones.findIndex(m => m.daysRemaining >= 0);
  }, [calculatedMilestones]);

  // Scroll to nearest milestone when the dialog is opened
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (showMilestonesDialog) {
      timer = setTimeout(() => {
        const targetElement = document.getElementById(`milestone-item-${nearestMilestoneIndex}`);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [showMilestonesDialog, nearestMilestoneIndex]);

  // Handle avatar & background image uploads
  const handleUploadFile = (field: 'maleAvatar' | 'femaleAvatar' | 'backgroundImage', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Hình ảnh quá dung lượng lớn hơn 2MB. Vui lòng chọn ảnh nhẹ hơn để lưu giữ được tốt.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Str = reader.result as string;
        const width = 1200;
        const height = 1200;
        const compressed = await CoupleUtils.compressAndResizeImage(base64Str, width, height, 0.75);
        
        // Copy profile to draft so editing is seamless
        const draft = { ...profile };
        draft[field] = compressed;
        
        // Reset scale/offset coordinates for this specific newly uploaded image
        if (field === 'maleAvatar') {
          draft.maleScale = 1.0;
          draft.maleOffsetX = 0;
          draft.maleOffsetY = 0;
        } else if (field === 'femaleAvatar') {
          draft.femaleScale = 1.0;
          draft.femaleOffsetX = 0;
          draft.femaleOffsetY = 0;
        } else if (field === 'backgroundImage') {
          draft.bgScale = 1.0;
          draft.bgOffsetX = 0;
          draft.bgOffsetY = 0;
        }
        
        setEditProfileDraft(draft);
        setShowEditProfileDialog(true);
        
        const editorType = field === 'maleAvatar' ? 'avatar_male' : field === 'femaleAvatar' ? 'avatar_female' : 'background';
        setActiveGestureEditor({
          type: editorType,
          imageUrl: compressed,
          initialScale: 1.0,
          initialOffsetX: 0,
          initialOffsetY: 0
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // -------------------------------------------------------------
  // MENSTRUAL ACTIONS
  // -------------------------------------------------------------
  const openLogCycle = (existing?: MenstrualCycle) => {
    if (existing) {
      setLogId(existing.id || null);
      setLogStartDate(existing.startDate);
      setLogCycleLength(existing.cycleLength);
      setLogPeriodLength(existing.periodLength);
      setLogLhTest(existing.lhTestResult || 'Không có');
      setLogBbt(existing.bbt || '36.6');
      setLogMucus(existing.cervicalMucus || 'Bình thường');
    } else {
      setLogId(null);
      // Auto prefill today
      setLogStartDate(CoupleUtils.formatDate(new Date()));
      setLogCycleLength(28);
      setLogPeriodLength(5);
      setLogLhTest('Không có');
      setLogBbt('36.6');
      setLogMucus('Bình thường');
    }
    setLogError(null);
    setShowLogCycleDialog(true);
  };

  const handleSaveCycle = () => {
    if (!logStartDate) {
      setLogError("Ngày bắt đầu không được bỏ trống.");
      return;
    }
    const parsed = CoupleUtils.parseDate(logStartDate);
    if (!parsed) {
      setLogError("Phần định dạng ngày không phù hợp.");
      return;
    }
    if (parsed > new Date()) {
      setLogError("Không cho phép ghi nhận ngày tương lai.");
      return;
    }
    if (logCycleLength < 21 || logCycleLength > 40) {
      setLogError("Độ chu kỳ bình thường phải dao động từ 21 tới 40 ngày.");
      return;
    }
    if (logPeriodLength < 2 || logPeriodLength > 10) {
      setLogError("Kỳ hành kinh lý tưởng nên nằm trong tầm 2 đến 10 ngày.");
      return;
    }

    const item: MenstrualCycle = {
      id: logId || Date.now(),
      startDate: logStartDate,
      cycleLength: logCycleLength,
      periodLength: logPeriodLength,
      lhTestResult: logLhTest,
      bbt: isNaN(Number(logBbt)) ? null : Number(logBbt),
      cervicalMucus: logMucus
    };

    const logIdValue = logId;
    setCycles(prev => {
      let updated: MenstrualCycle[];
      if (logIdValue) {
        // Edit mode
        updated = prev.map(c => c.id === logIdValue ? item : c);
      } else {
        // Add mode
        // Remove default seed if user logs custom list
        let list = [...prev];
        if (list.length === 1 && list[0].startDate === "2026-06-01" && list[0].cycleLength === 28) {
          list = [];
        }
        updated = [...list, item];
      }
      if (coupleId) {
        updateRoom({ cycles: updated });
      }
      return updated;
    });

    setShowLogCycleDialog(false);
  };

  const handleDeleteCycle = (id: number) => {
    if (confirm("Chắc chắn muốn xóa ghi nhận ngày chu kỳ này?")) {
      setCycles(prev => {
        const updated = prev.filter(c => c.id !== id);
        if (coupleId) {
          updateRoom({ cycles: updated });
        }
        return updated;
      });
    }
  };

  // -------------------------------------------------------------
  // GEMINI SECURE METHOD
  // -------------------------------------------------------------
  const handleTriggerAiAnalysis = async () => {
    if (cycles.length === 0) {
      alert("Cần có ít nhất 1 chu kỳ thực tế trong cơ sở dữ liệu để AI phân tích.");
      return;
    }
    setIsAiLoading(true);
    setAiError(null);
    setAiProgressText("Đang tổng hợp các chu kỳ...");

    try {
      const activeStartDates = cycles.map(c => c.startDate);
      const activeLengths = cycles.map(c => c.cycleLength);

      setTimeout(() => setAiProgressText("Đang kết nối cổng dự đoán y tế bảo mật..."), 1000);
      setTimeout(() => setAiProgressText("Gemini đang phân tích tần số dao động..."), 2200);

      const result = await GeminiService.analyzeMenstrualCycle(
        femaleAge,
        activeStartDates,
        activeLengths
      );

      setAiResult(result);
      if (coupleId) {
        updateRoom({ aiResult: result });
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Lỗi gọi AI phân tích chu kỳ.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Calendar Day generator based on monthly view
  const monthDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0 is Sun, 1 is Mon...

    // Total days in active month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Total days in previous month for offset padding
    const prevTotalDays = new Date(year, month, 0).getDate();

    const grid: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

    // Pre-pad with previous month
    for (let i = startOffset - 1; i >= 0; i--) {
      const dNum = prevTotalDays - i;
      const d = new Date(year, month - 1, dNum);
      grid.push({
        dateStr: CoupleUtils.formatDate(d),
        dayNum: dNum,
        isCurrentMonth: false
      });
    }

    // Fill current month
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      grid.push({
        dateStr: CoupleUtils.formatDate(d),
        dayNum: i,
        isCurrentMonth: true
      });
    }

    // Post-pad to make multiples of 7 grids
    const totalFilled = grid.length;
    const remaining = 42 - totalFilled; // standard 6-row layout
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      grid.push({
        dateStr: CoupleUtils.formatDate(d),
        dayNum: i,
        isCurrentMonth: false
      });
    }

    return grid;
  }, [calendarDate]);

  // Color mapper helper based on status codes
  const getDayStatusClass = (status: DayStatus, isToday: boolean, isSelected: boolean) => {
    let classes = 'transition-transform duration-200 cursor-pointer hover:scale-105 select-none ';

    if (isSelected) {
      classes += 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-white scale-110 ';
    }

    if (status === 'PERIOD') {
      classes += 'bg-red-500 text-white shadow-[0_4px_12px_rgba(239,68,68,0.2)] font-bold';
    } else if (status === 'UPCOMING') {
      classes += 'bg-rose-100/90 text-rose-700 border border-dashed border-rose-300';
    } else if (status === 'FERTILE') {
      classes += 'bg-indigo-100 text-indigo-800 font-medium pulse-fertile border border-indigo-200';
    } else if (status === 'OVULATION') {
      classes += 'bg-purple-150 text-purple-800 font-bold ring-2 ring-purple-205';
    } else if (status === 'SAFE') {
      classes += 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    } else {
      classes += 'bg-white border border-pink-100/50 text-text-primary hover:bg-surface-hover';
    }

    if (isToday && status !== 'PERIOD') {
      classes += ' ring-2 ring-primary ring-offset-1';
    }

    return classes;
  };

  // Calendar Day Click Detail lookup
  const activeSelectedDayDetail = useMemo(() => {
    if (!selectedCalendarDate) return null;
    const status = cycleMap[selectedCalendarDate] || 'NONE';
    const log = cycles.find(c => c.startDate === selectedCalendarDate);
    return {
      date: selectedCalendarDate,
      status,
      log
    };
  }, [selectedCalendarDate, cycleMap, cycles]);

  return (
    <div id="app-container" className="flex-1 flex flex-col bg-background-app overflow-x-hidden min-h-screen text-text-primary">

      {/* BACKGROUND DECORATOR WRAPPER FOR IMMERSIVE APPS */}
      {activeTab === 'love' && (
        <div
          id="immersive-app-background"
          className="fixed inset-0 pointer-events-none transition-all duration-700 select-none z-0 overflow-hidden"
          style={backgroundStyle}
        />
      )}

      {/* HEADER SECTION */}
      <header id="app-header" className="relative z-10 w-full bg-surface/60 backdrop-blur-md border-b border-border-color p-4 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-tr from-primary to-secondary rounded-xl shadow-lg">
              <Heart className="w-6 h-6 text-white fill-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black bg-gradient-to-r from-primary via-[#FFA4B4] to-[#B39DFF] bg-clip-text text-transparent tracking-tight">YOU LOVE</h1>
              <p className="text-[10px] text-text-secondary uppercase tracking-widest font-semibold flex items-center gap-1">
                <span>{coupleId ? "Đã kết nối ❤️" : "Chưa kết nối 💔"}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${coupleId ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
              </p>
            </div>
          </div>

          {/* Combined Time and Room Status */}
          <div className="flex items-center gap-2.5">
            {/* Room connection status widget */}
            {isCreating || isJoining || isSyncing ? (
              <div className="bg-surface border border-border-color rounded-full py-1.5 px-4 flex items-center gap-1.5 text-xs text-text-secondary shadow-md">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span className="hidden xs:inline">Đang kết nối...</span>
              </div>
            ) : coupleId ? (
              <div className="flex items-center gap-2 bg-surface border border-border-color rounded-full pl-3 pr-2 py-1 text-xs text-text-primary shadow-sm animate-fade-in">
                <Smile className="w-4 h-4 text-primary animate-pulse" />
                <span
                  onClick={handleCopyCoupleId}
                  className="cursor-pointer hover:text-primary font-mono font-bold select-all text-primary-hover"
                  title="Mã phòng - Click để sao chép"
                >
                  {coupleId}
                </span>
                <button
                  onClick={handleCopyCoupleId}
                  className="text-text-secondary hover:text-primary p-1 rounded-full hover:bg-surface-hover transition-colors"
                  title="Sao chép mã phòng"
                >
                  {copiedId ? <Check className="w-3" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <span className="text-border-color">|</span>
                <button
                  onClick={handleCopyLink}
                  className="text-text-secondary hover:text-primary p-1 rounded-full hover:bg-surface-hover transition-colors"
                  title="Sao chép link mời ghép đôi"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Link className="w-3.5 h-3.5" />}
                </button>
                <span className="text-border-color">|</span>
                <button
                  onClick={() => {
                    if (confirm("Bạn có tin chắc muốn rời không gian chia sẻ này? Dữ liệu của bạn vẫn an toàn trên đám mây!")) {
                      disconnectRoom();
                    }
                  }}
                  className="bg-red-100 hover:bg-red-200 border border-red-200 text-red-650 font-semibold px-2.5 py-1 rounded-full text-[10px] transition-colors"
                >
                  Rời phòng
                </button>
              </div>
            ) : (
              <div className="bg-amber-100 border border-amber-300 rounded-full py-1.5 px-3 text-xs font-semibold text-amber-650 shadow-sm">
                Ngoại Tuyến
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT SCROLL CONTAINER */}
      <main id="app-main" className="flex-1 overflow-y-auto relative z-10 w-full max-w-4xl mx-auto px-4 py-6 pb-28">

        {/* Syncing Progress Banner */}
        {isSyncing && (
          <div className="mb-6 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-4 text-xs text-indigo-300 max-w-2xl mx-auto flex items-center justify-center gap-3 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span className="font-bold">Đang đồng bộ cuộc sống tình yêu của bạn từ Firestore...</span>
          </div>
        )}

        {/* Firebase Error Notification */}
        {firebaseError && (
          <div className="mb-6 bg-red-500/15 border border-red-500/30 rounded-3xl p-5 text-xs text-red-350 max-w-2xl mx-auto flex items-start gap-3 relative animate-shake">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div className="space-y-1.5 flex-1 select-text">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-red-300 text-sm">Lỗi Hệ thống Chia sẻ ⚙️</span>
                <button
                  onClick={() => setFirebaseError(null)}
                  className="p-1 hover:bg-red-500/10 text-red-400 hover:text-red-200 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="leading-relaxed font-semibold">
                {(() => {
                  if (!firebaseError) return "";
                  try {
                    const parsed = JSON.parse(firebaseError);
                    if (parsed && typeof parsed === 'object') {
                      const msg = parsed.error || "";
                      const lowerMsg = msg.toLowerCase();
                      if (lowerMsg.includes("resource-exhausted") || lowerMsg.includes("quota") || lowerMsg.includes("limit exceeded")) {
                        return (
                          <span>
                            Dịch vụ đám mây (Firestore) của phòng chia sẻ hiện đang tạm thời đạt giới hạn hoặc hết lượt ghi miễn phí trong ngày (Quota Limit Exceeded). <strong className="text-pink-400">Hai bạn đừng lo lắng!</strong> Tất cả dữ liệu chu kỳ sinh lý, đếm ngày yêu và ảnh của hai bạn vẫn được lưu giữ an toàn tuyệt đối trên trình duyệt thiết bị. Hai bạn vẫn có thể sử dụng tất cả tính năng, viết nhật ký, đổi avatar, chỉnh nền bình thường ngoại tuyến. Hệ thống sẽ tự động đồng bộ lại lên đám mây khi giới hạn được làm mới (vào ngày mai), hoặc bạn có thể kiểm tra/nâng cấp gói tại: <a href="https://console.firebase.google.com/project/gen-lang-client-0633876285/firestore/databases/ai-studio-78915f4b-a497-41e5-b50a-3a113f8e6256/data?openUpgradeDialog=true" target="_blank" rel="noopener noreferrer" className="underline text-rose-300 font-bold hover:text-rose-200">Firebase Console</a>.
                          </span>
                        );
                      }
                      if (msg.includes("Missing or insufficient permissions") || msg.includes("permission-denied")) {
                        return "Bạn không có quyền truy cập hoặc chỉnh sửa phòng này. Có thể mã phòng không hợp lệ hoặc đã hết hạn truy cập.";
                      }
                      if (msg.includes("Failed to get document because the client is offline") || msg.includes("offline")) {
                        return "Kết nối mạng không ổn định hoặc lỗi dịch vụ ngoại tuyến. Hệ thống đã tự động chuyển sang chế độ Lưu cục bộ (Offline Local Mode) để bảo vệ dữ liệu thương yêu của bạn.";
                      }
                      return msg;
                    }
                  } catch (e) { }

                  const lowerError = firebaseError.toLowerCase();
                  if (lowerError.includes("resource-exhausted") || lowerError.includes("quota") || lowerError.includes("limit exceeded")) {
                    return (
                      <span>
                        Dịch vụ đám mây (Firestore) của phòng chia sẻ hiện đang tạm thời đạt giới hạn lượt ghi trong ngày. <strong className="text-pink-400 font-black">Mọi dữ liệu của bạn vẫn hoạt động và lưu trữ thành công trên thiết bị!</strong> Bạn vẫn có thể tiếp tục sử dụng tất cả tính năng, cập nhật chu kỳ sinh lý và chỉnh ảnh bình thường. Hệ thống sẽ kết nối đồng bộ đám mây trở lại khi giới hạn được thiết lập lại tự động vào ngày mai, hoặc bạn có thể theo dõi tại: <a href="https://console.firebase.google.com/project/gen-lang-client-0633876285/firestore/databases/ai-studio-78915f4b-a497-41e5-b50a-3a113f8e6256/data?openUpgradeDialog=true" target="_blank" rel="noopener noreferrer" className="underline text-rose-300 font-black hover:text-rose-200">Firebase Console</a>.
                      </span>
                    );
                  }
                  if (firebaseError.includes("insufficient permissions") || firebaseError.includes("permission-denied")) {
                    return "Mã phòng không hợp lệ hoặc bạn không có quyền truy cập hoặc chỉnh sửa phòng này.";
                  }
                  if (firebaseError.includes("offline")) {
                    return "Không thể ghép nối trực tiếp vì thiết bị đang ngoại tuyến. Hệ thống tự động kích hoạt chế độ lưu cục bộ an toàn.";
                  }
                  return firebaseError;
                })()}
              </p>
              <p className="text-[10px] text-slate-400 mt-2 font-mono leading-relaxed font-semibold">
                Mẹo: Dữ liệu của hai bạn vẫn được bảo vệ an toàn trên bộ nhớ cục bộ (local storage). Vui lòng kiểm tra lại chất lượng mạng hoặc độ chính xác của mã phòng trước khi thử lại.
              </p>
            </div>
          </div>
        )}

        {/* TAB CONNECT ROOM FOR UNPAIRED USERS */}
        {!coupleId && (
          <div id="connect-space-screen" className="max-w-xl mx-auto space-y-6 pt-4 animate-fade-in select-text">
            {/* Romantic Greeting Banner */}
            <div className="text-center space-y-3 pb-4 select-none">
              <div className="inline-flex p-3 bg-gradient-to-tr from-rose-500 to-pink-500 rounded-2xl shadow-xl shadow-rose-900/25">
                <Sparkles className="w-8 h-8 text-white animate-pulse" />
              </div>
              <h2 className="text-3xl font-black text-rose-300 tracking-tight">Không Gian Kết Nối Trái Tim 💞</h2>
              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                Đồng bộ nhịp điệu tình yêu, nhật ký ngày bên nhau, và chu kỳ sinh lý của bạn đời theo thời gian thực. Chọn một trong hai phương thức sau để bắt đầu:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
              {/* Option 1: Create New Room */}
              <div className="bg-slate-950/60 backdrop-blur-md rounded-3xl border border-slate-800 p-6 flex flex-col justify-between space-y-4 shadow-xl hover:border-rose-500/30 transition-all group select-none">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-400 font-bold group-hover:scale-105 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">Bắt đầu không gian mới</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Khởi tạo một mã phòng ngẫu nhiên duy nhất dạng <code className="text-rose-300 font-mono font-bold">LOVE-XXXXXX</code> và tự động đẩy dữ liệu hiện tại trong máy lên đám mây.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isCreating || isJoining || isSyncing}
                  onClick={handleCreateNewCouple}
                  className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 active:scale-98 text-white font-extrabold py-3 px-4 rounded-2xl text-xs shadow-lg shadow-rose-950/30 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Đang tạo phòng mới...</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 text-white fill-white animate-bounce" />
                      <span>Tạo Không Gian Yêu</span>
                    </>
                  )}
                </button>
              </div>

              {/* Option 2: Join Existing Room */}
              <div className="bg-slate-950/60 backdrop-blur-md rounded-3xl border border-slate-800 p-6 flex flex-col justify-between space-y-4 shadow-xl hover:border-indigo-500/30 transition-all group">
                <form onSubmit={handleJoinExistingCouple} className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 font-bold group-hover:scale-105 transition-transform">
                      <Link className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 select-none">Tham gia bằng mã phòng</h3>
                    <p className="text-xs text-slate-400 leading-relaxed select-none">
                      Nhập mã hoặc nhấp trực tiếp vào liên kết được người thương chia sẻ để ngay lập tức đồng bộ cuộc sống hai người.
                    </p>

                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="LOVE-XXXXXX"
                        value={enteredJoinCode}
                        onChange={(e) => setEnteredJoinCode(e.target.value.toUpperCase())}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-sm text-center font-mono placeholder-slate-600 text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-extrabold uppercase font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isCreating || isJoining || isSyncing}
                    className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-650 hover:to-violet-650 active:scale-98 text-white font-extrabold py-3 px-4 rounded-2xl text-xs shadow-lg shadow-indigo-950/30 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Đang kết nối...</span>
                      </>
                    ) : (
                      <>
                        <Link className="w-4 h-4 text-white" />
                        <span>Kết Nối Ngay</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

          </div>
        )}

        {/* TAB 1: LOVE DAYS INDEX SCREEN */}
        {coupleId && activeTab === 'love' && (
          <div id="love-tab-content" className="space-y-6 max-w-2xl mx-auto animate-fade-in pb-12">

            {/* UNIFIED LINKED CARD CONTAINER IN CRISP LIGHT SOFT GLASS */}
            <div className="bg-black/15 backdrop-blur-md rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] relative text-white">

              {/* TOP RIGHT BUTTONS - PALETTE & EDIT */}
              <div className="absolute top-4 right-4 flex gap-2 z-20">
                <button
                  onClick={openWallpaperEditor}
                  className="p-2 bg-primary hover:bg-primary-hover rounded-full text-white shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  title="Chỉnh sửa hình nền 🎨"
                >
                  <Palette className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={openEditProfile}
                  className="p-2 bg-primary hover:bg-primary-hover rounded-full text-white shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  title="Chỉnh sửa thông tin & Avatar ✏️"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* CENTRAL HEART DAY COUNT - VERTICALLY CENTERED FROM THE TOP TO THE BREAKDOWN BOX */}
              <div className="flex flex-col items-center justify-center pt-8 pb-4 select-none">
                {/* Big numeric circle */}
                <div className="relative w-44 h-44 xs:w-48 xs:h-48 sm:w-56 sm:h-56 flex flex-col items-center justify-center rounded-full bg-gradient-to-tr from-primary/10 via-secondary/15 to-violet-500/10 border-4 border-white shadow-[0_12px_36px_rgba(255,107,138,0.15),inset_0_4px_12px_rgba(255,107,138,0.06)] select-none animate-heart-beat">
                  <div className="absolute inset-2 sm:inset-3 rounded-full border border-dashed border-primary/20 animate-spin-slow"></div>

                  <span className="text-[10px] sm:text-xs text-white uppercase font-extrabold tracking-widest mb-1">
                    ĐANG YÊU
                  </span>

                  <span className="text-3xl sm:text-5xl font-black tracking-tighter text-white leading-none">
                    {loveDays}
                  </span>

                  <span className="text-xs sm:text-sm text-white font-black mt-1.5 uppercase tracking-wide">
                    Ngày
                  </span>
                </div>
              </div>

              {/* Breakdown detail: Năm/Tháng/Tuần/Ngày và có khung */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5 bg-white/40 backdrop-blur-sm rounded-2xl border border-pink-100/60 p-2 sm:p-4 max-w-xs sm:max-w-md mx-auto shadow-sm select-none">
                <div className="text-center">
                  <span className="block text-base sm:text-lg font-black text-white leading-tight">{loveBreakdown.years}</span>
                  <span className="text-[9px] sm:text-[10px] text-white uppercase tracking-tight font-extrabold">Năm</span>
                </div>
                <div className="text-center border-l border-pink-100/60">
                  <span className="block text-base sm:text-lg font-black text-white leading-tight">{loveBreakdown.months}</span>
                  <span className="text-[9px] sm:text-[10px] text-white uppercase tracking-tight font-extrabold">Tháng</span>
                </div>
                <div className="text-center border-l border-pink-100/60">
                  <span className="block text-base sm:text-lg font-black text-white leading-tight">{loveBreakdown.weeks}</span>
                  <span className="text-[9px] sm:text-[10px] text-white uppercase tracking-tight font-extrabold">Tuần</span>
                </div>
                <div className="text-center border-l border-pink-100/60">
                  <span className="block text-base sm:text-lg font-black text-white leading-tight">{loveBreakdown.days}</span>
                  <span className="text-[9px] sm:text-[10px] text-white uppercase tracking-tight font-extrabold">Ngày</span>
                </div>
              </div>

              {/* bên trái là ngày yêu bên phải là giờ thực và ko có khung - SÁT BÊN DƯỚI BẢNG NĂM THÁNG TUẦN NGÀY */}
              <div className="flex items-center justify-between px-4 max-w-xs sm:max-w-md mx-auto text-xs sm:text-sm font-bold select-none text-text-primary -mt-1">
                <div className="flex items-center gap-1.5 text-white">
                  <span>❤️</span>
                  <span className="tracking-tight">{CoupleUtils.formatDisplayDate(profile.loveDate)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-white font-mono tracking-wider">
                  <span>{currentTime || '00:00:00'}</span>
                </div>
              </div>

              {/* DUAL PROFILES SECTION - TRANSPARENT SEAMLESS GRAPHICS - SÁT VỚI BẢNG TRÊN */}
              <div className="relative grid grid-cols-2 gap-2 xs:gap-4 sm:gap-8 pt-1 pb-3 my-0 select-none">

                {/* Centered Beating Heart */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 p-2 bg-white/95 backdrop-blur-sm rounded-full shadow-[0_4px_16px_rgba(255,107,138,0.2)] border-2 border-pink-100/80 animate-heart-beat">
                  <Heart className="w-5 h-5 text-primary fill-primary" />
                </div>

                {/* MALE PARTNER - NO BACKGROUND CARD */}
                <div className="bg-transparent p-1 flex flex-col items-center text-center transition-all w-full">
                  <div className="relative group">
                    {profile.maleAvatar ? (
                      <ScaledAvatar
                        src={profile.maleAvatar}
                        scale={profile.maleScale}
                        offsetX={profile.maleOffsetX}
                        offsetY={profile.maleOffsetY}
                        className="w-20 h-20 xs:w-24 xs:h-24 border-2 border-indigo-400 bg-background-alt"
                        alt="Avatar Male"
                      />
                    ) : (
                      <div className="w-20 h-20 xs:w-24 xs:h-24 rounded-full border-2 border-indigo-400 bg-background-alt flex items-center justify-center text-3xl select-none">👦</div>
                    )}
                    <label className="absolute bottom-0 right-0 p-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-full cursor-pointer text-white shadow-md transition-colors">
                      <Camera className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadFile('maleAvatar', e)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="mt-3 w-full">
                    {/* Tên */}
                    <h3 className="text-sm sm:text-base font-black text-white text-center whitespace-nowrap">
                      {profile.maleName}
                    </h3>

                    {/* Tuổi - Cung */}
                    <p className="text-[11px] sm:text-xs text-white font-bold mt-1">
                      {maleAge} tuổi - {profile.maleZodiac}
                    </p>

                    {/* Bánh sinh nhật Còn 200 ngày */}
                    <p className="text-[10px] sm:text-[11px] text-white font-bold mt-1.5 flex items-center justify-center gap-1">
                      <span>🎂</span>
                      <span>
                        {maleNextBirthdayCountdown === 0
                          ? "Hôm nay sinh nhật!"
                          : `Còn ${maleNextBirthdayCountdown} ngày`}
                      </span>
                    </p>
                  </div>
                </div>

                {/* FEMALE PARTNER - NO BACKGROUND CARD */}
                <div className="bg-transparent p-1 flex flex-col items-center text-center transition-all w-full">
                  <div className="relative group">
                    {profile.femaleAvatar ? (
                      <ScaledAvatar
                        src={profile.femaleAvatar}
                        scale={profile.femaleScale}
                        offsetX={profile.femaleOffsetX}
                        offsetY={profile.femaleOffsetY}
                        className="w-20 h-20 xs:w-24 xs:h-24 border-2 border-primary bg-background-alt"
                        alt="Avatar Female"
                      />
                    ) : (
                      <div className="w-20 h-20 xs:w-24 xs:h-24 rounded-full border-2 border-primary bg-background-alt flex items-center justify-center text-3xl select-none">👧</div>
                    )}
                    <label className="absolute bottom-0 right-0 p-1.5 bg-primary hover:bg-primary-hover rounded-full cursor-pointer text-white shadow-md transition-colors">
                      <Camera className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadFile('femaleAvatar', e)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="mt-3 w-full">
                    {/* Tên */}
                    <h3 className="text-sm sm:text-base font-black text-white text-center whitespace-nowrap">
                      {profile.femaleName}
                    </h3>

                    {/* Tuổi - Cung */}
                    <p className="text-[11px] sm:text-xs text-white font-bold mt-1">
                      {femaleAge} tuổi - {profile.femaleZodiac}
                    </p>

                    {/* Bánh sinh nhật Còn 200 ngày */}
                    <p className="text-[10px] sm:text-[11px] text-white font-bold mt-1.5 flex items-center justify-center gap-1">
                      <span>🎂</span>
                      <span>
                        {femaleNextBirthdayCountdown === 0
                          ? "Hôm nay sinh nhật!"
                          : `Còn ${femaleNextBirthdayCountdown} ngày`}
                      </span>
                    </p>
                  </div>
                </div>

              </div>

              {/* ACTION DIRECTORIES - SỔ MỐC KỶ NIỆM TÌNH YÊU NẰM TRONG CARD NỀN TRẮNG MỜ */}
              <div className="pt-1 select-none">
                <button
                  onClick={() => setShowMilestonesDialog(true)}
                  className="w-full py-2 px-5 bg-gradient-to-r from-primary via-primary-hover to-secondary hover:brightness-105 rounded-2xl text-white flex items-center justify-center gap-2.5 shadow-md active:scale-[0.99] transition-all cursor-pointer border border-pink-300/30 text-xs sm:text-sm font-black uppercase tracking-wider"
                  id="milestone-book-btn"
                >
                  <span className="text-xl animate-bounce-slow">📖</span>
                  <span>Sổ mốc kỷ niệm tình yêu</span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: MENSTRUAL CYCLE DIARY SCREEN */}
        {coupleId && activeTab === 'menstrual' && (
          <div id="menstrual-tab-content" className="space-y-6 animate-fade-in animate-duration-300">

            {/* HERO WHEEL STATUS INDICATOR */}
            <div className={`border p-6 rounded-3xl ${currentCycleStatus.color} transition-all duration-350 shadow-[0_4px_20px_rgba(255,107,138,0.05)] flex flex-col md:flex-row items-center gap-6 justify-between select-none`}>
              <div className="text-center md:text-left space-y-1">
                <span className="text-[10px] uppercase font-black bg-pink-500/10 text-primary-hover py-1 px-3.5 rounded-full tracking-wide">Trạng Thái Sức Khỏe</span>
                <h2 className="text-2xl font-black mt-1.5">{currentCycleStatus.title}</h2>
                <p className="text-xs opacity-90 font-medium">{currentCycleStatus.description}</p>
              </div>

              {/* Stats circle detail */}
              <div className="flex gap-4 bg-white/80 border border-pink-100/80 rounded-2xl py-3 px-4 w-full md:w-auto justify-around shrink-0 text-text-primary shadow-sm">
                <div className="text-center min-w-[70px]">
                  <span className="text-text-secondary text-[10px] uppercase font-bold block">Chu Kỳ TB</span>
                  <span className="text-xl font-black text-rose-500">{menstrualStats.averageCycle} ngày</span>
                </div>
                <div className="border-r border-pink-100 my-1"></div>
                <div className="text-center min-w-[70px]">
                  <span className="text-text-secondary text-[10px] uppercase font-bold block">Ngắn Nhất</span>
                  <span className="text-xl font-black text-text-primary">
                    {menstrualStats.minCycle ? `${menstrualStats.minCycle} ngày` : '--'}
                  </span>
                </div>
                <div className="border-r border-pink-100 my-1"></div>
                <div className="text-center min-w-[70px]">
                  <span className="text-text-secondary text-[10px] uppercase font-bold block">Dài Nhất</span>
                  <span className="text-xl font-black text-text-primary">
                    {menstrualStats.maxCycle ? `${menstrualStats.maxCycle} ngày` : '--'}
                  </span>
                </div>
              </div>
            </div>

            {/* MAIN CALENDAR AND SECTOR PANEL */}
            <div className="bg-surface/60 backdrop-blur-md rounded-3xl border border-pink-200/50 p-3.5 sm:p-6 shadow-md text-text-primary">

              {/* CALENDAR CONTROLLER BAR */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-pink-100 pb-5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const prev = new Date(calendarDate);
                      prev.setMonth(prev.getMonth() - 1);
                      setCalendarDate(prev);
                    }}
                    className="p-2 border border-pink-200 rounded-xl hover:bg-pink-100 bg-white shadow-sm transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5 text-primary" />
                  </button>
                  <h3 className="text-lg font-extrabold text-text-primary min-w-[140px] text-center capitalize">
                    Tháng {calendarDate.getMonth() + 1} / {calendarDate.getFullYear()}
                  </h3>
                  <button
                    onClick={() => {
                      const next = new Date(calendarDate);
                      next.setMonth(next.getMonth() + 1);
                      setCalendarDate(next);
                    }}
                    className="p-2 border border-pink-200 rounded-xl hover:bg-pink-100 bg-white shadow-sm transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5 text-primary" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCalendarMode(calendarMode === 'month' ? 'year' : 'month')}
                    className="py-1.5 px-3.5 text-xs font-bold border border-pink-200 bg-white rounded-xl text-text-primary hover:bg-pink-50 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-primary" />
                    <span>{calendarMode === 'month' ? 'Xem cả Năm 📅' : 'Quay lại Tháng'}</span>
                  </button>

                  <button
                    onClick={() => openLogCycle()}
                    className="py-1.5 px-3.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
                    id="log-cycle-btn"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                    <span>Ghi nhận Kinh nguyệt</span>
                  </button>
                </div>
              </div>

              {/* CALENDAR RENDER ENGINE */}
              {calendarMode === 'month' ? (
                <div>
                  {/* Grid of days naming */}
                  <div className="grid grid-cols-7 text-center text-text-secondary font-bold text-xs uppercase tracking-wider mb-2">
                    <span>CN</span>
                    <span>T2</span>
                    <span>T3</span>
                    <span>T4</span>
                    <span>T5</span>
                    <span>T6</span>
                    <span>T7</span>
                  </div>

                  {/* Grid of numbers */}
                  <div className="grid grid-cols-7 gap-1 sm:gap-2.5">
                    {monthDays.map((cell, idx) => {
                      const cellDate = cell.dateStr;
                      const status = cycleMap[cellDate] || 'NONE';
                      const isTodayStr = CoupleUtils.formatDate(new Date());
                      const isToday = cellDate === isTodayStr;
                      const isSelected = selectedCalendarDate === cellDate;

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedCalendarDate(cellDate)}
                          className={`aspect-square rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-xs sm:text-sm ${getDayStatusClass(status, isToday, isSelected)} ${!cell.isCurrentMonth ? 'opacity-30' : 'opacity-100'}`}
                        >
                          <span className="font-extrabold">{cell.dayNum}</span>

                          {/* Small icon overlays */}
                          {status === 'PERIOD' && <span className="text-[8px] sm:text-[9px] mt-0.5 mt-[-1px]">🩸</span>}
                          {status === 'UPCOMING' && <span className="text-[8px] sm:text-[9px] mt-[-1px]">⏳</span>}
                          {status === 'FERTILE' && <span className="text-[8px] sm:text-[9px] mt-[-2px]">✨</span>}
                          {status === 'OVULATION' && <span className="text-[8px] sm:text-[9px] mt-[-3px]">🥚</span>}
                          {status === 'SAFE' && <span className="text-[8px] sm:text-[9px] mt-[-1px]">🌿</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* LEGEND GLOSSARY */}
                  <div className="flex flex-wrap justify-center gap-3 mt-6 border-t border-pink-100 pt-5 text-xs text-text-secondary">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-500 block shadow-[0_2px_6px_rgba(239,68,68,0.3)]"></span>
                      <span>Trong kỳ kinh 🩸</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-rose-100 border border-dashed border-rose-300 block"></span>
                      <span>Dự kiến kinh ⏳</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-indigo-100 border border-indigo-200 block"></span>
                      <span>Dễ thụ thai ✨</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-purple-150 block ring-1 ring-purple-205"></span>
                      <span>Rụng trứng 🥚</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-250 block col-span-1"></span>
                      <span>Ngày an toàn 🌿</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-slate-100 border border-slate-200 block"></span>
                      <span>Ngày bình thường</span>
                    </span>
                  </div>
                </div>
              ) : (
                /* YEAR COMPACT MODE SCREEN */
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 animate-fade-in">
                  {Array.from({ length: 12 }).map((_, mIdx) => {
                    const currentYear = calendarDate.getFullYear();
                    const demoMonth = new Date(currentYear, mIdx, 1);
                    const daysInDemo = new Date(currentYear, mIdx + 1, 0).getDate();
                    const startOffset = demoMonth.getDay();

                    return (
                      <div key={mIdx} className="bg-white border border-pink-100/50 p-3 rounded-2xl shadow-sm text-text-primary">
                        <h4 className="text-xs font-black text-primary tracking-wider mb-2 text-center capitalize">
                          Tháng {mIdx + 1}
                        </h4>

                        <div className="grid grid-cols-7 gap-0.5 text-[9px] text-center text-text-secondary font-bold mb-1">
                          <span>C</span><span>H</span><span>B</span><span>T</span><span>N</span><span>S</span><span>B</span>
                        </div>

                        <div className="grid grid-cols-7 gap-0.5">
                          {/* Offset spaces */}
                          {Array.from({ length: startOffset }).map((_, oIdx) => (
                            <div key={`offset-${oIdx}`} className="aspect-square opacity-0"></div>
                          ))}

                          {/* Real numbers */}
                          {Array.from({ length: daysInDemo }).map((_, dIdx) => {
                            const dmNum = dIdx + 1;
                            const dStr = CoupleUtils.formatDate(new Date(currentYear, mIdx, dmNum));
                            const status = cycleMap[dStr] || 'NONE';

                            let bgClass = 'bg-slate-50 text-text-secondary';
                            if (status === 'PERIOD') bgClass = 'bg-red-500 text-white';
                            if (status === 'UPCOMING') bgClass = 'bg-rose-100/90 text-rose-700';
                            if (status === 'FERTILE') bgClass = 'bg-indigo-100 text-indigo-800';
                            if (status === 'OVULATION') bgClass = 'bg-purple-150 text-purple-800';
                            if (status === 'SAFE') bgClass = 'bg-emerald-100 text-emerald-800';

                            return (
                              <div
                                key={dIdx}
                                className={`aspect-square rounded-sm text-[8px] flex items-center justify-center font-bold ${bgClass}`}
                              >
                                {dmNum}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* CALENDAR SELECTED DAY DETAILS CARDS */}
            {activeSelectedDayDetail && (
              <div className="bg-surface/60 backdrop-blur-md rounded-2xl border border-pink-200/50 p-5 shadow-md border-l-4 border-l-primary animate-slide-up text-text-primary">
                <div className="flex items-center justify-between border-b border-pink-100 pb-3 mb-3">
                  <span className="text-text-primary font-black">Ngày: {CoupleUtils.formatDisplayDate(activeSelectedDayDetail.date)}</span>
                  <span className="text-xs bg-white border border-pink-150 rounded-full py-1 px-3 text-text-primary font-bold shadow-sm">
                    Trạng thái: <span className="text-primary-hover font-black">{DayStatusTranslation[activeSelectedDayDetail.status]}</span>
                  </span>
                </div>

                {activeSelectedDayDetail.log ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="bg-white/85 p-2.5 rounded-xl border border-pink-150 shadow-sm">
                        <span className="text-[10px] text-text-secondary block font-bold">Chu Kỳ Tính Toán</span>
                        <span className="text-sm font-extrabold text-text-primary">{activeSelectedDayDetail.log.cycleLength} ngày</span>
                      </div>
                      <div className="bg-white/85 p-2.5 rounded-xl border border-pink-150 shadow-sm">
                        <span className="text-[10px] text-text-secondary block font-bold">Số Ngày Hành Kinh</span>
                        <span className="text-sm font-extrabold text-text-primary">{activeSelectedDayDetail.log.periodLength} ngày</span>
                      </div>
                      <div className="bg-white/85 p-2.5 rounded-xl border border-pink-150 shadow-sm">
                        <span className="text-[10px] text-text-secondary block font-bold">Thử nghiệm LH (Rụng Trứng)</span>
                        <span className="text-sm font-extrabold text-indigo-700">{activeSelectedDayDetail.log.lhTestResult || 'N/A'}</span>
                      </div>
                      <div className="bg-white/85 p-2.5 rounded-xl border border-pink-150 shadow-sm">
                        <span className="text-[10px] text-text-secondary block font-bold">Thân Nhiệt BBT</span>
                        <span className="text-sm font-extrabold text-[#FFA2B6]">
                          {activeSelectedDayDetail.log.bbt ? `${activeSelectedDayDetail.log.bbt}°C` : 'N/A'}
                        </span>
                      </div>
                      <div className="bg-white/85 p-2.5 rounded-xl border border-pink-150 shadow-sm">
                        <span className="text-[10px] text-text-secondary block font-bold">Chất nhầy cổ tử cung</span>
                        <span className="text-sm font-extrabold text-text-primary">{activeSelectedDayDetail.log.cervicalMucus || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleDeleteCycle(activeSelectedDayDetail.log!.id!)}
                        className="py-1.5 px-3.5 bg-white hover:bg-red-50 text-danger border border-red-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa nhật ký này</span>
                      </button>
                      <button
                        onClick={() => openLogCycle(activeSelectedDayDetail.log)}
                        className="py-1.5 px-3.5 bg-white hover:bg-pink-50/50 text-text-primary border border-pink-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Chỉnh sửa thông số</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-text-secondary text-xs mb-3 italic">Hôm nay chưa có dữ liệu chẩn đoán hoặc ghi nhận kỳ kinh.</p>
                    <button
                      onClick={() => openLogCycle()}
                      className="py-1.5 px-4 bg-white hover:bg-pink-50 text-text-primary border border-pink-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 mx-auto cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5 text-primary" />
                      <span>Thêm nhật ký cho ngày này</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* DYNAMIC CYCLE PREDICTOR REPORT PANEL */}
            <div className="bg-surface/60 backdrop-blur-md rounded-3xl border border-pink-200/50 p-6 shadow-sm text-text-primary">
              <div className="flex items-center gap-2 mb-4 border-b border-pink-100 pb-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="text-base font-extrabold text-text-primary">Kết Quả Tính Toán Theo 7 Bước Quy Chuẩn 📊</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/80 border border-pink-200/45 p-4 rounded-2xl space-y-3 shadow-sm">
                  <h4 className="text-xs font-black text-primary-hover uppercase tracking-wider">Kỳ Kinh Dự Kiến Kế Tiếp</h4>
                  <ul className="text-sm space-y-2 text-text-primary">
                    <li className="flex items-center justify-between bg-pink-50/40 p-2 rounded-lg border border-pink-100/50">
                      <span className="text-xs font-bold text-text-secondary">Kỳ kế 1:</span>
                      <strong className="text-primary-hover font-extrabold">
                        {menstrualStats.predictedPeriodStart ? CoupleUtils.formatDisplayDate(menstrualStats.predictedPeriodStart) : 'Chưa có thông số'}
                      </strong>
                    </li>
                    <li className="flex items-center justify-between bg-pink-50/40 p-2 rounded-lg border border-pink-100/50">
                      <span className="text-xs font-bold text-text-secondary">Kỳ kế 2:</span>
                      <strong className="font-extrabold">
                        {menstrualStats.predictedPeriodStart2 ? CoupleUtils.formatDisplayDate(menstrualStats.predictedPeriodStart2) : 'Chưa có thông số'}
                      </strong>
                    </li>
                    <li className="flex items-center justify-between bg-pink-50/40 p-2 rounded-lg border border-pink-100/50">
                      <span className="text-xs font-bold text-text-secondary">Kỳ kế 3:</span>
                      <strong className="font-extrabold text-text-secondary">
                        {menstrualStats.predictedPeriodStart3 ? CoupleUtils.formatDisplayDate(menstrualStats.predictedPeriodStart3) : 'Chưa có thông số'}
                      </strong>
                    </li>
                  </ul>
                </div>

                <div className="bg-white/80 border border-pink-200/45 p-4 rounded-2xl space-y-3 shadow-sm">
                  <h4 className="text-xs font-black text-indigo-600 uppercase tracking-wider">Khoảng Thời Gian Cơ Bản</h4>
                  <ul className="text-sm space-y-2 text-text-primary font-medium">
                    <li className="flex items-center justify-between bg-pink-50/40 p-2 rounded-lg border border-pink-100/50">
                      <span className="text-xs font-bold text-text-secondary">Ngày rụng trứng:</span>
                      <strong className="text-purple-600">
                        {menstrualStats.ovulationDate ? CoupleUtils.formatDisplayDate(menstrualStats.ovulationDate) : 'Chưa xác định'}
                      </strong>
                    </li>
                    <li className="flex items-center justify-between bg-pink-50/40 p-2 rounded-lg border border-pink-100/50">
                      <span className="text-xs font-bold text-text-secondary">Cửa sổ dễ thụ thai:</span>
                      <strong className="text-indigo-600">
                        {menstrualStats.fertileStart && menstrualStats.fertileEnd
                          ? `${CoupleUtils.formatDisplayDate(menstrualStats.fertileStart)} - ${CoupleUtils.formatDisplayDate(menstrualStats.fertileEnd)}`
                          : 'Chưa xác định'}
                      </strong>
                    </li>
                    <li className="flex items-center justify-between bg-pink-50/40 p-2 rounded-lg border border-pink-100/50">
                      <span className="text-xs font-bold text-text-secondary">An toàn sau kinh nguyệt (Hạn hẹp):</span>
                      <strong className="text-emerald-600">
                        {menstrualStats.safePeriod1Start && menstrualStats.safePeriod1End && menstrualStats.safePeriod1Start <= menstrualStats.safePeriod1End
                          ? `${CoupleUtils.formatDisplayDate(menstrualStats.safePeriod1Start)} - ${CoupleUtils.formatDisplayDate(menstrualStats.safePeriod1End)}`
                          : 'Bỏ qua (quá ngắn)'}
                      </strong>
                    </li>
                    <li className="flex items-center justify-between bg-pink-50/40 p-2 rounded-lg border border-pink-100/50">
                      <span className="text-xs font-bold text-text-secondary">An toàn sau rụng trứng (Tuyệt đối):</span>
                      <strong className="text-emerald-600 font-extrabold">
                        {menstrualStats.safePeriod2Start && menstrualStats.safePeriod2End
                          ? `${CoupleUtils.formatDisplayDate(menstrualStats.safePeriod2Start)} - ${CoupleUtils.formatDisplayDate(menstrualStats.safePeriod2End)}`
                          : 'Chưa xác định'}
                      </strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* AI PRESTIGE DIAGNOSTIC BANNER */}
            <div className="bg-gradient-to-tr from-white via-pink-50/40 to-indigo-50/30 rounded-3xl border border-pink-200/60 p-6 shadow-sm relative overflow-hidden text-text-primary">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-2xl rounded-full"></div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 text-primary rounded-xl border border-pink-200/50">
                    <Sparkles className="w-5 h-5 text-primary fill-primary/30" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-text-primary">Dự Đoán Thông Minh qua AI 🩺✨</h3>
                    <p className="text-text-secondary text-[11px] font-semibold">Sử dụng mô hình Gemini để phân tích outlier và độ lệch chuẩn chính xác hơn</p>
                  </div>
                </div>

                <button
                  onClick={handleTriggerAiAnalysis}
                  disabled={isAiLoading}
                  className="w-full sm:w-auto py-2 px-5 bg-gradient-to-r from-primary to-primary-hover text-white rounded-xl shadow-md border border-white/20 font-bold text-xs select-none hover:scale-[1.02] transform transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isAiLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{aiProgressText}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      <span>Phân Tích Bằng AI (Gemini)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Loader or Error indicator */}
              {aiError && (
                <div className="bg-red-500/10 border border-red-200 rounded-2xl p-4 text-xs text-danger flex items-start gap-2 max-w-lg mx-auto relative z-10">
                  <AlertCircle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Lỗi trong quá trình phân tích:</p>
                    <p className="font-medium">{aiError}</p>
                    <p className="text-[10px] text-text-secondary mt-1.5">Mẹo: Đảm bảo đã nhập các ngày bắt đầu hợp lệ và khóa bí mật đã được cài đặt trong settings.</p>
                  </div>
                </div>
              )}

              {/* RENDER RESPONSES AND STATS OBTAINED */}
              {aiResult ? (
                <div className="space-y-4 border-t border-pink-100 pt-5 mt-4 relative z-10 animate-fade-in text-text-primary">

                  {/* Confidence metrics row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white/85 border border-pink-150 p-3 rounded-2xl shadow-sm text-center">
                      <span className="text-text-secondary text-[10px] uppercase font-bold block">Chu kỳ TB (AI)</span>
                      <strong className="text-base font-extrabold text-[#FFA2B6]">{aiResult.average_cycle_length} ngày</strong>
                    </div>
                    <div className="bg-white/85 border border-pink-150 p-3 rounded-2xl shadow-sm text-center">
                      <span className="text-text-secondary text-[10px] uppercase font-bold block">Chu kỳ Trung vị</span>
                      <strong className="text-base font-extrabold text-text-primary">{aiResult.median_cycle_length || '--'} ngày</strong>
                    </div>
                    <div className="bg-white/85 border border-pink-150 p-3 rounded-2xl shadow-sm text-center">
                      <span className="text-text-secondary text-[10px] uppercase font-bold block">Độ ổn định</span>
                      <strong className="text-base font-extrabold text-indigo-600">{aiResult.cycle_stability || 'Bình thường'}</strong>
                    </div>
                    <div className="bg-white/85 border border-pink-150 p-3 rounded-2xl shadow-sm text-center">
                      <span className="text-text-secondary text-[10px] uppercase font-bold block">Độ tin cậy</span>
                      <strong className="text-base font-extrabold text-emerald-600">{aiResult.confidence_score || '85'}%</strong>
                    </div>
                  </div>

                  {/* Prediction insights columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/80 border border-pink-150 p-4.5 rounded-2xl space-y-3 shadow-sm">
                      <h4 className="text-xs font-black text-primary-hover uppercase tracking-wider flex items-center gap-1">
                        <span>🗓️ Ngày dự đoán tối ưu qua AI</span>
                      </h4>
                      <ul className="text-sm space-y-2 text-text-primary font-medium">
                        <li className="flex items-center justify-between bg-pink-50/40 p-2 rounded-lg border border-pink-100/50">
                          <span className="text-xs text-text-secondary">Ngày hành kinh kế:</span>
                          <strong className="text-primary-hover">
                            {aiResult.next_period_date ? CoupleUtils.formatDisplayDate(aiResult.next_period_date) : 'N/A'}
                          </strong>
                        </li>
                        <li className="flex items-center justify-between bg-pink-50/40 p-2 rounded-lg border border-pink-100/50">
                          <span className="text-xs text-text-secondary">Dao động sai số:</span>
                          <span className="text-text-primary font-semibold">{aiResult.prediction_range || '+- 1 ngày'}</span>
                        </li>
                        <li className="flex items-center justify-between bg-pink-50/40 p-2 rounded-lg border border-pink-100/50">
                          <span className="text-xs text-text-secondary">Ước đoán rụng trứng (AI):</span>
                          <strong className="text-purple-600">
                            {aiResult.estimated_ovulation_date ? CoupleUtils.formatDisplayDate(aiResult.estimated_ovulation_date) : 'N/A'}
                          </strong>
                        </li>
                        <li className="flex items-center justify-between bg-pink-50/40 p-2 rounded-lg border border-pink-100/50">
                          <span className="text-xs text-text-secondary">Hành lang thụ thai rộng:</span>
                          <span className="text-indigo-600 font-bold">{aiResult.fertility_window || 'N/A'}</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-white/80 border border-pink-150 p-4.5 rounded-2xl space-y-3 shadow-sm">
                      <h4 className="text-xs font-black text-emerald-600 uppercase tracking-wider">⚠️ Phát Hiện Chu Kỳ Bất Thường</h4>
                      <p className="text-xs text-text-secondary font-medium">Hỗ trợ loại bỏ các chu kỳ bị kéo dài do căng thẳng hoặc sức khoẻ tạm thời.</p>

                      <div className="bg-pink-50/50 p-3 rounded-xl border border-pink-150 text-xs text-text-primary space-y-2">
                        <div>
                          <span className="font-bold block text-text-secondary">Các Outliers phát hiện:</span>
                          <span className="text-primary-hover font-bold font-mono">
                            {aiResult.outliers && aiResult.outliers.length > 0
                              ? aiResult.outliers.join(', ')
                              : 'Không phát hiện (chu kỳ đồng đều ổn định).'}
                          </span>
                        </div>
                        <div>
                          <span className="font-bold block text-text-secondary">Thụ thai thấp:</span>
                          <span className="text-emerald-600 font-extrabold">{aiResult.low_fertility_days || 'Các ngày còn lại trong chu kỳ.'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Deep descriptive Vietnamese text */}
                  <div className="bg-indigo-50/50 border border-indigo-150 p-4 rounded-2xl">
                    <h5 className="text-xs font-extrabold text-indigo-750 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                      <span>Ý Kiến Chuyên Gia AI & Lập Luận</span>
                    </h5>
                    <p className="text-xs text-indigo-905 leading-relaxed font-semibold whitespace-pre-line text-justify">{aiResult.reasoning}</p>
                  </div>

                </div>
              ) : (
                !isAiLoading && (
                  <div className="text-center py-6 border border-dashed border-pink-200 rounded-2xl bg-pink-500/5 mt-4 h-full relative z-10 flex flex-col items-center justify-center">
                    <Smile className="w-8 h-8 text-primary/70 mb-2 animate-bounce" />
                    <p className="text-xs text-text-primary font-bold">Chưa Có Khảo Sát Báo Cáo AI Cho Kỳ Học Này</p>
                    <p className="text-[10px] text-text-secondary max-w-md mx-auto mt-1 leading-relaxed font-semibold">Hãy ấn nút "Phân Tích Bằng AI" ở góc phải để nhận báo cáo chuẩn đoán chu kỳ chuyên sâu từ thông số thực tế của bạn.</p>
                  </div>
                )
              )}

              {/* Secure health advice watermark note */}
              <div className="flex items-center gap-1.5 justify-center text-[10px] text-text-secondary mt-5 relative z-10 font-bold">
                <Shield className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span>Số liệu AI được bảo mật cục bộ và chỉ nhằm mục đích tham khảo, không thay thế cho chẩn đoán y tế chuyên khoa.</span>
              </div>
            </div>

            {/* PREVIOUS RECORD LOGS LISTINGS */}
            <div className="bg-surface/60 backdrop-blur-md rounded-3xl border border-pink-200/50 p-6 shadow-sm text-text-primary">
              <div className="flex items-center justify-between mb-4 border-b border-pink-100 pb-3">
                <h3 className="text-base font-extrabold text-text-primary flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span>Danh Sách Nhật Ký Chu Kỳ Đã Ghi Chép ({cycles.length})</span>
                </h3>
              </div>

              {cycles.length === 0 ? (
                <div className="text-center py-8 text-text-secondary italic text-xs font-medium">
                  Chưa ghi chép bất kỳ chu kỳ nào. Hãy dùng nút "Ghi nhận Kinh nguyệt" để thêm mới.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {[...cycles].sort((a, b) => b.startDate.localeCompare(a.startDate)).map((item, index) => (
                    <div
                      key={item.id || index}
                      className="bg-white border border-pink-150 rounded-xl p-3.5 flex items-center justify-between gap-4 hover:border-primary/50 transition-all shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse"></span>
                          <strong className="text-sm text-text-primary">Ngày bắt đầu: {CoupleUtils.formatDisplayDate(item.startDate)}</strong>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[10px] text-text-secondary font-bold">
                          <span className="bg-pink-50/50 px-2 py-0.5 rounded border border-pink-100">
                            Chu kỳ: <strong className="text-primary-hover">{item.cycleLength} ngày</strong>
                          </span>
                          <span className="bg-pink-50/50 px-2 py-0.5 rounded border border-pink-100">
                            Độ dài hành kinh: <strong className="text-[#FFA2B6]">{item.periodLength} ngày</strong>
                          </span>
                          {item.bbt && (
                            <span className="bg-pink-50/50 px-2 py-0.5 rounded border border-pink-100">
                              BBT: <strong className="text-purple-600">{item.bbt}°C</strong>
                            </span>
                          )}
                          {item.lhTestResult && item.lhTestResult !== 'Không có' && (
                            <span className="bg-pink-50/50 px-2 py-0.5 rounded border border-pink-100">
                              Trứng: <strong className="text-indigo-600">{item.lhTestResult}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openLogCycle(item)}
                          className="p-1.5 bg-white hover:bg-pink-50/50 border border-pink-150 text-text-primary rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                          title="Sửa bản ghi này"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => item.id && handleDeleteCycle(item.id)}
                          className="p-1.5 bg-white hover:bg-red-50 text-danger border border-red-200 rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                          title="Xóa bản ghi này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* -------------------------------------------------------------
          BOTTOM NAVIGATION SCAFFOLD (SÁT VỚI JETPACK COMPOSE BOTTOM NAV)
         ------------------------------------------------------------- */}
      {coupleId && (
        <nav id="bottom-navigation-bar" className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-pink-150 px-6 py-2 pb-6 flex items-center justify-around shadow-[0_-4px_24px_rgba(255,107,138,0.06)] select-none">
          <button
            onClick={() => setActiveTab('love')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 transition-all text-xs font-bold ${activeTab === 'love' ? 'text-primary scale-105' : 'text-text-secondary hover:text-text-primary'}`}
            id="tab-btn-love"
          >
            <div className={`p-1.5 rounded-xl ${activeTab === 'love' ? 'bg-primary/10' : 'bg-transparent'}`}>
              <Heart className={`w-5 h-5 ${activeTab === 'love' ? 'fill-primary stroke-primary' : ''}`} />
            </div>
            <span>Ngày Yêu ❤️</span>
          </button>

          <button
            onClick={() => setActiveTab('menstrual')}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 transition-all text-xs font-bold ${activeTab === 'menstrual' ? 'text-primary scale-105' : 'text-text-secondary hover:text-text-primary'}`}
            id="tab-btn-menstrual"
          >
            <div className={`p-1.5 rounded-xl ${activeTab === 'menstrual' ? 'bg-primary/10' : 'bg-transparent'}`}>
              <Calendar className="w-5 h-5" />
            </div>
            <span>Chu Kỳ Kinh Nguyệt 🩸</span>
          </button>
        </nav>
      )}

      {/* 1. EDIT PROFILE INFO & AVATARS DIALOG (BÀN CHỈNH SỬA THÔNG TIN & AVATAR) */}
      {showEditProfileDialog && editProfileDraft && (
        <div id="dialog-edit-profile" className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh] shadow-2xl select-text animate-scale-up text-white flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
              <h3 className="text-lg font-black text-rose-300 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-rose-500" />
                <span>Chỉnh Sửa Thông Tin & Avatar ✏️</span>
              </h3>
              <button
                onClick={() => setShowEditProfileDialog(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                id="close-edit-dialog-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pr-1 overflow-y-auto flex-1">
              {/* LOVE DATE FIELD */}
              <div className="bg-slate-950/20 p-4 border border-slate-800/80 rounded-2xl space-y-1.5">
                <label className="text-xs font-black text-slate-300 block uppercase tracking-wider">Ngày Bắt Đầu Yêu ❤️</label>
                <input
                  type="date"
                  value={editProfileDraft.loveDate}
                  onChange={(e) => setEditProfileDraft(p => p ? ({ ...p, loveDate: e.target.value }) : null)}
                  className="w-full bg-slate-100/5 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-rose-500 placeholder-slate-600 font-mono"
                />
              </div>

              {/* MALE PARTNER WORKSPACE */}
              <div className="p-4 bg-indigo-950/15 rounded-2xl border border-indigo-505/10 space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-550/10 pb-2">
                  <span className="text-[11px] font-black tracking-widest text-indigo-400 uppercase">Thông tin bạn Nam 👦</span>
                  <span className="text-[10px] text-indigo-350 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/15">Đối tác ♂️</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Live Avatar Preview Circle */}
                  <div className="relative shrink-0">
                    {editProfileDraft.maleAvatar ? (
                      <ScaledAvatar
                        src={editProfileDraft.maleAvatar}
                        scale={editProfileDraft.maleScale || 1.0}
                        offsetX={editProfileDraft.maleOffsetX || 0}
                        offsetY={editProfileDraft.maleOffsetY || 0}
                        className="w-20 h-20 border-2 border-indigo-400 bg-slate-850 shadow-lg cursor-pointer hover:border-indigo-400 hover:scale-105 transition-all"
                        alt="Draft Male Avatar"
                        onClick={() => {
                          if (editProfileDraft.maleAvatar) {
                            setActiveGestureEditor({
                              type: 'avatar_male',
                              imageUrl: editProfileDraft.maleAvatar,
                              initialScale: editProfileDraft.maleScale || 1.0,
                              initialOffsetX: editProfileDraft.maleOffsetX || 0,
                              initialOffsetY: editProfileDraft.maleOffsetY || 0
                            });
                          }
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full border-2 border-indigo-400/60 bg-slate-850 flex items-center justify-center text-3xl select-none">👦</div>
                    )}

                    {/* Camera Icon triggers file upload */}
                    <label
                      className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-full cursor-pointer text-white shadow-xl transition-all hover:scale-110"
                      title="Chọn ảnh chân dung Nam từ máy"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadDraftFile('maleAvatar', e)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Basic info input fields */}
                  <div className="flex-1 space-y-3 w-full">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Biệt danh bạn Nam:</label>
                      <input
                        type="text"
                        placeholder="Tên hoặc biệt danh..."
                        value={editProfileDraft.maleName}
                        onChange={(e) => setEditProfileDraft(p => p ? ({ ...p, maleName: e.target.value }) : null)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Ngày sinh Bạn Nam:</label>
                      <input
                        type="date"
                        value={editProfileDraft.maleBirthday}
                        onChange={(e) => setEditProfileDraft(p => p ? ({ ...p, maleBirthday: e.target.value }) : null)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Gestural Adjustment Trigger instead of buttons */}
                {editProfileDraft.maleAvatar ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!editProfileDraft.maleAvatar) return;
                      setActiveGestureEditor({
                        type: 'avatar_male',
                        imageUrl: editProfileDraft.maleAvatar,
                        initialScale: editProfileDraft.maleScale || 1.0,
                        initialOffsetX: editProfileDraft.maleOffsetX || 0,
                        initialOffsetY: editProfileDraft.maleOffsetY || 0
                      });
                    }}
                    className="w-full py-2.5 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/30 rounded-xl text-xs font-bold text-indigo-300 transition-all flex items-center justify-center gap-1.5 active:scale-98"
                  >
                    <Smartphone className="w-4 h-4 text-indigo-400" />
                    <span>Căn chỉnh bằng Gestures 🖐️</span>
                  </button>
                ) : (
                  <p className="text-[11px] text-indigo-300/60 font-semibold leading-relaxed bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10 animate-fade-in">
                    Bấm biểu tượng camera trên để chọn ảnh chân dung và mở trình căn chỉnh Full-screen.
                  </p>
                )}
              </div>

              {/* FEMALE PARTNER WORKSPACE */}
              <div className="p-4 bg-pink-950/15 rounded-2xl border border-pink-505/10 space-y-4">
                <div className="flex items-center justify-between border-b border-pink-550/10 pb-2">
                  <span className="text-[11px] font-black tracking-widest text-pink-400 uppercase">Thông tin bạn Nữ 👧</span>
                  <span className="text-[10px] text-pink-350 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/15">Đối tác ♀️</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Live Avatar Preview Circle */}
                  <div className="relative shrink-0">
                    {editProfileDraft.femaleAvatar ? (
                      <ScaledAvatar
                        src={editProfileDraft.femaleAvatar}
                        scale={editProfileDraft.femaleScale || 1.0}
                        offsetX={editProfileDraft.femaleOffsetX || 0}
                        offsetY={editProfileDraft.femaleOffsetY || 0}
                        className="w-20 h-20 border-2 border-pink-400 bg-slate-850 shadow-lg cursor-pointer hover:border-pink-400 hover:scale-105 transition-all"
                        alt="Draft Female Avatar"
                        onClick={() => {
                          if (editProfileDraft.femaleAvatar) {
                            setActiveGestureEditor({
                              type: 'avatar_female',
                              imageUrl: editProfileDraft.femaleAvatar,
                              initialScale: editProfileDraft.femaleScale || 1.0,
                              initialOffsetX: editProfileDraft.femaleOffsetX || 0,
                              initialOffsetY: editProfileDraft.femaleOffsetY || 0
                            });
                          }
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full border-2 border-pink-400/60 bg-slate-850 flex items-center justify-center text-3xl select-none">👧</div>
                    )}

                    {/* Camera Icon triggers file upload */}
                    <label
                      className="absolute bottom-0 right-0 p-2 bg-pink-600 hover:bg-pink-500 rounded-full cursor-pointer text-white shadow-xl transition-all hover:scale-110"
                      title="Chọn ảnh chân dung Nữ từ máy"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUploadDraftFile('femaleAvatar', e)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Basic info input fields */}
                  <div className="flex-1 space-y-3 w-full">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Biệt danh bạn Nữ:</label>
                      <input
                        type="text"
                        placeholder="Tên hoặc biệt danh..."
                        value={editProfileDraft.femaleName}
                        onChange={(e) => setEditProfileDraft(p => p ? ({ ...p, femaleName: e.target.value }) : null)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-pink-500 font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Ngày sinh Bạn Nữ:</label>
                      <input
                        type="date"
                        value={editProfileDraft.femaleBirthday}
                        onChange={(e) => setEditProfileDraft(p => p ? ({ ...p, femaleBirthday: e.target.value }) : null)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Gestural Adjustment Trigger instead of buttons */}
                {editProfileDraft.femaleAvatar ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!editProfileDraft.femaleAvatar) return;
                      setActiveGestureEditor({
                        type: 'avatar_female',
                        imageUrl: editProfileDraft.femaleAvatar,
                        initialScale: editProfileDraft.femaleScale || 1.0,
                        initialOffsetX: editProfileDraft.femaleOffsetX || 0,
                        initialOffsetY: editProfileDraft.femaleOffsetY || 0
                      });
                    }}
                    className="w-full py-2.5 bg-pink-950/40 hover:bg-pink-900/60 border border-pink-800/30 rounded-xl text-xs font-bold text-pink-300 transition-all flex items-center justify-center gap-1.5 active:scale-98"
                  >
                    <Smartphone className="w-4 h-4 text-pink-400" />
                    <span>Căn chỉnh bằng Gestures 🖐️</span>
                  </button>
                ) : (
                  <p className="text-[11px] text-pink-300/60 font-semibold leading-relaxed bg-pink-500/5 p-3 rounded-xl border border-pink-500/10 animate-fade-in">
                    Bấm biểu tượng camera trên để chọn ảnh chân dung và mở trình căn chỉnh Full-screen.
                  </p>
                )}
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex flex-wrap gap-3 mt-6 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setEditProfileDraft(null);
                  setShowEditProfileDialog(false);
                }}
                className="flex-1 min-w-[120px] py-3 border border-slate-800 bg-slate-950 hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-400 transition-colors"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditProfileDraft(prev => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      maleScale: 1.0,
                      maleOffsetX: 0,
                      maleOffsetY: 0,
                      femaleScale: 1.0,
                      femaleOffsetX: 0,
                      femaleOffsetY: 0
                    };
                  });
                }}
                className="py-3 px-4 border border-slate-800 bg-slate-950 text-slate-350 hover:bg-slate-850 rounded-xl text-xs font-semibold hover:border-slate-750 transition-colors"
              >
                Cài lại góc chân dung 📐
              </button>

              <button
                onClick={handleSaveProfile}
                className="flex-1 min-w-[150px] py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white rounded-xl text-xs font-black shadow-lg hover:shadow-rose-950/20 transition-all active:scale-98"
                id="save-profile-btn"
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CHỈNH SỬA HÌNH NỀN DIALOG (CHOOSING & NUDGING WALLPAPER - DRAG-FREE COMPASS CONTROLLER) */}
      {showWallpaperDialog && editProfileDraft && (
        <div id="dialog-edit-wallpaper" className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 overflow-y-auto max-h-[90vh] shadow-2xl select-text animate-scale-up text-white flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
              <h3 className="text-rose-600 font-black text-indigo-350 flex items-center gap-2">
                <span>Chỉnh Sửa Hình Nền Tình Yêu 🎨</span>
              </h3>
              <button
                onClick={() => setShowWallpaperDialog(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                id="close-wallpaper-dialog-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pr-1 overflow-y-auto flex-1 select-none">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-pink-450 block mb-1">Mẫu Gradient có sẵn hoặc hình riêng của bạn</span>
                <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">Bấm chọn một hình nền gradient ngọt ngào bên dưới hoặc trực tiếp tải lên một bức ảnh kỷ niệm từ thư viện thiết bị của bạn.</p>
              </div>

              {/* Grid of Default Preset Wallpapers & Device Upload Input */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditProfileDraft(p => p ? ({ ...p, backgroundImage: 'preset_1' }) : null)}
                  className={`py-2 px-3 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-700 font-bold text-[10px] text-white border-2 border-transparent transition-all hover:bg-opacity-100 ${editProfileDraft.backgroundImage === 'preset_1' ? 'border-pink-400 scale-[1.02]' : 'opacity-85'}`}
                >
                  Sunset Purple
                </button>
                <button
                  type="button"
                  onClick={() => setEditProfileDraft(p => p ? ({ ...p, backgroundImage: 'preset_2' }) : null)}
                  className={`py-2 px-3 rounded-xl bg-gradient-to-tr from-orange-400 to-pink-500 font-bold text-[10px] text-white border-2 border-transparent transition-all hover:bg-opacity-100 ${editProfileDraft.backgroundImage === 'preset_2' ? 'border-pink-400 scale-[1.02]' : 'opacity-85'}`}
                >
                  Peach Glow
                </button>
                <button
                  type="button"
                  onClick={() => setEditProfileDraft(p => p ? ({ ...p, backgroundImage: 'preset_3' }) : null)}
                  className={`py-2 px-3 rounded-xl bg-gradient-to-tr from-[#CDB4DB] via-[#FFC8DD] to-[#FFA2B6] font-bold text-[10px] text-slate-900 border-2 border-transparent transition-all hover:bg-opacity-100 ${editProfileDraft.backgroundImage === 'preset_3' ? 'border-pink-400 scale-[1.02]' : 'opacity-85'}`}
                >
                  Lavender Soft
                </button>

                <label
                  className={`py-2 px-3 rounded-xl bg-slate-855 hover:bg-slate-800 border-2 flex flex-col items-center justify-center font-bold text-[10px] text-slate-300 cursor-pointer transition-all border-dashed ${editProfileDraft.backgroundImage && !editProfileDraft.backgroundImage.startsWith('preset_') ? 'border-pink-400 scale-[1.02]' : 'border-slate-755'}`}
                >
                  <span className="text-center">Thêm ảnh tự chọn máy 📤</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadDraftFile('backgroundImage', e)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Dynamic background thumbnail live preview container with drag-to-pan */}
              <div className="border-t border-slate-805/80 pt-4 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 block">Căn chỉnh bằng cử chỉ Gestures 🖐️</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                    Căn chỉnh ảnh bìa bằng cách mở bàn chỉnh Gestures và sử dụng hai ngón tay trên màn hình toàn màn hình để xoay, thu phóng hoặc di dời mượt mà.
                  </p>
                </div>

                <div
                  onClick={() => {
                    if (editProfileDraft.backgroundImage) {
                      setActiveGestureEditor({
                        type: 'background',
                        imageUrl: editProfileDraft.backgroundImage,
                        initialScale: editProfileDraft.bgScale || 1.0,
                        initialOffsetX: editProfileDraft.bgOffsetX || 0,
                        initialOffsetY: editProfileDraft.bgOffsetY || 0
                      });
                    }
                  }}
                  className={`w-full h-28 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 relative flex items-center justify-center shadow-inner select-none cursor-pointer hover:border-pink-500 hover:scale-101 transition-all`}
                  title="Bấm để mở căn chỉnh cử chỉ"
                >
                  <span className="absolute z-10 text-[9px] bg-white text-slate-900 font-bold uppercase tracking-wider shadow px-2.5 py-1 rounded-lg">
                    Bấm để căn chỉnh tinh tế 🖐️
                  </span>
                  
                  <div
                    className="absolute inset-0 select-none pointer-events-none"
                    style={{
                      ...(editProfileDraft.backgroundImage && editProfileDraft.backgroundImage.startsWith('preset_')
                        ? (editProfileDraft.backgroundImage === 'preset_1'
                          ? { background: 'linear-gradient(135deg, #8E2DE2, #4A00E0)' }
                          : editProfileDraft.backgroundImage === 'preset_2'
                            ? { background: 'linear-gradient(135deg, #FF9966, #FF5E62)' }
                            : { background: 'linear-gradient(135deg, #CDB4DB, #FFC8DD, #FFA2B6)' })
                        : editProfileDraft.backgroundImage
                          ? { backgroundImage: `url(${editProfileDraft.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
                          : { background: 'linear-gradient(135deg, #FF8DA1, #FFB5C5, #FFE5EC)' }
                      ),
                      transform: `scale(${editProfileDraft.bgScale || 1.0}) translate(${editProfileDraft.bgOffsetX || 0}px, ${editProfileDraft.bgOffsetY || 0}px) rotate(${editProfileDraft.bgRotation || 0}deg)`,
                      transformOrigin: 'center center'
                    }}
                  />
                </div>

                {/* Gestural Adjustment Trigger instead of dual buttons & indicators */}
                {editProfileDraft.backgroundImage ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!editProfileDraft.backgroundImage) return;
                      setActiveGestureEditor({
                        type: 'background',
                        imageUrl: editProfileDraft.backgroundImage,
                        initialScale: editProfileDraft.bgScale || 1.0,
                        initialOffsetX: editProfileDraft.bgOffsetX || 0,
                        initialOffsetY: editProfileDraft.bgOffsetY || 0
                      });
                    }}
                    className="w-full py-2.5 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/30 rounded-xl text-xs font-bold text-indigo-300 transition-all flex items-center justify-center gap-1.5 active:scale-98"
                  >
                    <Smartphone className="w-4 h-4 text-indigo-400" />
                    <span>Căn chỉnh bằng Gestures toàn màn hình 🖐️</span>
                  </button>
                ) : (
                  <p className="text-[11px] text-pink-300/60 font-semibold leading-relaxed bg-pink-500/5 p-3 rounded-xl border border-pink-500/10 animate-fade-in">
                    Hãy chọn một Preset hoặc Tải ảnh từ thư viện lên để mở trình căn chỉnh cử chỉ.
                  </p>
                )}
              </div>
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex flex-wrap gap-3 mt-6 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setEditProfileDraft(null);
                  setShowWallpaperDialog(false);
                }}
                className="flex-1 min-w-[120px] py-3 border border-slate-800 bg-slate-950 hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-400 transition-colors"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditProfileDraft(prev => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      bgScale: 1.0,
                      bgOffsetX: 0,
                      bgOffsetY: 0,
                      bgRotation: 0
                    };
                  });
                }}
                className="py-3 px-4 border border-slate-800 bg-slate-950 text-slate-350 hover:bg-slate-850 rounded-xl text-xs font-semibold hover:border-slate-750 transition-colors"
              >
                Cài lại góc nền 📐
              </button>

              <button
                onClick={handleSaveProfile}
                className="flex-1 min-w-[150px] py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-black shadow-lg hover:shadow-indigo-950/20 transition-all active:scale-98"
                id="save-wallpaper-btn"
              >
                Lưu Hình Nền
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TIMELINE MILESTONES SCROLL DIALOG */}
      {showMilestonesDialog && (
        <div id="dialog-love-milestones" className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 flex flex-col max-h-[85vh] shadow-2xl animate-scale-up select-text">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-3 shrink-0">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-1.5">
                 
                  <span className="text-rose-500 font-black">Sổ Mốc Kỷ Niệm Tình Yêu 📖</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Dòng thời gian các cột mốc ý nghĩa của gia đình bạn</p>
              </div>
              <button
                onClick={() => setShowMilestonesDialog(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                id="close-milestones-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scroll list with nearest upcoming focus highlight */}
            <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1.5 scrollbar-thin scrollbar-thumb-slate-800">
              {calculatedMilestones.map((item, idx) => {
                const isPast = item.daysRemaining < 0;
                const isNearest = idx === nearestMilestoneIndex;

                let borderStyle = 'border-slate-800 bg-slate-900/60';
                let titleColor = 'text-slate-100';
                let dateColor = 'text-slate-400';
                let remainingBadge = 'text-rose-400 bg-rose-500/10 border border-rose-500/20';

                if (isNearest) {
                  borderStyle = 'border-rose-300 bg-rose-50 ring-2 ring-rose-400/30';
                  titleColor = 'text-rose-950 font-black';
                  dateColor = 'text-rose-700 font-semibold';
                  remainingBadge = 'text-rose-400 bg-rose-500/10 border border-rose-500/20 font-bold';
                } else if (isPast) {
                  borderStyle = 'border-slate-800/40 bg-slate-950/30 opacity-45';
                  titleColor = 'text-slate-400';
                  dateColor = 'text-slate-500';
                }

                return (
                  <div
                    key={idx}
                    id={`milestone-item-${idx}`}
                    className={`border p-3.5 rounded-2xl flex items-center justify-between gap-4 transition-all ${borderStyle}`}
                  >
                    <div className="space-y-1 bg-transparent">
                      {isNearest && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-600 text-[10px] font-black text-white uppercase tracking-wider animate-pulse mb-1">
                          <Heart className="w-3 h-3 fill-white text-white" />
                          <span>Mốc sự kiện kế tiếp cận kề ✨</span>
                        </span>
                      )}
                      <h4 className={`text-sm font-bold ${titleColor}`}>{item.title}</h4>
                      <p className={`text-[11px] font-medium ${dateColor}`}>Lịch bàn: {CoupleUtils.formatDisplayDate(item.dateStr)}</p>
                    </div>

                    <div className="text-right shrink-0 bg-transparent">
                      {isPast ? (
                        <span className="text-[10px] bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-slate-500 font-semibold uppercase">
                          Đã qua
                        </span>
                      ) : item.daysRemaining === 0 ? (
                        <span className="text-xs bg-rose-500 text-white font-black py-1 px-3 rounded-lg shadow-lg uppercase tracking-wide inline-block animate-bounce">
                          Hôm Nay! ✨
                        </span>
                      ) : (
                        <span className={`text-xs py-1.5 px-3 rounded-xl block ${remainingBadge}`}>
                          Còn <strong>{item.daysRemaining}</strong> ngày
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowMilestonesDialog(false)}
              className="w-full mt-4 py-3 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl font-bold text-xs shadow-md transition-colors shrink-0"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* 4. DIALOG LOG / EDIT MENSTRUAL CYCLE */}
      {showLogCycleDialog && (
        <div id="dialog-log-menstrual" className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 overflow-y-auto max-h-[95vh] shadow-2xl select-text animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800/85 pb-4 mb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-rose-500" />
                <span>{logId ? "Chỉnh sửa chu kỳ ✏️" : "Ghi nhận chu kỳ mới 🩸"}</span>
              </h3>
              <button
                onClick={() => setShowLogCycleDialog(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                id="close-log-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {logError && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-2xl p-3.5 text-xs text-red-300 flex items-start gap-1.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{logError}</span>
              </div>
            )}

            <div className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-bold block uppercase tracking-wide">1. Ngày bắt đầu kỳ kinh (*)</label>
                <input
                  type="date"
                  value={logStartDate}
                  onChange={(e) => setLogStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-bold block uppercase tracking-wide">2. Chu Kỳ (ngày)</label>
                  <input
                    type="number"
                    min="21" max="40"
                    value={logCycleLength}
                    onChange={(e) => setLogCycleLength(parseInt(e.target.value) || 28)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[10px] text-slate-500">Giới hạn: 21 - 40 ngày</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-bold block uppercase tracking-wide">3. Số ngày hành kinh</label>
                  <input
                    type="number"
                    min="2" max="10"
                    value={logPeriodLength}
                    onChange={(e) => setLogPeriodLength(parseInt(e.target.value) || 5)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[10px] text-slate-500">Giới hạn: 2 - 10 ngày</span>
                </div>
              </div>

              <div className="border-t border-slate-850 my-2"></div>

              {/* DYNAMIC SYMPTOM LOG DETAILS */}
              <div className="space-y-3.5 p-3.5 bg-slate-950/40 border border-slate-850 rounded-2xl">
                <span className="text-[10px] font-black tracking-widest text-slate-400 block uppercase">Chỉ số sinh lý mở rộng (Tùy chọn)</span>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 block font-bold">Thử nghiệm rụng trứng LH:</label>
                  <select
                    value={logLhTest}
                    onChange={(e) => setLogLhTest(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-505"
                  >
                    <option value="Không có">Không có dữ liệu</option>
                    <option value="Dương tính (Đạt đỉnh)">Dương tính (Đạt đỉnh 🥚)</option>
                    <option value="Âm tính">Âm tính</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 block font-bold">Nhiệt độ cơ thể cơ sở (BBT °C):</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 36.6"
                    value={logBbt}
                    onChange={(e) => setLogBbt(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-505"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 block font-bold">Trạng thái dịch tử cung:</label>
                  <select
                    value={logMucus}
                    onChange={(e) => setLogMucus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-505"
                  >
                    <option value="Bình thường">Bình thường</option>
                    <option value="Dai dính">Dai dính</option>
                    <option value="Trắng đục dẻo">Trắng đục dẻo</option>
                    <option value="Loãng ướt (Lòng trắng trứng)">Loãng ướt (Lòng trắng trứng ✨)</option>
                  </select>
                </div>
              </div>

            </div>

            <div className="flex gap-3 mt-6 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowLogCycleDialog(false)}
                className="flex-1 py-2.5 border border-slate-800 bg-slate-950 hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-400 transition-colors"
                id="cancel-save-cycle-btn"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveCycle}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg transition-all"
                id="save-cycle-confirm-btn"
              >
                Lưu Ghi Nhật Nhật
              </button>
            </div>
          </div>
        </div>
      )}

      {activeGestureEditor && editProfileDraft && (
        <GestureImageEditor
          type={activeGestureEditor.type}
          imageUrl={activeGestureEditor.imageUrl}
          initialScale={activeGestureEditor.initialScale}
          initialOffsetX={activeGestureEditor.initialOffsetX}
          initialOffsetY={activeGestureEditor.initialOffsetY}
          onSave={handleSaveGestureCorrection}
          onCancel={() => setActiveGestureEditor(null)}
          maleName={editProfileDraft.maleName}
          femaleName={editProfileDraft.femaleName}
        />
      )}

    </div>
  );
}
