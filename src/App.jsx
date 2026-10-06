import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar, Cell,
  CartesianGrid, ResponsiveContainer
} from "recharts";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { getFirestore, getDocs, collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { getDoc } from "firebase/firestore";

// ==========================================
// 聖保祿中學 專屬雲端 Firebase 資料庫初始化 (正式直連)
// ==========================================
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// 預設教師與管理員帳號 (系統為空時會自動初始至雲端)
// ==========================================


const initialStudents = [
  { className: "F1A", id: "1", name: "陳大文", password: "1234", xp: 3200, aiAdvice: "", questsSubmitted: [], scores: [{ testName: "第1次", average: 65, cardio: 60, strength: 70, power: 55, speed: 65, flexibility: 75, agility: 65, createdAt: "2026/03/01" }] },
  { className: "F1A", id: "2", name: "李小明", password: "2222", xp: 850, aiAdvice: "", questsSubmitted: [], scores: [{ testName: "第1次", average: 58, cardio: 50, strength: 60, power: 65, speed: 55, flexibility: 50, agility: 70, createdAt: "2026/03/10" }] },
  { className: "F1A", id: "3", name: "王小芬", password: "3333", xp: 39500, aiAdvice: "", questsSubmitted: [], scores: [{ testName: "第1次", average: 88, cardio: 90, strength: 85, power: 80, speed: 92, flexibility: 95, agility: 86, createdAt: "2026/04/20" }] },
  { className: "F2B", id: "1", name: "張志強", password: "abcd", xp: 0, aiAdvice: "", questsSubmitted: [], scores: [] },
];

const classList = [
  "F1A", "F1B", "F1C", "F1D", "F1E", "F1F",
  "F2A", "F2B", "F2C", "F2D", "F2E", "F2F",
  "F3A", "F3B", "F3C", "F3D", "F3E", "F3F",
  "F4A", "F4B", "F4C", "F4D", "F4E", "F4F",
  "F5A", "F5B", "F5C", "F5D", "F5E", "F5F",
  "F6A", "F6B", "F6C", "F6D", "F6E", "F6F",
];
const yearList = ["F1", "F2", "F3", "F4", "F5", "F6"];

const abilityFields = [
  { key: "cardio", label: "心肺耐力", icon: "❤️", color: "#ef4444", tip: "例：20米折返跑、耐力跑" },
  { key: "strength", label: "肌肉力量", icon: "💪", color: "#3b82f6", tip: "例：仰臥起坐、引體向上" },
  { key: "power", label: "瞬發爆發力", icon: "⚡", color: "#f59e0b", tip: "例：立定跳遠" },
  { key: "speed", label: "直線速度", icon: "🏃", color: "#10b981", tip: "例：50米衝刺" },
  { key: "flexibility", label: "關節柔軟度", icon: "🦴", color: "#ec4899", tip: "例：坐姿體前彎" },
  { key: "agility", label: "動態敏捷性", icon: "🔁", color: "#8b5cf6", tip: "例：T字折返跑" },
];

const emptyFitness = { cardio: 60, strength: 60, power: 60, speed: 60, flexibility: 60, agility: 60 };


// ==========================================
// 🛡️ 超級安全數據防禦與清洗轉換器
// ==========================================
const getSafeString = (val) => {
  if (val === null || val === undefined) return "";
  return String(val);
};

const getSafeNumber = (val) => {
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

const cleanCell = (cell) => {
  if (cell === null || cell === undefined) return "";
  return String(cell).trim().replace(/^["']|["']$/g, "").trim();
};

const getYearFromClass = (className = "") => {
  return getSafeString(className).slice(0, 2);
};

const latestRecord = (student) => {
  if (student && Array.isArray(student.scores) && student.scores.length > 0) {
    return student.scores[student.scores.length - 1];
  }
  return null;
};

const latestScore = (student) => {
  const record = latestRecord(student);
  return record ? getSafeNumber(record.average) : 0;
};

const progressScore = (student) => {
  if (!student || !Array.isArray(student.scores) || student.scores.length < 2) return 0;
  const lastAvg = getSafeNumber(student.scores[student.scores.length - 1]?.average);
  const firstAvg = getSafeNumber(student.scores[0]?.average);
  return lastAvg - firstAvg;
};

// ==========================================
// 等級與稱號邏輯
// ==========================================
const getLvTitleAndDesc = (level) => {
  const lv = getSafeNumber(level);
  if (lv >= 100) return { title: "👑 永恆冠軍", desc: "體能之極致，化作永恆的冠軍，如不朽傳奇般刻印在殿堂頂端。" };
  if (lv >= 90) return { title: "🎖️ 榮耀王者", desc: "登峰造極，以王者之姿俯瞰體能之巔，榮耀加身，激勵眾生。" };
  if (lv >= 80) return { title: "⚜️ 神話至尊", desc: "體能成就近乎神話，居於至尊之位，為萬中選一的終極存在。" };
  if (lv >= 70) return { title: "🌌 超凡大師", desc: "已達隨心所欲駕馭身體的境界，如同武學宗師，「超凡」強調超越凡俗的體能掌控力。" };
  if (lv >= 60) return { title: "☄️ 星耀傳說", desc: "開始超越凡人範疇，體能事蹟足以被傳頌，星耀帶有奇幻與傳說色彩。" };
  if (lv >= 50) return { title: "💎 鑽石英雄", desc: "身體能力近乎無懈可擊，以「英雄」之姿成為眾人標竿，鑽石代表堅摧的毅力。" };
  if (lv >= 40) return { title: "⚔️ 白金勇者", desc: "突破常人的極限，「勇者」往往是破除難關的關鍵，白金賦予稀有的價值感。" };
  if (lv >= 30) return { title: "🛡️ 黃金騎士", desc: "擁有榮耀感的階段，騎士精神象徵自律與守護，黃金代表身體素質已達耀眼水準。" };
  if (lv >= 20) return { title: "🏹 白銀戰士", desc: "體能更上層樓，以「戰士」身分投入更高強度挑戰，白銀代表堅韌與純粹的鬥志。" };
  if (lv >= 10) return { title: "🛡️ 青銅角鬥士", desc: "如同古代競技場 the 角鬥士，開始累積實戰體能，青銅象徵首次晉級。" };
  return { title: "🌱 見習鬥士", desc: "剛踏入體能訓練的初心者，以「鬥士」為起點，點燃身體的戰鬥本能。" };
};

// ==========================================
// 🧠 聖保祿本地內置智能 AI 專家引擎 (港澳無障礙離線版)
// ==========================================
const generateLocalStudentAiAdvice = (student, level, avgScore, record) => {
  const rec = record || emptyFitness;
  
  // 算出最低分 (弱點) 與最高分 (強項) 屬性
  const sortedFields = [...abilityFields].map(f => ({
    key: f.key,
    label: f.label,
    icon: f.icon,
    val: getSafeNumber(rec[f.key] || 0)
  })).sort((a, b) => a.val - b.val);
  
  const weakest = sortedFields[0] || { label: "全面鍛鍊", icon: "⚔️", val: 60, key: "cardio" };
  const strongest = sortedFields[sortedFields.length - 1] || { label: "全面開發", icon: "🔥", val: 60, key: "strength" };
  const titleInfo = getLvTitleAndDesc(level);

  let weakestSolution = "";
  switch(weakest.key) {
    case "cardio":
      weakestSolution = "建議進行 20 分鐘慢跑（保持心率在 130-150 bpm），或進行 4 組「捷風高抬腿跑」，每組持續 30 秒，組間休息 45 秒，以此激活心肌纖維！";
      break;
    case "strength":
      weakestSolution = "推薦挑戰「鋼鐵巨人岩壁」：自重深蹲 20 次 + 俯臥撐 12 次，連續進行 4 組，組間休息 60 秒，建立身體核心的頑強抗性！";
      break;
    case "power":
      weakestSolution = "實施「雷霆跳躍特訓」：立定跳遠 5 次 + 階梯縱跳 10 次，連續進行 3 組。著重落地緩衝，全力釋放肌肉中儲存的瞬發動能！";
      break;
    case "speed":
      weakestSolution = "挑戰「幻影折返跑」：進行 30 米全速衝刺 5 次，每組間完全休息 90 秒，訓練大腦與神經肌肉系統的高頻聯動與高速爆發！";
      break;
    case "flexibility":
      weakestSolution = "修煉「流水拉伸法」：坐姿體前彎保持 30 秒 x 4 組，配合大腿後側拉伸與跪姿弓步壓腿，慢慢釋放緊繃肌腱，增加動態閃避率！";
      break;
    case "agility":
      weakestSolution = "演練「幽靈迷蹤步」：設置 4 個地標進行「T字形敏捷折返跑」4 組，每次務必觸地折返，訓練快速變向時重心變換的流暢度！";
      break;
    default:
      weakestSolution = "建議進行綜合體能訓練，如波比跳與開合跳組合，每天持續 15 分鐘。";
  }

  return `⚔️ 聖保祿體能冒險教練 —— 【AI 本地實時特訓天書】 ⚔️

哈囉！冒險者 ${student.name}！
我是你的專屬 AI 體能導師。分析了你最新的體適能星圖，你目前處於 【${titleInfo.title}】（Lv.${level}）階段！
你的天賦長處是 ${strongest.icon}【${strongest.label}】（${strongest.val} 分），表現十分耀眼！但你的守護防線 ${weakest.icon}【${weakest.label}】（${weakest.val} 分）尚有修煉空間。這就是我們本週要攻克的「主線副本」！

以下為你量身打造的【七日突破性修煉副本】：

📅 【第 1-2 天：弱點專防副本】（針對：${weakest.label}）
• 任務目標：突破 ${weakest.icon}${weakest.label} 瓶頸
• 實戰內容：${weakestSolution}
• 消耗體力：20% / 獲得經驗預估：+150 XP

📅 【第 3-4 天：天賦激發副本】（針對：${strongest.label}）
• 任務目標：讓最強屬性化作致命武器！
• 實戰內容：發揮你的 ${strongest.icon}${strongest.label} 天賦。
  - 建議：進行高強度自我挑戰，保持目前的良好狀態，嘗試超越上次的測量極限！
  - 消耗體力：15% / 獲得經驗預估：+100 XP

📅 【第 5-6 天：敏捷與心肺綜合修煉】
• 任務目標：提升戰鬥續航力
• 實戰內容：波比跳（Burpees）10 次 x 3 組，組間休息 60 秒。配合 10 分鐘輕快慢跑，調整呼吸節奏，鍛煉全身協調。

📅 【第 7 天：修復與能量重整】
• 任務目標：身體超量恢復
• 實戰內容：全身各大肌群靜態拉伸 15 分鐘，每組維持 20-30 秒。多補充優質蛋白質與水分，迎接下一輪屬性蛻變！

🔥 教練寄語：
「偉大的冒險家從不畏懼瓶頸，而是將瓶頸視為升級的踏腳石！${student.name}，穿上你的跑鞋，我們操場見！」`;
};

const generateLocalTeacherAiEvaluation = (className, analysis) => {
  const { average, strongest, weakest, total } = analysis;
  
  const classWeakName = weakest.split(' ')[0] || "心肺耐力";
  const classStrongName = strongest.split(' ')[0] || "肌肉力量";

  let classWeakSolution = "";
  switch(classWeakName) {
    case "心肺耐力":
      classWeakSolution = "安排「班級無盡心肺賽」：每堂課抽出 10 分鐘，以音樂節拍引導全班進行變速慢跑，並結合心肺挑戰；";
      break;
    case "肌肉力量":
      classWeakSolution = "安排「核心力量野煉」：在熱身階段加入「平板支撐障礙賽」與雙人互推對抗，鍛鍊班級的整體核心與上肢力量；";
      break;
    case "瞬發爆發力":
      classWeakSolution = "安排「雷霆縱跳競技」：利用跳箱或立定跳遠線，進行小組累計距離對抗賽，激發快肌纖維的募集；";
      break;
    case "直線速度":
      classWeakSolution = "安排「極速追逐戰」：進行 20 米與 30 米的分組接力衝刺，設計趣味追逐副本，強化高頻神經衝動；";
      break;
    case "關節柔軟度":
      classWeakSolution = "安排「水流拉伸操」：在每節課結束後，預留 8 分鐘進行集體瑜伽式伸展與腿部肌群靜態拉伸，改善關節活動度；";
      break;
    case "動態敏捷性":
      classWeakSolution = "安排「幽靈迴避折返賽」：設置敏捷錐或繩梯，進行 T 字折返或側向滑步接力挑戰，訓練變向時的平衡感；";
      break;
    default:
      classWeakSolution = "安排綜合循環體能，利用小組競賽形式提高課堂互動。";
  }

  return `🧑‍🏫 聖保祿班級體適能教學AI大師 —— 【4週班級重塑計畫】 🧑‍🏫

致聖保祿體育科導師：
針對您所指導的 【${className}】 班（共 ${total} 位已登記學員），AI 導師已完成全班體適能大數據的深度診斷。

📊 班級戰略診斷大綱：
• 班級平均戰力：${average.toFixed(1)} 分
• 集體最強天賦：✨ ${strongest} （表現出色，建議在課堂中予以肯定，維持優勢）
• 集體核心弱項：⚠️ ${weakest} （這是本學期亟需攻克的防禦空洞）

為此，為您量身定制【四週班級體適能重塑教學大綱（每週 1 節體育課專用）】：

📅 【第一週：破冰與弱點覺醒 —— 團體趣味對抗】
• 教學目標：引導學生正視 ${classWeakName} 的重要性，建立團體默契。
• 課堂暖身（10 分鐘）：RPG 獵人跑（變速折返跑），加入魔法躲避球概念。
• 核心訓練（25 分鐘）：
  - 針對【${classWeakName}】的基礎分組循環賽。
  - ${classWeakSolution}
  - 設計「體能闖關副本」，以 3 人冒險小隊為單位，共同完成特定次數的基礎動作。
• 整理放鬆（5 分鐘）：靜態全身肌肉拉伸，搭配深呼吸，降低心率。

📅 【第二週：天賦融合 —— 強弱互補特訓】
• 教學目標：利用班級強項【${classStrongName}】帶動弱項，由體能尖子生擔任組長。
• 課堂暖身（10 分鐘）：雙人協調拉伸與動態敏捷熱身.
• 核心訓練（25 分鐘）：
  - 「守護神盾挑戰」：將【${classStrongName}】與【${classWeakName}】結合。
  - 例如：一組進行【${classStrongName}】天賦展示，另一組成員隨即進行【${classWeakName}】護衛演練，交替互補，培養團隊互助精神。
• 整理放鬆（5 分鐘）：雙人協助被動拉伸，促進身體恢復。

📅 【第三週：極限突破 —— 團體副本挑戰賽】
• 教學目標：提高課堂強度，利用高額經驗值（XP）激勵機制，衝擊全班成績。
• 課堂暖身（10 分鐘）：敏捷梯熱身與神經激活。
• 核心訓練（25 分鐘）：
  - 舉辦「聖保祿班級挑戰賽」，全班分為 4 個小隊，限時累積完成最多組數的綜合體能循環。
• 整理放鬆（5 分鐘）：集體靜坐冥想與肌肉舒緩。

📅 【第四週：數據同步與榮耀加冕】
• 教學目標：成果驗收與數據實時同步，發放 XP 與頭銜獎勵。
• 課堂暖身（10 分鐘）：趣味動態關節操。
• 核心訓練（25 分鐘）：
  - 班級體適能「二次測量」驗收，讓學生在系統中看見進步的雷達圖。
  - 對於進步顯著的同學，在控制台點擊「+100 XP」派發星宿榮譽！
• 整理放鬆（5 分鐘）：歡樂合影與伸展放鬆。

💡 老師指導貼士：
「在接下來的教學中，建議多利用系統中的『每週體能任務』與『教師激勵魔法傳音』，在課後隨時向 ${className} 發布鼓勵信函，這能顯著提升學生在課外的自主特訓積極性！」`;
};


const SvgIcon = ({ name, className = "w-5 h-5" }) => {
  const icons = {
    trophy: <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34M12 2a4 4 0 0 1 4 4v6H8V6a4 4 0 0 1 4-4z"/>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    user: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>,
    lock: <g><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></g>,
    chart: <path d="M18 20V10M12 20V4M6 20v-6"/>,
    settings: <g><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></g>,
    sparkles: <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>,
    upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>,
    download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || <circle cx="12" cy="12" r="10"/>}
    </svg>
  );
};

// ==========================================
// 協助超時處理的 Promise 包裝器
// ==========================================
const withTimeout = (ms, promise) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("雲端寫入超時 (8秒無回應)。這通常代表您在 Firebase 控制台『尚未建立 Firestore 資料庫實例』，或規則修改完未成功發布！"));
    }, ms);
    promise.then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
};


