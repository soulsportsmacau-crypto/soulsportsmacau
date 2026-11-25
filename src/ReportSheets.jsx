// ==========================================================================
// 聖保祿學校 PE 體適能系統 —— 家長版 A4 報告元件（個人 / 班級 / 年級）
// 版面參考「學生體質報告工具」，數據全部來自本系統（六大體能屬性、等級、任務紀錄）
// 全部圖表為純 SVG，列印 / 另存 PDF 時完整保留向量畫質
// ==========================================================================
import React, { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/* ------------------------------ 基礎工具 ------------------------------ */
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v) => (v === null || v === undefined ? "" : String(v));
const esc = (s) =>
  str(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};
const fmtDiff = (d) => (d === null || d === undefined || !Number.isFinite(d) ? "—" : (d > 0 ? "+" : "") + d.toFixed(1));
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

// 與主程式 abilityFields 保持一致
export const ABILITIES = [
  { key: "cardio", label: "心肺耐力", color: "#ef4444" },
  { key: "strength", label: "肌肉力量", color: "#3b82f6" },
  { key: "power", label: "瞬發爆發力", color: "#f59e0b" },
  { key: "speed", label: "直線速度", color: "#10b981" },
  { key: "flexibility", label: "關節柔軟度", color: "#ec4899" },
  { key: "agility", label: "動態敏捷性", color: "#8b5cf6" },
];

const latest = (s) => (s && Array.isArray(s.scores) && s.scores.length ? s.scores[s.scores.length - 1] : null);
const hasScore = (s) => !!latest(s);
const clsOf = (s) => str(s && s.className).trim().toUpperCase();
const yearOf = (c) => str(c).trim().toUpperCase().slice(0, 2);
const levelOf = (xp) => Math.min(100, Math.floor(num(xp) / 1000) + 1);
const progressOf = (s) => {
  const sc = s && Array.isArray(s.scores) ? s.scores : [];
  return sc.length >= 2 ? num(sc[sc.length - 1].average) - num(sc[0].average) : null;
};
const approvedOf = (s) => (s && Array.isArray(s.questsSubmitted) ? s.questsSubmitted.filter((q) => q.status === "approved") : []);
const rankSort = (a, b) => num(b.xp) - num(a.xp) || num(latest(b) && latest(b).average) - num(latest(a) && latest(a).average);

const LV_TITLES = [
  [100, "👑 永恆冠軍"], [90, "🎖️ 榮耀王者"], [80, "⚜️ 神話至尊"], [70, "🌌 超凡大師"], [60, "☄️ 星耀傳說"],
  [50, "💎 鑽石英雄"], [40, "⚔️ 白金勇者"], [30, "🛡️ 黃金騎士"], [20, "🏹 白銀戰士"], [10, "🛡️ 青銅角鬥士"], [0, "🌱 見習鬥士"],
];
const titleOfLevel = (lv) => (LV_TITLES.find(([min]) => lv >= min) || LV_TITLES[LV_TITLES.length - 1])[1];

const ratingOf = (score) => {
  const s = num(score);
  if (s >= 95) return { code: "SSS", label: "SSS 神之領域" };
  if (s >= 90) return { code: "S", label: "S 傳奇宗師" };
  if (s >= 80) return { code: "A", label: "A 體育精英" };
  if (s >= 70) return { code: "B", label: "B 驍勇冒險者" };
  if (s >= 60) return { code: "C", label: "C 實習新兵" };
  return { code: "D", label: "D 體能平民" };
};

const typeOf = (rec, score) => {
  if (!rec) return "未知";
  if (num(rec.speed) >= 85) return "🐆 速度型（閃電幻影）";
  if (num(rec.strength) >= 85) return "🦍 力量型（巨岩破壞者）";
  if (num(rec.cardio) >= 85) return "🐎 耐力型（無盡之翼）";
  if (num(rec.power) >= 85) return "⚡ 爆發型（雷霆之躍）";
  if (num(rec.flexibility) >= 85) return "🐍 柔韌型（水流舞者）";
  if (num(rec.agility) >= 85) return "🔁 敏捷型（幽靈迴避者）";
  if (num(score) < 60) return "🌱 潛力型（星火待燃）";
  return "⚔️ 全能型（神盾戰士）";
};

/* 以「最新一次測量」彙總一組學生的平均 */
function summarize(list) {
  const scored = list.filter(hasScore);
  const out = { n: scored.length, average: null, abilities: {} };
  ABILITIES.forEach((a) => (out.abilities[a.key] = null));
  if (!scored.length) return out;
  out.average = mean(scored.map((s) => num(latest(s).average)));
  ABILITIES.forEach((a) => {
    out.abilities[a.key] = mean(scored.map((s) => num(latest(s)[a.key])));
  });
  return out;
}

const RATING_BARS = [
  { code: "D", color: "#94a3b8" }, { code: "C", color: "#38bdf8" }, { code: "B", color: "#34d399" },
  { code: "A", color: "#fbbf24" }, { code: "S", color: "#fb923c" }, { code: "SSS", color: "#a855f7" },
];
function distribution(list) {
  const scored = list.filter(hasScore);
  return RATING_BARS.map((r) => ({
    label: r.code,
    color: r.color,
    value: scored.filter((s) => ratingOf(latest(s).average).code === r.code).length,
  }));
}

