import React, { useRef, useState, useEffect } from "react";

// Shared mute state across all video slides on the page
// Start unmuted — browsers may allow it; we fall back to muted on play failure
let globalMuted = false;
const muteListeners = new Set();
const setGlobalMuted = (val) => {
  globalMuted = val;
  muteListeners.forEach(fn => fn(val));
};

export default function CarouselVideoSlide({ src, active }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false); // start unmuted, fall back on error
  const visibleRef = useRef(false);

  // Subscribe to global mute changes
  useEffect(() => {
    const handler = (val) => {
      setMuted(val);
      if (videoRef.current) videoRef.current.muted = val;
    };
    muteListeners.add(handler);
    return () => muteListeners.delete(handler);
  }, []);

  // On mount: set src, preload, and attempt immediate play with sound
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.load();
    if (active) {
      v.play().catch(() => {
        // Browser blocked unmuted autoplay — fall back to muted
        v.muted = true;
        setMuted(true);
        setGlobalMuted(true);
        v.play().catch(() => {});
      });
    }
  }, [src]);

  // Intersection observer — pause when off-screen, resume when visible
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const obs = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
      if (entry.isIntersecting && active) {
        v.muted = globalMuted;
        v.play().catch(() => { v.muted = true; setMuted(true); v.play().catch(() => {}); });
      } else {
        v.pause();
      }
    }, { threshold: 0.1 });
    obs.observe(v);
    return () => obs.disconnect();
  }, []);

  // Play/pause when active prop changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active && visibleRef.current) {
      v.muted = globalMuted;
      v.play().catch(() => { v.muted = true; setMuted(true); v.play().catch(() => {}); });
    } else {
      v.pause();
    }
  }, [active]);

  const toggleMute = (e) => {
    e.stopPropagation();
    setGlobalMuted(!globalMuted);
    setMuted(!globalMuted);
  };

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white/50 text-xs animate-pulse">Loading video...</span>
        </div>
      )}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain p-2"
        loop
        playsInline
        preload="auto"
        muted={muted}
        onCanPlay={() => setLoading(false)}
      />
      {/* Mute/unmute button — bottom right */}
      <button
        onClick={toggleMute}
        className="absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm transition-opacity hover:opacity-100 opacity-70"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.15)" }}
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? (
          // Muted icon
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <line x1="23" y1="9" x2="17" y2="15"/>
            <line x1="17" y1="9" x2="23" y2="15"/>
          </svg>
        ) : (
          // Unmuted icon
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
        )}
      </button>
    </div>
  );
}