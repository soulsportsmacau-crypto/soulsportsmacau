// ==========================================================================
// 學生看板：「我 vs 班平均 vs 級平均」體能對比元件組
// 計算口徑與教師端 A4 報告（ReportSheets.jsx）一致：
//   以每位學生「最新一次測量」計算；只計算已有測量紀錄的學生；
//   學生只看到匯總平均數，看不到其他同學的個別分數。
//
// 對外提供三個元件（都從 App.jsx 引入）：
//   <AbilityCompareList />  左側欄：六項能力數值 + 班/級平均差距（取代舊的六條進度條）
//   <ScoreGapChips />       「最新戰力分」卡片內：我比班 / 我比級 的差距標籤
//   <BenchmarkRadar />      左側欄：六大體能雷達（我 · 班平均 · 級平均），放在學生數據之下
//   <StudentBenchmark />    主面板（default）：歷次趨勢折線圖 + 下一個小目標
// 共同 props：student, allStudents, abilityFields
// ==========================================================================
import React, { useMemo } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Legend, Tooltip, ResponsiveContainer
} from "recharts";

/* ------------------------------ 工具 ------------------------------ */
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v) => (v === null || v === undefined ? "" : String(v));
const clsOf = (s) => str(s && s.className).trim().toUpperCase();
const yearOf = (c) => str(c).trim().toUpperCase().slice(0, 2);
const latest = (s) => (s && Array.isArray(s.scores) && s.scores.length ? s.scores[s.scores.length - 1] : null);
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const f1 = (v) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : Number(v).toFixed(1));
const signed = (d) => {
  if (d === null || d === undefined || !Number.isFinite(d)) return "—";
  if (Math.abs(d) < 0.05) return "±0";
  return (d > 0 ? "+" : "") + d.toFixed(1);
};
const pct = (v) => `${Math.max(0, Math.min(100, num(v)))}%`;

const TIPS = {
  cardio: "每週 2–3 次慢跑或跳繩，每次 15 分鐘，由輕鬆配速開始，慢慢延長。",
  strength: "做自重深蹲、屈膝俯臥撐、平板支撐，動作標準比次數更重要。",
  power: "練習立定跳遠的擺臂、蹬地、落地緩衝，再加上跳繩。",
  speed: "做短距離加速跑和反應遊戲，記得先熱身。",
  flexibility: "運動後做坐姿體前彎、大腿後側拉伸，每個動作維持 20–30 秒。",
  agility: "練習 T 字折返、繩梯步法和側向滑步。",
};

function avgOf(list, keys) {
  const scored = list.filter((s) => latest(s));
  const out = { n: scored.length, average: null, abilities: {} };
  keys.forEach((k) => (out.abilities[k] = null));
  if (!scored.length) return out;
  out.average = mean(scored.map((s) => num(latest(s).average)));
  keys.forEach((k) => {
    out.abilities[k] = mean(scored.map((s) => num(latest(s)[k])));
  });
  return out;
}

// 集中計算，三個元件共用
function useBenchmark(student, allStudents, abilityFields) {
  return useMemo(() => {
    if (!student) return null;
    const keys = abilityFields.map((a) => a.key);
    const cls = clsOf(student);
    const yr = yearOf(cls);
    const everyone = Array.isArray(allStudents) ? allStudents.filter((s) => s && s.className) : [];
    const C = avgOf(everyone.filter((s) => clsOf(s) === cls), keys);
    const G = avgOf(everyone.filter((s) => yearOf(clsOf(s)) === yr), keys);
    const rec = latest(student);
    if (!rec) return { cls, yr, C, G, rec: null };

    const rows = abilityFields.map((a) => {
      const me = num(rec[a.key]);
      const c = C.abilities[a.key];
      const g = G.abilities[a.key];
      return { ...a, me, c, g, dc: c === null ? null : me - c, dg: g === null ? null : me - g };
    });
    const me = num(rec.average);
    const dc = C.average === null ? null : me - C.average;
    const dg = G.average === null ? null : me - G.average;
    const aboveClass = rows.filter((r) => r.dc !== null && r.dc > 0.5).length;
    const withGap = rows.filter((r) => r.dc !== null);
    const lowest = withGap.length ? [...withGap].sort((a, b) => a.dc - b.dc)[0] : null;
    const highest = withGap.length ? [...withGap].sort((a, b) => b.dc - a.dc)[0] : null;
    const sc = Array.isArray(student.scores) ? student.scores : [];
    const growth = sc.length >= 2 ? { first: num(sc[0].average), last: num(sc[sc.length - 1].average), tests: sc.length } : null;

    // 歷次戰力趨勢：與教師 A4 報告一致，顯示最近 6 次測量的戰力總評
    const trend = sc.slice(-6).map((r, i, arr) => ({
      name: `第${sc.length - arr.length + i + 1}次`,
      戰力: Math.round(num(r.average) * 10) / 10,
    }));
    let lo = 0, hi = 100;
    if (trend.length) {
      const vals = trend.map((t) => t.戰力);
      lo = Math.max(0, Math.floor((Math.min(...vals) - 8) / 10) * 10);
      hi = Math.min(100, Math.ceil((Math.max(...vals) + 8) / 10) * 10);
      if (hi - lo < 20) hi = Math.min(100, lo + 20);
    }
    return { cls, yr, C, G, rec, rows, me, dc, dg, aboveClass, lowest, highest, growth, trend, trendDomain: [lo, hi] };
  }, [student, allStudents, abilityFields]);
}