/* ------------------------------ 建議文字庫 ------------------------------ */
const TIPS = {
  cardio: "可安排每週 2–3 次慢跑或跳繩，每次 15–20 分鐘，由輕鬆配速開始，逐步延長時間。",
  strength: "可進行自重深蹲、屈膝俯臥撐、平板支撐等練習，動作標準比次數更重要。",
  power: "可練習立定跳遠分解動作（擺臂、蹬地、落地緩衝）及跳繩，提升下肢瞬發力。",
  speed: "可利用短距離加速跑及反應遊戲，並做好熱身，提升步頻與起跑反應。",
  flexibility: "可在運動後做坐姿體前彎、大腿後側拉伸，每個動作維持 20–30 秒，溫和進行。",
  agility: "可練習 T 字折返、繩梯步法及側向滑步，提升變向速度與身體協調。",
};
const STAGE_TIPS = {
  F1: "初中低年級適合以遊戲化、多元化的活動建立運動興趣。",
  F2: "初中低年級適合以遊戲化、多元化的活動建立運動興趣。",
  F3: "此階段可嘗試球類或專項運動，在樂趣中提升整體體能。",
  F4: "此階段可嘗試球類或專項運動，在樂趣中提升整體體能。",
  F5: "高年級宜建立規律運動習慣，並兼顧學業壓力下的恢復與伸展。",
  F6: "高年級宜建立規律運動習慣，並兼顧學業壓力下的恢復與伸展。",
};

function personalFeedback({ student, strongest, weakest, progress, taskCount, year }) {
  const name = student.name || "同學";
  const cDiff = strongest.c !== null && strongest.c !== undefined ? strongest.p - strongest.c : null;
  let positive = `${name}同學，感謝你認真完成本學年的體適能測試。你目前最突出的能力是「${strongest.label}」（${fmt(strongest.p)} 分）`;
  if (cDiff !== null && cDiff > 0.5) positive += `，高於班平均 ${fmt(cDiff)} 分`;
  positive += "，這是你值得自豪的優勢。";
  if (progress !== null && progress > 0) positive += `與首次測量相比，戰力總評進步了 ${fmt(progress)} 分，努力正在開花結果。`;
  if (taskCount > 0) positive += `同時已完成 ${taskCount} 項每週體能任務，主動自主練習的態度值得讚賞。`;
  positive += "每個人的成長節奏不同，持續參與運動、享受過程，就是最實在的進步。";

  let follow = `下一階段建議以「${weakest.label}」（${fmt(weakest.p)} 分）作為重點：${TIPS[weakest.key]}`;
  follow += (STAGE_TIPS[year] || "") + "家長可陪伴孩子每週運動 2–3 次，並透過系統的每週體能任務累積經驗值，以鼓勵代替比較。";
  return { positive, follow };
}

function classFeedback({ classCode, n, average, strongest, weakest, vsGrade }) {
  let positive = `${classCode} 班共有 ${n} 位學生完成體適能測量，班級戰力均分為 ${fmt(average)} 分。`;
  if (vsGrade !== null && vsGrade > 0.5) positive += `在「${strongest.label}」方面高於年級平均 ${fmt(vsGrade)} 分，反映同學們的共同努力。`;
  else positive += `班級在「${strongest.label}」方面表現相對突出，同學們願意投入各項測試，展現良好態度。`;
  positive += "班內每位同學的起點與節奏不同，這正是體育課設計多元活動的依據。";
  let follow = `課堂可適度加入與「${weakest.label}」相關的練習：${TIPS[weakest.key]}`;
  follow += "教師會依學生能力分組，讓每位同學都能在適合自己的挑戰中獲得成功經驗，並鼓勵同學參與每週體能任務。";
  return { positive, follow };
}

function gradeFeedback({ year, classes, n, strongest, weakest }) {
  let positive = `${year} 年級共有 ${classes} 個班別、${n} 位學生完成測量。各班數據各有特色，有助了解年級整體的多元樣貌；年級整體在「${strongest.label}」方面表現相對突出。`;
  positive += "年級報告不以單一數值評價學生，而是著眼於整體參與和持續進步。";
  let follow = `年級整體可加強「${weakest.label}」：${TIPS[weakest.key]}`;
  follow += (STAGE_TIPS[year] || "") + "建議可安排跨班體育活動（如班際接力、體能挑戰），讓學生在合作與遊戲中累積活動量。";
  return { positive, follow };
}

