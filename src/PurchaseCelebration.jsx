// ==========================================================================
// 裝備兌換成功慶祝特效：彩紙從天而降 + 中央爆開 + 旋轉光芒 + 裝備發光
// 純 CSS 動畫，不需要任何額外套件。
// 使用：{celebration && <PurchaseCelebration item={celebration} onClose={() => setCelebration(null)} />}
//   item：商店商品物件（用到 item.name、item.imgUrl）
// 系統設定「減少動態效果」時，彩紙和旋轉會自動關閉，只保留靜態光暈。
// ==========================================================================
import React, { useEffect, useMemo, useRef } from "react";

const COLORS = ["#facc15", "#f59e0b", "#818cf8", "#a78bfa", "#34d399", "#f472b6", "#38bdf8", "#fb923c"];

// 固定種子的亂數，彩紙位置每次都不同但渲染過程穩定
function makeRng(seed) {
  let x = seed % 233280;
  return () => (x = (x * 9301 + 49297) % 233280) / 233280;
}

const CSS = `
@keyframes pcFall {
  0%   { transform: translate3d(0,-8vh,0) rotate(0deg); opacity: 1; }
  85%  { opacity: 1; }
  100% { transform: translate3d(var(--dx),108vh,0) rotate(var(--rot)); opacity: 0; }
}
@keyframes pcBurst {
  0%   { transform: translate3d(0,0,0) rotate(0deg) scale(.4); opacity: 1; }
  100% { transform: translate3d(var(--bx),var(--by),0) rotate(var(--rot)) scale(1); opacity: 0; }
}
@keyframes pcRays { to { transform: translate(-50%,-50%) rotate(360deg); } }
@keyframes pcPop {
  0%   { transform: scale(.5); opacity: 0; }
  60%  { transform: scale(1.06); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes pcGlow {
  0%,100% { filter: drop-shadow(0 0 14px rgba(250,204,21,.55)) drop-shadow(0 0 30px rgba(129,140,248,.35)); }
  50%     { filter: drop-shadow(0 0 28px rgba(250,204,21,.95)) drop-shadow(0 0 55px rgba(129,140,248,.6)); }
}
@keyframes pcRing {
  0%   { transform: translate(-50%,-50%) scale(.3); opacity: .9; }
  100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
}
@keyframes pcTwinkle {
  0%,100% { transform: scale(.4) rotate(0deg); opacity: 0; }
  50%     { transform: scale(1.1) rotate(25deg); opacity: 1; }
}
.pc-piece { position: absolute; top: 0; will-change: transform, opacity; }
.pc-pop   { animation: pcPop .55s cubic-bezier(.2,1.2,.4,1) both; }
.pc-glow  { animation: pcGlow 1.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .pc-piece, .pc-rays, .pc-ring, .pc-twinkle { display: none !important; }
  .pc-glow, .pc-pop { animation: none !important; }
}
`;

