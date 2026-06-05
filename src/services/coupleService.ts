import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/firebase';
import { generateCoupleId } from '../utils/generateCoupleId';

export interface CoupleData {
  profile: any;
  cycles: any[];
  aiResult: any | null;
  settings: any | null;
  updatedAt?: any;
}

/**
 * Checks if a Firestore error is related to network/offline status
 */
function isOfflineError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || String(error)).toLowerCase();
  return (
    msg.includes('offline') || 
    msg.includes('network') || 
    msg.includes('failed to get document') || 
    msg.includes('browser-connection-lost') ||
    msg.includes('unavailable')
  );
}

/**
 * Creates a new couple document on Firestore with initial state.
 * Generates a random couple ID (LOVE-XXXXXX).
 * Saves the newly created code into localStorage.
 */
export async function createCouple(initialData: CoupleData): Promise<string> {
  let coupleId = '';
  let exists = true;
  let attempts = 0;

  // Try generating a unique room ID that doesn't conflict (max 5 retries for extreme safety)
  while (exists && attempts < 5) {
    coupleId = generateCoupleId();
    attempts++;
    try {
      const docRef = doc(db, 'couples', coupleId);
      const snapshot = await getDoc(docRef);
      exists = snapshot.exists();
    } catch (err: any) {
      console.warn("Retrying couple code availability: ", err);
      if (isOfflineError(err)) {
        exists = false;
      } else {
        exists = false; // default to false so we try to set it, which will fail if permissions deny
      }
    }
  }

  const path = `couples/${coupleId}`;
  try {
    const docRef = doc(db, 'couples', coupleId);
    await setDoc(docRef, {
      profile: initialData.profile,
      cycles: initialData.cycles,
      aiResult: initialData.aiResult || null,
      settings: initialData.settings || null,
      updatedAt: serverTimestamp()
    });

    localStorage.setItem('youlove_offline_room_' + coupleId, JSON.stringify(initialData));
    localStorage.setItem('youlove_couple_id', coupleId);
    return coupleId;
  } catch (error: any) {
    if (isOfflineError(error)) {
      console.warn("Offline fallback activation for room creation:", coupleId);
      localStorage.setItem('youlove_offline_room_' + coupleId, JSON.stringify(initialData));
      localStorage.setItem('youlove_couple_id', coupleId);
      return coupleId;
    }
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Prepares and sanitizes any user inputted couple/room text.
 * Handles bare codes (e.g. "FOIE4U"), full room IDs (e.g. "LOVE-FOIE4U"), or shared URLs with "?room=LOVE-FOIE4U".
 */
export function extractCoupleId(input: string): string {
  let text = input.trim();
  try {
    if (text.includes('?')) {
      const urlParams = new URLSearchParams(text.substring(text.indexOf('?')));
      const roomVal = urlParams.get('room');
      if (roomVal) {
        text = roomVal;
      }
    } else if (text.includes('/')) {
      const parts = text.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart.toUpperCase().includes('LOVE-') || lastPart.length === 6) {
        text = lastPart;
      }
    }
  } catch (e) {
    console.warn("Error parsing potential URL in room ID input, fallback to text: ", e);
  }

  let sanitized = text.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!sanitized.startsWith('LOVE-')) {
    sanitized = `LOVE-${sanitized}`;
  }
  return sanitized;
}

/**
 * Joins an existing couple room.
 * Fetches data to verify its existence, then saves the ID to localStorage.
 */
export async function joinCouple(coupleId: string): Promise<CoupleData> {
  const sanitizedId = extractCoupleId(coupleId);
  if (sanitizedId.length < 11) {
    throw new Error('Mã liên kết không hợp lệ. Mã phải có dạng LOVE-XXXXXX (ví dụ: LOVE-FOIE4U hoặc FOIE4U)');
  }

  const data = await loadCouple(sanitizedId);
  localStorage.setItem('youlove_couple_id', sanitizedId);
  return data;
}

/**
 * Loads couple data once from Firestore.
 */
