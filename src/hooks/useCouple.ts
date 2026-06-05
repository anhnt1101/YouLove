import { useState, useEffect, useCallback } from 'react';
import * as coupleService from '../services/coupleService';
import { CoupleData } from '../services/coupleService';

export function useCouple(
  onDataUpdate: (data: CoupleData) => void
) {
  const [coupleId, setCoupleId] = useState<string | null>(() => {
    return localStorage.getItem('youlove_couple_id');
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(() => {
    return !!localStorage.getItem('youlove_couple_id');
  });
  const [error, setError] = useState<string | null>(null);

  // Parse URL query parameter: room or room/couple ID from shared navigation link
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      if (urlRoom) {
        const cleanRoom = coupleService.extractCoupleId(urlRoom);
        if (cleanRoom.length >= 11) {
          localStorage.setItem('youlove_couple_id', cleanRoom);
          setCoupleId(cleanRoom);
          
          // Clear query params elegantly without triggering whole page reloads
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
    } catch (err) {
      console.error("Error reading room query parameter on init:", err);
    }
  }, []);

  // Sync state & register listeners for couples document in real-time
  useEffect(() => {
    if (!coupleId) return;

    setIsSyncing(true);
    setError(null);

    let isDisposed = false;

    // Establish onSnapshot listener connection with secure error handling
    const unsubscribe = coupleService.subscribeCouple(coupleId, (data) => {
      if (!isDisposed) {
        onDataUpdate(data);
        setError(null);
        setIsSyncing(false);
      }
    }, (err) => {
      if (!isDisposed) {
        console.error("Real-time sync listener failed: ", err);
        setError(err.message || "Lỗi kết nối thời gian thực với phòng chia sẻ.");
        setIsSyncing(false);
        // If room doesn't exist, disconnect automatically to prevent stuck screens
        if (err.message && err.message.includes('Không tìm thấy phòng liên kết')) {
          localStorage.removeItem('youlove_couple_id');
          setCoupleId(null);
        }
      }
    });

    return () => {
      isDisposed = true;
      unsubscribe();
    };
  }, [coupleId]);

  const createRoom = useCallback(async (initialData: CoupleData) => {
    setIsCreating(true);
    setError(null);
    try {
      const newId = await coupleService.createCouple(initialData);
      setCoupleId(newId);
      setIsCreating(false);
      return newId;
    } catch (err: any) {
      console.error("Room creation error:", err);
      setError(err.message || "Lỗi khi tạo phòng liên kết.");
      setIsCreating(false);
      throw err;
    }
  }, []);

  const joinRoom = useCallback(async (id: string) => {
    setIsJoining(true);
    setError(null);
    try {
      const docData = await coupleService.joinCouple(id);
      onDataUpdate(docData);
      const sanitizedId = coupleService.extractCoupleId(id);
      setCoupleId(sanitizedId);
      setIsJoining(false);
      return sanitizedId;
    } catch (err: any) {
      console.error("Room joining error:", err);
      setError(err.message || "Lỗi khi tham gia phòng liên kết.");
      setIsJoining(false);
      throw err;
    }
  }, [onDataUpdate]);

  const updateRoom = useCallback(async (data: Partial<CoupleData>) => {
    if (!coupleId) return;
    try {
      await coupleService.saveCouple(coupleId, data);
    } catch (err: any) {
      console.error("Room saving error:", err);
      setError(err.message || "Không thể đồng bộ dữ liệu lên đám mây.");
    }
  }, [coupleId]);

  const disconnectRoom = useCallback(() => {
    localStorage.removeItem('youlove_couple_id');
    setCoupleId(null);
    setError(null);
  }, []);

  return {
    coupleId,
    isCreating,
    isJoining,
    isSyncing,
    error,
    setError,
    createRoom,
    joinRoom,
    updateRoom,
    disconnectRoom,
    shareLink: coupleId ? coupleService.generateShareLink(coupleId) : ''
  };
}