export default function App() {
  const [dbUser, setDbUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [teacherAccounts, setTeacherAccounts] = useState([]);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: "", msg: "", onConfirm: null });

  // 🔔 Level Up 等級提升慶祝賀卡 State
  const [levelUpModal, setLevelUpModal] = useState({ isOpen: false, oldLevel: 1, newLevel: 2 });

  // 雲端連線實時診斷 States
  const [dbStatus, setDbStatus] = useState("connecting"); // connecting, connected, error
  const [dbErrorMessage, setDbErrorMessage] = useState("");

  // ==========================================
  // 🧭 精準最外層根目錄參考計算器（100% 正式版結構）
  // ==========================================
  const getStudentsRef = () => collection(db, 'students');
  const getTeachersRef = () => collection(db, 'teachers');
  const getStudentDocRef = (className, id) => doc(db, 'students', `${className}_${id}`);
  const getTeacherDocRef = (username) => doc(db, 'teachers', username);

  // ==========================================
  // 每週體能任務 & 學生提交之狀態管理
  // ==========================================
  const [currentWeeklyQuests, setCurrentWeeklyQuests] = useState([
    { id: "q1", title: "🐆 疾風瞬步挑戰", desc: "完成 50米衝刺 5 組，每組間隔休息 90 秒。", xp: 200 },
    { id: "q2", title: "❤️ 鋼鐵心肺副本", desc: "進行持續慢跑 15 分鐘，維持均勻呼吸頻率。", xp: 300 },
    { id: "q3", title: "🦴 筋脈柔軟拉伸", desc: "坐姿體前彎拉伸 4 組，每組靜止維持 20 秒。", xp: 150 }
  ]);

  // 🆕 任務版本控制：追蹤目前從 SYSTEM_CONFIG_QUESTS 加載的版本（以此控制學生端狀態覆蓋重置）
  const [currentQuestsVersion, setCurrentQuestsVersion] = useState("v1");

  // 教師端發布任務之編輯狀態
  const [questEdits, setQuestEdits] = useState([
    { id: "q1", title: "🐆 疾風瞬步挑戰", desc: "完成 50米衝刺 5 組，每組間隔休息 90 秒。", xp: 200 },
    { id: "q2", title: "❤️ 鋼鐵心肺副本", desc: "進行持續慢跑 15 分鐘，維持均勻呼吸頻率。", xp: 300 },
    { id: "q3", title: "🦴 筋脈柔軟拉伸", desc: "坐姿體前彎拉伸 4 組，每組靜止維持 20 秒。", xp: 150 }
  ]);

  // 學生新功能狀態：分頁切換 ("manual" | "quests" | "tbd")
  const [studentActiveTab, setStudentActiveTab] = useState("manual");

  // 教師控制台分頁切換 ("cultivation" | "quests" | "reports")
  const [teacherActiveTab, setTeacherActiveTab] = useState("cultivation");

  // 💬 教師激勵魔法傳音 (對學生的鼓勵說話) 相關狀態
  const [teacherMsgClass, setTeacherMsgClass] = useState("");
  const [teacherMsgText, setTeacherMsgText] = useState("");
  const [studentAnnouncement, setStudentAnnouncement] = useState(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  // 提交鍛鍊日誌 Modal 狀態
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [activeQuestForLog, setActiveQuestForLog] = useState(null);
  const [studentReaction, setStudentReaction] = useState("");
  const [customComment, setCustomComment] = useState("");

  const presetFeelings = [
    "呼吸急促、心跳加速，但能輕鬆完成",
    "心跳有些劇烈，感覺比較吃力完成",
    "呼吸均勻，非常輕鬆地完成挑戰",
    "全身汗流浹背，雖然吃力 but 順利堅持",
    "腿部肌肉緊繃微酸，能順利拉伸完成"
  ];

  const [studentLoginData, setStudentLoginData] = useState({ className: "", studentId: "", password: "" });
  const [studentAuthenticated, setStudentAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [teacherMode, setTeacherMode] = useState(false);

  const [teacherAuthenticated, setTeacherAuthenticated] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState(null);
  const [teacherLogin, setTeacherLogin] = useState({ username: "", password: "" });
  const [teacherError, setTeacherError] = useState("");
  
  const [newTeacher, setNewTeacher] = useState({ name: "", username: "", password: "", classes: "", role: "teacher" });

  const [selectedRankingClass, setSelectedRankingClass] = useState("全部");
  const [selectedRankingYear, setSelectedRankingYear] = useState("全部");
  const [selectedReportClass, setSelectedReportClass] = useState("全部");
  const [selectedStudentKey, setSelectedStudentKey] = useState("");
  const [selectedRewardClass, setSelectedRewardClass] = useState("全部");
  const [importMessage, setImportMessage] = useState("");
  
  const [editingScoreKey, setEditingScoreKey] = useState(null);
  const [editScoreData, setEditScoreData] = useState({});

  // 🤖 狀態指示器
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCoachResponse, setAiCoachResponse] = useState("");
  const [teacherAiLoading, setTeacherAiLoading] = useState(false);
  const [teacherAiResponse, setTeacherAiResponse] = useState("");

  const [printModalOpen, setPrintModalOpen] = useState(false);

  const fileInputRef = useRef(null);
  const reportRef = useRef(null);

// 🌟 1. 一次性獲取學生數據函數
const fetchStudentsData = async () => {
try {
const querySnapshot = await getDocs(collection(db, "students"));
const loaded = querySnapshot.docs
.map(doc => doc.data())
.filter(doc => doc.id !== "SYSTEM_CONFIG_QUESTS"); // 過濾非學生文件
setStudents(loaded);
} catch (error) {
console.error("獲取學生數據失敗:", error);
}
};

// 🌟 2. 僅在教師登入成功或點擊刷新時觸發一次
useEffect(() => {
if (teacherAuthenticated) {
fetchStudentsData();
}
}, [teacherAuthenticated]);

  // 1. 依照安全限制進行雲端帳號登入（已修正連線狀態燈卡燈閃爍問題）
  useEffect(() => {
    const initAuth = async () => {
      setDbStatus("connecting");
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          const credential = await signInWithCustomToken(auth, __initial_auth_token);
          setDbUser(credential.user);
        } else {
          const credential = await signInAnonymously(auth);
          setDbUser(credential.user);
        }
        // 🌟 核心修正點：確保一次性匿名驗證成功後，立即將狀態切換為已連線
        setDbStatus("connected"); 
        setDbErrorMessage("");
      } catch (err) {
        console.error("Firebase 驗證初始化失敗，嘗試匿名後備:", err);
        try {
          const credential = await signInAnonymously(auth);
          setDbUser(credential.user);
          setDbStatus("connected"); // 🌟 核心修正點
          setDbErrorMessage("");
        } catch (e2) {
          setDbStatus("error");
          setDbErrorMessage(`驗證登入失敗: ${err.message}`);
        }
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setDbUser(user);
        setDbStatus("connected"); // 🌟 狀態安全同步
      } else {
        setDbUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

// 2. 當驗證通過時，監聽任務配置與教師帳號
useEffect(() => {
if (!dbUser) return;
setDbStatus("connecting");
setDbErrorMessage("");
   
    // (B) 實時監聽 全球任務配置 SYSTEM_CONFIG_QUESTS 專屬文件 (包含版本資訊)
    const questConfigRef = doc(db, 'students', 'SYSTEM_CONFIG_QUESTS');
    const unsubscribeQuests = onSnapshot(questConfigRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && Array.isArray(data.quests)) {
          setCurrentWeeklyQuests(data.quests);
          setQuestEdits(data.quests);
          if (data.version) {
            setCurrentQuestsVersion(data.version);
          }
        }
         setDbStatus("connected"); 
      } else {
        // 若雲端尚未有此配置，則寫入預設任務與初始版本
        const initialVersion = String(Date.now());
        setDoc(questConfigRef, { quests: currentWeeklyQuests, version: initialVersion })
          .then(() => {
            console.log("✅ 成功初始化雲端預設每週任務配置。");
            setCurrentQuestsVersion(initialVersion);
          })
          .catch(err => console.error("無法初始化雲端任務:", err));
      }
    });

    // (C) 實時監聽 教師帳號（安全限制版：只獲取已啟用教師，不進行自動寫入）
const teachersRef = getTeachersRef();
const unsubscribeTeachers = onSnapshot(teachersRef, (snapshot) => {
  const loaded = snapshot.docs.map(doc => doc.data());
  
  // 🛡️ 安全修正：完全移除 if (loaded.length === 0) 的自動寫入邏輯
  // 僅保留將雲端資料同步到前端 State 的功能，供管理員介面顯示表格使用
  setTeacherAccounts(loaded);
}, (error) => {
  console.error("Firestore 教師帳號連線中斷:", error);
});


    return () => {
      unsubscribeQuests();
      unsubscribeTeachers();
    };
  }, [dbUser]);

  // ==========================================
  // 🔑 細粒度權限：當前登入教師的「授權任教班級」邏輯
  // ==========================================
  const authorizedClasses = useMemo(() => {
    if (!currentTeacher) return [];
    if (currentTeacher.role === 'admin') return classList; 
    if (!currentTeacher.classes) return [];
    return currentTeacher.classes.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
  }, [currentTeacher]);

  const visibleStudents = useMemo(() => {
    if (!currentTeacher) return students; 
    if (currentTeacher.role === 'admin') return students; 
    return students.filter(s => authorizedClasses.includes(getSafeString(s.className).trim().toUpperCase()));
  }, [students, currentTeacher, authorizedClasses]);


  useEffect(() => {
    if (currentTeacher && currentTeacher.role !== 'admin' && authorizedClasses.length > 0) {
      const defaultClass = authorizedClasses[0];
      setSelectedReportClass(defaultClass);
      setSelectedRewardClass(defaultClass);
      setSelectedRankingClass(defaultClass);
      setTeacherMsgClass(defaultClass);
    } else if (currentTeacher?.role === 'admin') {
      setSelectedReportClass("全部");
      setSelectedRewardClass("全部");
      setSelectedRankingClass("全部");
      setTeacherMsgClass("F1A");
    }
  }, [currentTeacher, authorizedClasses]);

  const visibleScoredStudents = useMemo(() => visibleStudents.filter((s) => s.scores && s.scores.length > 0), [visibleStudents]);
  
  const findStudent = (className, studentId) => 
    students.find(s => 
      getSafeString(s.className).trim().toUpperCase() === getSafeString(className).trim().toUpperCase() && 
      getSafeString(s.id).trim() === getSafeString(studentId).trim()
    );

  const currentLoggedInStudent = useMemo(() => {
    if (!studentAuthenticated) return null;
    return findStudent(studentLoginData.className, studentLoginData.studentId);
  }, [studentAuthenticated, studentLoginData, students]);

  const currentAvgScore = useMemo(() => currentLoggedInStudent ? latestScore(currentLoggedInStudent) : 0, [currentLoggedInStudent]);
  const studentXp = currentLoggedInStudent ? getSafeNumber(currentLoggedInStudent.xp) : 0;
  const currentLevel = Math.min(100, Math.floor(studentXp / 1000) + 1);
  const xpInCurrentLevel = currentLevel >= 100 ? 1000 : studentXp % 1000;

  // 🔔 精密防漏等級提升自動偵測器 (自動比對與觸發 Level Up 彈窗)
  const prevLevelRef = useRef(0);
  useEffect(() => {
    if (studentAuthenticated && currentLevel) {
      if (prevLevelRef.current !== 0 && currentLevel > prevLevelRef.current) {
        setLevelUpModal({
          isOpen: true,
          oldLevel: prevLevelRef.current,
          newLevel: currentLevel
        });
      }
      prevLevelRef.current = currentLevel;
    } else if (!studentAuthenticated) {
      prevLevelRef.current = 0;
    }
  }, [currentLevel, studentAuthenticated]);

  // 🔔 實時追蹤魔法傳音 (一對一班級鼓勵羊皮紙信函)
  useEffect(() => {
    if (!currentLoggedInStudent) {
      setStudentAnnouncement(null);
      setShowAnnouncementModal(false);
      return;
    }
    const targetClass = currentLoggedInStudent.className.toUpperCase();
    const annRef = doc(db, 'announcements', targetClass);
    const unsubscribe = onSnapshot(annRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStudentAnnouncement(data);
        // 核對是否已閱讀過該特定時間戳記的信函
        const localSeenStamp = localStorage.getItem(`seen_announcement_${targetClass}`);
        if (String(data.updatedAt) !== localSeenStamp) {
          setShowAnnouncementModal(true);
        }
      }
    }, (error) => {
      console.warn("未發現鼓勵或無對應權限:", error);
    });
    return () => unsubscribe();
  }, [currentLoggedInStudent]);
  
  const studentRadarData = abilityFields.map((item) => ({ 
    subject: item.label, 
    value: getSafeNumber(latestRecord(currentLoggedInStudent)?.[item.key] || 0)
  }));

  // ==========================================
  // 🏆 學生專屬排行運算與 Top 5 榜單計算
  // ==========================================
  const studentRanks = useMemo(() => {
    if (!currentLoggedInStudent || students.length === 0) return { classRank: "-", yearRank: "-", classTotal: 0, yearTotal: 0 };
    
    const myClass = getSafeString(currentLoggedInStudent.className).trim().toUpperCase();
    const myYear = getYearFromClass(myClass);

    const sortByXpAndAvg = (a, b) => {
      const xpDiff = getSafeNumber(b.xp) - getSafeNumber(a.xp);
      if (xpDiff !== 0) return xpDiff;
      return latestScore(b) - latestScore(a);
    };

    const classStudents = students.filter(s => getSafeString(s.className).trim().toUpperCase() === myClass).sort(sortByXpAndAvg);
    const yearStudents = students.filter(s => getYearFromClass(getSafeString(s.className).trim().toUpperCase()) === myYear).sort(sortByXpAndAvg);

    const classRank = classStudents.findIndex(s => getSafeString(s.id).trim() === getSafeString(currentLoggedInStudent.id).trim()) + 1;
    const yearRank = yearStudents.findIndex(s => getSafeString(s.id).trim() === getSafeString(currentLoggedInStudent.id).trim()) + 1;

    return {
      classRank: classRank > 0 ? classRank : "-",
      yearRank: yearRank > 0 ? yearRank : "-",
      classTotal: classStudents.length,
      yearTotal: yearStudents.length
    };
  }, [currentLoggedInStudent, students]);

  // 計算目前學生班級前五名
  const top5ClassStudents = useMemo(() => {
    if (!currentLoggedInStudent || students.length === 0) return [];
    const myClass = getSafeString(currentLoggedInStudent.className).trim().toUpperCase();
    return students
      .filter(s => getSafeString(s.className).trim().toUpperCase() === myClass)
      .sort((a, b) => {
        const xpDiff = getSafeNumber(b.xp) - getSafeNumber(a.xp);
        if (xpDiff !== 0) return xpDiff;
        return latestScore(b) - latestScore(a);
      })
      .slice(0, 5);
  }, [students, currentLoggedInStudent]);

  // 計算目前學生年級前五名
  const top5YearStudents = useMemo(() => {
    if (!currentLoggedInStudent || students.length === 0) return [];
    const myClass = getSafeString(currentLoggedInStudent.className).trim().toUpperCase();
    const myYear = getYearFromClass(myClass);
    return students
      .filter(s => getYearFromClass(getSafeString(s.className).trim().toUpperCase()) === myYear)
      .sort((a, b) => {
        const xpDiff = getSafeNumber(b.xp) - getSafeNumber(a.xp);
        if (xpDiff !== 0) return xpDiff;
        return latestScore(b) - latestScore(a);
      })
      .slice(0, 5);
  }, [students, currentLoggedInStudent]);

  const handleLoginFieldChange = (field, value) => {
    setLoginError("");
    setStudentLoginData((prev) => ({ ...prev, [field]: value }));
  };