/* ------------------------------ 差距標籤 ------------------------------ */
const chipCls = (d) => {
  if (d === null || d === undefined || !Number.isFinite(d)) return "bg-slate-900 text-slate-500 border-slate-800";
  if (d > 0.5) return "bg-emerald-950/60 text-emerald-300 border-emerald-800/50";
  if (d < -0.5) return "bg-rose-950/50 text-rose-300 border-rose-800/50";
  return "bg-slate-900 text-slate-300 border-slate-700";
};
const Chip = ({ label, d }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[12px] leading-4 font-black whitespace-nowrap ${chipCls(d)}`}>
    {label}
    <span className="font-mono">{signed(d)}</span>
  </span>
);

/* ------------------------------ 1. 左側欄：六項能力 + 差距 ------------------------------ */
export function AbilityCompareList({ student, allStudents, abilityFields }) {
  const data = useBenchmark(student, allStudents, abilityFields);
  if (!data) return null;
  if (!data.rec) {
    return <p className="text-xs text-slate-400 leading-relaxed text-center">你還沒有體適能測量紀錄，完成第一次測量後這裡會顯示你的六項能力。</p>;
  }
  const { rows, C, G } = data;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.key} className="space-y-1">
          <div className="flex justify-between items-center gap-2 text-xs">
            <span className="font-bold text-slate-200">{r.icon} {r.label}</span>
            <span className="font-black text-white font-mono">{f1(r.me)}</span>
          </div>
          {/* 填色 = 我；金色刻度 = 班平均；白色刻度 = 級平均 */}
          <div className="relative h-2.5 rounded-full bg-slate-800">
            <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: pct(r.me), background: r.color }} />
            {r.c !== null && (
              <span className="absolute w-0.5 bg-amber-400" style={{ left: pct(r.c), top: "-3px", height: "16px" }} title={`班平均 ${f1(r.c)}`} />
            )}
            {r.g !== null && (
              <span className="absolute w-0.5 bg-slate-200" style={{ left: pct(r.g), top: "-3px", height: "16px" }} title={`級平均 ${f1(r.g)}`} />
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Chip label={`班 ${f1(r.c)}`} d={r.dc} />
            <Chip label={`級 ${f1(r.g)}`} d={r.dg} />
          </div>
        </div>
      ))}
      <p className="text-[11px] leading-4 text-slate-500 pt-1">
        <span className="inline-block w-2 h-2 rounded-sm bg-amber-400 mr-1" />金線＝班平均
        <span className="inline-block w-2 h-2 rounded-sm bg-slate-200 ml-3 mr-1" />白線＝級平均
        <br />以最新一次測量計算（{data.cls} 班已測 {C.n} 人，{data.yr} 年級已測 {G.n} 人）。
        {C.n < 3 && <b className="text-amber-400">班內已測人數較少，平均數僅供參考。</b>}
      </p>
    </div>
  );
}

/* ------------------------------ 2. 戰力分卡片內：我比班 / 我比級 ------------------------------ */
export function ScoreGapChips({ student, allStudents, abilityFields }) {
  const data = useBenchmark(student, allStudents, abilityFields);
  if (!data || !data.rec) return null;
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1.5 flex-wrap">
        <Chip label="比班" d={data.dc} />
        <Chip label="比級" d={data.dg} />
      </div>
      <p className="text-[11px] leading-4 text-slate-500">班均 {f1(data.C.average)} ・ 級均 {f1(data.G.average)}</p>
    </div>
  );
}

/* ------------------------------ 3. 左側欄：六大體能雷達 ------------------------------ */
export function BenchmarkRadar({ student, allStudents, abilityFields }) {
  const data = useBenchmark(student, allStudents, abilityFields);
  if (!data || !data.rec) return null;
  const radarData = data.rows.map((r) => ({
    subject: r.label,
    我: Math.round(r.me * 10) / 10,
    班平均: r.c === null ? null : Math.round(r.c * 10) / 10,
    級平均: r.g === null ? null : Math.round(r.g * 10) / 10,
  }));
  return (
    <div className="space-y-1 pt-3 border-t border-slate-800">
      <h3 className="text-xs font-extrabold text-slate-400 tracking-wider">🔮 六大體能雷達</h3>
      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} outerRadius="62%" margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="級平均" dataKey="級平均" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.05} strokeDasharray="2 3" />
            <Radar name="班平均" dataKey="班平均" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} strokeDasharray="5 3" />
            <Radar name="我" dataKey="我" stroke="#818cf8" fill="#6366f1" fillOpacity={0.5} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, fontSize: 13 }} />
            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------------ 4. 主面板：趨勢 + 小目標 ------------------------------ */
export default function StudentBenchmark({ student, allStudents, abilityFields }) {
  const data = useBenchmark(student, allStudents, abilityFields);
  if (!data) return null;

  const card = "rounded-3xl border border-slate-800 bg-slate-950 p-6 rpg-glowing-card";

  if (!data.rec) {
    return (
      <div className={`${card} space-y-2`}>
        <h3 className="text-sm font-extrabold text-white">📈 成長與進步趨勢</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          你還沒有體適能測量紀錄。完成第一次測量後，這裡會顯示你的進步趨勢和下一個小目標。
        </p>
      </div>
    );
  }

  const { rows, aboveClass, lowest, highest, growth, trend, trendDomain } = data;
  const diff = growth ? growth.last - growth.first : 0;

  return (
    <div className="space-y-6">
      {/* 歷次趨勢（含成長摘要）＋ 下一個小目標 */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className={`${card} space-y-2`}>
          <p className="text-xs font-black text-indigo-300">📈 歷次戰力趨勢（最近 {Math.min(6, trend.length)} 次測量）</p>
          {trend.length >= 2 ? (
            <>
              <div className="w-full h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 16, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis domain={trendDomain} tick={{ fill: "#64748b", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, fontSize: 13 }} />
                    <Line
                      type="monotone"
                      dataKey="戰力"
                      stroke="#818cf8"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#0f172a", stroke: "#818cf8", strokeWidth: 2 }}
                      label={{ position: "top", fill: "#e2e8f0", fontSize: 12, fontWeight: 700 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                第 1 次 <b className="font-mono">{f1(growth.first)}</b> → 最新 <b className="font-mono">{f1(growth.last)}</b>
                （<b className={diff >= 0 ? "text-emerald-300" : "text-rose-300"}>{signed(diff)}</b> 分，共 {growth.tests} 次測量）
                <span className="text-slate-400">
                  {diff > 0.5
                    ? "　你比自己的起點進步了，努力有回報！"
                    : diff < -0.5
                      ? "　這次略低於起點，別氣餒，持續練習和休息都很重要。"
                      : "　表現穩定，試試完成每週體能任務來突破自己。"}
                </span>
              </p>
            </>
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed py-6">
              目前只有 1 次測量紀錄，完成下一次測量後，這裡就會畫出你的進步軌跡。
            </p>
          )}
        </div>

        <div className={`${card} space-y-2`}>
          <p className="text-xs font-black text-emerald-300">🎯 下一個小目標</p>
          {lowest && lowest.dc < -0.5 ? (
            <>
              <p className="text-xs text-slate-300 leading-relaxed">
                「{lowest.label}」目前比班平均低 <b className="text-rose-300">{f1(Math.abs(lowest.dc))}</b> 分，是你最有進步空間的項目。
              </p>
              <p className="text-[12px] text-slate-400 leading-relaxed">💡 {TIPS[lowest.key]}</p>
            </>
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed">
              你的六項能力都不低於班平均，太厲害了！可以向更高的目標挑戰，或者幫助同學一起進步。
            </p>
          )}
          <p className="text-[12px] text-slate-500 leading-relaxed">
            你有 <b className="text-emerald-300">{aboveClass}</b> / {rows.length} 項高於班平均
            {highest && highest.dc > 0.5 ? `，最強項目是「${highest.label}」（高出 ${f1(highest.dc)} 分）` : ""}。
          </p>
        </div>
      </div>
    </div>
  );
}