export async function loadCouple(coupleId: string): Promise<CoupleData> {
  const path = `couples/${coupleId}`;
  try {
    const docRef = doc(db, 'couples', coupleId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      // Check if we have offline-first copy of it
      const localStr = localStorage.getItem('youlove_offline_room_' + coupleId);
      if (localStr) {
        try {
          const parsed = JSON.parse(localStr);
          return {
            profile: parsed.profile,
            cycles: parsed.cycles || [],
            aiResult: parsed.aiResult || null,
            settings: parsed.settings || null,
            updatedAt: parsed.updatedAt
          };
        } catch (_) {}
      }
      throw new Error(`Không tìm thấy phòng liên kết: ${coupleId}. Vui lòng kiểm tra lại mã số.`);
    }
    const data = docSnap.data() as any;
    const model = {
      profile: data.profile,
      cycles: data.cycles || [],
      aiResult: data.aiResult || null,
      settings: data.settings || null,
      updatedAt: data.updatedAt
    };
    // Cache successfully loaded data to local storage for future offline access
    localStorage.setItem('youlove_offline_room_' + coupleId, JSON.stringify(model));
    return model;
  } catch (error: any) {
    if (error.message && error.message.includes('Không tìm thấy phòng liên kết')) {
      throw error;
    }
    if (isOfflineError(error)) {
      console.warn("Reading couple from local cache due to offline state.");
      // Read local-only simulated data
      const localStr = localStorage.getItem('youlove_offline_room_' + coupleId);
      if (localStr) {
        try {
          const parsed = JSON.parse(localStr);
          return {
            profile: parsed.profile,
            cycles: parsed.cycles || [],
            aiResult: parsed.aiResult || null,
            settings: parsed.settings || null,
            updatedAt: parsed.updatedAt
          };
        } catch (_) {}
      }
      
      // If no room-specific cache exists yet but we are offline, let's bootstrap with current local storage states
      let fallbackProfile = { maleName: 'Bạn Nam', femaleName: 'Bạn Nữ', maleBirthday: '2000-01-01', femaleBirthday: '2000-01-01', loveDate: '2026-01-01' };
      let fallbackCycles: any[] = [];
      let fallbackAi = null;
      try {
        const pStr = localStorage.getItem('youlove_couple_profile');
        if (pStr) fallbackProfile = JSON.parse(pStr);
        const cStr = localStorage.getItem('youlove_menstrual_cycles');
        if (cStr) fallbackCycles = JSON.parse(cStr);
        const aStr = localStorage.getItem('youlove_ai_result');
        if (aStr) fallbackAi = JSON.parse(aStr);
      } catch (_) {}

      const bsData = {
        profile: fallbackProfile,
        cycles: fallbackCycles,
        aiResult: fallbackAi,
        settings: null,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('youlove_offline_room_' + coupleId, JSON.stringify(bsData));
      return bsData;
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Saves/updates couple data to Firestore.
 */
export async function saveCouple(coupleId: string, data: Partial<CoupleData>): Promise<void> {
  const path = `couples/${coupleId}`;
  
  // Update local storage representation first for instant snappy local cache responsiveness
  let current: any = {};
  const localStr = localStorage.getItem('youlove_offline_room_' + coupleId);
  if (localStr) {
    try {
      current = JSON.parse(localStr);
    } catch (_) {}
  } else {
    try {
      current.profile = JSON.parse(localStorage.getItem('youlove_couple_profile') || 'null');
      current.cycles = JSON.parse(localStorage.getItem('youlove_menstrual_cycles') || '[]');
      current.aiResult = JSON.parse(localStorage.getItem('youlove_ai_result') || 'null');
    } catch (_) {}
  }
  
  const merged = {
    ...current,
    ...data,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem('youlove_offline_room_' + coupleId, JSON.stringify(merged));

  try {
    const docRef = doc(db, 'couples', coupleId);
    await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error: any) {
    if (isOfflineError(error)) {
      console.warn("Synchronous firebase push deferred (saving locally offline)");
      return; // resolve successfully to keep app working perfectly in offline mode
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribes to real-time changes in the couple room.
 */
export function subscribeCouple(
  coupleId: string, 
  callback: (data: CoupleData) => void,
  onError?: (error: any) => void
): () => void {
  const path = `couples/${coupleId}`;
  const docRef = doc(db, 'couples', coupleId);

  // Set up local storage dynamic polling listener so real-time updates happen instantly if offline
  let lastLocalStr = localStorage.getItem('youlove_offline_room_' + coupleId);
  const handleLocalPoll = () => {
    const currentLoc = localStorage.getItem('youlove_offline_room_' + coupleId);
    if (currentLoc && currentLoc !== lastLocalStr) {
      lastLocalStr = currentLoc;
      try {
        const parsed = JSON.parse(currentLoc);
        callback({
          profile: parsed.profile,
          cycles: parsed.cycles || [],
          aiResult: parsed.aiResult || null,
          settings: parsed.settings || null,
          updatedAt: parsed.updatedAt
        });
      } catch (_) {}
    }
  };
  const pollTimer = setInterval(handleLocalPoll, 1000);

  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as any;
      const parsedData = {
        profile: data.profile,
        cycles: data.cycles || [],
        aiResult: data.aiResult || null,
        settings: data.settings || null,
        updatedAt: data.updatedAt
      };
      
      // Cache latest remote doc values
      localStorage.setItem('youlove_offline_room_' + coupleId, JSON.stringify(parsedData));
      lastLocalStr = JSON.stringify(parsedData);
      callback(parsedData);
    } else {
      if (onError) {
        onError(new Error(`Không tìm thấy phòng liên kết: ${coupleId}. Vui lòng kiểm tra lại mã số.`));
      }
    }
  }, (error) => {
    if (isOfflineError(error)) {
      console.warn("Real-time network listener disconnected. Proceeding with simulated offline subscriber.");
      // Trigger callback with current local cached data right now since network is off
      const currentLoc = localStorage.getItem('youlove_offline_room_' + coupleId);
      if (currentLoc) {
        try {
          const parsed = JSON.parse(currentLoc);
          callback({
            profile: parsed.profile,
            cycles: parsed.cycles || [],
            aiResult: parsed.aiResult || null,
            settings: parsed.settings || null,
            updatedAt: parsed.updatedAt
          });
        } catch (_) {}
      }
      return; // Do not bubble up error to trigger system alert since offline is gracefully simulated
    }
    if (onError) {
      onError(error);
    } else {
      handleFirestoreError(error, OperationType.GET, path);
    }
  });

  return () => {
    clearInterval(pollTimer);
    unsubscribe();
  };
}

/**
 * Generates copyable url sharing link.
 */
export function generateShareLink(coupleId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://hiepngoanne2060-star.github.io/YouLove/';
  return `${origin}?room=${coupleId}`;
}