/* ------------------------------ SVG 圖表 ------------------------------ */
function RadarSvg({ series, width = 300, height = 185 }) {
  const cx = width / 2;
  const cy = height / 2 + 6;
  const R = 58;
  const n = ABILITIES.length;
  const ang = (i) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const pt = (i, v) => {
    const r = (R * Math.max(0, Math.min(100, v))) / 100;
    return [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
  };
  const ring = (p) =>
    ABILITIES.map((_, i) => pt(i, p).map((x) => x.toFixed(1)).join(",")).join(" ");
  const active = series.filter((s) => s.values && s.values.every((v) => v !== null && v !== undefined));
  return (
    <svg className="rp-svg" viewBox={`0 0 ${width} ${height}`}>
      {[25, 50, 75, 100].map((p) => (
        <polygon key={p} points={ring(p)} fill="none" stroke="#cbd5e1" strokeWidth="0.7" />
      ))}
      {ABILITIES.map((_, i) => {
        const [x, y] = pt(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#cbd5e1" strokeWidth="0.7" />;
      })}
      {active.map((s, si) => (
        <polygon
          key={si}
          points={s.values.map((v, i) => pt(i, v).map((x) => x.toFixed(1)).join(",")).join(" ")}
          fill={s.fill ? s.color : "none"}
          fillOpacity={s.fill ? 0.28 : 0}
          stroke={s.color}
          strokeWidth={s.fill ? 2 : 1.6}
          strokeDasharray={s.dash || undefined}
        />
      ))}
      {ABILITIES.map((a, i) => {
        const c = Math.cos(ang(i));
        const s = Math.sin(ang(i));
        const x = cx + (R + 9) * c;
        const y = cy + (R + 9) * s + (s > 0.5 ? 8 : s < -0.5 ? -1 : 3);
        const anchor = c > 0.3 ? "start" : c < -0.3 ? "end" : "middle";
        return (
          <text key={a.key} x={x} y={y} textAnchor={anchor} fontSize="10" fontWeight="700" fill="#334155">
            {a.label}
          </text>
        );
      })}
      {active.map((s, i) => (
        <g key={"lg" + i} transform={`translate(4, ${8 + i * 12})`}>
          <rect width="14" height="3.5" y="2" rx="1.5" fill={s.color} />
          <text x="19" y="7" fontSize="9" fontWeight="700" fill="#475569">{s.name}</text>
        </g>
      ))}
    </svg>
  );
}

function GroupedBars({ labels, series, width = 600, height = 125 }) {
  const padL = 24, padR = 6, padT = 16, padB = 17;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const active = series.filter((s) => s.values.some((v) => v !== null && v !== undefined));
  const groupW = plotW / labels.length;
  const barW = Math.min(26, (groupW * 0.72) / Math.max(1, active.length));
  const y = (v) => padT + plotH - (Math.max(0, Math.min(100, v)) / 100) * plotH;
  return (
    <svg className="rp-svg" viewBox={`0 0 ${width} ${height}`}>
      {[0, 50, 100].map((g) => (
        <g key={g}>
          <line x1={padL} x2={width - padR} y1={y(g)} y2={y(g)} stroke="#e2e8f0" strokeWidth="0.8" />
          <text x={padL - 4} y={y(g) + 3} textAnchor="end" fontSize="8.5" fill="#94a3b8">{g}</text>
        </g>
      ))}
      {labels.map((lb, i) => {
        const gx = padL + groupW * i + (groupW - barW * active.length) / 2;
        return (
          <g key={lb}>
            {active.map((s, j) => {
              const v = s.values[i];
              if (v === null || v === undefined) return null;
              const bx = gx + barW * j;
              const by = y(v);
              return (
                <g key={j}>
                  <rect x={bx + 0.8} y={by} width={barW - 1.6} height={Math.max(0.5, padT + plotH - by)} rx="2" fill={s.color} />
                  <text x={bx + barW / 2} y={by - 2.5} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#0f172a">
                    {fmt(v)}
                  </text>
                </g>
              );
            })}
            <text x={padL + groupW * i + groupW / 2} y={height - 4} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#475569">
              {lb}
            </text>
          </g>
        );
      })}
      {active.map((s, i) => (
        <g key={"lg" + i} transform={`translate(${width - padR - 62 * (active.length - i)}, 2)`}>
          <rect width="8" height="8" rx="2" fill={s.color} />
          <text x="11" y="7.5" fontSize="9" fontWeight="700" fill="#475569">{s.name}</text>
        </g>
      ))}
    </svg>
  );
}

function SimpleBars({ items, max, width = 300, height = 120 }) {
  const padL = 6, padR = 6, padT = 16, padB = 18;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const vals = items.map((i) => i.value).filter((v) => v !== null && v !== undefined);
  const top = max || (vals.length ? Math.max(...vals, 1) * 1.25 : 1);
  const gap = plotW / items.length;
  const bw = Math.min(30, gap * 0.6);
  return (
    <svg className="rp-svg" viewBox={`0 0 ${width} ${height}`}>
      <line x1={padL} x2={width - padR} y1={padT + plotH} y2={padT + plotH} stroke="#cbd5e1" strokeWidth="0.8" />
      {items.map((it, i) => {
        const ok = it.value !== null && it.value !== undefined;
        const h = ok ? (Math.min(top, it.value) / top) * plotH : 0;
        const x = padL + gap * i + (gap - bw) / 2;
        const y = padT + plotH - h;
        return (
          <g key={i}>
            {ok && h > 0 && <rect x={x} y={y} width={bw} height={h} rx="2" fill={it.color} />}
            <text x={x + bw / 2} y={ok ? y - 3 : padT + plotH - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="#0f172a">
              {ok ? fmt(it.value) : "—"}
            </text>
            <text x={padL + gap * i + gap / 2} y={height - 4} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#475569">
              {it.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChartSvg({ points, width = 300, height = 112 }) {
  const padL = 26, padR = 14, padT = 16, padB = 17;
  const vals = points.map((p) => p.value);
  let lo = Math.max(0, Math.floor((Math.min(...vals) - 8) / 10) * 10);
  let hi = Math.min(100, Math.ceil((Math.max(...vals) + 8) / 10) * 10);
  if (hi - lo < 20) hi = Math.min(100, lo + 20);
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const n = points.length;
  const x = (i) => padL + (plotW * i) / Math.max(1, n - 1);
  const y = (v) => padT + plotH - ((v - lo) / (hi - lo)) * plotH;
  return (
    <svg className="rp-svg" viewBox={`0 0 ${width} ${height}`}>
      {[lo, (lo + hi) / 2, hi].map((g) => (
        <g key={g}>
          <line x1={padL} x2={width - padR} y1={y(g)} y2={y(g)} stroke="#e2e8f0" strokeWidth="0.8" />
          <text x={padL - 4} y={y(g) + 3} textAnchor="end" fontSize="8.5" fill="#94a3b8">{Math.round(g)}</text>
        </g>
      ))}
      <polyline fill="none" stroke="#4f46e5" strokeWidth="2" points={points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r="3" fill="#fff" stroke="#4f46e5" strokeWidth="1.8" />
          <text x={x(i)} y={y(p.value) - 6} textAnchor="middle" fontSize="9" fontWeight="700" fill="#0f172a">{fmt(p.value)}</text>
          <text x={x(i)} y={height - 4} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#64748b">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------ 共用版面零件 ------------------------------ */
function Logo({ src }) {
  const html = "<span>聖</span>" + (src ? `<img src="${esc(src)}" alt="" onerror="this.style.display='none'"/>` : "");
  return <div className="rp-logo" dangerouslySetInnerHTML={{ __html: html }} />;
}

function Frame({ meta, subtitle, kindLabel, children }) {
  return (
    <div className="rp-sheet">
      <div className="rp-band" />
      <div className="rp-body">
        <header className="rp-header">
          <div className="rp-brand">
            <Logo src={meta.logoSrc} />
            <div>
              <div className="rp-school">{meta.schoolName}</div>
              <div className="rp-sub">{subtitle}</div>
            </div>
          </div>
          <div className="rp-year">
            <div className="rp-year-label">學 年</div>
            <div className="rp-year-value">{meta.schoolYear}</div>
          </div>
        </header>
        {children}
        <footer className="rp-footer">
          <div>
            <div>{meta.schoolName}　·　{meta.schoolYear} 學年　·　{kindLabel}　·　產出日期：{meta.printDate}</div>
            <div className="rp-note">本報告為校內體適能數據整理與鼓勵性回饋，平均值僅供參考，並非醫學或健康診斷。</div>
          </div>
          <div>第 1 頁 / 共 1 頁</div>
        </footer>
      </div>
    </div>
  );
}

const Field = ({ label, value, accent }) => (
  <div className={"rp-field" + (accent ? " accent" : "")}>
    <span className="rp-field-label">{label}</span>
    <span className="rp-field-value">{value}</span>
  </div>
);
const Title = ({ children }) => <div className="rp-title">{children}</div>;

function Feedback({ title, fb }) {
  return (
    <section className="rp-feedback">
      <div className="rp-feedback-title">{title}</div>
      <p><strong>正面回饋：</strong>{fb.positive}</p>
      <p><strong>課堂跟進建議：</strong>{fb.follow}</p>
    </section>
  );
}

function Sign({ left, mid = "家長簽閱" }) {
  return (
    <div className="rp-sign">
      <div>{left}：<span /></div>
      <div>{mid}：<span /></div>
      <div>日期：<span /></div>
    </div>
  );
}

function DiffCell({ d }) {
  if (d === null || d === undefined || !Number.isFinite(d)) return <td>—</td>;
  const cls = d > 0.5 ? "rp-up" : d < -0.5 ? "rp-down" : "rp-flat";
  return <td className={cls}>{fmtDiff(d)}</td>;
}

/* ------------------------------ 個人報告 ------------------------------ */
function PersonalSheet({ student, allStudents, meta }) {
  const rec = latest(student) || {};
  const cls = clsOf(student);
  const yr = yearOf(cls);
  const classList = allStudents.filter((s) => clsOf(s) === cls);
  const yearList = allStudents.filter((s) => yearOf(clsOf(s)) === yr);
  const C = summarize(classList);
  const G = summarize(yearList);
  const avg = num(rec.average);
  const lv = levelOf(student.xp);
  const rating = ratingOf(avg);
  const rank = [...classList].sort(rankSort).findIndex((s) => str(s.id) === str(student.id)) + 1;

  const rows = ABILITIES.map((a) => ({ ...a, p: num(rec[a.key]), c: C.abilities[a.key], g: G.abilities[a.key] }));
  const sorted = [...rows].sort((a, b) => a.p - b.p);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];

  const scores = Array.isArray(student.scores) ? student.scores : [];
  const progress = progressOf(student);
  const trendPts = scores.map((s, i) => ({ label: `第${i + 1}次`, value: num(s.average) })).slice(-6);
  const approved = approvedOf(student);
  const taskXp = approved.reduce((sum, q) => sum + num(q.xp), 0);
  const pending = (Array.isArray(student.questsSubmitted) ? student.questsSubmitted : []).filter((q) => q.status === "pending").length;
  const recent = approved.slice(-3).reverse();

  const fb = personalFeedback({ student, strongest, weakest, progress, taskCount: approved.length, year: yr });

  return (
    <Frame meta={meta} subtitle="聖保祿學校·　個人體適能報告" kindLabel="個人體適能報告">
      <section className="rp-info">
        <Field accent label="學生姓名" value={student.name || "—"} />
        <Field label="班別 / 座號" value={`${student.className || "—"}　${student.id || "—"} 號`} />
        <Field label="戰力總評" value={`${fmt(avg)} 分`} />
        <Field label="體能評級" value={rating.label} />
        <Field label="角色稱號" value={`Lv.${lv} ${titleOfLevel(lv)}`} />
        <Field label="體能流派" value={typeOf(rec, avg)} />
        <Field label="班內修煉排名" value={rank > 0 ? `第 ${rank} 名 / ${classList.length} 人` : "—"} />
        <Field label="最新測量日期" value={rec.createdAt || "—"} />
      </section>

      <Title>六大體能屬性分析（個人 · 班平均 · 級平均）</Title>
      <div className="rp-row">
        <div className="rp-box">
          <RadarSvg
            series={[
              { name: "個人", color: "#4f46e5", fill: true, values: rows.map((r) => r.p) },
              { name: "班平均", color: "#f59e0b", dash: "4 2", values: rows.map((r) => r.c) },
              { name: "級平均", color: "#64748b", dash: "1.5 2", values: rows.map((r) => r.g) },
            ]}
          />
        </div>
        <div className="rp-box">
          <table className="rp-table">
            <thead>
              <tr><th>項目</th><th>個人</th><th>班平均</th><th>級平均</th><th>較班平均</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td className="p">{fmt(r.p)}</td>
                  <td>{fmt(r.c)}</td>
                  <td>{fmt(r.g)}</td>
                  <DiffCell d={r.c === null ? null : r.p - r.c} />
                </tr>
              ))}
              <tr className="total">
                <td>戰力總評</td>
                <td className="p">{fmt(avg)}</td>
                <td>{fmt(C.average)}</td>
                <td>{fmt(G.average)}</td>
                <DiffCell d={C.average === null ? null : avg - C.average} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Title>各項能力對比</Title>
      <div className="rp-box">
        <GroupedBars
          labels={ABILITIES.map((a) => a.label)}
          series={[
            { name: "個人", color: "#4f46e5", values: rows.map((r) => r.p) },
            { name: "班平均", color: "#f59e0b", values: rows.map((r) => r.c) },
            { name: "級平均", color: "#475569", values: rows.map((r) => r.g) },
          ]}
        />
      </div>

      <div className="rp-row" style={{ marginTop: "2.6mm" }}>
        <div className="rp-box">
          <div className="rp-box-title">戰力總評進步軌跡</div>
          {trendPts.length >= 2 ? (
            <>
              <LineChartSvg points={trendPts} />
              <div className="rp-small">
                首次 {fmt(num(scores[0].average))} 分 → 最新 {fmt(avg)} 分（
                <b className={progress > 0 ? "rp-up" : progress < 0 ? "rp-down" : "rp-flat"}>{fmtDiff(progress)}</b> 分）
              </div>
            </>
          ) : (
            <div className="rp-empty">目前僅有 1 次測量紀錄，完成下一次測量後即可顯示進步趨勢。</div>
          )}
        </div>
        <div className="rp-box">
          <div className="rp-box-title">每週體能任務成就</div>
          <div className="rp-stat-line">
            已完成 <b>{approved.length}</b> 項　·　累計 <b>{taskXp}</b> XP　·　總經驗 <b>{num(student.xp)}</b> XP
          </div>
          {recent.length > 0 ? (
            <ul className="rp-list">
              {recent.map((q) => (
                <li key={q.id}>{q.questTitle}<em>（{q.approvedAt || q.submittedAt || "—"}）</em></li>
              ))}
            </ul>
          ) : (
            <div className="rp-empty">本學期尚未有經老師核可的每週體能任務紀錄。</div>
          )}
          {pending > 0 && <div className="rp-small">另有 {pending} 項任務正等待老師審核。</div>}
        </div>
      </div>

      <Feedback title="教師回饋" fb={fb} />
      <Sign left="體育教師簽署" />
    </Frame>
  );
}

/* ------------------------------ 班級報告 ------------------------------ */
function ClassSheet({ classCode, allStudents, meta }) {
  const cls = str(classCode).trim().toUpperCase();
  const yr = yearOf(cls);
  const list = allStudents.filter((s) => clsOf(s) === cls);
  const yearList = allStudents.filter((s) => yearOf(clsOf(s)) === yr);
  const C = summarize(list);
  const G = summarize(yearList);

  if (!list.length || !C.n) {
    return (
      <Frame meta={meta} subtitle="聖保祿學校　·　班級體適能報告" kindLabel="班級體適能報告">
        <div className="rp-empty" style={{ padding: "30mm 10mm", fontSize: "12pt" }}>
          {cls} 班尚未有任何體適能測量紀錄，暫時無法生成班級報告。
        </div>
      </Frame>
    );
  }

  const rows = ABILITIES.map((a) => ({ ...a, c: C.abilities[a.key], g: G.abilities[a.key] }));
  const byC = [...rows].sort((a, b) => a.c - b.c);
  const weakest = byC[0];
  const strongest = byC[byC.length - 1];
  const rating = ratingOf(C.average);
  const scored = list.filter(hasScore);
  const tracked = scored.filter((s) => progressOf(s) !== null);
  const improved = tracked.filter((s) => progressOf(s) > 0).length;
  const joined = list.filter((s) => approvedOf(s).length > 0).length;
  const totalApproved = list.reduce((sum, s) => sum + approvedOf(s).length, 0);
  const avgXp = mean(list.map((s) => num(s.xp)));
  const vsGrade = G.average === null ? null : C.average - G.average;
  const strongVsGrade = strongest.g === null ? null : strongest.c - strongest.g;

  const fb = classFeedback({ classCode: cls, n: C.n, average: C.average, strongest, weakest, vsGrade: strongVsGrade });

  return (
    <Frame meta={meta} subtitle="聖保祿學校　·　班級體適能報告" kindLabel="班級體適能報告">
      <section className="rp-info">
        <Field accent label="班別" value={cls} />
        <Field label="年級" value={yr} />
        <Field label="班級人數" value={`${list.length} 人`} />
        <Field label="已測人數" value={`${C.n} 人`} />
        <Field label="班級戰力均分" value={`${fmt(C.average)} 分`} />
        <Field label="較年級均分" value={vsGrade === null ? "—" : `${fmtDiff(vsGrade)} 分`} />
        <Field label="班級體能評級" value={rating.label} />
        <Field label="任務參與率" value={`${Math.round((joined / list.length) * 100)}%（${joined}/${list.length}）`} />
      </section>

      <Title>六大體能屬性分析（班平均 · 級平均）</Title>
      <div className="rp-row">
        <div className="rp-box">
          <RadarSvg
            series={[
              { name: "班平均", color: "#4f46e5", fill: true, values: rows.map((r) => r.c) },
              { name: "級平均", color: "#f59e0b", dash: "4 2", values: rows.map((r) => r.g) },
            ]}
          />
        </div>
        <div className="rp-box">
          <table className="rp-table">
            <thead>
              <tr><th>項目</th><th>班平均</th><th>級平均</th><th>差異</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td className="p">{fmt(r.c)}</td>
                  <td>{fmt(r.g)}</td>
                  <DiffCell d={r.g === null ? null : r.c - r.g} />
                </tr>
              ))}
              <tr className="total">
                <td>戰力總評</td>
                <td className="p">{fmt(C.average)}</td>
                <td>{fmt(G.average)}</td>
                <DiffCell d={vsGrade} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Title>各項能力對比</Title>
      <div className="rp-box">
        <GroupedBars
          labels={ABILITIES.map((a) => a.label)}
          series={[
            { name: "班平均", color: "#4f46e5", values: rows.map((r) => r.c) },
            { name: "級平均", color: "#f59e0b", values: rows.map((r) => r.g) },
          ]}
        />
      </div>

      <div className="rp-row" style={{ marginTop: "2.6mm" }}>
        <div className="rp-box">
          <div className="rp-box-title">班內體能評級分佈（人數）</div>
          <SimpleBars items={distribution(list)} />
        </div>
        <div className="rp-box">
          <div className="rp-box-title">班級成長與參與概況</div>
          <ul className="rp-list rp-list-spaced">
            <li>班級最強項目：<b>{strongest.label}</b>（{fmt(strongest.c)} 分）</li>
            <li>班級核心弱項：<b>{weakest.label}</b>（{fmt(weakest.c)} 分）</li>
            <li>戰力有進步人數：<b>{improved}</b> / {tracked.length} 人（需有 2 次以上測量）</li>
            <li>已完成體能任務：<b>{totalApproved}</b> 項（{joined} 位同學參與）</li>
            <li>班級平均經驗值：<b>{fmt(avgXp)}</b> XP</li>
          </ul>
        </div>
      </div>

      <Feedback title="班級回饋" fb={fb} />
      <Sign left="體育教師簽署" mid="科主任簽閱" />
    </Frame>
  );
}

/* ------------------------------ 年級報告 ------------------------------ */
function GradeSheet({ year, allStudents, meta }) {
  const yr = str(year).trim().toUpperCase();
  const gradeList = allStudents.filter((s) => yearOf(clsOf(s)) === yr);
  const G = summarize(gradeList);
  const classCodes = [...new Set(gradeList.map(clsOf))].sort();

  if (!gradeList.length || !G.n) {
    return (
      <Frame meta={meta} subtitle="聖保祿學校　·　年級體適能報告" kindLabel="年級體適能報告">
        <div className="rp-empty" style={{ padding: "30mm 10mm", fontSize: "12pt" }}>
          {yr} 年級尚未有任何體適能測量紀錄，暫時無法生成年級報告。
        </div>
      </Frame>
    );
  }

  const rows = ABILITIES.map((a) => ({ ...a, g: G.abilities[a.key] }));
  const byG = [...rows].sort((a, b) => a.g - b.g);
  const weakest = byG[0];
  const strongest = byG[byG.length - 1];
  const perClass = classCodes.map((c) => {
    const l = gradeList.filter((s) => clsOf(s) === c);
    return { code: c, total: l.length, S: summarize(l) };
  });
  const palette = ["#4f46e5", "#f59e0b", "#10b981", "#ec4899", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];
  const tracked = gradeList.filter((s) => hasScore(s) && progressOf(s) !== null);
  const improved = tracked.filter((s) => progressOf(s) > 0).length;
  const joined = gradeList.filter((s) => approvedOf(s).length > 0).length;
  const totalApproved = gradeList.reduce((sum, s) => sum + approvedOf(s).length, 0);
  const fb = gradeFeedback({ year: yr, classes: classCodes.length, n: G.n, strongest, weakest });

  return (
    <Frame meta={meta} subtitle="聖保祿學校　·　年級體適能報告" kindLabel="年級體適能報告">
      <section className="rp-info">
        <Field accent label="年級" value={yr} />
        <Field label="班級數" value={`${classCodes.length} 班`} />
        <Field label="學生總數" value={`${gradeList.length} 人`} />
        <Field label="已測人數" value={`${G.n} 人`} />
        <Field label="年級戰力均分" value={`${fmt(G.average)} 分`} />
        <Field label="年級體能評級" value={ratingOf(G.average).label} />
        <Field label="年級最強項目" value={strongest.label} />
        <Field label="年級核心弱項" value={weakest.label} />
      </section>

      <Title>各班體能平均一覽</Title>
      <div className="rp-box">
        <table className="rp-table rp-table-wide">
          <thead>
            <tr>
              <th>班別</th><th>人數</th><th>已測</th><th>戰力均分</th>
              {ABILITIES.map((a) => <th key={a.key}>{a.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {perClass.map((c) => (
              <tr key={c.code}>
                <td>{c.code}</td>
                <td>{c.total}</td>
                <td>{c.S.n}</td>
                <td className="p">{fmt(c.S.average)}</td>
                {ABILITIES.map((a) => <td key={a.key}>{fmt(c.S.abilities[a.key])}</td>)}
              </tr>
            ))}
            <tr className="total">
              <td>年級平均</td>
              <td>{gradeList.length}</td>
              <td>{G.n}</td>
              <td className="p">{fmt(G.average)}</td>
              {ABILITIES.map((a) => <td key={a.key}>{fmt(G.abilities[a.key])}</td>)}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rp-row" style={{ marginTop: "2.6mm" }}>
        <div className="rp-box">
          <div className="rp-box-title">年級六大體能屬性</div>
          <RadarSvg series={[{ name: "年級平均", color: "#4f46e5", fill: true, values: rows.map((r) => r.g) }]} />
        </div>
        <div className="rp-box">
          <div className="rp-box-title">各班戰力均分比較</div>
          <SimpleBars
            max={100}
            height={130}
            items={[
              ...perClass.map((c, i) => ({ label: c.code, value: c.S.average, color: palette[i % palette.length] })),
              { label: "年級", value: G.average, color: "#0f172a" },
            ]}
          />
        </div>
      </div>

      <div className="rp-row" style={{ marginTop: "2.6mm" }}>
        <div className="rp-box">
          <div className="rp-box-title">年級體能評級分佈（人數）</div>
          <SimpleBars items={distribution(gradeList)} height={100} />
        </div>
        <div className="rp-box">
          <div className="rp-box-title">年級成長與參與概況</div>
          <ul className="rp-list rp-list-spaced">
            <li>年級最強項目：<b>{strongest.label}</b>（{fmt(strongest.g)} 分）</li>
            <li>年級核心弱項：<b>{weakest.label}</b>（{fmt(weakest.g)} 分）</li>
            <li>戰力有進步人數：<b>{improved}</b> / {tracked.length} 人</li>
            <li>已完成體能任務：<b>{totalApproved}</b> 項（{joined} 位同學參與）</li>
          </ul>
        </div>
      </div>

      <Feedback title="年級回饋" fb={fb} />
      <Sign left="體育科主任簽署" mid="校方簽閱" />
    </Frame>
  );
}

/* ------------------------------ 對外入口 ------------------------------ */
export function ReportSheet({ kind, student, classCode, year, allStudents, meta }) {
  if (kind === "class") return <ClassSheet classCode={classCode} allStudents={allStudents} meta={meta} />;
  if (kind === "grade") return <GradeSheet year={year} allStudents={allStudents} meta={meta} />;
  return <PersonalSheet student={student} allStudents={allStudents} meta={meta} />;
}

/* ------------------------------ 樣式 ------------------------------ */
const REPORT_CSS = `
.rp-preview-wrap{width:100%;display:flex;justify-content:center}
.rp-holder{flex:0 0 auto;overflow:hidden}
.rp-scale{width:210mm;height:296mm;transform-origin:top left}
.rp-sheet,.rp-sheet *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.rp-sheet{width:210mm;height:296mm;background:#fff;position:relative;overflow:hidden;display:flex;flex-direction:column;
  color:#0f172a;font-family:'Noto Sans TC','Microsoft JhengHei','PingFang TC','Heiti TC',sans-serif;font-size:9.5pt;line-height:1.4;
  border-radius:4px;box-shadow:0 10px 30px rgba(15,23,42,.25);text-align:left}
.rp-band{height:6mm;flex:0 0 auto;background:linear-gradient(90deg,#4f46e5 0%,#a855f7 50%,#f59e0b 100%)}
.rp-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;padding:4.5mm 10mm 4mm}
.rp-header{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:4mm;border-bottom:.6mm solid #0f172a;padding-bottom:2mm}
.rp-brand{display:flex;align-items:center;gap:3mm}
.rp-logo{position:relative;width:13mm;height:13mm;border-radius:3mm;background:#fde68a;color:#0f172a;font-size:17pt;font-weight:900;display:flex;align-items:center;justify-content:center;overflow:hidden;flex:0 0 auto}
.rp-logo img{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;background:#fff}
.rp-school{font-size:15pt;font-weight:900;line-height:1.15}
.rp-sub{font-size:8.5pt;color:#64748b;font-weight:600;margin-top:.6mm}
.rp-year{text-align:right;flex:0 0 auto}
.rp-year-label{font-size:7.5pt;color:#64748b;letter-spacing:2px;font-weight:700}
.rp-year-value{font-size:12pt;font-weight:900;color:#4f46e5}
.rp-info{flex:0 0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:1.6mm;margin-top:2.4mm}
.rp-field{background:#f1f5f9;border-left:1.1mm solid #4f46e5;border-radius:1.6mm;padding:1.2mm 2.2mm;min-width:0}
.rp-field.accent{background:#fffbeb;border-left-color:#f59e0b}
.rp-field-label{display:block;font-size:7pt;color:#64748b;font-weight:700}
.rp-field-value{display:block;font-size:9.3pt;font-weight:900;margin-top:.2mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rp-field.accent .rp-field-value{font-size:11.5pt;color:#92400e}
.rp-title{flex:0 0 auto;display:flex;align-items:center;gap:1.8mm;font-size:10.5pt;font-weight:900;margin:2.6mm 0 1.2mm}
.rp-title::before{content:"";width:1.3mm;height:4mm;border-radius:1mm;background:#f59e0b;flex:0 0 auto}
.rp-row{flex:0 0 auto;display:grid;grid-template-columns:1fr 1fr;gap:2.4mm}
.rp-box{border:.3mm solid #e2e8f0;border-radius:2mm;padding:1.4mm 2mm;background:#fff;min-width:0;flex:0 0 auto}
.rp-box-title{font-size:8.5pt;font-weight:900;color:#334155;margin-bottom:.6mm}
.rp-svg{display:block;width:100%;height:auto}
.rp-table{width:100%;border-collapse:collapse;font-size:8.8pt}
.rp-table th{background:#0f172a;color:#fff;padding:1.1mm 1.2mm;font-size:8pt;text-align:center;font-weight:800;white-space:nowrap}
.rp-table td{padding:1mm 1.2mm;text-align:center;border-bottom:.2mm solid #e2e8f0;font-weight:700;white-space:nowrap}
.rp-table td:first-child{text-align:left}
.rp-table tbody tr:nth-child(even) td{background:#f8fafc}
.rp-table tr.total td{background:#eef2ff;font-weight:900}
.rp-table .p{color:#4f46e5;font-weight:900}
.rp-table-wide th,.rp-table-wide td{font-size:8.3pt;padding:.9mm .8mm}
.rp-up{color:#059669}.rp-down{color:#dc2626}.rp-flat{color:#64748b}
.rp-small{font-size:8pt;color:#475569;font-weight:600;margin-top:.8mm}
.rp-empty{font-size:8.5pt;color:#94a3b8;font-weight:600;line-height:1.6;padding:3mm 1mm}
.rp-stat-line{font-size:8.8pt;font-weight:600;color:#334155;margin:.6mm 0 1mm}
.rp-stat-line b{color:#4f46e5;font-size:11pt}
.rp-list{margin:0;padding-left:4.5mm;font-size:8.6pt;line-height:1.55;font-weight:600;color:#334155}
.rp-list em{font-style:normal;color:#94a3b8;font-size:7.8pt}
.rp-list-spaced li{margin-bottom:1.1mm}
.rp-feedback{flex:1 1 auto;min-height:0;margin-top:2.6mm;background:linear-gradient(180deg,#fffdf5,#fff7e0);border:.4mm solid #fcd34d;border-radius:2.5mm;padding:2.2mm 3.4mm;overflow:hidden;display:flex;flex-direction:column;justify-content:center}
.rp-feedback-title{font-size:10.5pt;font-weight:900;color:#92400e;margin-bottom:1mm}
.rp-feedback-title::before{content:"★ ";color:#f59e0b}
.rp-feedback p{margin:0 0 1mm;font-size:8.8pt;line-height:1.5;color:#3a2a0a;font-weight:600}
.rp-feedback p:last-child{margin-bottom:0}
.rp-feedback p strong{color:#92400e}
.rp-sign{flex:0 0 auto;display:flex;justify-content:space-between;gap:6mm;margin-top:2.4mm;font-size:9pt;color:#475569;font-weight:700}
.rp-sign span{display:inline-block;border-bottom:.25mm solid #94a3b8;min-width:34mm;padding-bottom:.6mm}
.rp-footer{flex:0 0 auto;margin-top:2mm;padding-top:1.6mm;border-top:.25mm dashed #cbd5e1;display:flex;justify-content:space-between;align-items:flex-end;gap:4mm;font-size:7.3pt;color:#64748b;font-weight:700}
.rp-note{font-weight:500;color:#94a3b8;margin-top:.4mm}
@media print{
  .rp-holder{width:210mm!important;height:296mm!important;overflow:visible!important}
  .rp-scale{transform:none!important}
  .rp-sheet{box-shadow:none!important;border-radius:0!important}
}
`;

const PAGE_CSS = `
@page{size:A4 portrait;margin:0}
html,body{margin:0;padding:0;background:#e2e8f0;font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif}
.rp-bar{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 20px;background:#312e81;color:#fff;font-size:14px;font-weight:700}
.rp-bar button{background:#f59e0b;color:#1e1b4b;border:0;border-radius:10px;padding:9px 18px;font-weight:900;font-size:14px;cursor:pointer}
.rp-page{width:210mm;height:297mm;margin:12px auto;background:#fff;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.25);page-break-after:always;break-after:page}
.rp-page .rp-sheet{box-shadow:none;border-radius:0}
@media print{
  html,body{background:#fff}
  .rp-noprint{display:none!important}
  .rp-page{margin:0;box-shadow:none}
  .rp-page:last-child{page-break-after:auto;break-after:auto}
}
`;

export const ReportStyle = () => <style>{REPORT_CSS}</style>;

/* ------------------------------ 螢幕預覽（自動縮放） ------------------------------ */
const SHEET_W = 793.7; // 210mm
const SHEET_H = 1118.7; // 296mm

export function ReportPreview({ children }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(0.7);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const update = () => setScale(Math.min(1, Math.max(0.3, (el.clientWidth - 4) / SHEET_W)));
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (ro) ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);
  return (
    <div ref={wrapRef} className="rp-preview-wrap">
      <ReportStyle />
      <div className="rp-holder" style={{ width: SHEET_W * scale, height: SHEET_H * scale }}>
        <div className="rp-scale" style={{ transform: `scale(${scale})` }}>{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------ 新視窗列印（單份 / 批量） ------------------------------ */
// elements：React 元素陣列，每個元素 = 一頁 A4。回傳 false 代表彈窗被瀏覽器攔截。
export function printSheets(elements, title = "體適能報告") {
  const pages = renderToStaticMarkup(
    <>
      {elements.map((el, i) => (
        <div className="rp-page" key={i}>{el}</div>
      ))}
    </>
  );
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(
    "<!DOCTYPE html><html lang=\"zh-Hant\"><head><meta charset=\"utf-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
      "<title>" + esc(title) + "</title>" +
      "<link href=\"https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap\" rel=\"stylesheet\">" +
      "<style>" + REPORT_CSS + PAGE_CSS + "</style></head><body>" +
      "<div class=\"rp-noprint rp-bar\"><span>列印預覽：共 " + elements.length + " 頁 A4　（列印設定：邊界「無」、比例 100%、關閉頁首頁尾）</span>" +
      "<button onclick=\"window.print()\">🖨 立即列印 / 另存為 PDF</button></div>" +
      pages +
      "<script>window.onload=function(){setTimeout(function(){window.print();},800);};<\/script>" +
      "</body></html>"
  );
  w.document.close();
  return true;
}