export default function PurchaseCelebration({ item, onClose, autoCloseMs = 7000 }) {
  // 彩紙：從頂部落下的 60 片 + 從中央爆開的 36 片
  const pieces = useMemo(() => {
    const rnd = makeRng(Date.now());
    const rain = Array.from({ length: 60 }, (_, i) => ({
      key: "r" + i,
      style: {
        left: `${rnd() * 100}%`,
        width: `${6 + rnd() * 6}px`,
        height: `${10 + rnd() * 10}px`,
        background: COLORS[Math.floor(rnd() * COLORS.length)],
        borderRadius: rnd() > 0.7 ? "50%" : "2px",
        "--dx": `${(rnd() - 0.5) * 220}px`,
        "--rot": `${360 + rnd() * 720}deg`,
        animation: `pcFall ${2.4 + rnd() * 2.2}s ${rnd() * 1.2}s cubic-bezier(.25,.6,.4,1) forwards`,
      },
    }));
    const burst = Array.from({ length: 36 }, (_, i) => {
      const ang = (i / 36) * Math.PI * 2 + rnd() * 0.3;
      const dist = 140 + rnd() * 190;
      return {
        key: "b" + i,
        style: {
          left: "50%",
          top: "42%",
          width: `${6 + rnd() * 5}px`,
          height: `${6 + rnd() * 9}px`,
          background: COLORS[Math.floor(rnd() * COLORS.length)],
          borderRadius: rnd() > 0.5 ? "50%" : "2px",
          "--bx": `${Math.cos(ang) * dist}px`,
          "--by": `${Math.sin(ang) * dist}px`,
          "--rot": `${rnd() * 540}deg`,
          animation: `pcBurst ${0.9 + rnd() * 0.7}s ${rnd() * 0.15}s cubic-bezier(.1,.7,.3,1) forwards`,
        },
      };
    });
    return [...rain, ...burst];
  }, []);

  // onClose 用 ref 保存：App 每次重新渲染都會產生新的函式，若放進依賴會令自動關閉計時被不斷重置
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const t = setTimeout(() => closeRef.current && closeRef.current(), autoCloseMs);
    const onKey = (e) => e.key === "Escape" && closeRef.current && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [autoCloseMs]);

  const sparkles = [
    { top: "6%", left: "14%", d: "0s" }, { top: "12%", left: "82%", d: ".4s" },
    { top: "46%", left: "4%", d: ".8s" }, { top: "52%", left: "92%", d: ".2s" },
    { top: "82%", left: "20%", d: ".6s" }, { top: "86%", left: "78%", d: "1s" },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4"
      onClick={onClose}
      role="dialog"
      aria-label="兌換成功"
    >
      <style>{CSS}</style>

      {/* 彩紙層（不攔截點擊） */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {pieces.map((p) => (
          <span key={p.key} className="pc-piece" style={p.style} />
        ))}
      </div>

      <div
        className="pc-pop relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border-2 border-yellow-500/80 rounded-3xl max-w-sm w-full text-center shadow-[0_0_60px_rgba(234,179,8,0.35)] p-8 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 旋轉光芒 + 擴散光環 */}
        <div
          className="pc-rays absolute pointer-events-none"
          style={{
            left: "50%", top: "34%", width: "520px", height: "520px",
            background: "repeating-conic-gradient(from 0deg, rgba(250,204,21,.22) 0deg 8deg, transparent 8deg 24deg)",
            WebkitMaskImage: "radial-gradient(circle, #000 0%, transparent 68%)",
            maskImage: "radial-gradient(circle, #000 0%, transparent 68%)",
            transform: "translate(-50%,-50%)",
            animation: "pcRays 14s linear infinite",
          }}
        />
        {[0, 0.5].map((d) => (
          <span
            key={d}
            className="pc-ring absolute rounded-full border-2 border-yellow-300/70 pointer-events-none"
            style={{ left: "50%", top: "34%", width: "150px", height: "150px", animation: `pcRing 1.6s ${d}s ease-out infinite` }}
          />
        ))}
        {sparkles.map((sp, i) => (
          <span
            key={i}
            className="pc-twinkle absolute text-yellow-300 pointer-events-none select-none"
            style={{ top: sp.top, left: sp.left, animation: `pcTwinkle 1.8s ${sp.d} ease-in-out infinite` }}
          >
            ✦
          </span>
        ))}

        <div className="relative">
          <span className="text-xs font-extrabold tracking-widest text-yellow-400 bg-yellow-950/50 border border-yellow-500/30 px-3 py-1 rounded-full">
            🎉 兌換成功 UNLOCKED!
          </span>
        </div>

        {/* 裝備圖 */}
        <div className="relative mx-auto w-36 h-36 rounded-full bg-gradient-to-b from-indigo-900/60 to-slate-950/80 border border-yellow-500/40 flex items-center justify-center">
          {item && item.imgUrl ? (
            <img src={item.imgUrl} alt={item.name} className="pc-glow w-[78%] h-[78%] object-contain" />
          ) : (
            <span className="pc-glow text-6xl">🎁</span>
          )}
        </div>

        <div className="relative space-y-1">
          <h3 className="text-xl font-black text-white">{item ? item.name : "神秘裝備"}</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            已加入你的收藏背包！請於實體體育課向老師領取。
          </p>
        </div>

        <button
          onClick={onClose}
          className="relative w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/20 active:scale-95"
        >
          收下裝備，繼續冒險！
        </button>
      </div>
    </div>
  );
}
