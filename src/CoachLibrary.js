// ⚠️ 此檔由 tools/xlsx_to_library.py 自「動作庫」Excel 自動產生，請勿手動修改。
// 要改動作內容：先改 Excel，再重新執行轉換腳本。
//
// 欄位說明：
//   cat     能力類別（cardio / strength / power / speed / flexibility / agility / warmup / cooldown）
//   venue   any＝家中或操場皆可；field＝只適合操場／公園
//   equip   none＝無器材；rope＝需要跳繩
//   impact  low / mid / high（身體不適時只使用 low）
//   levels  [入門, 進階, 挑戰] 的訓練量
export const COACH_LIBRARY = [
  {
    "id": "CAR-01",
    "cat": "cardio",
    "name": "原地高抬腿",
    "venue": "any",
    "equip": "none",
    "impact": "high",
    "levels": [
      "20秒×3組，休40秒",
      "30秒×4組，休30秒",
      "40秒×5組，休20秒"
    ],
    "cue": "膝蓋抬至腰部高度，前腳掌輕快落地，雙臂自然擺動",
    "safety": "頭暈或腳痛請立即停止"
  },
  {
    "id": "CAR-02",
    "cat": "cardio",
    "name": "開合跳",
    "venue": "any",
    "equip": "none",
    "impact": "high",
    "levels": [
      "20次×3組，休30秒",
      "30次×4組，休30秒",
      "40次×5組，休20秒"
    ],
    "cue": "跳起時雙腳打開、雙手過頭拍掌，落地屈膝緩衝",
    "safety": "落地要輕，膝蓋與腳尖同向"
  },
  {
    "id": "CAR-03",
    "cat": "cardio",
    "name": "慢跑",
    "venue": "field",
    "equip": "none",
    "impact": "mid",
    "levels": [
      "8分鐘，可走跑交替",
      "15分鐘均速",
      "20分鐘，最後2分鐘加速"
    ],
    "cue": "速度以「可以說話但不能唱歌」為準，口鼻並用呼吸",
    "safety": "天氣炎熱時減少時間並補充水分"
  },
  {
    "id": "CAR-04",
    "cat": "cardio",
    "name": "跳繩",
    "venue": "any",
    "equip": "rope",
    "impact": "high",
    "levels": [
      "1分鐘×3組，休1分鐘",
      "2分鐘×3組，休1分鐘",
      "3分鐘×3組，休45秒"
    ],
    "cue": "手腕轉繩，腳尖輕跳離地約2厘米",
    "safety": "確保頭頂及兩側有足夠空間，穿運動鞋"
  },
  {
    "id": "CAR-05",
    "cat": "cardio",
    "name": "原地踏步擺臂",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "2分鐘×3組，休30秒",
      "3分鐘×4組，休30秒",
      "4分鐘×4組，休20秒"
    ],
    "cue": "大步踏步、膝蓋抬高，雙臂前後大幅擺動，節奏逐步加快",
    "safety": "低衝擊，適合身體不適時使用"
  },
  {
    "id": "CAR-06",
    "cat": "cardio",
    "name": "登山者",
    "venue": "any",
    "equip": "none",
    "impact": "mid",
    "levels": [
      "20秒×3組，休40秒",
      "30秒×4組，休30秒",
      "40秒×4組，休20秒"
    ],
    "cue": "雙手撐地、身體成一直線，雙膝交替快速拉向胸口",
    "safety": "手腕或肩膀不適請停止，臀部不要翹高"
  },
  {
    "id": "CAR-07",
    "cat": "cardio",
    "name": "間歇跑（走跑交替）",
    "venue": "field",
    "equip": "none",
    "impact": "mid",
    "levels": [
      "慢跑1分鐘＋步行1分鐘，共6輪",
      "快跑30秒＋慢跑1分鐘，共8輪",
      "快跑45秒＋慢跑45秒，共8輪"
    ],
    "cue": "快跑約八成力，慢跑時讓呼吸恢復",
    "safety": "如有氣喘或胸悶，先告知老師"
  },
  {
    "id": "CAR-08",
    "cat": "cardio",
    "name": "原地空擊",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "30秒×4組，休30秒",
      "45秒×4組，休30秒",
      "60秒×5組，休20秒"
    ],
    "cue": "雙腳輕微彈動，雙拳交替向前快速出拳，下巴收緊",
    "safety": "出拳時手肘不要完全鎖死"
  },
  {
    "id": "STR-01",
    "cat": "strength",
    "name": "自重深蹲",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "10次×3組，休45秒",
      "15次×4組，休45秒",
      "20次×4組，休30秒"
    ],
    "cue": "雙腳與肩同寬，臀部往後坐，膝蓋與腳尖同向，背部挺直",
    "safety": "膝蓋不要內扣"
  },
  {
    "id": "STR-02",
    "cat": "strength",
    "name": "俯臥撐",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "跪姿6次×3組，休45秒",
      "標準8次×3組，休45秒",
      "標準12次×4組，休45秒"
    ],
    "cue": "身體由頭到腳成一直線，手肘約45度，胸口接近地面",
    "safety": "入門用跪姿；肩膀或手腕痛請停止"
  },
  {
    "id": "STR-03",
    "cat": "strength",
    "name": "平板支撐",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "20秒×3組，休30秒",
      "40秒×3組，休30秒",
      "60秒×3組，休30秒"
    ],
    "cue": "前臂撐地，收緊腹部與臀部，頭部與脊椎成一直線",
    "safety": "腰部下塌或疼痛請立即停止"
  },
  {
    "id": "STR-04",
    "cat": "strength",
    "name": "仰臥捲腹",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "10次×3組，休30秒",
      "15次×3組，休30秒",
      "20次×4組，休30秒"
    ],
    "cue": "屈膝仰臥，雙手放胸前，以腹部力量捲起肩膀離地",
    "safety": "不要用手拉頸部"
  },
  {
    "id": "STR-05",
    "cat": "strength",
    "name": "交替弓步",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "6次/邊×3組，休45秒",
      "10次/邊×3組，休45秒",
      "12次/邊×4組，休45秒"
    ],
    "cue": "向前跨一步，前後膝蓋約成90度，軀幹挺直",
    "safety": "平衡不穩可扶牆"
  },
  {
    "id": "STR-06",
    "cat": "strength",
    "name": "臀橋",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "10次×3組，休30秒",
      "15次×3組，休30秒",
      "單腳10次/邊×3組，休30秒"
    ],
    "cue": "仰臥屈膝，腳跟推地把臀部抬起，頂端夾緊臀部1秒",
    "safety": "腰部不要過度拱起"
  },
  {
    "id": "STR-07",
    "cat": "strength",
    "name": "超人式（背伸展）",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "10次×2組，每次停1秒",
      "12次×3組，每次停2秒",
      "15次×3組，每次停3秒"
    ],
    "cue": "俯臥、雙臂前伸，同時抬起手臂與雙腿，眼睛看地面",
    "safety": "抬到不痛的高度即可"
  },
  {
    "id": "STR-08",
    "cat": "strength",
    "name": "靠牆靜蹲",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "20秒×3組，休40秒",
      "40秒×3組，休40秒",
      "60秒×3組，休40秒"
    ],
    "cue": "背靠牆，大腿接近水平，膝蓋約90度",
    "safety": "膝蓋不適可減少下蹲深度"
  },
  {
    "id": "POW-01",
    "cat": "power",
    "name": "立定跳遠",
    "venue": "field",
    "equip": "none",
    "impact": "high",
    "levels": [
      "5次，每次間休息30秒",
      "8次，落地站穩才計算",
      "10次，嘗試超越個人最佳"
    ],
    "cue": "擺臂下蹲蓄力，向前上方蹬地跳出，落地屈膝緩衝",
    "safety": "確保地面平整防滑，落地不穩不增加距離"
  },
  {
    "id": "POW-02",
    "cat": "power",
    "name": "深蹲跳",
    "venue": "any",
    "equip": "none",
    "impact": "high",
    "levels": [
      "6次×3組，休45秒",
      "8次×3組，休45秒",
      "10次×4組，休45秒"
    ],
    "cue": "深蹲後向上爆發跳起，落地立即屈膝吸收衝力",
    "safety": "落地要輕，膝蓋不內扣"
  },
  {
    "id": "POW-03",
    "cat": "power",
    "name": "原地縱跳摸高",
    "venue": "any",
    "equip": "none",
    "impact": "high",
    "levels": [
      "6次×3組，休45秒",
      "8次×3組，休45秒",
      "10次×4組，休45秒"
    ],
    "cue": "雙臂向上擺動帶動身體，盡力向上跳，落地輕柔",
    "safety": "注意天花板高度及周圍物品"
  },
  {
    "id": "POW-04",
    "cat": "power",
    "name": "跳躍弓步",
    "venue": "any",
    "equip": "none",
    "impact": "high",
    "levels": [
      "4次/邊×2組，休45秒",
      "6次/邊×3組，休45秒",
      "8次/邊×3組，休45秒"
    ],
    "cue": "空中交換前後腳，落地時屈膝穩住",
    "safety": "平衡不穩可改為交替弓步"
  },
  {
    "id": "POW-05",
    "cat": "power",
    "name": "快速起蹲（腳不離地）",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "8次×3組，休45秒",
      "10次×3組，休45秒",
      "12次×4組，休45秒"
    ],
    "cue": "3秒慢慢蹲下，再用最快速度站起，腳掌保持貼地",
    "safety": "低衝擊的爆發力訓練"
  },
  {
    "id": "POW-06",
    "cat": "power",
    "name": "爆發牆推",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "8次×3組，休40秒",
      "10次×3組，休40秒",
      "12次×4組，休40秒"
    ],
    "cue": "面向牆壁一臂距離，屈肘靠近牆，用力把身體推離牆壁",
    "safety": "保持身體穩定，手掌不要用力拍牆"
  },
  {
    "id": "POW-07",
    "cat": "power",
    "name": "滑冰跳（左右側跳）",
    "venue": "any",
    "equip": "none",
    "impact": "high",
    "levels": [
      "8次×3組，休40秒",
      "12次×3組，休40秒",
      "16次×4組，休40秒"
    ],
    "cue": "向左右側跳，單腳落地，另一腳後擺保持平衡",
    "safety": "落地不穩時縮短跳距"
  },
  {
    "id": "POW-08",
    "cat": "power",
    "name": "青蛙跳",
    "venue": "field",
    "equip": "none",
    "impact": "high",
    "levels": [
      "5次×3組，休45秒",
      "8次×3組，休45秒",
      "10次×4組，休45秒"
    ],
    "cue": "深蹲後向前跳，雙手前擺，落地回到深蹲姿勢",
    "safety": "地面要平整，膝蓋不適不要練"
  },
  {
    "id": "SPD-01",
    "cat": "speed",
    "name": "30米衝刺",
    "venue": "field",
    "equip": "none",
    "impact": "high",
    "levels": [
      "3次，每次休息90秒",
      "5次，每次休息90秒",
      "6次，每次休息90秒"
    ],
    "cue": "身體前傾起跑，前幾步向後蹬地，擺臂與步幅逐步加大",
    "safety": "先熱身；感到肌肉拉扯請停止"
  },
  {
    "id": "SPD-02",
    "cat": "speed",
    "name": "起跑反應練習",
    "venue": "field",
    "equip": "none",
    "impact": "high",
    "levels": [
      "10米×4次，休60秒",
      "15米×5次，休60秒",
      "20米×6次，休60秒"
    ],
    "cue": "聽到信號（拍掌）立即起跑，專注前3步的爆發力",
    "safety": "需有人給信號，跑道前方保持清空"
  },
  {
    "id": "SPD-03",
    "cat": "speed",
    "name": "後踢跑",
    "venue": "any",
    "equip": "none",
    "impact": "mid",
    "levels": [
      "20秒×3組，休30秒",
      "30秒×3組，休30秒",
      "30秒×4組，休30秒"
    ],
    "cue": "腳跟快速向臀部後踢，身體保持直立，雙臂協調擺動",
    "safety": "場地不足可在原地進行"
  },
  {
    "id": "SPD-04",
    "cat": "speed",
    "name": "高抬腿小跑",
    "venue": "any",
    "equip": "none",
    "impact": "mid",
    "levels": [
      "20秒×3組，休30秒",
      "30秒×4組，休30秒",
      "30秒×5組，休30秒"
    ],
    "cue": "提膝至腰部高度，腳掌輕快落地，節奏輕盈",
    "safety": "場地不足可在原地進行"
  },
  {
    "id": "SPD-05",
    "cat": "speed",
    "name": "快速跳繩",
    "venue": "any",
    "equip": "rope",
    "impact": "high",
    "levels": [
      "20秒快＋40秒慢，共4輪",
      "30秒快＋30秒慢，共5輪",
      "30秒快＋20秒慢，共6輪"
    ],
    "cue": "手腕快速轉繩，腳步小而快",
    "safety": "確保空間足夠，穿運動鞋"
  },
  {
    "id": "SPD-06",
    "cat": "speed",
    "name": "擺臂訓練",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "20秒×3組，休30秒",
      "30秒×4組，休30秒",
      "30秒×5組，休30秒"
    ],
    "cue": "站姿或坐姿，手肘約90度前後快速擺動，肩膀放鬆",
    "safety": "低衝擊，適合身體不適時使用"
  },
  {
    "id": "SPD-07",
    "cat": "speed",
    "name": "快步走加速",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "1分鐘快步＋1分鐘慢步，共3輪",
      "1分鐘快步＋1分鐘慢步，共4輪",
      "1分鐘快步＋45秒慢步，共5輪"
    ],
    "cue": "擺臂有力、步幅加大，逐步加快步頻",
    "safety": "可原地進行；低衝擊"
  },
  {
    "id": "SPD-08",
    "cat": "speed",
    "name": "快速小碎步",
    "venue": "any",
    "equip": "none",
    "impact": "mid",
    "levels": [
      "10秒×4組，休30秒",
      "15秒×5組，休30秒",
      "20秒×5組，休30秒"
    ],
    "cue": "雙腳在原地極快速輪流點地，前腳掌著地",
    "safety": "動作小而快，不要硬碰地面"
  },
  {
    "id": "FLX-01",
    "cat": "flexibility",
    "name": "坐姿體前彎",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "20秒×3組",
      "30秒×3組",
      "30秒×4組"
    ],
    "cue": "雙腿前伸，背部伸長，雙手沿小腿向腳尖伸，呼氣時慢慢加深",
    "safety": "不要彈震，輕微拉伸感即可，不要拉到痛"
  },
  {
    "id": "FLX-02",
    "cat": "flexibility",
    "name": "跪姿弓步髖屈肌拉伸",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "20秒/邊×2組",
      "30秒/邊×3組",
      "30秒/邊×4組"
    ],
    "cue": "後膝跪地，臀部輕輕前推，軀幹挺直",
    "safety": "膝蓋下可墊毛巾"
  },
  {
    "id": "FLX-03",
    "cat": "flexibility",
    "name": "站姿股四頭肌拉伸",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "20秒/邊×2組",
      "30秒/邊×3組",
      "30秒/邊×3組"
    ],
    "cue": "單腳站立，拉起另一腳腳踝靠向臀部，膝蓋併攏",
    "safety": "平衡不穩可扶牆"
  },
  {
    "id": "FLX-04",
    "cat": "flexibility",
    "name": "蝴蝶式拉伸",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "20秒×3組",
      "30秒×3組",
      "40秒×3組"
    ],
    "cue": "坐姿腳掌相對，雙膝向兩側放鬆下沉，背部挺直",
    "safety": "不要用手大力壓膝蓋"
  },
  {
    "id": "FLX-05",
    "cat": "flexibility",
    "name": "貓牛式",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "8次×2組",
      "10次×3組",
      "12次×3組"
    ],
    "cue": "四足跪姿，吸氣下沉脊椎抬頭，呼氣拱背低頭，動作緩慢",
    "safety": "手腕不適可改用前臂支撐"
  },
  {
    "id": "FLX-06",
    "cat": "flexibility",
    "name": "牆壁胸肩拉伸",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "20秒/邊×2組",
      "30秒/邊×3組",
      "30秒/邊×3組"
    ],
    "cue": "單手扶牆，手臂約與肩同高，身體慢慢向反方向轉開",
    "safety": "肩膀不要聳起"
  },
  {
    "id": "FLX-07",
    "cat": "flexibility",
    "name": "牆壁小腿拉伸",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "20秒/邊×2組",
      "30秒/邊×3組",
      "40秒/邊×3組"
    ],
    "cue": "雙手扶牆，一腳在後蹬直、腳跟貼地，身體前傾",
    "safety": "後腳腳尖朝前"
  },
  {
    "id": "FLX-08",
    "cat": "flexibility",
    "name": "坐姿脊柱扭轉",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "20秒/邊×2組",
      "30秒/邊×3組",
      "30秒/邊×4組"
    ],
    "cue": "坐姿一腿跨過另一腿，向後轉身，保持背部挺直",
    "safety": "轉到舒適範圍即可，不要強扭"
  },
  {
    "id": "AGI-01",
    "cat": "agility",
    "name": "T字折返跑",
    "venue": "field",
    "equip": "none",
    "impact": "high",
    "levels": [
      "3次，休60秒",
      "4次，休60秒",
      "6次，休45秒"
    ],
    "cue": "四個標記點（可用水樽、書包）擺成T字：前跑、左右側滑步、後退，每個點用手觸摸",
    "safety": "標記物不要用硬物；地面要防滑"
  },
  {
    "id": "AGI-02",
    "cat": "agility",
    "name": "側向滑步",
    "venue": "any",
    "equip": "none",
    "impact": "mid",
    "levels": [
      "5米×6趟",
      "5米×8趟",
      "5米×10趟"
    ],
    "cue": "降低重心，雙腳不交叉，背部挺直",
    "safety": "空間不足可改為原地側向小步"
  },
  {
    "id": "AGI-03",
    "cat": "agility",
    "name": "5米折返跑",
    "venue": "field",
    "equip": "none",
    "impact": "high",
    "levels": [
      "4趟，休45秒",
      "6趟，休45秒",
      "8趟，休45秒"
    ],
    "cue": "衝到線上觸地，快速轉身折返，轉身時降低重心",
    "safety": "轉身時注意地面是否濕滑"
  },
  {
    "id": "AGI-04",
    "cat": "agility",
    "name": "方格步法",
    "venue": "any",
    "equip": "none",
    "impact": "mid",
    "levels": [
      "20秒×3組，休30秒",
      "30秒×4組，休30秒",
      "30秒×5組，休30秒"
    ],
    "cue": "用膠帶或粉筆畫約50厘米方格，雙腳依前、後、左、右順序快速點地",
    "safety": "地面要防滑，穿運動鞋"
  },
  {
    "id": "AGI-05",
    "cat": "agility",
    "name": "交叉步（Carioca）",
    "venue": "field",
    "equip": "none",
    "impact": "mid",
    "levels": [
      "10米×4趟",
      "10米×6趟",
      "15米×6趟"
    ],
    "cue": "側身移動，後腳交替從前或從後交叉，髖部扭轉，雙臂保持平衡",
    "safety": "先慢後快，動作正確才加速"
  },
  {
    "id": "AGI-06",
    "cat": "agility",
    "name": "單腳平衡",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "20秒/邊×3組",
      "30秒/邊×3組",
      "30秒/邊，閉眼×3組"
    ],
    "cue": "單腳站立、另一腳離地，雙手放腰，眼睛看前方一點",
    "safety": "閉眼時須站在牆邊或有人在旁"
  },
  {
    "id": "AGI-07",
    "cat": "agility",
    "name": "慢速方格點地",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "20秒×3組，休30秒",
      "30秒×3組，休30秒",
      "40秒×4組，休30秒"
    ],
    "cue": "與方格步法相同路線，但腳掌輕輕點地不跳起，節奏穩定",
    "safety": "低衝擊版本"
  },
  {
    "id": "AGI-08",
    "cat": "agility",
    "name": "跳繩步法（交替腳、前後跳）",
    "venue": "any",
    "equip": "rope",
    "impact": "mid",
    "levels": [
      "1分鐘×3組，交替腳",
      "1分鐘×4組，加入前後跳",
      "1分鐘×4組，加入交叉步"
    ],
    "cue": "按節奏切換腳步，眼睛看前方不看腳",
    "safety": "確保空間足夠"
  },
  {
    "id": "WRM-01",
    "cat": "warmup",
    "name": "原地踏步擺臂",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "1分鐘",
      "1.5分鐘",
      "2分鐘"
    ],
    "cue": "步伐逐漸加快，手臂自然擺動",
    "safety": "每次訓練必做"
  },
  {
    "id": "WRM-02",
    "cat": "warmup",
    "name": "全身關節環繞（頸、肩、腰、膝、踝）",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "每個關節8圈",
      "每個關節10圈",
      "每個關節12圈"
    ],
    "cue": "動作慢而大，由上到下依次活動",
    "safety": "頸部不要大力向後仰"
  },
  {
    "id": "WRM-03",
    "cat": "warmup",
    "name": "手臂繞圈",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "前後各10圈",
      "前後各15圈",
      "前後各20圈"
    ],
    "cue": "站穩，雙臂伸直畫大圈，肩膀放鬆",
    "safety": "肩膀不適請縮小幅度"
  },
  {
    "id": "WRM-04",
    "cat": "warmup",
    "name": "動態弓步走",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "6步",
      "10步",
      "12步，加上身體扭轉"
    ],
    "cue": "向前跨步下蹲再站起，換邊前進",
    "safety": "平衡不穩可扶牆或縮小步幅"
  },
  {
    "id": "WRM-05",
    "cat": "warmup",
    "name": "原地輕跑",
    "venue": "any",
    "equip": "none",
    "impact": "mid",
    "levels": [
      "1分鐘",
      "1.5分鐘",
      "2分鐘"
    ],
    "cue": "腳步輕、雙臂放鬆擺動，逐漸提高心率",
    "safety": "感到不適立即改為踏步"
  },
  {
    "id": "WRM-06",
    "cat": "warmup",
    "name": "輕度開合跳",
    "venue": "any",
    "equip": "none",
    "impact": "mid",
    "levels": [
      "20秒×2組",
      "30秒×2組",
      "40秒×2組"
    ],
    "cue": "動作幅度不用大，保持輕快節奏",
    "safety": "落地輕柔"
  },
  {
    "id": "WRM-07",
    "cat": "warmup",
    "name": "站姿俯身手走",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "4次",
      "6次",
      "8次"
    ],
    "cue": "由站姿彎腰，雙手向前爬到俯撐位，再爬回站起",
    "safety": "膝蓋可微屈"
  },
  {
    "id": "WRM-08",
    "cat": "warmup",
    "name": "深蹲配手臂上舉",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "8次",
      "10次",
      "12次"
    ],
    "cue": "蹲下時雙手前伸，站起時雙手上舉過頭",
    "safety": "膝蓋與腳尖同向"
  },
  {
    "id": "CLD-01",
    "cat": "cooldown",
    "name": "慢走與深呼吸",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "1分鐘",
      "2分鐘",
      "3分鐘"
    ],
    "cue": "慢慢走動讓心率下降，用鼻吸氣、口呼氣",
    "safety": "運動後不要馬上坐下或躺下"
  },
  {
    "id": "CLD-02",
    "cat": "cooldown",
    "name": "大腿後側拉伸",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "20秒/邊",
      "30秒/邊",
      "30秒/邊×2組"
    ],
    "cue": "一腳前伸腳跟著地，身體向前傾，背部保持平直",
    "safety": "不要彈震"
  },
  {
    "id": "CLD-03",
    "cat": "cooldown",
    "name": "大腿前側拉伸",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "20秒/邊",
      "30秒/邊",
      "30秒/邊×2組"
    ],
    "cue": "單腳站立，拉起另一腳腳踝靠向臀部",
    "safety": "平衡不穩可扶牆"
  },
  {
    "id": "CLD-04",
    "cat": "cooldown",
    "name": "小腿拉伸",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "20秒/邊",
      "30秒/邊",
      "30秒/邊×2組"
    ],
    "cue": "雙手扶牆，一腳在後蹬直、腳跟貼地",
    "safety": "後腳腳尖朝前"
  },
  {
    "id": "CLD-05",
    "cat": "cooldown",
    "name": "胸肩拉伸",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "20秒/邊",
      "30秒/邊",
      "30秒/邊×2組"
    ],
    "cue": "手臂橫過胸前，用另一手輕輕拉向身體",
    "safety": "肩膀不要聳起"
  },
  {
    "id": "CLD-06",
    "cat": "cooldown",
    "name": "嬰兒式放鬆",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "30秒",
      "45秒",
      "60秒"
    ],
    "cue": "跪坐，身體前傾趴下，雙臂前伸，慢慢呼吸",
    "safety": "膝蓋不適可在臀部下墊枕頭"
  },
  {
    "id": "CLD-07",
    "cat": "cooldown",
    "name": "仰臥臀部拉伸（4字式）",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "20秒/邊",
      "30秒/邊",
      "30秒/邊×2組"
    ],
    "cue": "仰臥屈膝，一腳踝放在另一膝上，拉向胸口",
    "safety": "保持背部貼地"
  },
  {
    "id": "CLD-08",
    "cat": "cooldown",
    "name": "仰臥腹式呼吸",
    "venue": "any",
    "equip": "none",
    "impact": "low",
    "levels": [
      "1分鐘",
      "2分鐘",
      "3分鐘"
    ],
    "cue": "仰臥，手放腹部，吸氣時腹部鼓起，呼氣時慢慢放鬆",
    "safety": "讓全身放鬆"
  }
];
