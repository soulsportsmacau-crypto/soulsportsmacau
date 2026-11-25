import React, { useEffect, useState } from "react";
import { COACH_OPTION_DEFS, getExerciseById } from "./CoachEngine";

// ==========================================================================
// 學生端：AI 教練「生成前選項」與「7 天方案檢視」
// 樣式沿用現有系統的 Tailwind 深色 RPG 風格
// ==========================================================================

// 生成前的 4 個選項（單擊選擇）
export function CoachOptionsPanel({ options, onChange, disabled }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      {COACH_OPTION_DEFS.map((def) => (
        <div key={def.key} className="space-y-1.5">
          <p className="text-xxs font-bold text-slate-400">{def.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {def.choices.map((c) => {
              const active = options[def.key] === c.value;
              return (
                <button
                  key={String(c.value)}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ ...options, [def.key]: c.value })}
                  className={`px-3 py-1.5 rounded-xl text-xxs font-bold border transition-all disabled:opacity-50 ${
                    active
                      ? "bg-indigo-950 border-indigo-500 text-indigo-200 shadow-[0_0_10px_rgba(99,102,241,0.25)]"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const KIND_STYLE = {
  train: { icon: "⚔️", tab: "border-indigo-500/60 text-indigo-200", card: "border-indigo-900/50" },
  rest: { icon: "😴", tab: "border-slate-600 text-slate-300", card: "border-slate-800" },
  light: { icon: "🚶", tab: "border-emerald-600/60 text-emerald-200", card: "border-emerald-900/40" },
  free: { icon: "🎯", tab: "border-emerald-500/60 text-emerald-200", card: "border-emerald-900/40" },
  recover: { icon: "🧘", tab: "border-sky-500/60 text-sky-200", card: "border-sky-900/40" },
};

const SECTION_STYLE = {
  warmup: "text-amber-300",
  main: "text-indigo-300",
  cooldown: "text-sky-300",
  choices: "text-emerald-300",
};

function ExerciseRow({ item }) {
  const lib = getExerciseById(item.id);
  return (
    <li className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-black text-slate-100">{item.name}</span>
        <span className="text-xxs font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
          {item.catLabel}
        </span>
        {item.supplement && (
          <span className="text-xxs font-bold text-slate-500 border border-dashed border-slate-700 px-2 py-0.5 rounded-full">
            補充
          </span>
        )}
      </div>
      <p className="text-xs text-amber-300 font-bold">{item.dose}</p>
      {lib && lib.cue && <p className="text-xxs text-slate-400 leading-relaxed">動作要領：{lib.cue}</p>}
      {lib && lib.safety && <p className="text-xxs text-rose-300/80 leading-relaxed">⚠ {lib.safety}</p>}
    </li>
  );
}

// 7 天方案檢視
export function CoachPlanView({ plan }) {
  const [activeDay, setActiveDay] = useState(1);
  useEffect(() => setActiveDay(1), [plan?.generatedAt]);
  if (!plan || !Array.isArray(plan.days)) return null;

  const day = plan.days.find((d) => d.day === activeDay) || plan.days[0];
  const style = KIND_STYLE[day.kind] || KIND_STYLE.train;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-4 space-y-3">
        <p className="text-xs font-bold text-slate-200 leading-relaxed">{plan.opening}</p>
        <div className="space-y-1.5">
          <p className="text-xxs font-black text-indigo-300 tracking-wider">📋 為什麼這樣安排</p>
          {plan.reasons.map((r, i) => (
            <p key={i} className="text-xxs text-slate-300 leading-relaxed">
              <span className="mr-1">{r.icon}</span>
              {r.text}
            </p>
          ))}
        </div>
        <p className="text-xxs text-slate-500">
          本週共 {plan.profile?.trainDays ?? "-"} 個訓練日 · 週結構：{plan.profile?.typeLabel}
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {plan.days.map((d) => {
          const s = KIND_STYLE[d.kind] || KIND_STYLE.train;
          const active = d.day === activeDay;
          return (
            <button
              key={d.day}
              type="button"
              onClick={() => setActiveDay(d.day)}
              className={`py-2 rounded-xl border text-center transition-all ${
                active ? `bg-slate-900 ${s.tab} shadow-md` : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"
              }`}
            >
              <div className="text-xxs font-black">第{d.day}天</div>
              <div className="text-sm leading-none mt-0.5">{s.icon}</div>
            </button>
          );
        })}
      </div>

      <div className={`rounded-2xl border bg-slate-950/60 p-4 space-y-3 ${style.card}`}>
        <div>
          <p className="text-xxs font-bold text-slate-500">第 {day.day} 天</p>
          <h4 className="text-sm font-black text-white">
            {style.icon} {day.title}
          </h4>
          {day.note && <p className="text-xxs text-slate-400 leading-relaxed mt-1">{day.note}</p>}
        </div>

        {day.blocks.map((b, bi) => (
          <div key={bi} className="space-y-2">
            <p className={`text-xxs font-black tracking-wider ${SECTION_STYLE[b.section] || "text-slate-300"}`}>■ {b.label}</p>
            <ul className="space-y-2">
              {b.items.map((it, ii) => (
                <ExerciseRow key={`${it.id}-${ii}`} item={it} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 space-y-1">
        <p className="text-xxs font-black text-slate-300">💡 安全提醒</p>
        {plan.safety.map((s, i) => (
          <p key={i} className="text-xxs text-slate-400 leading-relaxed">
            • {s}
          </p>
        ))}
      </div>

      <p className="text-xs text-amber-200/90 italic leading-relaxed">🔥 教練寄語：{plan.closing}</p>
    </div>
  );
}