// 🌟 修改後的學生獨立認證登入（直接向雲端精準請求單一文件，免等老師登入）
  const handleStudentLogin = async () => {
    if (!studentLoginData.className || !studentLoginData.studentId || !studentLoginData.password) {
      setLoginError("請輸入完整的班級、學號及密碼！"); 
      return;
    }

    setLoginError("");
    setDbStatus("connecting"); // 顯示讀取中狀態

    try {
      // 1. 直接定位到該學生在雲端的單一 Doc 參照
      const studentDocRef = getStudentDocRef(studentLoginData.className, studentLoginData.studentId);
      const docSnap = await getDoc(studentDocRef);

      // 2. 檢查雲端有沒有這份文件
      if (!docSnap.exists()) {
        setLoginError("查無此學生，或伺服器尚未同步資料。");
        setDbStatus("connected");
        return;
      }

      const foundStudent = docSnap.data();

      // 3. 安全比對密碼
      if (getSafeString(foundStudent.password).trim() !== getSafeString(studentLoginData.password).trim()) {
        setLoginError("密碼不正確，請重新輸入。");
        setDbStatus("connected");
        return;
      }

      // 4. 驗證成功，將此學生的最新資料寫入當前在線狀態
      setLoginError("");
      setStudentAuthenticated(true);
      setStudentActiveTab("manual"); // 預設進入"我的修煉手冊"
      setAiCoachResponse(foundStudent.aiAdvice || "");

      // 5. 🌟 關鍵補位：為了讓排行榜、Top 5 運算不報錯，把當前學生的資料塞進學生的 local 陣列中
      setStudents(prev => {
        const filtered = prev.filter(s => 
          !(getSafeString(s.className).toUpperCase() === getSafeString(foundStudent.className).toUpperCase() && 
            getSafeString(s.id) === getSafeString(foundStudent.id))
        );
        return [...filtered, foundStudent];
      });

      setDbStatus("connected");
    } catch (err) {
      console.error("學生登入雲端查詢失敗:", err);
      setLoginError("系統連線失敗，請稍後再試。");
      setDbStatus("error");
    }
  };

  const handleTeacherLogin = async () => {
  if (!teacherLogin.username || !teacherLogin.password) {
    setTeacherError("請輸入帳號與密碼！");
    return;
  }

  try {
    // 直接動態獲取該用戶名在 Firestore 的文件參照
    const teacherDocRef = getTeacherDocRef(teacherLogin.username.trim());
    const docSnap = await getDoc(teacherDocRef);

    if (docSnap.exists()) {
      const teacherData = docSnap.data();
      
      // 驗證帳號是否啟用，以及密碼是否正確
      if (teacherData.active && teacherData.password === teacherLogin.password) {
        setTeacherError("");
        setCurrentTeacher(teacherData); 
        setTeacherAuthenticated(true);
        setTeacherActiveTab("cultivation");
        return;
      }
    }
    
    // 若找不到文件或密碼錯誤
    setTeacherError("教師帳號或密碼錯誤！");
  } catch (err) {
    console.error("登入查詢失敗:", err);
    setTeacherError("系統連線失敗，請稍後再試。");
  }
};

  const handlePrintDirectly = () => {
    try {
      window.print();
    } catch (err) {
      console.warn("直接列印被安全機制限制，請使用相容模式！", err);
    }
  };


  const handleNewWindowPrint = () => {
    const reportNode = reportRef.current;
    if (!reportNode) {
      setImportMessage("⚠️ 找不到報告內容，請確認是否已選擇特定學生或班級！");
      return;
    }
    const reportContent = reportNode.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setImportMessage("⚠️ 開啟新視窗失敗。請檢查並允許瀏覽器「快顯視窗與重新導向」權限！");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>聖保祿中學 - 體適能個人數據化分析報告</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap');
            body {
              font-family: 'Noto Sans TC', sans-serif;
              background-color: white !important;
              color: #1e293b !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @media print {
              @page { size: A4; margin: 15mm; }
              body { background-color: white !important; }
              .no-print { display: none !important; }
            }
            svg { max-width: 100% !important; height: auto !important; }
          </style>
        </head>
        <body class="p-6 md:p-12">
          <div class="max-w-4xl mx-auto">
            <div class="no-print mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-3xl flex justify-between items-center shadow-sm">
              <div class="flex items-center gap-2">
                <span class="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-xs font-black text-indigo-950">家長專屬報告列印分頁（向量圖表已完全保留）</span>
              </div>
              <button onclick="window.print()" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md">
                立即列印 / 另存為 PDF
              </button>
            </div>
            <div class="bg-white">${reportContent}</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 600);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ==========================================
  // 🆕 升級：學生線下提交日誌，送審至雲端 (標註目前版本)
  // ==========================================
  const handleOpenLogModal = (quest) => {
    setActiveQuestForLog(quest);
    setStudentReaction("");
    setCustomComment("");
    setLogModalOpen(true);
  };

  const handleSelectPresetFeeling = (preset) => {
    setStudentReaction(preset);
  };

  const handleSubmitWorkoutLog = async () => {
    if (!studentReaction) {
      setImportMessage("⚠️ 請選擇或填寫完成任務時身體的感覺或反應！");
      return;
    }
    if (!currentLoggedInStudent) return;

    const combinedFeedback = customComment 
      ? `${studentReaction}（補充描述：${customComment}）` 
      : studentReaction;

    const newSubmission = {
      id: `${activeQuestForLog.id}_${Date.now()}`,
      questId: activeQuestForLog.id,
      questTitle: activeQuestForLog.title,
      questDesc: activeQuestForLog.desc,
      xp: getSafeNumber(activeQuestForLog.xp),
      reflection: combinedFeedback,
      submittedAt: new Date().toLocaleDateString(),
      approvedAt: "",
      status: "pending", // pending, approved, rejected
      version: currentQuestsVersion // 🆕 寫入目前發布的版本標籤，用作重置比對
    };

    const updatedQuests = [
      ...(Array.isArray(currentLoggedInStudent.questsSubmitted) ? currentLoggedInStudent.questsSubmitted : []),
      newSubmission
    ];

    try {
      const docRef = getStudentDocRef(currentLoggedInStudent.className, currentLoggedInStudent.id);
      await withTimeout(8000, setDoc(docRef, {
        ...currentLoggedInStudent,
        questsSubmitted: updatedQuests
      }, { merge: true }));

      setLogModalOpen(false);
      setImportMessage(`🎉 成功提交「${activeQuestForLog.title}」日誌！請等待體育老師在審核大廳核准。`);
      setTimeout(() => setImportMessage(""), 5000);
    } catch (err) {
      console.error("提交日誌失敗:", err);
      setImportMessage(`❌ 提交失敗: ${err.message}`);
    }
  };

  // ==========================================
  // 🆕 升級：教師端審核大廳核心決策邏輯
  // ==========================================
  const pendingSubmissions = useMemo(() => {
    let list = [];
    visibleStudents.forEach(student => {
      if (Array.isArray(student.questsSubmitted)) {
        student.questsSubmitted.forEach(sub => {
          if (sub.status === "pending") {
            list.push({
              studentName: student.name,
              className: student.className,
              studentId: student.id,
              studentObj: student,
              ...sub
            });
          }
        });
      }
    });
    return list;
  }, [visibleStudents]);


  const handleAuditDecision = async (sub, approved) => {
    if (dbStatus !== "connected") {
      setImportMessage("⚠️ 資料庫未連線，操作已拒絕。");
      return;
    }
    const student = sub.studentObj;
    if (!student) return;

    // 更新任務狀態
    const updatedSubmitted = student.questsSubmitted.map(q => {
      if (q.id === sub.id) {
        return {
          ...q,
          status: approved ? "approved" : "rejected",
          approvedAt: approved ? new Date().toLocaleDateString() : ""
        };
      }
      return q;
    });

    // 如果同意，則立即增加 XP
    const newXp = approved ? getSafeNumber(student.xp) + getSafeNumber(sub.xp) : getSafeNumber(student.xp);

    try {
      const docRef = getStudentDocRef(student.className, student.id);
      await withTimeout(8000, setDoc(docRef, {
        ...student,
        xp: newXp,
        questsSubmitted: updatedSubmitted
      }, { merge: true }));

      setImportMessage(approved 
        ? `✅ 已核准 ${student.name} 的日誌，並成功派發 +${sub.xp} XP 獎勵！` 
        : `❌ 已退回 ${student.name} 的體能任務申請。`
      );
      setTimeout(() => setImportMessage(""), 5000);
    } catch (err) {
      console.error("審核寫入失敗:", err);
      setImportMessage(`❌ 審核處理失敗: ${err.message}`);
    }
  };

  // ==========================================
  // 🆕 升級：教師發布與同步更新每週任務 (寫入全新 version 時間戳記，覆寫重置學生狀態)
  // ==========================================
  const handleUpdateWeeklyQuests = async () => {
    if (currentTeacher?.role !== "admin" && currentTeacher?.role !== "teacher") {
      setImportMessage("🚫 權限不足！只有教師和管理員可以派發每週體能任務。");
      return;
    }

    try {
      const newVersion = String(Date.now()); // 🆕 每當發放新任務時自動產生全新的版本標籤
      const questConfigRef = doc(db, 'students', 'SYSTEM_CONFIG_QUESTS');
      await withTimeout(8000, setDoc(questConfigRef, { 
        quests: questEdits,
        version: newVersion // 🆕 重置並更新 SYSTEM_CONFIG_QUESTS 內的版次
      }));
      setImportMessage("✨ 已成功同步、覆蓋並發布全校『每週體能任務』！同學在學生看板會重置任務狀態，可再次做新任務獲取經驗值。");
      setTimeout(() => setImportMessage(""), 5000);
    } catch (err) {
      console.error("更新每週任務失敗:", err);
      setImportMessage(`❌ 發布任務失敗: ${err.message}`);
    }
  };

  // ==========================================
  // 🆕 升級：教師發布激勵傳音 (鼓勵說話) 雲端連動
  // ==========================================
  const handleSendEncouragement = async () => {
    if (!teacherMsgClass) {
      setImportMessage("⚠️ 請選擇要發布傳音的班級！");
      return;
    }
    if (!teacherMsgText.trim()) {
      setImportMessage("⚠️ 請填寫激勵說話內容！");
      return;
    }
    try {
      const targetClass = teacherMsgClass.toUpperCase();
      const annRef = doc(db, 'announcements', targetClass);
      await withTimeout(8000, setDoc(annRef, {
        text: teacherMsgText.trim(),
        sender: currentTeacher ? currentTeacher.name : "體育導師",
        updatedAt: Date.now()
      }));
      setTeacherMsgText("");
      setImportMessage(`🔮 已向 ${targetClass} 班成功發布激勵魔法傳音！`);
      setTimeout(() => setImportMessage(""), 5000);
    } catch (err) {
      console.error("發布傳音失敗:", err);
      setImportMessage(`❌ 魔法派發失敗: ${err.message}`);
    }
  };

  const handleQuestEditFieldChange = (index, field, value) => {
    const updated = [...questEdits];
    updated[index] = {
      ...updated[index],
      [field]: field === 'xp' ? Number(value) || 0 : value
    };
    setQuestEdits(updated);
  };

  const addXpToStudent = async (className, id, amount) => {
    if (dbStatus !== "connected") {
      setImportMessage("⚠️ 資料庫未連線，操作已拒絕。");
      return;
    }
    if (currentTeacher?.role !== 'admin' && !authorizedClasses.includes(getSafeString(className).trim().toUpperCase())) {
      setImportMessage("🚫 權限不足！您未被授權編輯此班級。");
      return;
    }

    const s = findStudent(className, id);
    if (s) {
      try {
        const docRef = getStudentDocRef(s.className, s.id);
        await withTimeout(8000, setDoc(docRef, { ...s, xp: getSafeNumber(s.xp) + amount }));
      } catch (err) {
        console.error("XP 寫入失敗:", err);
        setImportMessage(`❌ XP 獎勵同步失敗：${err.message}`);
      }
    }
  };


  const startEditScore = (student) => {
    if (currentTeacher?.role !== 'admin' && !authorizedClasses.includes(getSafeString(student.className).trim().toUpperCase())) {
      setImportMessage("🚫 權限不足！您未被授權編輯此班級。");
      return;
    }
    const rec = latestRecord(student) || emptyFitness;
    setEditingScoreKey(`${student.className}_${student.id}`);
    setEditScoreData({
      xp: getSafeNumber(student.xp),
      cardio: getSafeNumber(rec.cardio) || 60, 
      strength: getSafeNumber(rec.strength) || 60, 
      power: getSafeNumber(rec.power) || 60,
      speed: getSafeNumber(rec.speed) || 60, 
      flexibility: getSafeNumber(rec.flexibility) || 60, 
      agility: getSafeNumber(rec.agility) || 60,
    });
  };

  const saveEditedScore = async (student) => {
    if (dbStatus !== "connected") {
      setImportMessage("⚠️ 資料庫未連線，無法儲存變更。");
      return;
    }
    if (currentTeacher?.role !== 'admin' && !authorizedClasses.includes(getSafeString(student.className).trim().toUpperCase())) {
      setImportMessage("🚫 權限不足！您未被授權編輯此班級。");
      return;
    }

    const average = (Number(editScoreData.cardio) + Number(editScoreData.strength) + Number(editScoreData.power) + Number(editScoreData.speed) + Number(editScoreData.flexibility) + Number(editScoreData.agility)) / 6;
    const newScore = {
      testName: "教師同步測量",
      average,
      cardio: Number(editScoreData.cardio), strength: Number(editScoreData.strength), power: Number(editScoreData.power),
      speed: Number(editScoreData.speed), flexibility: Number(editScoreData.flexibility), agility: Number(editScoreData.agility),
      createdAt: new Date().toLocaleDateString()
    };
    
    try {
      const docRef = getStudentDocRef(student.className, student.id);
      await withTimeout(8000, setDoc(docRef, {
        ...student,
        xp: Number(editScoreData.xp),
        scores: [...(Array.isArray(student.scores) ? student.scores : []), newScore]
      }, { merge: true }));
      setEditingScoreKey(null);
    } catch (err) {
      console.error("成績寫入失敗:", err);
      setImportMessage(`❌ 成績儲存失敗：${err.message}`);
    }
  };

  const handleDeleteStudent = (student) => {
    if (currentTeacher?.role !== 'admin' && !authorizedClasses.includes(getSafeString(student.className).trim().toUpperCase())) {
      setImportMessage("🚫 權限不足！您未被授權刪除此班級學生。");
      return;
    }

    setModalConfig({
      isOpen: true,
      title: "⚠️ 確認刪除特定學生",
      msg: `您確認要永久刪除 【${student.className}班 座號 ${student.id} 的 ${student.name}】 嗎？此操作將會從雲端同步刪除且無法還原。`,
      onConfirm: async () => {
        if (dbStatus === "connected") {
          try {
            const docRef = getStudentDocRef(student.className, student.id);
            await withTimeout(8500, deleteDoc(docRef));
            setModalConfig({ isOpen: false });
          } catch (err) {
            console.error("刪除失敗:", err);
            setImportMessage(`❌ 雲端刪除失敗：${err.message}`);
            setModalConfig({ isOpen: false });
          }
        }
      }
    });
  };

  const handleDeleteAllStudents = () => {
    if (currentTeacher?.role !== "admin") {
      setImportMessage("🚫 只有系統管理員有權限進行整庫重置！");
      return;
    }

    setModalConfig({
      isOpen: true,
      title: "🚨 系統資料庫重置警告",
      msg: "此操作將會「徹底清空」雲端資料庫中的所有學生數據，適用於新學年！確定要執行嗎？",
      onConfirm: async () => {
        if (dbStatus !== "connected") return;
        try {
          const batch = writeBatch(db);
          students.forEach(s => {
            const docRef = getStudentDocRef(s.className, s.id);
            batch.delete(docRef);
          });
          await withTimeout(8000, batch.commit());
          setImportMessage("✅ 成功清空雲端資料庫！");
          setModalConfig({ isOpen: false });
        } catch (err) {
          console.error("重置失敗:", err);
          setImportMessage(`❌ 清空資料庫失敗：${err.message}`);
          setModalConfig({ isOpen: false });
        }
      }
    });
  };


  const handleAddTeacher = async () => {
    if (currentTeacher?.role !== "admin") {
      setTeacherError("🚫 權限不足！只有管理員可以管理教師。");
      return;
    }
    if (!newTeacher.username || !newTeacher.name || !newTeacher.password) {
      setTeacherError("⚠️ 請完整填寫教師姓名、登入帳號及密碼！");
      return;
    }
    if (teacherAccounts.some(t => getSafeString(t.username).trim().toLowerCase() === newTeacher.username.trim().toLowerCase())) {
      setTeacherError("⚠️ 該登入帳號已被使用！請更換。");
      return;
    }

    try {
      const docRef = getTeacherDocRef(newTeacher.username.trim());
      await setDoc(docRef, {
        username: newTeacher.username.trim(),
        name: newTeacher.name.trim(),
        password: newTeacher.password.trim(),
        classes: newTeacher.classes.trim().toUpperCase(), 
        role: "teacher",
        active: true
      });
      setNewTeacher({ name: "", username: "", password: "", classes: "", role: "teacher" });
      setTeacherError("");
      setImportMessage("✅ 教師帳號新增成功，並已同步至雲端資料庫！");
    } catch (err) {
      setTeacherError(`❌ 儲存至雲端失敗：${err.message}`);
    }
  };

  const handleDeleteTeacher = async (targetUsername) => {
    if (currentTeacher?.role !== "admin") {
      setTeacherError("🚫 權限不足！");
      return;
    }
    if (targetUsername === "admin") {
      setTeacherError("⚠️ 系統保護：不允許刪除預設系統管理員！");
      return;
    }
    if (targetUsername === currentTeacher.username) {
      setTeacherError("⚠️ 不能刪除自己目前的登入帳號！");
      return;
    }

    setModalConfig({
      isOpen: true,
      title: "👥 確認刪除教師帳號",
      msg: `您確定要永久刪除教師 【${targetUsername}】 嗎？刪除後該教師將立即失去系統登入與編輯權限。`,
      onConfirm: async () => {
        try {
          const docRef = getTeacherDocRef(targetUsername);
          await deleteDoc(docRef);
          setTeacherError("");
          setModalConfig({ isOpen: false });
          setImportMessage(`✅ 教師帳號 ${targetUsername} 已從雲端移除。`);
        } catch (err) {
          setTeacherError(`❌ 刪除失敗：${err.message}`);
          setModalConfig({ isOpen: false });
        }
      }
    });
  };

  const handleExportCSV = () => {
    if (visibleStudents.length === 0) {
      setImportMessage("⚠️ 目前您沒有可管理的資料進行匯出！"); return;
    }
    const headers = ["班級", "學號", "姓名", "密碼", "經驗值(XP)", "心肺耐力", "肌肉力量", "瞬發爆發力", "直線速度", "關節柔軟度", "動態敏捷性"];
    const rows = visibleStudents.map(s => {
      const rec = latestRecord(s) || {};
      return [
        s.className, s.id, s.name, s.password, s.xp || 0,
        rec.cardio || 0, rec.strength || 0, rec.power || 0,
        rec.speed || 0, rec.flexibility || 0, rec.agility || 0
      ].join(",");
    });
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `聖保祿體適能數據庫_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setImportMessage("✅ 成功匯出您所管轄的班級數據！");
  };

  const handleExcelImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const cleanText = text.replace(/^\uFEFF/, "");
        const lines = cleanText.split(/\r?\n/);
        
        if (dbStatus !== "connected") {
          setImportMessage("⚠️ 資料庫未連線，請稍後再試。"); return;
        }
        
        const batch = writeBatch(db);
        let count = 0;
        let rejectedCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const cols = lines[i].split(/[,\t;]/);
          if (cols.length >= 4) {
            const className = cleanCell(cols[0]).toUpperCase(); 
            const id = cleanCell(cols[1]);
            const name = cleanCell(cols[2]);
            const password = cleanCell(cols[3]);
            
            if (className && id && name && password) {
              if (currentTeacher?.role !== 'admin' && !authorizedClasses.includes(className)) {
                rejectedCount++;
                continue;
              }

              const existingStudent = students.find(s => 
                getSafeString(s.className).trim().toUpperCase() === className && 
                getSafeString(s.id).trim() === id
              );
              
              let xp = existingStudent ? getSafeNumber(existingStudent.xp) : 0;
              if (cols[4] && !isNaN(cleanCell(cols[4]))) {
                xp = Number(cleanCell(cols[4]));
              }

              let aiAdvice = existingStudent ? getSafeString(existingStudent.aiAdvice) : "";
              let questsSubmitted = existingStudent && Array.isArray(existingStudent.questsSubmitted) ? existingStudent.questsSubmitted : [];

              let newScores = existingStudent && Array.isArray(existingStudent.scores) ? [...existingStudent.scores] : [];
              
              if (cols.length >= 11 && cleanCell(cols[5]) !== "") {
                const cardio = Number(cleanCell(cols[5])) || 0;
                const strength = Number(cleanCell(cols[6])) || 0;
                const power = Number(cleanCell(cols[7])) || 0;
                const speed = Number(cleanCell(cols[8])) || 0;
                const flexibility = Number(cleanCell(cols[9])) || 0;
                const agility = Number(cleanCell(cols[10])) || 0;
                const average = (cardio + strength + power + speed + flexibility + agility) / 6;
                
                const syncRecord = {
                  testName: "外置數據庫同步",
                  average, cardio, strength, power, speed, flexibility, agility,
                  createdAt: new Date().toLocaleDateString()
                };

                if (newScores.length > 0) {
                  newScores[newScores.length - 1] = syncRecord;
                } else {
                  newScores.push(syncRecord);
                }
              }

              const docRef = getStudentDocRef(className, id);
              batch.set(docRef, { className, id, name, password, xp, aiAdvice, questsSubmitted, scores: newScores });
              count++;
            }
          }
        }
        
        if (count > 0) {
          await withTimeout(8000, batch.commit());
          let msg = `🎉 成功同步 ${count} 名學生資料至資料庫最外層 /students 集合！`;
          if (rejectedCount > 0) msg += ` (⚠️ 其中 ${rejectedCount} 筆因班級權限不符已被系統安全屏蔽保護)`;
          setImportMessage(msg);
        } else {
          setImportMessage("⚠️ 檔案解析失敗。請確認 CSV 是否符合「班級,學號,姓名,密碼」的基本排版！");
        }
      } catch (err) {
        console.error("匯入發生錯誤:", err);
        setImportMessage(`⚠️ 匯入失敗：${err.message}`);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const handleImportSampleData = async () => {
    if (dbStatus !== "connected") { 
      setImportMessage(`⚠️ 資料庫未連線！請確保您在 Firebase 控制台中啟用了「匿名登入 (Anonymous)」且發布了讀寫規則！`); 
      return; 
    }
    if (currentTeacher?.role !== "admin") {
      setImportMessage("🚫 權限不足！只有系統管理員才能載入模擬範例數據。");
      return;
    }
    try {
      setImportMessage("⏳ 正在將預設模擬數據同步至雲端...");
      const batch = writeBatch(db);
      initialStudents.forEach(s => {
        const docRef = getStudentDocRef(s.className, s.id);
        batch.set(docRef, s);
      });
      await withTimeout(8000, batch.commit());
      setImportMessage(`🎉 已成功將模擬範例數據安全寫入雲端最外層 /students 集合中！`);
    } catch (err) {
      console.error("範例載入失敗:", err);
      setImportMessage(`❌ 載入失敗！錯誤訊息：${err.message}`);
    }
  };


  const getLevel = (score) => {
    const s = getSafeNumber(score);
    if (s >= 95) return "SSS 神之領域";
    if (s >= 90) return "S 傳奇宗師";
    if (s >= 80) return "A 體育精英";
    if (s >= 70) return "B 驍勇冒險者";
    if (s >= 60) return "C 實習新兵";
    return "D 體能平民";
  };

  const getType = (source, score) => {
    if (!source) return "未知";
    const speed = getSafeNumber(source.speed);
    const strength = getSafeNumber(source.strength);
    const cardio = getSafeNumber(source.cardio);
    const power = getSafeNumber(source.power);
    const flexibility = getSafeNumber(source.flexibility);
    const agility = getSafeNumber(source.agility);

    if (speed >= 85) return "🐆 速度型（閃電幻影）";
    if (strength >= 85) return "🦍 力量型（巨岩破壞者）";
    if (cardio >= 85) return "🐎 耐力型（無盡之翼）";
    if (power >= 85) return "⚡ 爆發型（雷霆之躍）";
    if (flexibility >= 85) return "🐍 柔韌型（水流舞者）";
    if (agility >= 85) return "🔁 敏捷型（幽靈迴避者）";
    if (score < 60) return "🌱 潛力型（星火待燃）";
    return "⚔️ 全能型（神盾戰士）";
  };

  const getAdvice = (source, score) => {
    if (!source) return "資料不足以分析。";
    const sorted = [...abilityFields].sort((a, b) => getSafeNumber(source[a.key]) - getSafeNumber(source[b.key]));
    const weakest = sorted[0];
    const strongest = sorted[sorted.length - 1];
    return `目前最突出的屬性是「${strongest.label}」（${getSafeNumber(source[strongest.key])}分），而「${weakest.label}」（${getSafeNumber(source[weakest.key])}分）是目前的弱點防線。建議加入針對「${weakest.label}」的專項訓練。`;
  };

  const getProgressStage = (score) => {
    const s = getSafeNumber(score);
    if (s < 60) return "🌱 磨練基本功";
    if (s < 75) return "📈 能量正快速積累";
    return "🔥 突破瓶頸，邁向巔峰";
  };

  // ==========================================
  // ⚡ 本地秒配 AI 行動觸發（取代過往 Gemini 超時通訊）
  // ==========================================
  const handleAskAICoach = () => {
    if (!currentLoggedInStudent) return;
    setAiLoading(true);
    
    // 模擬 600ms 星圖運算延遲，提昇 RPG 儀式體驗感
    setTimeout(async () => {
      const rec = latestRecord(currentLoggedInStudent) || emptyFitness;
      const adviceText = generateLocalStudentAiAdvice(currentLoggedInStudent, currentLevel, currentAvgScore, rec);
      
      setAiCoachResponse(adviceText);
      
      // 同步寫入 Firebase 雲端資料庫以永久保存修煉成果
      try {
        const docRef = getStudentDocRef(currentLoggedInStudent.className, currentLoggedInStudent.id);
        await setDoc(docRef, { ...currentLoggedInStudent, aiAdvice: adviceText }, { merge: true });
      } catch (err) {
        console.warn("同步本地 AI 建議至雲端失敗：", err);
      }
      setAiLoading(false);
    }, 600);
  };

  const handleAskTeacherAI = () => {
    setTeacherAiLoading(true);
    
    // 模擬 800ms 大數據診斷延遲
    setTimeout(() => {
      const evaluationText = generateLocalTeacherAiEvaluation(selectedReportClass, classAnalysis);
      setTeacherAiResponse(evaluationText);
      setTeacherAiLoading(false);
    }, 800);
  };


  const reportClassOptions = useMemo(() => {
    return currentTeacher?.role === 'admin' ? ["全部", ...classList] : authorizedClasses;
  }, [currentTeacher, authorizedClasses]);

  const rewardClassOptions = useMemo(() => {
    return currentTeacher?.role === 'admin' ? ["全部", ...classList] : authorizedClasses;
  }, [currentTeacher, authorizedClasses]);

  const rankingClassOptions = useMemo(() => {
    return currentTeacher?.role === 'admin' ? ["全部", ...classList] : authorizedClasses;
  }, [currentTeacher, authorizedClasses]);

  const classRanking = useMemo(() => 
    [...visibleStudents]
      .filter((s) => selectedRankingClass === "全部" || getSafeString(s.className).trim().toUpperCase() === selectedRankingClass.trim().toUpperCase())
      .map((s) => ({ ...s, average: latestScore(s), progress: progressScore(s) }))
      .filter(s => getSafeNumber(s.xp) > 0 || s.average > 0)
      .sort((a, b) => { 
        const xpDiff = getSafeNumber(b.xp) - getSafeNumber(a.xp); 
        if (xpDiff !== 0) return xpDiff; 
        return b.average - a.average; 
      }), 
    [visibleStudents, selectedRankingClass]
  );
  
  const yearRanking = useMemo(() => 
    [...visibleStudents]
      .filter((s) => selectedRankingYear === "全部" || getYearFromClass(s.className).trim().toUpperCase() === selectedRankingYear.trim().toUpperCase())
      .map((s) => ({ ...s, average: latestScore(s), progress: progressScore(s) }))
      .filter(s => getSafeNumber(s.xp) > 0 || s.average > 0)
      .sort((a, b) => { 
        const xpDiff = getSafeNumber(b.xp) - getSafeNumber(a.xp); 
        if (xpDiff !== 0) return xpDiff; 
        return b.average - a.average; 
      }), 
    [visibleStudents, selectedRankingYear]
  );
  
  const progressRanking = useMemo(() => 
    [...visibleStudents]
      .map((s) => ({ ...s, average: latestScore(s), progress: progressScore(s) }))
      .filter(s => s.progress > 0)
      .sort((a, b) => b.progress - a.progress), 
    [visibleStudents]
  );
  
  const selectedStudent = useMemo(() => { 
    if (!selectedStudentKey) return null; 
    const [className, id] = selectedStudentKey.split("__"); 
    return findStudent(className, id); 
  }, [students, selectedStudentKey]);

  const classAnalysis = useMemo(() => {
    const targetStudents = selectedReportClass === "全部" 
      ? visibleScoredStudents 
      : visibleScoredStudents.filter((s) => getSafeString(s.className).trim().toUpperCase() === selectedReportClass.trim().toUpperCase());
    
    const totalStudents = selectedReportClass === "全部" 
      ? visibleStudents.length 
      : visibleStudents.filter((s) => getSafeString(s.className).trim().toUpperCase() === selectedReportClass.trim().toUpperCase()).length;
    
    const scopeStudents = selectedReportClass === "全部" 
      ? visibleStudents 
      : visibleStudents.filter((s) => getSafeString(s.className).trim().toUpperCase() === selectedReportClass.toUpperCase());
    
    const cumulativeTested = scopeStudents.reduce((sum, s) => sum + (Array.isArray(s.scores) ? s.scores.length : 0), 0);

    if (!targetStudents.length) {
      return { 
        total: totalStudents, 
        tested: cumulativeTested, 
        average: 0, 
        strongest: "尚無數據", 
        weakest: "尚無數據", 
        abilityAvg: abilityFields.map(f => ({ name: f.label, value: 0, color: f.color })), 
        advice: "班級尚未累積足夠數據，請協助輸入學生成績。" 
      };
    }
    const abilityAvg = abilityFields.map((field) => {
      const sum = targetStudents.reduce((total, student) => total + getSafeNumber(latestRecord(student)?.[field.key] || 0), 0);
      const avg = targetStudents.length ? sum / targetStudents.length : 0;
      return { name: field.label, value: Number(avg.toFixed(1)), color: field.color };
    });
    const strongest = [...abilityAvg].sort((a, b) => b.value - a.value)[0];
    const weakest = [...abilityAvg].sort((a, b) => a.value - b.value)[0];
    const totalAverage = targetStudents.reduce((sum, student) => sum + latestScore(student), 0) / targetStudents.length;

    return { 
      total: totalStudents, 
      tested: cumulativeTested, 
      average: totalAverage, 
      strongest: `${strongest.name} (${strongest.value}分)`, 
      weakest: `${weakest.name} (${weakest.value}分)`, 
      abilityAvg, 
      advice: `班級平均為 ${totalAverage.toFixed(1)} 分。強項是「${strongest.name}」，核心弱項為「${weakest.name}」，應於本季加強集體修煉！` 
    };
  }, [visibleStudents, visibleScoredStudents, selectedReportClass]);

  // ==========================================
  // 🆕 升級：融合每週任務成就之客製化個人體適能報告變數
  // ==========================================
  const reportRecord = useMemo(() => selectedStudent ? latestRecord(selectedStudent) : null, [selectedStudent]);
  const reportScore = useMemo(() => reportRecord ? getSafeNumber(reportRecord.average) : 0, [reportRecord]);
  const reportRadarData = useMemo(() => {
    return abilityFields.map((field) => ({ 
      subject: field.label, 
      value: getSafeNumber(reportRecord?.[field.key] || 0) 
    }));
  }, [reportRecord]);
  const reportStudentLv = useMemo(() => selectedStudent ? Math.min(100, Math.floor(getSafeNumber(selectedStudent.xp) / 1000) + 1) : 1, [selectedStudent]);
  const reportStudentLvInfo = useMemo(() => getLvTitleAndDesc(reportStudentLv), [reportStudentLv]);
  
  // 🆕 顯示學生的歷史奮鬥任務史（顯示所有狀態為 approved 的已通過任務，保留完整成長軌跡）
  const reportCompletedTasks = useMemo(() => {
    if (!selectedStudent || !Array.isArray(selectedStudent.questsSubmitted)) return [];
    return selectedStudent.questsSubmitted.filter(q => q.status === "approved");
  }, [selectedStudent]);


  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 print:bg-white print:text-slate-900 print:p-0 animate-fadeIn relative overflow-x-hidden">
      
      {/* 🔮 注入 RPG 特效與校徽動態流光 CSS 樣式 */}
      <style>
        {`
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
            @page { size: A4; margin: 15mm; }
          }
          
          /* RPG 聖保祿專屬動態流光外框特效 */
          @keyframes rpgGlow {
            0% { filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.4)) drop-shadow(0 0 20px rgba(168, 85, 247, 0.2)); }
            50% { filter: drop-shadow(0 0 30px rgba(234, 179, 8, 0.5)) drop-shadow(0 0 45px rgba(249, 115, 22, 0.3)); }
            100% { filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.4)) drop-shadow(0 0 20px rgba(168, 85, 247, 0.2)); }
          }

          /* 微發光 RPG 智能邊框 */
          .rpg-glowing-card {
            position: relative;
            background: rgba(15, 23, 42, 0.95);
          }
          .rpg-glowing-card::before {
            content: "";
            position: absolute;
            inset: -1px;
            border-radius: 1.5rem;
            padding: 1px;
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25), rgba(234, 179, 8, 0.25));
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            pointer-events: none;
            z-index: 1;
          }
        `}
      </style>

      {/* ==========================================
          🛡️ 聖保祿學校校徽：右下角高奢動態浮水印 (RPG 魔法陣模式)
          ========================================== */}
      <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-0 pointer-events-none print:hidden select-none flex items-center justify-center w-52 h-52 md:w-96 md:h-96 opacity-15 md:opacity-20 transition-all duration-1000">
        <div className="absolute inset-0 rounded-full border border-dashed border-indigo-500/10 animate-[spin_80s_linear_infinite]" />
        <div className="absolute inset-4 rounded-full border border-double border-amber-500/5 animate-[spin_50s_linear_infinite_reverse]" />
        <div className="absolute inset-10 rounded-full bg-gradient-to-tr from-indigo-500/5 via-purple-500/5 to-amber-500/5 blur-3xl animate-pulse" />
        <img 
          src="SP校徽ai_工作區域 1.png" 
          alt="SP校徽" 
          className="w-[82%] h-[82%] object-contain"
          style={{ animation: "rpgGlow 7s ease-in-out infinite" }}
          onError={(e) => {
            e.target.onerror = null; 
            e.target.style.display = 'none';
          }}
        />
      </div>

      {/* 📜 RPG 羊皮紙一次性鼓勵彈窗 */}
      {showAnnouncementModal && studentAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative max-w-md w-full bg-amber-50 text-amber-950 border-[6px] border-double border-amber-800 p-8 rounded-2xl shadow-[0_0_50px_rgba(230,140,40,0.55)] transform scale-100 transition-all duration-300">
            {/* 魔法四角符號 */}
            <div className="absolute top-2 left-2 text-amber-800/40 text-lg">✦</div>
            <div className="absolute top-2 right-2 text-amber-800/40 text-lg">✦</div>
            <div className="absolute bottom-2 left-2 text-amber-800/40 text-lg">✦</div>
            <div className="absolute bottom-2 right-2 text-amber-800/40 text-lg">✦</div>
            
            <div className="text-center space-y-4">
              <div className="text-4xl animate-bounce">📜</div>
              <span className="text-xs font-black uppercase tracking-widest text-amber-800 bg-amber-200/50 border border-amber-300 px-3 py-1 rounded-full">
                來自體育導師的激勵魔法
              </span>
              <h3 className="text-xl font-black font-serif text-amber-900 pt-1">✨ 導師激勵傳音信件</h3>
              
              <div className="my-6 p-5 bg-amber-100/50 border border-dashed border-amber-305 rounded-xl min-h-[100px] flex items-center justify-center">
                <p className="text-sm font-bold leading-relaxed font-serif text-amber-950 whitespace-pre-line italic text-center">
                  "{studentAnnouncement.text}"
                </p>
              </div>
              
              <p className="text-xs text-amber-800/90 text-right font-serif">
                —— 🧙‍♂️ {studentAnnouncement.sender} 導師 傳音
              </p>
              
              <button 
                onClick={() => {
                  localStorage.setItem(`seen_announcement_${currentLoggedInStudent.className.toUpperCase()}`, String(studentAnnouncement.updatedAt));
                  setShowAnnouncementModal(false);
                }}
                className="w-full bg-gradient-to-r from-amber-800 to-amber-950 hover:from-amber-700 hover:to-amber-900 text-amber-50 font-black py-3 rounded-xl transition-all shadow-md active:scale-95"
              >
                收下能量，開始特訓！
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔔 RPG 等級突破 Level Up 精美全螢幕慶祝賀卡彈窗 */}
      {levelUpModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-fadeIn">
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border-2 border-yellow-500/80 p-10 rounded-3xl max-w-sm w-full text-center shadow-[0_0_50px_rgba(234,179,8,0.3)] space-y-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.15)_0%,transparent_70%)] pointer-events-none" />
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center shadow-lg shadow-yellow-500/20 animate-bounce">
              <span className="text-4xl">⚡</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-yellow-400 bg-yellow-950/50 border border-yellow-500/30 px-3 py-1 rounded-full">
                等級突破 LEVEL UP!
              </span>
              <h3 className="text-2xl font-black text-white pt-2">實力突破新極限</h3>
            </div>
            <div className="flex justify-center items-center gap-4 py-1.5 bg-slate-900/60 rounded-2xl border border-slate-800">
              <div className="text-slate-400 font-bold">Lv. {levelUpModal.oldLevel}</div>
              <div className="text-yellow-400 text-lg animate-pulse">➔</div>
              <div className="text-yellow-400 text-xl font-black">Lv. {levelUpModal.newLevel}</div>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed px-2 font-medium">
              🎉 恭喜你突破極限，實力更進一步！請保持這股熱血與堅持，繼續挑戰自我，為下一階段努力吧！💪
            </p>
            <button 
              onClick={() => setLevelUpModal(prev => ({ ...prev, isOpen: false }))}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/20"
            >
              收下勳章，繼續啟程！
            </button>
          </div>
        </div>
      )}

      {/* 🆕 學生提交鍛鍊日誌彈窗 (LogModal) */}
      {logModalOpen && activeQuestForLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 p-6 md:p-8 rounded-3xl max-w-lg w-full shadow-2xl space-y-5 text-left relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            <div className="space-y-1">
              <span className="text-xxs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-950 px-2.5 py-1 rounded-full border border-indigo-800/40">
                每週體能鍛鍊任務對接
              </span>
              <h3 className="text-xl font-black text-white pt-2">📝 提交完成審核日誌</h3>
              <p className="text-slate-400 text-xs">
                任務名稱：<b className="text-slate-200">{activeQuestForLog.title}</b> (預計獲得 <b className="text-amber-400">+{activeQuestForLog.xp} XP</b>)
              </p>
            </div>

            <div className="space-y-4">
              {/* 反應選擇 */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  1. 完成任務後身體的感覺 or 反應 <span className="text-rose-500">*</span>
                </label>
                <div className="grid gap-2 sm:grid-cols-1">
                  {presetFeelings.map((preset, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectPresetFeeling(preset)}
                      className={`w-full text-left p-3 rounded-xl text-xs border transition-all leading-relaxed ${
                        studentReaction === preset
                          ? "bg-indigo-950 border-indigo-500 text-indigo-200 font-bold shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 手動輸入描述 */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  2. 額外補充描述 (選填)
                </label>
                <textarea
                  rows="3"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  placeholder="可自由描述：完成任務的辛酸、過程、拉伸感受或體育老師的要求..."
                  value={customComment}
                  onChange={(e) => setCustomComment(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setLogModalOpen(false)} 
                className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                取消返回
              </button>
              <button 
                onClick={handleSubmitWorkoutLog} 
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-xs font-black transition-all hover:brightness-110 shadow-lg shadow-indigo-500/20"
              >
                確認提交審核
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 雙模式列印選擇器 */}
      {printModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-5">
            <h3 className="text-lg font-black text-white flex items-center gap-2">🖨️ 選擇列印與 PDF 匯出方案</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              為了解決瀏覽器安全防護限制，我們為您提供以下兩種列印方案：
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={() => { handleNewWindowPrint(); setPrintModalOpen(false); }} 
                className="w-full text-left p-4 rounded-2xl bg-indigo-950/60 border border-indigo-700 hover:bg-indigo-900/80 transition-all space-y-1"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-indigo-300">方案一：新視窗極致列印 (🌟 100% 相容推薦)</span>
                  <span className="text-xxs bg-indigo-600 px-2 py-0.5 text-white font-bold rounded-full">相容最佳</span>
                </div>
                <p className="text-xxs text-slate-400 leading-normal">
                  系統將在新視窗中單獨開啟純淨的 A4 報告排版，此方案完全不受沙盒安全限制，且能完美將雷達圖高畫質印出。
                </p>
              </button>

              <button 
                onClick={() => { handlePrintDirectly(); setPrintModalOpen(false); }} 
                className="w-full text-left p-4 rounded-2xl bg-slate-800/60 border border-slate-700 hover:bg-slate-800 transition-all space-y-1"
              >
                <span className="text-xs font-black text-slate-300">方案二：直接列印 (嘗試模式)</span>
                <p className="text-xxs text-slate-400 leading-normal">
                  直接呼叫當前視窗列印。在部分安全性極高的瀏覽器中可能會無回應或沒有動作。
                </p>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setPrintModalOpen(false)} 
                className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                關閉返回
              </button>
            </div>
          </div>
        </div>
      )}

      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-black text-white flex items-center gap-2">⚠️ {modalConfig.title}</h3>
            <p className="text-slate-300 text-sm my-4 leading-relaxed">{modalConfig.msg}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalConfig({ ...modalConfig, isOpen: false })} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold">取消</button>
              <button onClick={modalConfig.onConfirm} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold">確認執行</button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          主要內容區 (z-10 確保內容不被背景水印魔法陣覆蓋)
          ========================================== */}
      <div className="mx-auto max-w-7xl space-y-6 print:space-y-0 print:max-w-none relative z-10">
        
        {/* ==========================================
            Header 頂部精緻控制列 (套用 rpg-glowing-card 微光感)
            ========================================== */}
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-850 bg-slate-950/90 p-6 shadow-2xl backdrop-blur-md md:flex-row md:items-center md:justify-between print:hidden rpg-glowing-card">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold uppercase text-indigo-400 bg-indigo-950/85 px-3 py-1 rounded-full border border-indigo-800/40">⚡ Saint Paul School PE SYSTEM</span>
              
              {dbStatus === "connecting" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xxs font-bold text-slate-400 bg-slate-800/60 border border-slate-700 rounded-full animate-pulse">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span> 雲端連線中...
                </span>
              )}
              {dbStatus === "connected" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xxs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-900/40 rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span> 雲端已安全連線
                </span>
              )}
              {dbStatus === "error" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xxs font-bold text-rose-400 bg-rose-950/60 border border-rose-900/40 rounded-full" title={dbErrorMessage}>
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span> 連線診斷說明
                </span>
              )}

              {teacherAuthenticated && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xxs font-bold rounded-full ${currentTeacher?.role === 'admin' ? 'text-amber-400 bg-amber-950/60 border border-amber-900/40' : 'text-blue-400 bg-blue-950/60 border border-blue-900/40'}`}>
                  🔑 {currentTeacher?.role === 'admin' ? '系統管理員 (全權限)' : `任教授權：${currentTeacher?.classes || '無任教班級'}`}
                </span>
              )}
            </div>
            
            <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-white via-indigo-200 to-purple-400 bg-clip-text text-transparent mt-1">聖保祿中學PE體適能數據化分析系統</h1>
            
            {dbStatus === "error" && (
              <div className="text-xs text-rose-300 font-mono bg-rose-950/60 border border-rose-900/40 p-4 rounded-2xl mt-2 max-w-2xl animate-fadeIn space-y-2 whitespace-pre-line leading-relaxed">
                <p className="font-extrabold text-sm text-rose-400">⚠️ 雲端資料庫連線提示：</p>
                <p className="text-slate-300 font-sans">{dbErrorMessage}</p>
              </div>
            )}
          </div>
          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button onClick={() => { setTeacherMode(false); setStudentAuthenticated(false); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${!teacherMode ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400"}`}><SvgIcon name="user" className="w-4 h-4" /> 學生看板</button>
            <button onClick={() => { setTeacherMode(true); setTeacherAuthenticated(false); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${teacherMode ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400"}`}><SvgIcon name="settings" className="w-4 h-4" /> 教師後台</button>
          </div>
        </header>

        {/* ==========================================
            學生端主介面
            ========================================== */}
        {!teacherMode && (
          <div className="grid gap-6 lg:grid-cols-[380px_1fr] print:hidden">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl space-y-5 rpg-glowing-card h-fit">
              <h2 className="text-lg font-black text-white">學生認證登入</h2>
              {!studentAuthenticated && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">選擇班級</label>
                    <select className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs focus:border-indigo-500 bg-slate-900 text-slate-100" value={studentLoginData.className} onChange={(e) => handleLoginFieldChange("className", e.target.value)}>
                      <option value="">請選擇...</option>{classList.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs text-slate-400 mb-1">學號 / 座號</label><input type="text" className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs focus:border-indigo-500 text-slate-100" value={studentLoginData.studentId} placeholder="如：1" onChange={(e) => handleLoginFieldChange("studentId", e.target.value)} /></div>
                  <div><label className="block text-xs text-slate-400 mb-1">安全密碼</label><input type="password" className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs focus:border-indigo-500 text-slate-100" value={studentLoginData.password} placeholder="請輸入密碼" onChange={(e) => handleLoginFieldChange("password", e.target.value)} /></div>
                  {loginError && <p className="text-xs text-rose-400 font-bold">⚠️ {loginError}</p>}
                  <button onClick={handleStudentLogin} className="w-full bg-indigo-600 py-3 rounded-xl font-bold transition-all hover:bg-indigo-700">驗證登入</button>
                </div>
              )}
              {studentAuthenticated && (
                <div className="space-y-4 animate-fadeIn">
                  <p className="font-extrabold text-white text-center">歡迎回來，{getSafeString(currentLoggedInStudent?.name)}！</p>
                  {abilityFields.map((item) => {
                    const val = getSafeNumber(latestRecord(currentLoggedInStudent)?.[item.key] || 0);
                    return (
                      <div key={item.key} className="space-y-1">
                        <div className="flex justify-between text-xs"><span>{item.icon} {item.label}</span><span>{val}</span></div>
                        <div className="h-2 bg-slate-800 rounded-lg overflow-hidden"><div className="h-full bg-indigo-500 transition-all" style={{ width: `${val}%` }}></div></div>
                      </div>
                    );
                  })}
                  <button onClick={() => setStudentAuthenticated(false)} className="w-full bg-slate-800 py-2 rounded-xl text-xs text-slate-300">安全登出</button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* 🆕 學生端分頁選單：三欄式分頁控制器 */}
              {studentAuthenticated && (
                <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800/80 shadow-md">
                  <button 
                    onClick={() => setStudentActiveTab("manual")} 
                    className={`flex-1 text-center py-3.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${studentActiveTab === "manual" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    📖 我的修煉手冊
                  </button>
                  <button 
                    onClick={() => setStudentActiveTab("quests")} 
                    className={`flex-1 text-center py-3.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 relative ${studentActiveTab === "quests" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    <span>
                      🏃 每週體能任務
                    </span>
                    {/* 微型未完成任務提醒紅點 */}
                    <span className="absolute top-2 right-4 flex h-2 w-2 rounded-full bg-rose-500"></span>
                  </button>
                  <button 
                    onClick={() => setStudentActiveTab("tbd")} 
                    className={`flex-1 text-center py-3.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${studentActiveTab === "tbd" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    🔮 待定 (神秘裝備庫)
                  </button>
                </div>
              )}

              {/* ==========================================
                  分頁 1：我的修煉手冊 (納入原先學生板面之所有資訊)
                  ========================================== */}
              {studentAuthenticated && studentActiveTab === "manual" && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* 最上方四項大數值指標卡 */}
                  <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 rpg-glowing-card">
                      <p className="text-xs text-slate-500 font-bold">最新戰力分</p>
                      <p className="text-3xl font-black text-indigo-400 mt-1">{studentAuthenticated ? currentAvgScore.toFixed(1) : "--"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 rpg-glowing-card">
                      <p className="text-xs text-slate-500 font-bold">體能評級</p>
                      <p className="text-md font-black text-emerald-400 mt-2 truncate">{studentAuthenticated ? getLevel(currentAvgScore) : "尚未鑑定"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 rpg-glowing-card">
                      <p className="text-xs text-slate-500 font-bold">冒險者等級</p>
                      <p className="text-lg font-black text-amber-400 mt-1">{studentAuthenticated ? `Lv. ${currentLevel}` : "Lv. --"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 rpg-glowing-card">
                      <p className="text-xs text-slate-500 font-bold">當前修行階段</p>
                      <p className="text-xs font-bold text-purple-300 mt-2">{studentAuthenticated ? getProgressStage(currentAvgScore) : "未登入"}</p>
                    </div>
                  </div>

                  {/* 經驗條與等級 */}
                  <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-4 text-xs space-y-1 rpg-glowing-card">
                    <div className="flex justify-between font-bold text-amber-300">
                      <span>🌟 經驗與等級資訊</span>
                      <span>XP: {xpInCurrentLevel} / 1000 (總XP: {studentXp})</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 animate-pulse" style={{ width: `${(xpInCurrentLevel / 1000) * 100}%` }}></div>
                    </div>
                  </div>

                  {/* 班級排行與年級英雄榜 */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* 班級戰鬥排行 */}
                    <div className="rounded-2xl border border-amber-900/40 bg-gradient-to-br from-slate-950 to-slate-900 p-5 shadow-lg space-y-4 rpg-glowing-card">
                      <div className="flex justify-between items-center border-b border-amber-950 pb-2">
                        <p className="text-xs font-bold text-amber-500">👑 班級戰鬥排行 ({currentLoggedInStudent?.className})</p>
                        <span className="text-xxs bg-amber-950 px-2.5 py-0.5 rounded-full text-amber-400 font-black">
                          座號 {currentLoggedInStudent?.id} • 第 {studentRanks.classRank} 名 / {studentRanks.classTotal}人
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {top5ClassStudents.map((s, idx) => {
                          const isMe = getSafeString(s.id).trim() === getSafeString(currentLoggedInStudent.id).trim();
                          const badges = ["🥇", "🥈", "🥉", "4.", "5."];
                          return (
                            <div 
                              key={`top-c-${s.id}`}
                              className={`flex justify-between items-center p-2 rounded-xl border transition-all ${
                                isMe ? "bg-amber-950/40 border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.15)]" : "bg-slate-900/60 border-slate-800/80"
                              }`}
                            >
                              <span className="font-bold text-slate-300 flex items-center gap-2">
                                <span className="text-sm">{badges[idx]}</span>
                                <span className={isMe ? "text-yellow-400 font-black" : ""}>{s.name}</span>
                                {isMe && <span className="text-xxs font-black text-slate-950 bg-yellow-500 px-1 py-0.2 rounded">你</span>}
                              </span>
                              <span className="font-bold text-slate-400">{getSafeNumber(s.xp)} XP</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 年級英雄榜 */}
                    <div className="rounded-2xl border border-blue-900/40 bg-gradient-to-br from-slate-950 to-slate-900 p-5 shadow-lg space-y-4 rpg-glowing-card">
                      <div className="flex justify-between items-center border-b border-blue-950 pb-2">
                        <p className="text-xs font-bold text-blue-500">🏆 年級英雄榜 ({getYearFromClass(currentLoggedInStudent?.className)}年級)</p>
                        <span className="text-xxs bg-blue-950 px-2.5 py-0.5 rounded-full text-blue-400 font-black">
                          第 {studentRanks.yearRank} 名 / {studentRanks.yearTotal}人
                        </span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {top5YearStudents.map((s, idx) => {
                          const isMe = getSafeString(s.className).trim().toUpperCase() === getSafeString(currentLoggedInStudent.className).trim().toUpperCase() && getSafeString(s.id).trim() === getSafeString(currentLoggedInStudent.id).trim();
                          const badges = ["🥇", "🥈", "🥉", "4.", "5."];
                          return (
                            <div 
                              key={`top-y-${s.className}-${s.id}`}
                              className={`flex justify-between items-center p-2 rounded-xl border transition-all ${
                                isMe ? "bg-blue-950/40 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.15)]" : "bg-slate-900/60 border-slate-800/80"
                              }`}
                            >
                              <span className="font-bold text-slate-300 flex items-center gap-2">
                                <span className="text-sm">{badges[idx]}</span>
                                <span className="text-slate-400 text-xxs font-black font-mono">[{s.className}]</span>
                                <span className={isMe ? "text-blue-400 font-black" : ""}>{s.name}</span>
                                {isMe && <span className="text-xxs font-black text-slate-950 bg-blue-400 px-1 py-0.2 rounded">你</span>}
                              </span>
                              <span className="font-bold text-slate-400">{getSafeNumber(s.xp)} XP</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 3D 屬性天賦雷達 & 已解鎖流派榮譽 */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 flex flex-col items-center justify-between rpg-glowing-card">
                      <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider self-start mb-4">🔮 3D 屬性天賦雷達</h3>
                      <div className="w-full h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={studentRadarData}>
                            <PolarGrid stroke="#334155" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <PolarRadiusAxis domain={[0, 100]} />
                            <Radar dataKey="value" stroke="#6366f1" fill="#818cf8" fillOpacity={0.65} />
                            <Tooltip />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-4 rpg-glowing-card">
                      <h3 className="text-xs font-extrabold text-slate-400 tracking-wider">🏆 已解鎖流派與榮譽</h3>
                      <div className="space-y-3">
                        <div className="bg-slate-900/85 p-3 rounded-xl border border-slate-800">
                          <p className="text-xxs text-slate-500">職位定位 (流派)</p>
                          <p className="text-sm font-bold text-indigo-400">{getType(latestRecord(currentLoggedInStudent), currentAvgScore)}</p>
                        </div>
                        <div className="bg-slate-900/85 p-3 rounded-xl border border-slate-800">
                          <p className="text-xxs text-slate-500">角色頭銜 (稱號)</p>
                          <p className="text-sm font-bold text-amber-300">{getLvTitleAndDesc(currentLevel).title}</p>
                        </div>
                        <div className="p-3.5 bg-indigo-950/20 border border-indigo-900/40 rounded-xl">
                          <p className="text-xxs text-indigo-300 font-bold mb-1">💡 冒險修煉格言</p>
                          <p className="text-xxs text-slate-400 italic">"{getLvTitleAndDesc(currentLevel).desc}"</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI 冒險教練特訓建議 */}
                  <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-4 rpg-glowing-card">
                    <div className="flex flex-col sm:flex-row justify-between border-b border-slate-800 pb-2 gap-2">
                      <div>
                        <h3 className="text-sm font-extrabold text-white">👾 AI 冒險教練特訓建議</h3>
                        <p className="text-xxs text-slate-500">結合當前體能實時分析，生成最符合本週的課外自主訓練副本。</p>
                      </div>
                      <button 
                        onClick={handleAskAICoach} 
                        disabled={aiLoading} 
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
                      >
                        {aiLoading ? "💫 正在解析星圖..." : "🔮 召喚 AI 特訓副本"}
                      </button>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/50 leading-relaxed text-slate-300 text-xs whitespace-pre-line shadow-inner min-h-[100px] border border-slate-850">
                      {aiCoachResponse ? aiCoachResponse : "💡 點擊上方按鈕，本地 AI 專家引擎將針對您的「歷史弱點屬性」進行實時運算，量身派發修煉選單！"}
                    </div>
                  </div>

                </div>
              )}

              {/* ==========================================
                  分頁 2：每週體能任務 (線下完成，日誌送審)
                  ========================================== */}
              {studentAuthenticated && studentActiveTab === "quests" && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* 頂部任務說明看板 */}
                  <div className="rounded-3xl border border-indigo-900/60 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 shadow-xl relative overflow-hidden rpg-glowing-card">
                    <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl"></div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      ⚔️ 聖保祿本週派發修煉任務
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      體育老師為你們量身訂製了以下三項線下體能任務。完成任務並提交心得回饋（如呼吸急促、吃力等反應描述），經老師在審核大廳核准同意後，即可獲取高額修煉經驗值（XP），衝刺更高等級！
                    </p>
                  </div>

                  {/* 任務列表卡片 */}
                  <div className="grid gap-6 md:grid-cols-3">
                    {currentWeeklyQuests.map((quest) => {
                      // 🆕 版本控制核心比對：僅過濾出符合「目前雲端任務版本」的提交紀錄
                      const submissions = Array.isArray(currentLoggedInStudent.questsSubmitted) 
                        ? currentLoggedInStudent.questsSubmitted.filter(q => q.questId === quest.id && q.version === currentQuestsVersion)
                        : [];
                      
                      let questStatus = "none";
                      let submissionItem = null;

                      if (submissions.some(s => s.status === "approved")) {
                        questStatus = "approved";
                        submissionItem = submissions.find(s => s.status === "approved");
                      } else if (submissions.some(s => s.status === "pending")) {
                        questStatus = "pending";
                        submissionItem = submissions.find(s => s.status === "pending");
                      }

                      return (
                        <div 
                          key={quest.id} 
                          className={`rounded-2xl border p-5 shadow-lg flex flex-col justify-between relative overflow-hidden transition-all ${
                            questStatus === "approved"
                              ? "bg-emerald-950/20 border-emerald-500/40 shadow-emerald-950/10"
                              : questStatus === "pending"
                              ? "bg-amber-950/20 border-amber-500/40 shadow-amber-950/10"
                              : "bg-slate-950/80 border-slate-800/80"
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <span className={`text-xxs font-bold px-2.5 py-0.5 rounded-full ${
                                questStatus === "approved"
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-900/60"
                                  : questStatus === "pending"
                                  ? "bg-amber-950 text-amber-400 border border-amber-900/60"
                                  : "bg-slate-900 text-indigo-400 border border-slate-800"
                              }`}>
                                {questStatus === "approved" ? "✅ 已核可" : questStatus === "pending" ? "⌛ 審核中" : "🔥 新任務"}
                              </span>
                              <span className="text-xs font-black text-yellow-500 font-mono">+{quest.xp} XP</span>
                            </div>

                            <h4 className="text-base font-black text-slate-100">{quest.title}</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">{quest.desc}</p>
                          </div>

                          <div className="mt-5 pt-3 border-t border-slate-900">
                            {questStatus === "approved" ? (
                              <div className="space-y-2">
                                <div className="p-2.5 bg-emerald-950/30 rounded-lg text-xxs text-emerald-300 italic">
                                  💬 「{submissionItem?.reflection}」
                                </div>
                                <p className="text-xxs text-emerald-400 text-center font-bold">
                                  任務於 {submissionItem?.approvedAt || submissionItem?.submittedAt} 完成核可
                                </p>
                              </div>
                            ) : questStatus === "pending" ? (
                              <div className="space-y-2">
                                <div className="p-2.5 bg-amber-950/30 rounded-lg text-xxs text-amber-300 italic">
                                  💬 「{submissionItem?.reflection}」
                                </div>
                                <div className="w-full text-center py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl text-xxs font-black">
                                  ⌛ 正在等待體育老師審核...
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenLogModal(quest)}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-500/10 transition-all"
                              >
                                ✍️ 提交鍛鍊日誌
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-2.5">
                    <p className="text-xs font-bold text-slate-300">💡 如何填寫出色的鍛鍊日誌？</p>
                    <p className="text-xxs text-slate-500 leading-relaxed">
                      聖保祿體能系統重視同學完成挑戰時的真實心血管與肌肉感受。您可以多使用預設關鍵反應描述身體感受。當體育老師在後台發布新的體能任務大綱時，系統會自動在最安全的狀態下幫您重置任務状态。重置後，您以前得過的 XP 與完成紀錄均不會消失，而您可以再次挑戰，提交日誌以取得更多 XP！
                    </p>
                  </div>

                </div>
              )}

              {/* ==========================================
                  分頁 3：待定 (神兵裝備庫，拒絕空欄)
                  ========================================== */}
              {studentAuthenticated && studentActiveTab === "tbd" && (
                <div className="space-y-6 animate-fadeIn">
                  
                  <div className="rounded-3xl border border-yellow-900/40 bg-gradient-to-r from-amber-950/20 via-slate-950 to-amber-950/20 p-6 text-center space-y-3 rpg-glowing-card">
                    <span className="text-3xl">🛡️</span>
                    <h3 className="text-base font-black text-amber-400">體能冒險神兵裝備庫 (未來解鎖中)</h3>
                    <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
                      在聖保祿冒險世界中，經驗值（XP）與等級將決定你可裝備的神兵！目前全校體育大師們正在為此系統籌建「戰鬥商店」，敬請期待新功能！
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center gap-3 opacity-40">
                      <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-lg">👟</div>
                      <div>
                        <p className="text-xs font-black text-slate-300">疾風飛翼靴</p>
                        <p className="text-xxs text-slate-500">需等級達到 Lv.10 裝備</p>
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-855 p-4 rounded-xl flex items-center gap-3 opacity-40">
                      <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-lg">🏋️‍♂️</div>
                      <div>
                        <p className="text-xs font-black text-slate-300">巨人之臂重護腕</p>
                        <p className="text-xxs text-slate-500">需等級達到 Lv.25 裝備</p>
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-855 p-4 rounded-xl flex items-center gap-3 opacity-40">
                      <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-lg">👑</div>
                      <div>
                        <p className="text-xs font-black text-slate-300">聖保祿榮耀桂冠</p>
                        <p className="text-xxs text-slate-500">需等級達到 Lv.50 裝備</p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* 未登入時的防呆提示 */}
              {!studentAuthenticated && (
                <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-12 text-center text-slate-500">
                  <p className="text-4xl mb-2">🔑</p>
                  <p className="text-sm font-bold text-slate-300">請先在左側輸入班級學號完成認證連線</p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ==========================================
            教師端驗證登入
            ========================================== */}
        {teacherMode && !teacherAuthenticated && (
          <div className="max-w-md mx-auto print:hidden">
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-4 shadow-2xl rpg-glowing-card">
              <h2 className="text-lg font-black text-white">教師控制台認證</h2>
              <div className="space-y-4">
                <div><label className="block text-xs text-slate-400 mb-1">教師帳號</label><input type="text" className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-100" value={teacherLogin.username} placeholder="輸入教師或管理員帳號" onChange={(e) => setTeacherLogin((prev) => ({ ...prev, username: e.target.value }))} /></div>
                <div><label className="block text-xs text-slate-400 mb-1">安全密碼</label><input type="password" className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-100" value={teacherLogin.password} placeholder="請輸入密碼" onChange={(e) => setTeacherLogin((prev) => ({ ...prev, password: e.target.value }))} /></div>
                {teacherError && <p className="text-xs text-rose-400 font-bold">⚠️ {teacherError}</p>}
                <button onClick={handleTeacherLogin} className="w-full bg-indigo-600 py-3 rounded-xl font-bold">進入控制中心</button>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            教師端主控制台
            ========================================== */}
        {teacherMode && teacherAuthenticated && (
          <div className="grid gap-6 lg:grid-cols-[380px_1fr] print:block animate-fadeIn">
            
            {/* 左側管理操作側邊欄 */}
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-5 print:hidden rpg-glowing-card h-fit">
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400">數據備份與同步</p>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleExcelImport} />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-600 py-3 rounded-xl text-xs font-bold transition-all hover:bg-indigo-700">📥 匯入/更新資料庫</button>
                  <button onClick={handleExportCSV} className="bg-emerald-600 py-3 rounded-xl text-xs font-bold transition-all hover:bg-emerald-700">📤 匯出數據庫 (CSV)</button>
                </div>
                
                {currentTeacher?.role === "admin" && (
                  <button onClick={handleImportSampleData} className="w-full bg-slate-800 py-2.5 rounded-xl text-xxs text-slate-300 font-bold transition-all hover:bg-slate-700">
                    🚀 載入模擬範例數據 (管理員專屬)
                  </button>
                )}
              </div>

              {/* 🆕 💬 教師激勵魔法傳音控制面板 */}
              <div className="space-y-3 border-t border-slate-800 pt-4">
                <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <span>💬 教師激勵魔法傳音</span>
                </p>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xxs text-slate-500 mb-1">目標對象 (班級)</label>
                    <select 
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xxs text-slate-100"
                      value={teacherMsgClass}
                      onChange={(e) => setTeacherMsgClass(e.target.value)}
                    >
                      <option value="">請選擇班級...</option>
                      {authorizedClasses.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xxs text-slate-500 mb-1">激勵說話內容 (彈窗顯示)</label>
                    <textarea 
                      rows="3"
                      placeholder="請輸入給學生的溫慢鼓勵或特訓指導語..."
                      value={teacherMsgText}
                      onChange={(e) => setTeacherMsgText(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xxs text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button 
                    onClick={handleSendEncouragement}
                    className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xxs rounded-xl shadow-md transition-all active:scale-95"
                  >
                    🔮 派發激勵魔法
                  </button>
                </div>
              </div>

              {/* 🤖 聖保祿本地智能 AI 專家引擎 (管理員專屬，一般教師隱藏) */}
              {currentTeacher?.role === "admin" && (
                <div className="space-y-3 border-t border-slate-800 pt-4 animate-fadeIn">
                  <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span>🤖 本地智能 AI 專家引擎</span>
                  </p>
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-1.5 text-xxs text-emerald-300 font-bold bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      已啟用：管理員檢視模式
                    </div>
                    <p className="text-slate-400 text-[10px] leading-relaxed">
                      系統已升級內置的<b>聖保祿體適能專家演算法</b>！在免翻牆、100% 穩定的情況下，根據數據秒速為同學生成 RPG 冒險課堂特訓菜單。
                    </p>
                  </div>
                </div>
              )}
              
              {importMessage && (
                <p className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-xxs text-indigo-300 font-medium whitespace-pre-line leading-relaxed animate-fadeIn">
                  {importMessage}
                </p>
              )}

              <div className="border-t border-slate-800 pt-4">
                <button onClick={() => { setTeacherAuthenticated(false); setCurrentTeacher(null); }} className="w-full bg-slate-850 hover:bg-slate-800 py-2.5 rounded-xl text-xs text-slate-300">安全登出</button>
              </div>
            </div>

            {/* 右側工作台區 */}
            <div className="space-y-6 print:block">
              
              {/* 🆕 升級分頁選單：教師端三大整合 Tab 切換按鈕 */}
              <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800/80 shadow-md print:hidden">
                <button 
                  onClick={() => setTeacherActiveTab("cultivation")} 
                  className={`flex-1 text-center py-3.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${teacherActiveTab === "cultivation" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200"}`}
                >
                  📊 學生修煉資訊
                </button>
                <button 
                  onClick={() => setTeacherActiveTab("quests")} 
                  className={`flex-1 text-center py-3.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${teacherActiveTab === "quests" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200"}`}
                >
                  ⚔️ 體能任務大廳
                </button>
                <button 
                  onClick={() => setTeacherActiveTab("reports")} 
                  className={`flex-1 text-center py-3.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${teacherActiveTab === "reports" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10" : "text-slate-400 hover:text-slate-200"}`}
                >
                  📄 報告生成
                </button>
              </div>

              {/* ==========================================
                  分頁 A：📊 學生修煉資訊 (含四大收納區塊)
                  ========================================== */}
              {teacherActiveTab === "cultivation" && (
                <div className="space-y-6 animate-fadeIn print:hidden">
                  
                  {/* (A-1) 🧑‍🎓 課堂實時獎勵與成績管理中心 */}
                  <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-4 rpg-glowing-card">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <h3 className="text-sm font-extrabold text-white tracking-wider">🧑‍🎓 課堂實時獎勵與成績管理中心</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">篩選授權班級:</span>
                        <select className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-xs" value={selectedRewardClass} onChange={(e) => setSelectedRewardClass(e.target.value)}>
                          {rewardClassOptions.map(c => <option key={c} value={c}>{c === "全部" ? "顯示所有授權" : c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-900 text-slate-400"><tr><th className="p-3">班級/座號</th><th className="p-3">姓名</th><th className="p-3">經驗值 (XP)</th><th className="p-3">最新總評</th><th className="p-3 text-center">操作與同步管理</th></tr></thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {visibleStudents.filter(s => selectedRewardClass === "全部" || getSafeString(s.className).toUpperCase() === selectedRewardClass.toUpperCase()).map(s => {
                            const isEditing = editingScoreKey === `${s.className}_${s.id}`;
                            return (
                              <tr key={`${s.className}_${s.id}`} className="hover:bg-slate-900/30">
                                {isEditing ? (
                                  <td colSpan={5} className="p-4 bg-slate-900/80">
                                    <div className="flex flex-col gap-3">
                                      <div className="flex justify-between border-b border-slate-800 pb-2"><span className="font-bold text-amber-400">修改 {s.name} 的數據</span><div className="flex gap-2"><button onClick={() => saveEditedScore(s)} className="px-3 py-1 bg-emerald-600 text-white rounded font-bold">儲存</button><button onClick={() => setEditingScoreKey(null)} className="px-3 py-1 bg-slate-700 text-slate-300 rounded font-bold">取消</button></div></div>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xxs">
                                        <div><label className="block text-slate-500 mb-0.5">XP</label><input type="number" className="w-full bg-slate-950 border border-slate-700 rounded p-1" value={editScoreData.xp} onChange={e => setEditScoreData(p => ({...p, xp: e.target.value}))} /></div>
                                        <div><label className="block text-slate-500 mb-0.5">心肺耐力</label><input type="number" className="w-full bg-slate-950 border border-slate-700 rounded p-1" value={editScoreData.cardio} onChange={e => setEditScoreData(p => ({...p, cardio: e.target.value}))} /></div>
                                        <div><label className="block text-slate-500 mb-0.5">肌肉力量</label><input type="number" className="w-full bg-slate-950 border border-slate-700 rounded p-1" value={editScoreData.strength} onChange={e => setEditScoreData(p => ({...p, strength: e.target.value}))} /></div>
                                        <div><label className="block text-slate-500 mb-0.5">瞬發爆發力</label><input type="number" className="w-full bg-slate-950 border border-slate-700 rounded p-1" value={editScoreData.power} onChange={e => setEditScoreData(p => ({...p, power: e.target.value}))} /></div>
                                        <div><label className="block text-slate-500 mb-0.5">直線速度</label><input type="number" className="w-full bg-slate-950 border border-slate-700 rounded p-1" value={editScoreData.speed} onChange={e => setEditScoreData(p => ({...p, speed: e.target.value}))} /></div>
                                        <div><label className="block text-slate-500 mb-0.5">關節柔軟度</label><input type="number" className="w-full bg-slate-950 border border-slate-700 rounded p-1" value={editScoreData.flexibility} onChange={e => setEditScoreData(p => ({...p, flexibility: e.target.value}))} /></div>
                                        <div><label className="block text-slate-500 mb-0.5">動態敏捷性</label><input type="number" className="w-full bg-slate-950 border border-slate-700 rounded p-1" value={editScoreData.agility} onChange={e => setEditScoreData(p => ({...p, agility: e.target.value}))} /></div>
                                      </div>
                                    </div>
                                  </td>
                                ) : (
                                  <>
                                    <td className="p-3">{s.className} - {s.id}</td><td className="p-3 font-bold text-slate-200">{s.name}</td><td className="p-3 text-amber-400 font-bold">{getSafeNumber(s.xp)} XP <span className="text-slate-500 font-normal text-xxs">(Lv.{Math.min(100, Math.floor(getSafeNumber(s.xp)/1000)+1)})</span></td><td className="p-3 text-indigo-300">{(Array.isArray(s.scores) && s.scores.length > 0) ? latestScore(s).toFixed(1) : "無紀錄"}</td>
                                    <td className="p-3 text-center flex justify-center gap-1.5">
                                      <button onClick={() => addXpToStudent(s.className, s.id, 100)} className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500 hover:text-white transition-all">+100 XP</button>
                                      <button onClick={() => startEditScore(s)} className="px-2 py-1 bg-indigo-600/20 text-indigo-400 rounded hover:bg-indigo-600 hover:text-white transition-all">修改數據</button>
                                      <button onClick={() => handleDeleteStudent(s)} className="px-2 py-1 bg-rose-600/20 text-rose-400 rounded hover:bg-rose-600 hover:text-white transition-all">刪除</button>
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* (A-2) 🏆 授權班級段位、🏫 年級大師、🚀 突破星宿 三大排行榜 */}
                  <div className="grid gap-6 xl:grid-cols-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 rpg-glowing-card">
                      <div className="flex justify-between border-b border-slate-800 pb-1 text-xs font-bold">
                        <span>🏆 授權班級段位</span>
                        <select className="bg-slate-900 border border-slate-800 text-xxs rounded p-0.5" value={selectedRankingClass} onChange={(e) => setSelectedRankingClass(e.target.value)}>
                          {rankingClassOptions.map((c) => <option key={c} value={c}>{c === "全部" ? "全部授權" : c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5 max-h-[180px] overflow-y-auto text-xxs">
                        {classRanking.slice(0, 5).map((s, idx) => (
                          <div key={`c-${idx}`} className="flex justify-between rounded bg-slate-900/60 p-2">
                            <span>{idx+1}. {s.name} ({s.className})</span>
                            <span className="text-amber-400">{getSafeNumber(s.xp)} XP (均分 {s.average.toFixed(1)})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 rpg-glowing-card">
                      <div className="flex justify-between border-b border-slate-800 pb-1 text-xs font-bold">
                        <span>🏫 年級大師 (授權學生)</span>
                        <select className="bg-slate-900 border border-slate-800 text-xxs rounded p-0.5" value={selectedRankingYear} onChange={(e) => setSelectedRankingYear(e.target.value)}>
                          <option value="全部">全部</option>
                          {yearList.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5 max-h-[180px] overflow-y-auto text-xxs">
                        {yearRanking.slice(0, 5).map((s, idx) => (
                          <div key={`y-${idx}`} className="flex justify-between rounded bg-slate-900/60 p-2">
                            <span>{idx+1}. {s.name}</span>
                            <span className="text-amber-400">{getSafeNumber(s.xp)} XP (均分 {s.average.toFixed(1)})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2 rpg-glowing-card">
                      <div className="border-b border-slate-800 pb-1 text-xs font-bold"><span>🚀 突破星宿 (授權進步榜)</span></div>
                      <div className="space-y-1.5 max-h-[180px] overflow-y-auto text-xxs">
                        {progressRanking.slice(0, 5).map((s, idx) => (
                          <div key={`p-${idx}`} className="flex justify-between rounded bg-slate-900/60 p-2">
                            <span>{idx+1}. {s.name}</span>
                            <b className="text-emerald-400">+{s.progress.toFixed(1)} 分</b>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 👑 系統管理員專屬高級控制台 (維持權限控制) */}
                  {currentTeacher?.role === "admin" && (
                    <div className="space-y-6">
                      
                      {/* 教師帳號精密管理面板 */}
                      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-5 shadow-2xl rpg-glowing-card">
                        <div className="border-b border-slate-800 pb-3">
                          <h4 className="text-sm font-black text-white flex items-center gap-2">👑 雲端教師帳號權限管理中心</h4>
                          <p className="text-xxs text-slate-500 mt-1">管理員可以在此為任課教師配置對應權限，限制其僅能瀏覽和編輯特定班級資料。</p>
                        </div>

                        {/* 教師新增表單 */}
                        <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 space-y-4">
                          <p className="text-xs font-bold text-indigo-400">➕ 新增教師與權限劃分</p>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <label className="block text-xxs text-slate-400 mb-1">教師中文姓名</label>
                              <input type="text" placeholder="如：黃心怡老師" value={newTeacher.name} onChange={(e) => setNewTeacher(p => ({...p, name: e.target.value}))} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 outline-none focus:border-indigo-500" />
                            </div>
                            <div>
                              <label className="block text-xxs text-slate-400 mb-1">登入帳號 (Username)</label>
                              <input type="text" placeholder="如：teacher1" value={newTeacher.username} onChange={(e) => setNewTeacher(p => ({...p, username: e.target.value}))} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 outline-none focus:border-indigo-500" />
                            </div>
                            <div>
                              <label className="block text-xxs text-slate-400 mb-1">安全密碼</label>
                              <input type="text" placeholder="如：pw2026" value={newTeacher.password} onChange={(e) => setNewTeacher(p => ({...p, password: e.target.value}))} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 outline-none focus:border-indigo-500" />
                            </div>
                            <div>
                              <label className="block text-xxs text-slate-400 mb-1">授權任教班級 (逗號隔開)</label>
                              <input type="text" placeholder="如：F1A,F1B,F2C" value={newTeacher.classes} onChange={(e) => setNewTeacher(p => ({...p, classes: e.target.value}))} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 outline-none focus:border-indigo-500" />
                            </div>
                          </div>
                          
                          {teacherError && <p className="text-xs text-rose-400 font-bold">⚠️ {teacherError}</p>}
                          
                          <div className="flex justify-end">
                            <button onClick={handleAddTeacher} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-extrabold text-xs rounded-xl shadow-md transition-all">
                              建立教師並同步雲端
                            </button>
                          </div>
                        </div>

                        {/* 教師列表表格 */}
                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                          <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-slate-900 text-slate-400">
                              <tr>
                                <th className="p-3">教師姓名</th>
                                <th className="p-3">登入帳號</th>
                                <th className="p-3">安全密碼</th>
                                <th className="p-3">授權任教班級</th>
                                <th className="p-3">系統權限角色</th>
                                <th className="p-3 text-center">操作</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                              {teacherAccounts.map(t => (
                                <tr key={t.username} className="hover:bg-slate-900/30">
                                  <td className="p-3 font-bold text-slate-200">{t.name}</td>
                                  <td className="p-3 font-mono">{t.username}</td>
                                  <td className="p-3 font-mono text-slate-400">{t.password}</td>
                                  <td className="p-3">
                                    {t.role === 'admin' ? (
                                      <span className="text-xxs bg-amber-950 text-amber-400 border border-amber-800/40 px-2 py-0.5 rounded-full font-bold">全班級完全權限</span>
                                    ) : (
                                      <div className="flex flex-wrap gap-1">
                                        {getSafeString(t.classes).split(",").filter(Boolean).map(c => (
                                          <span key={c} className="text-xxs bg-indigo-950 text-indigo-400 border border-indigo-900/30 px-2 py-0.5 rounded">
                                            {c}
                                          </span>
                                        ))}
                                        {(!t.classes) && <span className="text-xxs text-rose-500 italic">尚未配置班級</span>}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <span className={`text-xxs px-2.5 py-0.5 rounded-full font-bold ${t.role === 'admin' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-300'}`}>
                                      {t.role === 'admin' ? "👑 管理員" : "🧑‍🏫 教師"}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    {t.username !== "admin" ? (
                                      <button onClick={() => handleDeleteTeacher(t.username)} className="px-2.5 py-1 bg-rose-600/20 text-rose-400 rounded hover:bg-rose-600 hover:text-white transition-all">
                                        移除教師
                                      </button>
                                    ) : (
                                      <span className="text-xxs text-slate-500 italic">不可刪除</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* 管理員專屬資料重置區 */}
                      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-3 rpg-glowing-card">
                        <h4 className="text-xs font-bold text-rose-500">🚨 系統管理員專屬：危險區域資料重置 (新學年適用)</h4>
                        <p className="text-xxs text-slate-500">
                          點擊下方按鈕，將徹底清空雲端資料庫 `students` 集合下的所有學生體適能數據與 XP。
                        </p>
                        <button onClick={handleDeleteAllStudents} className="px-4 py-2 bg-rose-950 text-rose-400 border border-rose-800 rounded-xl font-bold text-xs hover:bg-rose-900 transition-all">
                          🗑️ 一鍵清空資料庫所有學生數據
                        </button>
                      </div>

                    </div>
                  )}

                </div>
              )}

              {/* ==========================================
                  分頁 B：⚔️ 體能任務大廳 (任務發布與審核中心)
                  ========================================== */}
              {teacherActiveTab === "quests" && (
                <div className="space-y-6 animate-fadeIn print:hidden">
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    
                    {/* (B-1) 每週任務分發 (編輯任務與經驗值派發) */}
                    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-4 rpg-glowing-card">
                      <div>
                        <h3 className="text-sm font-black text-slate-200">🚀 每週體能任務發布與派發</h3>
                        <p className="text-xxs text-slate-500 mt-1">
                          設定與修改目前全校的三個體能挑戰，並指派學生通過後發送的經驗值(XP)。<b>注意：每次點擊下方發布，均會將全校學生的進行中狀態重置，以便他們再次提交、重複刷任務獲取 XP！</b>
                        </p>
                      </div>
                      <div className="space-y-3 text-xs">
                        {questEdits.map((q, index) => (
                          <div key={q.id} className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-850 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-indigo-400 text-xxs">任務 #{index+1}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xxs text-slate-500 font-bold">獎勵XP:</span>
                                <input 
                                  type="number" 
                                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-bold text-yellow-400 text-xxs" 
                                  value={q.xp} 
                                  onChange={(e) => handleQuestEditFieldChange(index, "xp", e.target.value)} 
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <input 
                                type="text" 
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xxs text-white font-bold" 
                                value={q.title} 
                                placeholder="如：疾風瞬步挑戰"
                                onChange={(e) => handleQuestEditFieldChange(index, "title", e.target.value)} 
                              />
                              <textarea 
                                rows="2"
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xxs text-slate-400" 
                                value={q.desc} 
                                placeholder="描述具體體適能動作，如20米衝刺5組..."
                                onChange={(e) => handleQuestEditFieldChange(index, "desc", e.target.value)} 
                              />
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={handleUpdateWeeklyQuests}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 font-black text-xs rounded-xl shadow-md shadow-indigo-500/10 transition-all text-white"
                        >
                          💾 同步發布任務至全校雲端 (自動覆寫重置狀態)
                        </button>
                      </div>
                    </div>

                    {/* (B-2) 任務完成審核大廳 (審核日誌，並派發 XP) */}
                    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-4 rpg-glowing-card flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-black text-slate-200">⚖️ 任務完成審核大廳</h3>
                        <p className="text-xxs text-slate-500 mt-1">
                          查收同學線下完成任務後提交的自我鍛鍊日誌。核准同意後可立即自動派發獎勵 XP。
                        </p>
                      </div>

                      <div className="flex-1 overflow-y-auto max-h-[460px] space-y-3 pr-1 text-xs mt-3">
                        {pendingSubmissions.length > 0 ? (
                          pendingSubmissions.map((sub) => (
                            <div key={sub.id} className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-850 text-xxs space-y-2">
                              <div className="flex justify-between items-center font-bold">
                                <span className="text-slate-300">
                                  [{sub.className}] {sub.studentName} (座號{sub.studentId})
                                </span>
                                <span className="text-yellow-400 font-mono">+{sub.xp} XP</span>
                              </div>
                              
                              <div className="space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                                <p className="text-slate-500 text-xxs font-bold">任務: {sub.questTitle}</p>
                                <p className="text-slate-200 italic leading-normal">
                                  💬完成反應：「{sub.reflection}」
                                </p>
                              </div>

                              <div className="flex justify-between items-center pt-1">
                                <span className="text-slate-500 text-xxs">提交於：{sub.submittedAt}</span>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleAuditDecision(sub, false)}
                                    className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded-lg text-xxs font-extrabold transition-all"
                                  >
                                    ❌ 拒絕
                                  </button>
                                  <button
                                    onClick={() => handleAuditDecision(sub, true)}
                                    className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded-lg text-xxs font-extrabold transition-all"
                                  >
                                    ✔ 同意派發
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-20 text-slate-500">
                            <p className="text-2xl mb-1">🕊️</p>
                            <p className="text-xxs font-bold">當前暫無待審核的體能日誌申請</p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* ==========================================
                  分頁 C：📄 報告生成 (AI 大師、PDF 列印與統合診斷)
                  ========================================== */}
              {teacherActiveTab === "reports" && (
                <div className="space-y-6 print:block animate-fadeIn">
                  
                  {/* (C-1) 🧑‍🏫 聖保祿班級體適能教學AI大師 (列印時自動隱藏) */}
                  <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-4 print:hidden rpg-glowing-card">
                    <div className="flex flex-col sm:flex-row justify-between border-b border-slate-800 pb-2 gap-2">
                      <div>
                        <h3 className="text-sm font-extrabold text-white">🧑‍🏫 聖保祿班級體適能教學AI大師</h3>
                        <p className="text-xxs text-slate-500">自動點評班級弱點，生成四週特色趣味課程。</p>
                      </div>
                      <button onClick={handleAskTeacherAI} disabled={teacherAiLoading} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-xs font-bold rounded-xl shadow-md active:scale-95">
                        {teacherAiLoading ? "💫 大師規劃中..." : "🔮 生成 4 週授課大綱"}
                      </button>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-900/50 leading-relaxed text-slate-300 text-xs whitespace-pre-line shadow-inner border border-slate-850">
                      {teacherAiResponse ? teacherAiResponse : `🎓 點擊按鈕，本地 AI 專家大師將自動評估您轄下班級弱項「${classAnalysis.weakest}」並生成自適應教案大綱。`}
                    </div>
                  </div>

                  {/* 報告對接篩選器 (列印時自動隱藏) */}
                  <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-4 print:hidden rpg-glowing-card">
                    <div className="border-b border-slate-800 pb-2">
                      <p className="text-xs font-bold text-slate-400">📊 報告與 A4 匯出檔案篩選</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xxs text-slate-400 mb-1">任教班級篩選</label>
                        <select className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-100 font-bold" value={selectedReportClass} onChange={(e) => { setSelectedReportClass(e.target.value); setSelectedStudentKey(""); }}>
                          {reportClassOptions.map((c) => <option key={c} value={c}>{c === "全部" ? "全部任教班級" : c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xxs text-slate-400 mb-1">特定學生成績報告</label>
                        <select className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-100 font-bold" value={selectedStudentKey} onChange={(e) => setSelectedStudentKey(e.target.value)}>
                          <option value="">顯示整體班級診斷報告 (不選取單一學生)</option>
                          {visibleStudents.filter(s => selectedReportClass === "全部" || getSafeString(s.className).toUpperCase() === selectedReportClass.toUpperCase()).map((s) => (
                            <option key={`${s.className}__${s.id}`} value={`${s.className}__${s.id}`}>{s.className} ｜ 座號 {s.id} ｜ {s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button onClick={() => setPrintModalOpen(true)} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-extrabold rounded-xl transition-all shadow-md">
                        🖨️ 列印報告 / 另存 PDF
                      </button>
                    </div>
                  </div>

                  {/* (C-2) 學生/班級 整合報告 A4 列印預覽實體 */}
                  <div className="border-t border-slate-800 pt-6">
                    <div ref={reportRef} id="report-print-area" className="rounded-3xl bg-white p-8 text-slate-800 shadow-xl border border-slate-100 print:border-0 print:shadow-none print:p-0">
                      
                      {/* A4 頂端標籤 */}
                      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">聖保祿中學 PE SYSTEM</span>
                          <h2 className="text-2xl font-black mt-2 text-slate-900 flex items-center gap-2">📄 體適能數據分析報告</h2>
                        </div>
                        <div className="mt-4 md:mt-0 text-left md:text-right text-xs text-slate-400">
                          <p>學校：聖保祿中學</p>
                          <p>產出日期：{new Date().toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* 渲染特定學生報告 */}
                      {selectedStudent && reportRecord ? (
                        <div className="space-y-6 animate-fadeIn text-slate-800">
                          <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-4 rounded-2xl bg-slate-50 p-6 border border-slate-100">
                              <h3 className="text-lg font-bold text-slate-900 border-b pb-2 flex items-center gap-2">🧭 冒險者基本履歷</h3>
                              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                                <p>班級：<b>{selectedStudent.className}</b></p>
                                <p>學號：<b>{selectedStudent.id}</b></p>
                                <p>姓名：<b>{selectedStudent.name}</b></p>
                                <p>戰力分：<b className="text-indigo-600 text-lg">{reportScore.toFixed(1)}</b></p>
                                <p>評級：<b className="text-emerald-600">{getLevel(reportScore)}</b></p>
                                <p>職位定位：<b className="text-amber-600">{getType(reportRecord, reportScore)}</b></p>
                                <p className="col-span-2">修煉進度：<b className="text-indigo-600">Lv. {reportStudentLv}</b> ({selectedStudent.xp || 0} XP)</p>
                              </div>
                              <div className="pt-2 border-t border-slate-200">
                                <p className="text-xs font-bold text-indigo-700">{reportStudentLvInfo.title}</p>
                                <p className="text-xs text-slate-500 italic mt-0.5">{reportStudentLvInfo.desc}</p>
                              </div>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 flex flex-col items-center justify-center min-h-[240px]">
                              <div className="w-full h-[220px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <RadarChart data={reportRadarData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }} />
                                    <PolarRadiusAxis domain={[0, 100]} />
                                    <Radar dataKey="value" stroke="#6366f1" fill="#818cf8" fillOpacity={0.6} />
                                  </RadarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                          
                          {/* 學生日常體能奮鬥史 (家長關切專區 - 完美保留完整歷史軌跡) */}
                          <div className="rounded-2xl bg-emerald-50/50 p-6 border border-emerald-100">
                            <h3 className="text-sm font-bold text-emerald-950 mb-3 flex items-center gap-2">
                              🏆 學生日常體能奮鬥史 (家長關切專區)
                            </h3>
                            {reportCompletedTasks.length > 0 ? (
                              <div className="space-y-3">
                                <p className="text-xxs text-slate-500 mb-2 leading-relaxed">
                                  💡 以下為該生在校積極參與及完成的歷史每週體能任務（包含以前版本得過的歷次經驗值和身體真實反饋，完美保留了學習成長軌跡）：
                                </p>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {reportCompletedTasks.map((t) => (
                                    <div key={t.id} className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm text-xs space-y-1 animate-fadeIn">
                                      <div className="flex justify-between font-black text-slate-900">
                                        <span>{t.questTitle}</span>
                                        <span className="text-emerald-600">+{t.xp} XP</span>
                                      </div>
                                      <div className="flex justify-between items-center text-xxs text-slate-400">
                                        <p>完成日期：{t.approvedAt || t.submittedAt}</p>
                                        {t.version && <span className="bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-mono scale-90">版次: {t.version.slice(-4)}</span>}
                                      </div>
                                      <div className="bg-slate-50 p-2 rounded-lg mt-1 text-slate-600 text-xxs italic leading-normal">
                                        💬 「{t.reflection}」
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-4 bg-white/50 rounded-xl border border-dashed border-slate-200">
                                <p className="text-xs text-slate-400 font-medium">✨ 本學期尚未有經審核核可的每週任務紀錄。</p>
                              </div>
                            )}
                          </div>

                          {/* AI 特訓指南 */}
                          <div className="rounded-2xl bg-indigo-50/50 p-6 border border-indigo-100/50">
                            <h3 className="text-sm font-bold text-indigo-950 mb-1">🤖 AI 冒險教練保留建議</h3>
                            <p className="text-slate-700 text-sm whitespace-pre-line bg-white/80 p-4 rounded-xl shadow-sm leading-relaxed">
                              {selectedStudent.aiAdvice ? selectedStudent.aiAdvice : "💡 本生尚未在學生端點擊「召喚 AI」產生其客製化訓練指導。系統評估推薦：" + getAdvice(reportRecord, reportScore)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* 整合班級診斷報告 */
                        <div className="space-y-6 animate-fadeIn">
                          <div className="rounded-2xl bg-slate-50 p-6 border border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900 border-b pb-3 mb-4">📊 班級體適能整合數據診斷 ({selectedReportClass})</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                              <div className="p-3 bg-white rounded-xl shadow-sm"><p className="text-xs text-slate-400 font-bold">班級人數</p><p className="text-2xl font-black text-slate-800 mt-1">{classAnalysis.total} 人</p></div>
                              <div className="p-3 bg-white rounded-xl shadow-sm"><p className="text-xs text-slate-400 font-bold">已測人次</p><p className="text-2xl font-black text-indigo-600 mt-1">{classAnalysis.tested} 人次</p></div>
                              <div className="p-3 bg-white rounded-xl shadow-sm"><p className="text-xs text-slate-400 font-bold">班級均分</p><p className="text-2xl font-black text-emerald-600 mt-1">{classAnalysis.average.toFixed(1)}</p></div>
                              <div className="p-3 bg-white rounded-xl shadow-sm"><p className="text-xs text-slate-400 font-bold">核心弱項</p><p className="text-sm font-bold text-rose-600 mt-2 truncate">{classAnalysis.weakest}</p></div>
                            </div>
                          </div>
                          <div className="grid gap-6 md:grid-cols-2">
                            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 min-h-[260px]">
                              <div className="w-full h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={classAnalysis.abilityAvg}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis domain={[0, 100]} />
                                    <Tooltip />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                      {classAnalysis.abilityAvg.map((entry, idx) => (
                                        <Cell key={`idx-${idx}`} fill={entry.color} />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            <div className="rounded-2xl bg-purple-50/50 p-6 border border-purple-100/50">
                              <h3 className="text-sm font-bold text-purple-950">👩‍🏫 班級重塑建議</h3>
                              <div className="text-slate-700 text-sm mt-2 max-h-[190px] overflow-y-auto bg-white/80 p-3 rounded-xl leading-relaxed">
                                {classAnalysis.advice}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}