// ==========================================================================
// 聖保祿 本機 AI 教練引擎 v2（零成本、離線、不需任何 API）
//
// 流程：學生資料 → 畫像 → 週結構 → 從動作庫選動作 → 7 天方案（純 JSON）
//
// 重點：
//  1. 全程用「確定性亂數」：種子 = 班級 + 學號 + 週次 + 換套次數，
//     同一學生同一週結果穩定；不同學生、不同週、按「換一套」都會不同。
//  2. 所有門檻集中在 COACH_RULES，與 Excel【規則參數】一一對應。
//  3. 不依賴 React，可單獨測試。
// ==========================================================================
import { COACH_LIBRARY } from "./CoachLibrary";

export const COACH_PLAN_VERSION = 2;

// ---- 與 Excel【規則參數】對應的門檻 ---------------------------------------
export const COACH_RULES = {
  levelBeginnerMax: 60, // 分數 < 60 → 入門
  levelAdvancedMax: 80, // 60 ≤ 分數 < 80 → 進階；≥ 80 → 挑戰
  lowOverallAvg: 60, // 六項平均 < 60 → 全面偏低
  spreadForWeakLink: 20, // 最高 − 最低 ≥ 20 → 單項短板
  highOverallAvg: 70, // 六項平均 ≥ 70 → 均衡偏高；否則 → 均衡型
  declineThreshold: 3, // 比上次下降 ≥ 3 分 → 退步
  improveThreshold: 5, // 比上次上升 ≥ 5 分 → 進步
  declinePriorityBonus: 8, // 退步項目排序時視為再低 8 分，優先處理
  minGroupSize: 3, // 班／級平均至少要有 3 位已測學生才顯示對比
  recentLogCount: 4, // 參考最近 4 份任務日誌
};

export const COACH_DEFAULT_OPTIONS = { minutes: 20, venue: "home", rope: false, body: "good" };

// 學生端「生成前的 4 個選項」
export const COACH_OPTION_DEFS = [
  {
    key: "minutes",
    label: "⏱️ 每次可用時間",
    choices: [
      { value: 10, label: "10 分鐘" },
      { value: 20, label: "20 分鐘" },
      { value: 30, label: "30 分鐘" },
    ],
  },
  {
    key: "venue",
    label: "📍 訓練場地",
    choices: [
      { value: "home", label: "🏠 家中（空間小）" },
      { value: "field", label: "🏟️ 操場／公園" },
    ],
  },
  {
    key: "rope",
    label: "🎒 器材",
    choices: [
      { value: false, label: "無器材" },
      { value: true, label: "🪢 有跳繩" },
    ],
  },
  {
    key: "body",
    label: "🩺 身體狀況",
    choices: [
      { value: "good", label: "💪 良好" },
      { value: "sore", label: "😅 有點痠痛" },
      { value: "injured", label: "🩹 有傷患或不適" },
    ],
  },
];

// ---- 動作庫存取 -----------------------------------------------------------
const LIB = COACH_LIBRARY;
const byId = new Map(LIB.map((e) => [e.id, e]));
export const getExerciseById = (id) => byId.get(id) || null;

// ---- 小工具 ---------------------------------------------------------------
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round1 = (n) => Math.round(n * 10) / 10;
const str = (v) => (v === null || v === undefined ? "" : String(v));

