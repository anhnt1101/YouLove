import React, { useState, useRef, useEffect } from 'react';
import { Check, Laptop, Smartphone, HelpCircle, RefreshCw } from 'lucide-react';

interface GestureImageEditorProps {
  type: 'avatar_male' | 'avatar_female' | 'background';
  imageUrl: string;
  initialScale?: number;
  initialOffsetX?: number;
  initialOffsetY?: number;
  onSave: (scale: number, offsetX: number, offsetY: number) => void;
  onCancel: () => void;
  maleName?: string;
  femaleName?: string;
}

export const GestureImageEditor: React.FC<GestureImageEditorProps> = ({
  type,
  imageUrl,
  initialScale = 1.0,
  initialOffsetX = 0,
  initialOffsetY = 0,
  onSave,
  onCancel,
  maleName = "Bạn Nam",
  femaleName = "Bạn Nữ"
}) => {
  // Scale and Offset states
  const [scale, setScale] = useState<number>(initialScale);
  const [offsetX, setOffsetX] = useState<number>(initialOffsetX);
  const [offsetY, setOffsetY] = useState<number>(initialOffsetY);

  // References for tracking interactions
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Single-touch/Mouse interaction tracking
  const isDragging = useRef<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragOffsetStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Multi-touch pinch zoom tracking
  const activeTouchCount = useRef<number>(0);
  const pinchStartDistance = useRef<number>(0);
  const pinchStartScale = useRef<number>(1.0);
  const pinchStartCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartOffsets = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Get screen bounds
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Center coordinate of clipping areas
  const centerY = dimensions.height / 2;
  const centerX = dimensions.width / 2;

  // Sizes for the focal crops
  const avatarRadius = 120; // circular area with diameter 240
  
  // For Background cover/banner
  const bgWidth = Math.min(dimensions.width - 40, 520);
  const bgHeight = Math.round(bgWidth * 0.5); // 2:1 aspect ratio view

  // Mouse wheel scrolling for zoom (highly descriptive for desktop mouse testing!)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 0.08;
    const direction = e.deltaY < 0 ? 1 : -1;
    
    // Zoom centering logic:
    // Try to zoom centered at the cursor position
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;

    const newScale = Math.max(0.5, Math.min(5.0, scale + direction * zoomFactor));
    
    // Scale offset centering adjustment
    const ratio = newScale / scale;
    setOffsetX(prev => Math.round(mouseX - (mouseX - prev) * ratio));
    setOffsetY(prev => Math.round(mouseY - (mouseY - prev) * ratio));
    setScale(parseFloat(newScale.toFixed(3)));
  };

  // Touch start handler
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    activeTouchCount.current = e.touches.length;

    if (e.touches.length === 1) {
      // Single finger pan
      const touch = e.touches[0];
      isDragging.current = true;
      dragStart.current = { x: touch.clientX, y: touch.clientY };
      dragOffsetStart.current = { x: offsetX, y: offsetY };
    } else if (e.touches.length === 2) {
      // Double finger pinch-to-zoom
      isDragging.current = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      
      const distance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchStartDistance.current = distance;
      pinchStartScale.current = scale;
      
      // Calculate start center point helper
      pinchStartCenter.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };
      pinchStartOffsets.current = { x: offsetX, y: offsetY };
    }
  };

  // Touch move handler with simultaneous pan & zoom calculation
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && isDragging.current) {
      // Single finger drag
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.current.x;
      const dy = touch.clientY - dragStart.current.y;
      
      setOffsetX(Math.round(dragOffsetStart.current.x + dx));
      setOffsetY(Math.round(dragOffsetStart.current.y + dy));
    } else if (e.touches.length === 2 && pinchStartDistance.current > 0) {
      // Multi-touch drag & zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      
      // Current distance and center
      const currentDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const currentCenter = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };

      // Zoom dynamic ratio
      const ratio = currentDistance / pinchStartDistance.current;
      const newScale = Math.max(0.5, Math.min(5.0, pinchStartScale.current * ratio));

      // Coordinate shift between fingers' centers
      const shiftX = currentCenter.x - pinchStartCenter.current.x;
      const shiftY = currentCenter.y - pinchStartCenter.current.y;

      // Adjust overall transform for smooth concurrent dragging while zooming
      const scaleChange = newScale / pinchStartScale.current;
      
      // Get container boundaries
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeCenter = {
        x: pinchStartCenter.current.x - rect.left - rect.width / 2,
        y: pinchStartCenter.current.y - rect.top - rect.height / 2
      };

      const adjustedX = relativeCenter.x - (relativeCenter.x - pinchStartOffsets.current.x) * scaleChange + shiftX;
      const adjustedY = relativeCenter.y - (relativeCenter.y - pinchStartOffsets.current.y) * scaleChange + shiftY;

      setScale(parseFloat(newScale.toFixed(3)));
      setOffsetX(Math.round(adjustedX));
      setOffsetY(Math.round(adjustedY));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    activeTouchCount.current = e.touches.length;
    if (e.touches.length === 0) {
      isDragging.current = false;
      pinchStartDistance.current = 0;
    } else if (e.touches.length === 1) {
      // Re-trigger single drag for remaining touch
      isDragging.current = true;
      const touch = e.touches[0];
      dragStart.current = { x: touch.clientX, y: touch.clientY };
      dragOffsetStart.current = { x: offsetX, y: offsetY };
    }
  };

  // Mouse drag handlers (Desktop testing)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left click
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragOffsetStart.current = { x: offsetX, y: offsetY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffsetX(Math.round(dragOffsetStart.current.x + dx));
    setOffsetY(Math.round(dragOffsetStart.current.y + dy));
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Clean values reset
  const handleReset = () => {
    setScale(1.0);
    setOffsetX(0);
    setOffsetY(0);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-between overflow-hidden select-none">
      
      {/* 1. TOP HEADER NAVIGATION - STYLISH FLOATING PIL */}
      <div className="w-full max-w-5xl px-4 py-3 flex items-center justify-between z-50 bg-gradient-to-b from-slate-950 to-slate-950/0 absolute top-0 left-0 right-0">
        <div>
          <span className="text-rose-500 text-[10px] uppercase font-black tracking-widest block font-mono">Gesture Workspace</span>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            {type === 'avatar_male' && <span>Chỉnh sửa ảnh của {maleName} 🧔</span>}
            {type === 'avatar_female' && <span>Chỉnh sửa ảnh của {femaleName} 👩</span>}
            {type === 'background' && <span>Chỉnh sửa Hình nền Đôi lứa 🌸</span>}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-2 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all border border-slate-800"
            title="Đưa về mặc định"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-350 hover:text-white text-xs font-bold rounded-xl transition-all"
          >
            Hủy
          </button>

          <button
            onClick={() => onSave(scale, offsetX, offsetY)}
            className="px-4 py-1.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-black rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5 stroke-[3px]" />
            <span>Xong</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE / GESTURE TRACKER CANVAS */}
      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center relative touch-none bg-slate-950 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Dynamic Zooming/Panning Image */}
        {type !== 'background' ? (
          <div 
            style={{
              position: 'absolute',
              width: '240px',
              height: '240px',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              transformOrigin: 'center center',
            }} 
            className="flex items-center justify-center pointer-events-none"
          >
            <img 
              src={imageUrl} 
              alt="Source Workspace Workspace" 
              style={{
                transform: `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`,
                transition: isDragging.current ? 'none' : 'transform 0.1s cubic-bezier(0.1, 0.8, 0.2, 1)',
                maxWidth: '1200px',
                maxHeight: '85vh',
                objectFit: 'contain',
              }}
              className="pointer-events-none max-w-none origin-center"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div 
            className="absolute select-none pointer-events-none will-change-transform"
            style={{
              transform: `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`,
              transition: isDragging.current ? 'none' : 'transform 0.1s cubic-bezier(0.1, 0.8, 0.2, 1)',
            }}
          >
            {imageUrl.startsWith('preset_') ? (
              <div 
                className="w-[1200px] h-[800px] rounded-lg"
                style={{
                  background: imageUrl === 'preset_1'
                    ? 'linear-gradient(135deg, #8E2DE2, #4A00E0)'
                    : imageUrl === 'preset_2'
                      ? 'linear-gradient(135deg, #FF9966, #FF5E62)'
                      : 'linear-gradient(135deg, #CDB4DB, #FFC8DD, #FFA2B6)'
                }}
              />
            ) : (
              <img 
                src={imageUrl} 
                alt="Source Workspace Workspace" 
                className="max-w-[1200px] max-h-[85vh] object-contain pointer-events-none"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        )}

        {/* 3. SHIFT/CROP HOLE MASK (CUSTOM SVG MASK ACCORDING TO VIEW MODE) */}
        {type !== 'background' ? (
          // Avatar Crop Mask
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <defs>
              <mask id="avatar-hole-mask">
                <rect width="100%" height="100%" fill="white" />
                <circle cx={centerX} cy={centerY} r={avatarRadius} fill="black" />
              </mask>
            </defs>
            {/* Dark opaque overlay around circular hole */}
            <rect width="100%" height="100%" fill="rgba(2, 6, 23, 0.82)" mask="url(#avatar-hole-mask)" />
            {/* Aesthetic dash frame */}
            <circle cx={centerX} cy={centerY} r={avatarRadius} fill="none" stroke="rgba(244, 63, 94, 0.55)" strokeWidth="2.5" strokeDasharray="6 4" />
            <circle cx={centerX} cy={centerY} r={avatarRadius + 1} fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />
          </svg>
        ) : (
          // Background Crop Mask
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <defs>
              <mask id="bg-hole-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect 
                  x={centerX - bgWidth / 2} 
                  y={centerY - bgHeight / 2} 
                  width={bgWidth} 
                  height={bgHeight} 
                  rx="16" 
                  ry="16" 
                  fill="black" 
                />
              </mask>
            </defs>
            {/* Dark opaque overlay around centered rectangle */}
            <rect width="100%" height="100%" fill="rgba(2, 6, 23, 0.82)" mask="url(#bg-hole-mask)" />
            {/* Aesthetic dash outline */}
            <rect 
              x={centerX - bgWidth / 2} 
              y={centerY - bgHeight / 2} 
              width={bgWidth} 
              height={bgHeight} 
              rx="16" 
              ry="16" 
              fill="none" 
              stroke="rgba(244, 63, 94, 0.55)" 
              strokeWidth="2.5" 
              strokeDasharray="6 4" 
            />
            <rect 
              x={centerX - bgWidth / 2 - 1} 
              y={centerY - bgHeight / 2 - 1} 
              width={bgWidth + 2} 
              height={bgHeight + 2} 
              rx="17" 
              ry="17" 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.15)" 
              strokeWidth="1" 
            />
          </svg>
        )}

        {/* Tactile gesture manual hints label overlay */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 border border-slate-800 px-4 py-1.5 rounded-full text-[10px] text-slate-300 font-medium tracking-wide flex items-center gap-1.5 pointer-events-none text-center shadow-lg whitespace-nowrap">
          <HelpCircle className="w-3.5 h-3.5 text-rose-400 inline" />
          <span>Kéo 1 ngón/chuột để dời • Pinch 2 ngón/lăn chuột để thu phóng</span>
        </div>
      </div>

      {/* 4. REAL-TIME DUAL DEVICE PREVIEW BAR (HIỂN THỊ ĐỒNG THỜI DUAL PREVIEW CHỈ CHO BACKGROUND) */}
      {type === 'background' ? (
        <div className="w-full border-t border-slate-900/80 bg-slate-950/95 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row items-center justify-center gap-8 z-30 select-none pb-8">
          <div className="flex flex-col text-center md:text-left">
            <span className="text-xs font-black text-rose-500 uppercase tracking-widest font-mono">Real-time Previews ⚡</span>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs font-semibold">Hình nền sẽ cập nhật đồng thời trên giao diện thiết bị di động và máy tính ngay khi bạn thao tác kéo thả.</p>
          </div>

          <div className="flex flex-wrap items-end justify-center gap-6">
            
            {/* A. MOBILE PREMIUM PHONE CONTAINER */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 flex items-center gap-1">
                <Smartphone className="w-3 h-3 text-indigo-400" />
                <span>MOBILE PREVIEW</span>
              </span>
              <div 
                className="w-[100px] h-[178px] rounded-[18px] bg-slate-900 border-[3.5px] border-slate-800 shadow-xl overflow-hidden relative"
                aria-hidden="true"
              >
                {/* Notch speaker */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-3 bg-slate-800 rounded-b-lg z-20 flex items-center justify-center">
                  <div className="w-4 h-0.5 bg-slate-950 rounded" />
                </div>

                {/* Simulated dynamic wallpaper inside mobile layout */}
                <div 
                  className="absolute inset-0 z-0 origin-center transition-all bg-slate-900"
                  style={{
                    ...(imageUrl.startsWith('preset_')
                      ? (imageUrl === 'preset_1'
                        ? { background: 'linear-gradient(135deg, #8E2DE2, #4A00E0)' }
                        : imageUrl === 'preset_2'
                          ? { background: 'linear-gradient(135deg, #FF9966, #FF5E62)' }
                          : { background: 'linear-gradient(135deg, #CDB4DB, #FFC8DD, #FFA2B6)' })
                      : { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
                    ),
                    transform: `scale(${scale}) translate(${offsetX / 6}px, ${offsetY / 6}px)`,
                    transformOrigin: 'center center'
                  }}
                />

                {/* Overlaid UI components to make preview incredibly immersive */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/0 to-slate-950/90 z-10 flex flex-col justify-end p-2 text-[6px]">
                  {/* Days Counter widget */}
                  <div className="text-center w-full mb-1">
                    <span className="bg-rose-500/80 backdrop-blur-[1px] text-white font-extrabold px-1 rounded text-[5px] inline-block mb-0.5 py-0.5">188 NGÀY</span>
                    <div className="text-white font-bold tracking-tight scale-[0.8] leading-none text-[5px]">{maleName} ❤️ {femaleName}</div>
                  </div>
                  {/* Miniature Hearts progress bar */}
                  <div className="w-full bg-white/20 h-0.5 rounded overflow-hidden mb-1">
                    <div className="bg-rose-500 h-full w-[65%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* B. DESKTOP WIDESCREEN BROWSER CONTAINER */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 flex items-center gap-1">
                <Laptop className="w-3 h-3 text-indigo-400" />
                <span>DESKTOP / WEB PREVIEW</span>
              </span>
              <div 
                className="w-[220px] h-[135px] rounded-lg bg-slate-900 border-2 border-slate-800 shadow-xl overflow-hidden relative flex flex-col"
                aria-hidden="true"
              >
                {/* Browser top title bar */}
                <div className="w-full h-4 bg-slate-800 flex items-center px-2 gap-1 justify-between select-none">
                  <div className="flex gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </div>
                  <div className="bg-slate-900/40 text-[5px] px-3 py-0.5 rounded text-slate-500 font-mono scale-[0.85] truncate max-w-[120px]">youlove.com/couple-room</div>
                  <div className="w-2.5" />
                </div>

                {/* Simulated dynamic banner image inside browser window */}
                <div className="w-full h-11 relative bg-slate-950 overflow-hidden">
                  <div 
                    className="absolute inset-0 z-0 origin-center transition-all bg-slate-900"
                    style={{
                      ...(imageUrl.startsWith('preset_')
                        ? (imageUrl === 'preset_1'
                          ? { background: 'linear-gradient(135deg, #8E2DE2, #4A00E0)' }
                          : imageUrl === 'preset_2'
                            ? { background: 'linear-gradient(135deg, #FF9966, #FF5E62)' }
                            : { background: 'linear-gradient(135deg, #CDB4DB, #FFC8DD, #FFA2B6)' })
                        : { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
                      ),
                      transform: `scale(${scale}) translate(${offsetX / 4}px, ${offsetY / 4}px)`,
                      transformOrigin: 'center center'
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-950/10 border-b border-white/5" />
                </div>

                {/* Rest of page layout */}
                <div className="flex-1 bg-slate-900 flex flex-col justify-center p-2 text-[6px]">
                  <div className="flex items-center gap-1.5 mb-1 bg-transparent">
                    <div className="w-4 h-4 rounded-full bg-indigo-500/40 border border-indigo-400" />
                    <div className="text-white font-mono scale-[0.8] leading-tight flex-1">
                      <div className="font-bold">{maleName} & {femaleName}</div>
                      <div className="text-[5.5px] text-slate-400">Yêu đương được 188 ngày ngọt ngào</div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-850 h-5 rounded p-1 flex items-center justify-between text-[4.5px] text-indigo-300 font-mono scale-[0.9]">
                    <span>Chu kỳ kế tiếp: 15 ngày nữa 🩸</span>
                    <span className="bg-rose-500/15 border border-rose-500/20 text-rose-450 px-1 rounded-sm">Chi tiết</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        // Simple info bar for Avatars
        <div className="w-full border-t border-slate-900/80 bg-slate-950/95 backdrop-blur-md p-5 flex flex-col items-center justify-center gap-1 z-30 select-none pb-8">
          <span className="text-rose-500 text-[10px] font-black uppercase tracking-widest font-mono">Chân Dung Chân Thực 📸</span>
          <p className="text-[11px] text-slate-400 text-center max-w-md font-semibold leading-relaxed">
            Xem trước được khoanh tròn tinh xảo. Ảnh gốc kỷ niệm được bảo lưu trọn vẹn, không chỉnh sửa trực tiếp tập tin gốc.
          </p>
        </div>
      )}
    </div>
  );
};