function xmur3(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const makeRng = (seed) => mulberry32(xmur3(str(seed))());

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pickOne = (arr, rng) => arr[Math.floor(rng() * arr.length)];

// ISO 週次，例如 "2026-W48"
export function getWeekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ---- 選項篩選：場地 / 器材 / 身體狀況 --------------------------------------
function isAllowed(ex, opts) {
  if (opts.venue === "home" && ex.venue !== "any") return false;
  if (!opts.rope && ex.equip === "rope") return false;
  if (opts.body !== "good" && ex.impact !== "low") return false;
  return true;
}

// ---- 分級 -----------------------------------------------------------------
const baseLevel = (score) =>
  score < COACH_RULES.levelBeginnerMax ? 1 : score < COACH_RULES.levelAdvancedMax ? 2 : 3;

// ---- 班／級平均 -----------------------------------------------------------
function groupAverage(list, abilities) {
  const rows = list
    .filter((s) => Array.isArray(s.scores) && s.scores.length > 0)
    .map((s) => s.scores[s.scores.length - 1]);
  if (rows.length < COACH_RULES.minGroupSize) return null;
  const out = { n: rows.length };
  abilities.forEach((a) => {
    out[a.key] = rows.reduce((t, r) => t + num(r[a.key]), 0) / rows.length;
  });
  return out;
}

// ---- 任務日誌回饋 ---------------------------------------------------------
// 以「預設選項原文」中的關鍵字判斷（見 App.jsx 的 presetFeelings）
const FEEDBACK_RULES = [
  { id: "easy", match: "非常輕鬆", shift: +1 },
  { id: "hard", match: "感覺比較吃力", shift: -1 },
  { id: "hardOk", match: "雖然吃力", shift: 0 },
  { id: "legSore", match: "腿部肌肉緊繃", shift: 0 },
  { id: "ok", match: "但能輕鬆完成", shift: 0 },
];

const ABILITY_KEYWORDS = {
  cardio: ["心肺", "慢跑", "耐力", "持續跑"],
  strength: ["力量", "深蹲", "俯臥", "仰臥", "引體", "支撐"],
  power: ["爆發", "跳遠", "縱跳", "跳躍"],
  speed: ["衝刺", "速度", "疾風", "瞬步"],
  flexibility: ["柔軟", "拉伸", "體前彎", "柔韌"],
  agility: ["敏捷", "折返", "T字", "變向"],
};

function relatedAbility(sub) {
  const text = `${str(sub.questTitle)} ${str(sub.questDesc)}`;
  let best = null;
  let bestHits = 0;
  Object.entries(ABILITY_KEYWORDS).forEach(([key, words]) => {
    const hits = words.reduce((t, w) => t + (text.includes(w) ? 1 : 0), 0);
    if (hits > bestHits) {
      best = key;
      bestHits = hits;
    }
  });
  return best;
}

function analyseFeedback(student) {
  const subs = Array.isArray(student.questsSubmitted) ? student.questsSubmitted : [];
  const recent = subs.filter((s) => s && s.reflection).slice(-COACH_RULES.recentLogCount);
  const perAbility = {};
  let unrelated = 0;
  const flags = { hard: false, easy: false, hardOk: false, legSore: false };
  const notes = []; // 給學生看的說明

  recent.forEach((s) => {
    // 只比對預設選項那一段，避免學生自由補充的文字造成誤判
    const core = str(s.reflection).split("（補充描述：")[0];
    const rule = FEEDBACK_RULES.find((r) => core.includes(r.match));
    if (!rule) return;
    if (rule.id === "hard") flags.hard = true;
    if (rule.id === "easy") flags.easy = true;
    if (rule.id === "hardOk") flags.hardOk = true;
    if (rule.id === "legSore") flags.legSore = true;
    if (rule.shift !== 0) {
      const ability = relatedAbility(s);
      if (ability) perAbility[ability] = (perAbility[ability] || 0) + rule.shift;
      else unrelated += rule.shift;
    }
  });

  // 沒有對應能力的日誌：至少兩份同方向才整體調整，避免單次偶然
  const globalShift = Math.abs(unrelated) >= 2 ? Math.sign(unrelated) : 0;
  return { perAbility, globalShift, flags, count: recent.length, recent };
}

// ---- 任務參與度 -----------------------------------------------------------
function analyseEngagement(student, quests, questsVersion) {
  const subs = Array.isArray(student.questsSubmitted) ? student.questsSubmitted : [];
  const total = Array.isArray(quests) ? quests.length : 0;
  if (!subs.length || !total) return { state: "unknown" };

  const byVersion = {};
  subs.forEach((s) => {
    if (!s || s.status === "rejected") return;
    const v = str(s.version);
    if (!byVersion[v]) byVersion[v] = new Set();
    byVersion[v].add(s.questId);
  });

  let used = null;
  let isCurrent = false;
  if (byVersion[str(questsVersion)] && byVersion[str(questsVersion)].size > 0) {
    used = byVersion[str(questsVersion)];
    isCurrent = true;
  } else {
    // 本週任務還沒開始做 → 參考最近一次有提交的任務版本，不因為「新一週剛開始」而扣分
    const others = Object.keys(byVersion)
      .filter((v) => v !== str(questsVersion))
      .sort((a, b) => num(b) - num(a));
    if (others.length) used = byVersion[others[0]];
  }
  if (!used) return { state: "unknown" };

  const done = Math.min(used.size, total);
  const ratio = done / total;
  const state = ratio <= 1 / 3 ? "low" : ratio >= 1 ? "high" : "mid";
  return { state, done, total, isCurrent };
}

// ---- 週結構模板（對應 Excel【一週結構】）-----------------------------------
const TYPE_LABEL = { low: "全面偏低", spike: "單項短板", balanced: "均衡型", high: "均衡偏高" };
const TEMPLATES = {
  low: ["weak", "rest", "second", "rest", "mixed", "light", "recover"],
  spike: ["weak", "second", "rest", "weak", "maintain", "free", "recover"],
  balanced: ["weak", "second", "rest", "weak", "maintain", "free", "recover"],
  high: ["weak", "second", "circuit", "maintain", "weak", "free", "recover"],
};
// 參與度低時，減少哪一個訓練日
const DROP_SLOT = { low: "mixed", spike: "maintain", balanced: "maintain", high: "circuit" };

const MAIN_COUNT = { 10: 2, 20: 3, 30: 4 };
const SIDE_COUNT = { 10: 1, 20: 2, 30: 3 }; // 熱身／放鬆動作數
const SIDE_MINUTES = { 10: 2, 20: 3, 30: 5 };

// ---- 文字庫 ---------------------------------------------------------------
const toneOf = (level) => (level < 10 ? "friendly" : level < 30 ? "coach" : "challenge");

const OPENINGS = {
  friendly: [
    "歡迎來到你的訓練計劃！每次完成一個動作，都是在為自己升級，不用急，穩穩前進就好。",
    "新的一週開始了！先從小目標做起，把這份方案一步一步完成，你會看到自己的進步。",
    "別擔心起步慢，重要的是開始行動。這週的方案已按你的數據設計好，我們一起出發！",
  ],
  coach: [
    "你已經打好基礎，這週的目標是突破瓶頸。按方案認真完成，下一次測量就會看到成果。",
    "你有一定的實力了，現在要靠有針對性的訓練再上一層樓。這週的方案專攻你的關鍵位置！",
    "進入進階階段，訓練要更精準。這份方案針對你的強弱項來安排，跟著做就對了。",
  ],
  challenge: [
    "高階冒險者，這週的方案為你加了強度。突破自己，就是最好的訓練。",
    "你的體能已屬同儕前列，這週用高要求去打磨細節，向更高的境界進發。",
    "要保持頂尖，就不能鬆懈。這份方案專挑你還有空間的位置，用挑戰級動作逼出潛力。",
  ],
};
const CLOSINGS = {
  friendly: [
    "完成多少都值得鼓勵，做不到的天數不用補，下一天繼續就好。我們操場見！",
    "記得：慢慢來比較快。每練一天，你就比昨天更強一點。加油！",
    "只要願意開始，就已經贏了一半。這週完成它，再回來看自己的進步吧！",
  ],
  coach: [
    "堅持一週，數據會告訴你答案。下次測量，期待看到你的突破！",
    "訓練靠的是紀律，不是心情。按計劃完成，成績自然會上來。",
    "目標已經明確，剩下的就是行動。穿上跑鞋，出發吧！",
  ],
  challenge: [
    "真正的強者，是把計劃完成得比要求更好。期待你刷新紀錄！",
    "細節決定上限。每個動作都做到標準，你就是同級的標竿。",
    "以高標準要求自己，也別忘了好好休息。恢復也是訓練的一部分。",
  ],
};

const SAFETY_LINES = [
  "每次訓練前先熱身，訓練後做放鬆拉伸。",
  "每個動作先做完所有組數，再換下一個動作；組間休息按提示進行。",
  "感到疼痛、頭暈或不適，請立即停止並告知體育老師，不要硬撐。",
  "有傷患或身體不舒服時，先詢問老師再訓練。",
];

// ---- 生成主函數 -----------------------------------------------------------
/**
 * @param {object}  p
 * @param {object}  p.student       學生資料（需含 scores）
 * @param {Array}   p.allStudents   用於計算班／級平均
 * @param {Array}   p.abilities     [{key,label,icon}]，即 App 內的 abilityFields
 * @param {object}  p.levelInfo     { level, title }
 * @param {object}  p.options       { minutes, venue, rope, body }
 * @param {string}  p.questsVersion 目前任務版本
 * @param {Array}   p.quests        目前每週任務
 * @param {object}  p.prevPlan      上一份方案（可為 null）
 * @param {boolean} p.regenerate    true＝「換一套動作」
 * @param {Date}    p.now
 * @returns {object|null} 方案（純 JSON）；學生沒有任何測量紀錄時回傳 null
 */
export function generateCoachPlan({
  student,
  allStudents = [],
  abilities,
  levelInfo,
  options = COACH_DEFAULT_OPTIONS,
  questsVersion = "",
  quests = [],
  prevPlan = null,
  regenerate = false,
  now = new Date(),
}) {
  const scores = Array.isArray(student?.scores) ? student.scores : [];
  if (scores.length === 0) return null;

  const opts = {
    minutes: [10, 20, 30].includes(Number(options.minutes)) ? Number(options.minutes) : 20,
    venue: options.venue === "field" ? "field" : "home",
    rope: options.rope === true,
    body: ["good", "sore", "injured"].includes(options.body) ? options.body : "good",
  };

  // ---------- 隨機種子與「避免重複」 ----------
  const weekKey = getWeekKey(now);
  const sameWeek = prevPlan && prevPlan.weekKey === weekKey;
  const regen = regenerate ? (sameWeek ? num(prevPlan.regen) + 1 : 1) : sameWeek ? num(prevPlan.regen) : 0;
  const seed = `${str(student.className).toUpperCase()}|${str(student.id)}|${weekKey}|${regen}`;
  const rng = makeRng(seed);
  // 換套 → 避開目前這套；新的一週 → 避開上週用過的
  const avoidIds =
    prevPlan && Array.isArray(prevPlan.usedIds) && (regenerate || !sameWeek) ? prevPlan.usedIds : [];
  const ctx = { rng, used: new Set(), avoid: new Set(avoidIds) };

  // ---------- 畫像 ----------
  const rec = scores[scores.length - 1];
  const prev = scores.length >= 2 ? scores[scores.length - 2] : null;
  const labelOf = (key) => abilities.find((a) => a.key === key)?.label || key;
  const iconOf = (key) => abilities.find((a) => a.key === key)?.icon || "⭐";
  const catLabel = (key) => (key === "warmup" ? "熱身" : key === "cooldown" ? "放鬆" : labelOf(key));

  const values = {};
  const delta = {};
  abilities.forEach((a) => {
    values[a.key] = num(rec[a.key]);
    delta[a.key] = prev ? values[a.key] - num(prev[a.key]) : null;
  });
  const vals = abilities.map((a) => values[a.key]);
  const avg = vals.reduce((t, v) => t + v, 0) / vals.length;
  const spread = Math.max(...vals) - Math.min(...vals);

  const myClass = str(student.className).trim().toUpperCase();
  const myYear = myClass.slice(0, 2);
  const classAvg = groupAverage(
    allStudents.filter((s) => str(s.className).trim().toUpperCase() === myClass),
    abilities
  );
  const yearAvg = groupAverage(
    allStudents.filter((s) => str(s.className).trim().toUpperCase().slice(0, 2) === myYear),
    abilities
  );

  const declined = (k) => delta[k] !== null && delta[k] <= -COACH_RULES.declineThreshold;
  const improved = (k) => delta[k] !== null && delta[k] >= COACH_RULES.improveThreshold;

  // 週結構類型
  let typeKey;
  if (avg < COACH_RULES.lowOverallAvg) typeKey = "low";
  else if (spread >= COACH_RULES.spreadForWeakLink) typeKey = "spike";
  else if (avg >= COACH_RULES.highOverallAvg) typeKey = "high";
  else typeKey = "balanced";

  // 弱項排序：分數越低越前；退步項目視為再低 declinePriorityBonus 分；同分用種子決定，避免總是同一項
  const tie = {};
  abilities.forEach((a) => (tie[a.key] = rng()));
  const ranked = [...abilities]
    .map((a) => ({
      key: a.key,
      eff: values[a.key] - (declined(a.key) ? COACH_RULES.declinePriorityBonus : 0),
    }))
    .sort((x, y) => x.eff - y.eff || tie[x.key] - tie[y.key])
    .map((x) => x.key);
  const weakKeys = ranked.slice(0, 2);
  const strongKey = [...abilities]
    .map((a) => a.key)
    .sort((x, y) => values[y] - values[x] || tie[x] - tie[y])[0];

  // 維持日：優先放在「進步最明顯、且不是主攻項」的能力，否則用最強項
  const improvedKeys = abilities
    .map((a) => a.key)
    .filter((k) => improved(k) && !weakKeys.includes(k))
    .sort((x, y) => delta[y] - delta[x]);
  const maintainKey = improvedKeys[0] || strongKey;

  // ---------- 回饋與參與度 ----------
  const fb = analyseFeedback(student);
  const eng = analyseEngagement(student, quests, questsVersion);

  // ---------- 各項最終難度 ----------
  const levels = {};
  abilities.forEach((a) => {
    const k = a.key;
    let lv = baseLevel(values[k]);
    if (typeKey === "low") lv = 1; // 全面偏低：全部入門
    if (typeKey === "high") lv += 1; // 均衡偏高：以挑戰級為主
    lv += clamp((fb.perAbility[k] || 0) + fb.globalShift, -1, 1);
    if (eng.state === "high" && (k === weakKeys[0] || k === strongKey)) lv += 1;
    if (eng.state === "low") lv -= 1;
    lv = clamp(lv, 1, 3);
    if (opts.body === "injured") lv = 1; // 傷患：全部入門量
    levels[k] = lv;
  });
  const sideLevel =
    opts.body === "injured"
      ? 1
      : clamp(Math.round(abilities.reduce((t, a) => t + levels[a.key], 0) / abilities.length), 1, 3);

  const restNote = fb.flags.hard || fb.flags.hardOk ? "（組間休息可多加約 15 秒）" : "";
  const preferLow = fb.flags.legSore;

  // ---------- 動作選擇 ----------
  const poolOf = (cat) => LIB.filter((e) => e.cat === cat && isAllowed(e, opts));

  function pick(pool, n, extra = {}) {
    const scored = shuffle(pool, ctx.rng).map((e, i) => ({
      e,
      i,
      s:
        (ctx.used.has(e.id) ? 4 : 0) +
        (ctx.avoid.has(e.id) ? 2 : 0) +
        (extra.preferLow && e.impact === "high" ? 1 : 0) +
        (extra.regex && !extra.regex.test(e.name) ? 1 : 0),
    }));
    scored.sort((a, b) => a.s - b.s || a.i - b.i);
    const out = scored.slice(0, n).map((x) => x.e);
    out.forEach((e) => ctx.used.add(e.id));
    return out;
  }

  const toItem = (e, level, extra = {}) => {
    let dose = e.levels[level - 1];
    if (extra.rest && restNote && dose.includes("休")) dose += restNote;
    const item = { id: e.id, name: e.name, cat: e.cat, catLabel: catLabel(e.cat), level, dose };
    if (extra.supplement) item.supplement = true;
    return item;
  };

  const mainCountBase = typeKey === "low" ? Math.min(MAIN_COUNT[opts.minutes], 2) : MAIN_COUNT[opts.minutes];
  const sideCount = SIDE_COUNT[opts.minutes] + (preferLow ? 1 : 0); // 腿部痠痛 → 放鬆加一個

  function warmupBlock() {
    const items = pick(poolOf("warmup"), SIDE_COUNT[opts.minutes]).map((e) => toItem(e, sideLevel));
    return { section: "warmup", label: `熱身（約 ${SIDE_MINUTES[opts.minutes]} 分鐘）`, items };
  }
  function cooldownBlock(count = sideCount) {
    const items = pick(poolOf("cooldown"), count, { regex: preferLow ? /腿|髖|臀|股/ : null }).map((e) =>
      toItem(e, sideLevel)
    );
    return { section: "cooldown", label: `放鬆（約 ${SIDE_MINUTES[opts.minutes]} 分鐘）`, items };
  }

  // 主訓練：集中在一個能力；不夠時從其他能力補足
  function mainFromCategory(catKey, count) {
    const items = pick(poolOf(catKey), count, { preferLow }).map((e) => toItem(e, levels[catKey], { rest: true }));
    if (items.length < count) {
      const others = ranked.filter((k) => k !== catKey);
      for (const k of others) {
        if (items.length >= count) break;
        const extra = pick(poolOf(k), 1, { preferLow });
        extra.forEach((e) => items.push(toItem(e, levels[k], { rest: true, supplement: true })));
      }
    }
    return items;
  }
  // 綜合日：每個動作來自不同能力
  function mainAcrossCategories(order, count, forceLevel) {
    const items = [];
    for (const k of order) {
      if (items.length >= count) break;
      const e = pick(poolOf(k), 1, { preferLow })[0];
      if (e) items.push(toItem(e, forceLevel || levels[k], { rest: true }));
    }
    return items;
  }

  // ---------- 組裝 7 天 ----------
  const slots = [...TEMPLATES[typeKey]];
  if (eng.state === "low") {
    const idx = slots.indexOf(DROP_SLOT[typeKey]);
    if (idx >= 0) slots[idx] = "rest";
  }

  const days = slots.map((slot, i) => {
    const day = { day: i + 1, slot, kind: "train", title: "", focus: "", note: "", blocks: [] };

    if (slot === "rest") {
      day.kind = "rest";
      day.title = "休息 / 輕活動";
      day.note = "今天不安排訓練，讓身體恢復。可以散步或做輕鬆伸展，記得補充水分、早點睡覺。";
      return day;
    }
    if (slot === "light") {
      day.kind = "light";
      day.title = "自由輕活動";
      day.note =
        opts.body === "good"
          ? "做你喜歡的輕鬆活動：散步、打球、踏單車都可以，約 20–30 分鐘，保持身體活躍即可，不需要訓練到很累。"
          : "今天只做輕鬆的活動，例如慢慢散步或簡單伸展，不要勉強。不舒服就休息。";
      return day;
    }
    if (slot === "recover") {
      day.kind = "recover";
      day.title = "恢復日";
      day.note = "輕鬆伸展約 10 分鐘，並提醒自己：睡眠充足、多喝水、均衡飲食，讓身體吸收這一週的訓練成果。";
      day.blocks.push({
        section: "cooldown",
        label: "恢復伸展（約 10 分鐘）",
        items: pick(poolOf("cooldown"), 3, { regex: preferLow ? /腿|髖|臀|股/ : null }).map((e) => toItem(e, 1)),
      });
      return day;
    }
    if (slot === "free") {
      day.kind = "free";
      day.title = `自由發揮日（${labelOf(strongKey)}）`;
      day.focus = strongKey;
      day.note = `今天由你決定！從下面你擅長的【${labelOf(strongKey)}】動作中，自選 1–2 個來練，享受自己的強項。`;
      let choices = pick(poolOf(strongKey), 3, { preferLow });
      if (choices.length < 3) {
        const second = ranked.slice().reverse().filter((k) => k !== strongKey);
        for (const k of second) {
          if (choices.length >= 3) break;
          choices = choices.concat(pick(poolOf(k), 1, { preferLow }));
        }
      }
      day.blocks.push({
        section: "choices",
        label: "自選動作（選 1–2 個）",
        items: choices.map((e) => toItem(e, levels[e.cat] || levels[strongKey])),
      });
      return day;
    }

    // ---- 訓練日 ----
    day.blocks.push(warmupBlock());
    let main = [];
    if (slot === "weak" || slot === "second" || slot === "maintain") {
      const key = slot === "weak" ? weakKeys[0] : slot === "second" ? weakKeys[1] : maintainKey;
      day.focus = key;
      day.title = `${slot === "weak" ? "主攻" : slot === "second" ? "次攻" : "維持"}：${labelOf(key)}`;
      const v = values[key];
      if (slot === "maintain") {
        day.note =
          key === strongKey
            ? `【${labelOf(key)}】是你目前最強的一項（${v} 分），今天保持手感，不要讓它退步。`
            : `【${labelOf(key)}】比上次進步了 ${delta[key]} 分，今天繼續鞏固成果。`;
      } else {
        day.note = `【${labelOf(key)}】目前 ${v} 分，是這週需要補強的重點。`;
      }
      main = mainFromCategory(key, mainCountBase);
    } else if (slot === "mixed") {
      day.title = "綜合入門：多項輕量練習";
      day.note = "今天每個動作都來自不同的能力，用入門量輕鬆完成，重點是建立運動習慣。";
      main = mainAcrossCategories(ranked, mainCountBase, 1); // 由弱到強，全部入門量
    } else if (slot === "circuit") {
      day.title = "綜合循環";
      day.note = "今天把不同能力的動作串起來：依序完成每個動作的一組，再重頭做下一輪，直到做完所有組數。";
      const order = [];
      for (let a = 0, b = ranked.length - 1; a <= b; a++, b--) {
        order.push(ranked[a]);
        if (a !== b) order.push(ranked[b]);
      }
      main = mainAcrossCategories(order, mainCountBase);
    }
    day.blocks.push({ section: "main", label: "主訓練", items: main });
    day.blocks.push(cooldownBlock());
    return day;
  });

  // ---------- 說明文字 ----------
  const level = num(levelInfo?.level) || 1;
  const title = str(levelInfo?.title);
  const tone = toneOf(level);
  const name = str(student.name);

  const opening = `哈囉，${name}！你目前是【${title}】（Lv.${level}）。${pickOne(OPENINGS[tone], rng)}`;
  const closing = pickOne(CLOSINGS[tone], rng);

  const reasons = [];
  const avgText = round1(avg).toFixed(1);
  if (typeKey === "low")
    reasons.push({
      icon: "📊",
      text: `六項平均 ${avgText} 分，目前仍在打基礎的階段（屬「全面偏低」）。這週重點是建立運動習慣：每個訓練日只練 2 個動作，做得到比做得多更重要。`,
    });
  else if (typeKey === "spike")
    reasons.push({
      icon: "📊",
      text: `六項平均 ${avgText} 分，但最強與最弱的一項相差 ${Math.round(spread)} 分（屬「單項短板」）。這週先集中補強最弱的兩項，再用一天維持強項。`,
    });
  else if (typeKey === "high")
    reasons.push({
      icon: "📊",
      text: `六項平均 ${avgText} 分，整體均衡而且不錯（屬「均衡偏高」）。這週以較高難度為主，並加入一天綜合循環。`,
    });
  else
    reasons.push({
      icon: "📊",
      text: `六項平均 ${avgText} 分，各項差距不大（屬「均衡型」）。這週平均安排，最弱的一項多練一天。`,
    });

  const compare = (key) => {
    const parts = [];
    if (classAvg) {
      const d = values[key] - classAvg[key];
      parts.push(Math.abs(d) < 0.5 ? "與全班平均相若" : `比全班平均${d < 0 ? "低" : "高"} ${round1(Math.abs(d))} 分`);
    }
    if (yearAvg) {
      const d = values[key] - yearAvg[key];
      parts.push(Math.abs(d) < 0.5 ? "與全級平均相若" : `比全級平均${d < 0 ? "低" : "高"} ${round1(Math.abs(d))} 分`);
    }
    return parts.length ? `，${parts.join("、")}` : "";
  };
  weakKeys.forEach((k, idx) => {
    const trend = declined(k) ? `；而且比上次測量下降了 ${Math.abs(delta[k])} 分，所以優先處理` : "";
    reasons.push({
      icon: iconOf(k),
      text: `${idx === 0 ? "主攻" : "次攻"}【${labelOf(k)}】：${values[k]} 分${compare(k)}${trend}。`,
    });
  });
  abilities
    .map((a) => a.key)
    .filter((k) => declined(k) && !weakKeys.includes(k))
    .forEach((k) =>
      reasons.push({ icon: "⚠️", text: `【${labelOf(k)}】比上次測量下降了 ${Math.abs(delta[k])} 分，請留意。` })
    );
  improvedKeys.slice(0, 2).forEach((k) =>
    reasons.push({
      icon: "📈",
      text: `【${labelOf(k)}】比上次進步了 ${delta[k]} 分，做得好！${k === maintainKey ? "維持日安排在這一項，繼續鞏固。" : ""}`,
    })
  );

  // 日誌回饋
  if (fb.flags.hard)
    reasons.push({ icon: "💬", text: "你最近的日誌提到完成任務時感覺比較吃力，所以相關能力降了一級難度，並建議組間多休息一點。" });
  else if (fb.flags.hardOk)
    reasons.push({ icon: "💬", text: "你最近的日誌顯示雖然吃力但能堅持，很棒！方案維持原有難度，組間休息建議多加一點。" });
  if (fb.flags.easy)
    reasons.push({ icon: "💬", text: "你最近的日誌提到完成得很輕鬆，所以相關能力提高了一級難度，期待你的表現！" });
  if (fb.flags.legSore)
    reasons.push({ icon: "💬", text: "你的日誌提到腿部有些緊繃痠痛，所以這週減少高衝擊動作，並多安排了一個放鬆拉伸。" });

  // 參與度
  if (eng.state === "low")
    reasons.push({
      icon: "🌱",
      text: "最近完成的每週任務較少，所以這週把方案簡化了：少一個訓練日、動作改用較容易的版本。先把習慣建立起來，之後再慢慢加強！",
    });
  else if (eng.state === "high")
    reasons.push({ icon: "🔥", text: "你最近完成了全部每週任務，堅持得很好！所以主攻項與強項各加了一級難度。" });

  // 選項說明
  const optText = `每次 ${opts.minutes} 分鐘、${opts.venue === "home" ? "家中" : "操場／公園"}、${opts.rope ? "有跳繩" : "無器材"}`;
  if (opts.body === "injured")
    reasons.push({
      icon: "🩹",
      text: `你選了「有傷患或不適」（${optText}）。這份方案只使用低衝擊動作，訓練量全部採入門級。請先告知體育老師，確認可以訓練後才開始。`,
    });
  else if (opts.body === "sore")
    reasons.push({
      icon: "😅",
      text: `你選了「有點痠痛」（${optText}）。這份方案只使用低衝擊動作；請避開痠痛的位置，如果加劇就停止並告知老師。`,
    });
  else reasons.push({ icon: "⚙️", text: `已按你的選擇安排：${optText}。` });

  const used = new Set();
  days.forEach((d) => d.blocks.forEach((b) => b.items.forEach((it) => used.add(it.id))));

  return {
    v: COACH_PLAN_VERSION,
    generatedAt: now.getTime(),
    weekKey,
    regen,
    options: opts,
    profile: {
      type: typeKey,
      typeLabel: TYPE_LABEL[typeKey],
      avg: round1(avg),
      spread: Math.round(spread),
      weak: weakKeys,
      strong: strongKey,
      maintain: maintainKey,
      levels,
      engagement: eng.state,
      trainDays: days.filter((d) => d.kind === "train").length,
    },
    opening,
    reasons,
    days,
    safety: opts.body === "good" ? SAFETY_LINES : ["請先告知體育老師你的身體狀況，確認可以訓練後才開始。", ...SAFETY_LINES],
    closing,
    usedIds: [...used],
  };
}

// ---- 純文字版（相容舊的 aiAdvice 欄位，也方便列印 / 複製）-----------------
export function planToText(plan, studentName = "") {
  if (!plan) return "";
  const lines = [];
  lines.push("⚔️ 聖保祿體適能教練 —— 個人 7 天特訓方案 ⚔️");
  lines.push("");
  lines.push(plan.opening);
  lines.push("");
  lines.push("📋 本週重點");
  plan.reasons.forEach((r) => lines.push(`${r.icon} ${r.text}`));
  plan.days.forEach((d) => {
    lines.push("");
    lines.push(`📅 第 ${d.day} 天｜${d.title}`);
    if (d.note) lines.push(`   ${d.note}`);
    d.blocks.forEach((b) => {
      lines.push(`  ■ ${b.label}`);
      b.items.forEach((it) => lines.push(`    • ${it.name}：${it.dose}`));
    });
  });
  lines.push("");
  lines.push("💡 安全提醒");
  plan.safety.forEach((s) => lines.push(`• ${s}`));
  lines.push("");
  lines.push(`🔥 教練寄語：${plan.closing}${studentName ? `（${studentName}，加油！）` : ""}`);
  return lines.join("\n");
}
