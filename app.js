// 車輛改裝 SVD 槓桿分析器
// 核心想法：
// 1. 畫面輸入真實單位，例如 hp、Nm、mm、kg、bar。
// 2. 每個參數都有自己的合理範圍，程式會轉成 0~10 的能力/強度分數。
// 3. SVD 用標準化分數分析整車系統的主要槓桿。
// 4. 崩潰點不只看最低分，而是看「分數低 + 被其他改裝推高需求」。

const parameters = [
  { category: "動力", key: "EnginePower", zh: "引擎輸出", unit: "hp", min: 80, max: 800, step: 5, base: 220, sample: 520, hint: "馬力越高，越推高輪胎、煞車、傳動、冷卻需求。" },
  { category: "動力", key: "EngineTorque", zh: "峰值扭力", unit: "Nm", min: 120, max: 900, step: 5, base: 300, sample: 680, hint: "扭力會直接壓離合器、變速箱、輪胎與差速器。" },
  { category: "動力", key: "BoostPressure", zh: "增壓值", unit: "bar", min: 0, max: 2.5, step: 0.05, base: 0.5, sample: 1.55, hint: "增壓越高，越需要供油、中冷、引擎耐用度與 ECU 保護。" },
  { category: "動力", key: "FuelSystem", zh: "供油能力", unit: "hp支援", min: 100, max: 900, step: 10, base: 280, sample: 520, hint: "供油不足會讓高增壓高馬力變成爆震或稀薄燃燒風險。" },
  { category: "動力", key: "ECUSafety", zh: "ECU 保護完整度", unit: "%", min: 0, max: 100, step: 1, base: 65, sample: 72, hint: "含點火、空燃比、限壓、降載與保護策略。" },

  { category: "輪胎/抓地", key: "TireGrip", zh: "輪胎抓地力係數", unit: "μ", min: 0.65, max: 1.75, step: 0.01, base: 0.95, sample: 1.02, hint: "抓地是加速、煞車、過彎的底層上限。" },
  { category: "輪胎/抓地", key: "TireWidth", zh: "胎寬", unit: "mm", min: 165, max: 335, step: 5, base: 225, sample: 245, hint: "胎寬提高接地潛力，但會牽動定位、重量與溫度。" },
  { category: "輪胎/抓地", key: "TireTempWindow", zh: "胎溫工作窗", unit: "°C", min: 45, max: 115, step: 1, base: 75, sample: 68, hint: "胎溫太低或太高都會讓抓地失真。" },
  { category: "輪胎/抓地", key: "ContactPatch", zh: "接地面穩定度", unit: "%", min: 0, max: 100, step: 1, base: 65, sample: 58, hint: "由胎壓、定位、懸吊行程與路面貼地性決定。" },

  { category: "懸吊/定位", key: "SpringRate", zh: "彈簧硬度", unit: "kg/mm", min: 2, max: 18, step: 0.5, base: 6, sample: 8, hint: "支撐車重、下壓力與煞車點頭。" },
  { category: "懸吊/定位", key: "DamperCapacity", zh: "避震承受度", unit: "%", min: 0, max: 100, step: 1, base: 62, sample: 55, hint: "避震跟不上時，輪胎會跳、推頭或突然失去貼地。" },
  { category: "懸吊/定位", key: "CamberSetup", zh: "外傾設定", unit: "deg", min: 0, max: 5, step: 0.1, base: 1.5, sample: 2.0, hint: "彎中接地面角度，對胎肩溫度與抓地很敏感。" },
  { category: "懸吊/定位", key: "AlignmentStability", zh: "定位保持能力", unit: "%", min: 0, max: 100, step: 1, base: 60, sample: 52, hint: "襯套、魚眼、拉桿、車體剛性會影響定位是否跑掉。" },

  { category: "煞車", key: "BrakeTorque", zh: "煞車力矩", unit: "kNm", min: 1, max: 12, step: 0.1, base: 4.2, sample: 6.0, hint: "煞車力要和輪胎抓地與車重匹配。" },
  { category: "煞車", key: "BrakeCooling", zh: "煞車散熱能力", unit: "kW", min: 5, max: 80, step: 1, base: 25, sample: 22, hint: "連續重煞時，散熱不足比單次制動力更容易崩潰。" },
  { category: "煞車", key: "BrakeFluidTemp", zh: "煞車油沸點", unit: "°C", min: 180, max: 340, step: 5, base: 240, sample: 250, hint: "沸點不足會造成踏板變長或氣阻。" },
  { category: "煞車", key: "BrakeBiasControl", zh: "煞車比例控制", unit: "%", min: 0, max: 100, step: 1, base: 62, sample: 58, hint: "前後比例錯會鎖前輪、甩尾或 ABS 過早介入。" },

  { category: "傳動", key: "ClutchCapacity", zh: "離合器承受度", unit: "Nm", min: 150, max: 1000, step: 10, base: 380, sample: 480, hint: "承受度低於扭力需求時，會轉速上升但車速不上升。" },
  { category: "傳動", key: "GearboxCapacity", zh: "變速箱承受度", unit: "Nm", min: 150, max: 1100, step: 10, base: 420, sample: 520, hint: "扭力與輪胎抓地提高後，齒輪與同步機構負荷會變大。" },
  { category: "傳動", key: "LSDLock", zh: "LSD 鎖定率", unit: "%", min: 0, max: 100, step: 1, base: 35, sample: 45, hint: "鎖定率影響出彎牽引，也可能增加推頭或內輪拖曳。" },
  { category: "傳動", key: "TractionControl", zh: "循跡控制成熟度", unit: "%", min: 0, max: 100, step: 1, base: 55, sample: 42, hint: "動力大但抓地不足時，循跡控制會變成安全網。" },

  { category: "冷卻/耐久", key: "RadiatorCapacity", zh: "水箱散熱能力", unit: "kW", min: 20, max: 180, step: 5, base: 70, sample: 75, hint: "水溫壓不住時，引擎會降載或損壞。" },
  { category: "冷卻/耐久", key: "OilCooling", zh: "機油冷卻能力", unit: "kW", min: 5, max: 80, step: 1, base: 22, sample: 24, hint: "油溫高會造成油壓下降與潤滑保護不足。" },
  { category: "冷卻/耐久", key: "IntercoolerEfficiency", zh: "中冷效率", unit: "%", min: 20, max: 95, step: 1, base: 55, sample: 52, hint: "中冷不足會讓進氣溫升高，馬力衰退與爆震風險增加。" },
  { category: "冷卻/耐久", key: "EngineReliability", zh: "引擎耐用度", unit: "%", min: 0, max: 100, step: 1, base: 65, sample: 48, hint: "內部強度、油水溫、爆震餘裕與保養狀態的綜合分數。" },

  { category: "車體/空力", key: "VehicleMass", zh: "車重", unit: "kg", min: 800, max: 1900, step: 10, base: 1350, sample: 1280, invert: true, hint: "車重越低越好；會影響煞車、輪胎、懸吊與加速。" },
  { category: "車體/空力", key: "ChassisRigidity", zh: "車體剛性", unit: "%", min: 0, max: 100, step: 1, base: 58, sample: 62, hint: "剛性不足會讓懸吊設定和定位變得不穩定。" },
  { category: "車體/空力", key: "AeroDownforce", zh: "下壓力", unit: "kg@160", min: 0, max: 450, step: 5, base: 40, sample: 120, hint: "下壓力提高高速抓地，但會增加彈簧、避震與輪胎負荷。" },
  { category: "車體/空力", key: "AeroBalance", zh: "空力平衡", unit: "%", min: 0, max: 100, step: 1, base: 55, sample: 50, hint: "前後下壓比例錯會造成高速推頭或甩尾。" },

  { category: "電子/駕駛", key: "SteeringFeedback", zh: "轉向回饋", unit: "%", min: 0, max: 100, step: 1, base: 62, sample: 55, hint: "回饋不足時，駕駛很難感知抓地邊界。" },
  { category: "電子/駕駛", key: "DriverSkillFit", zh: "駕駛適配度", unit: "%", min: 0, max: 100, step: 1, base: 62, sample: 50, hint: "車輛反應如果超過駕駛能處理的速度，也是一種崩潰點。" },
  { category: "電子/駕駛", key: "DataLogging", zh: "資料記錄能力", unit: "%", min: 0, max: 100, step: 1, base: 40, sample: 35, hint: "沒有胎溫、油溫、煞車溫、圈速資料，很難知道問題源頭。" },
  { category: "電子/駕駛", key: "FailSafe", zh: "保護模式完整度", unit: "%", min: 0, max: 100, step: 1, base: 55, sample: 45, hint: "異常時限壓、降載、警示，能避免小問題變大損壞。" }
];

const n = parameters.length;
const names = parameters.map((p) => `${p.key}（${p.zh}）`);
const categories = [...new Set(parameters.map((p) => p.category))];
const indexByKey = new Map(parameters.map((p, i) => [p.key, i]));
const W = Array.from({ length: n }, () => Array(n).fill(0));

function link(fromKey, toKey, weight) {
  W[indexByKey.get(fromKey)][indexByKey.get(toKey)] = weight;
}

function linkMany(fromKey, pairs) {
  pairs.forEach(([toKey, weight]) => link(fromKey, toKey, weight));
}

// 同類別給一點弱關聯，跨類別再用下面的真實車輛邏輯加強。
for (const category of categories) {
  const idxs = parameters.map((p, i) => (p.category === category ? i : -1)).filter((i) => i >= 0);
  for (const from of idxs) {
    for (const to of idxs) {
      if (from !== to) W[from][to] = Math.max(W[from][to], 0.025);
    }
  }
}

// 影響矩陣：from 變強/變重/變激烈後，to 需要跟上的程度。
linkMany("EnginePower", [["TireGrip", 0.78], ["BrakeTorque", 0.58], ["BrakeCooling", 0.46], ["ClutchCapacity", 0.64], ["GearboxCapacity", 0.56], ["RadiatorCapacity", 0.46], ["OilCooling", 0.40], ["EngineReliability", 0.50], ["DriverSkillFit", 0.38]]);
linkMany("EngineTorque", [["TireGrip", 0.70], ["ClutchCapacity", 0.82], ["GearboxCapacity", 0.74], ["LSDLock", 0.42], ["TractionControl", 0.44], ["EngineReliability", 0.44]]);
linkMany("BoostPressure", [["FuelSystem", 0.76], ["IntercoolerEfficiency", 0.82], ["ECUSafety", 0.66], ["EngineReliability", 0.70], ["OilCooling", 0.35]]);
linkMany("FuelSystem", [["ECUSafety", 0.34], ["EngineReliability", 0.28]]);
linkMany("ECUSafety", [["FailSafe", 0.42], ["DataLogging", 0.24]]);

linkMany("TireGrip", [["BrakeTorque", 0.62], ["BrakeBiasControl", 0.38], ["SpringRate", 0.28], ["DamperCapacity", 0.40], ["ChassisRigidity", 0.32], ["DriverSkillFit", 0.32]]);
linkMany("TireWidth", [["ContactPatch", 0.42], ["TireTempWindow", 0.34], ["SteeringFeedback", 0.24], ["VehicleMass", 0.18]]);
linkMany("TireTempWindow", [["TireGrip", 0.42], ["DataLogging", 0.25]]);
linkMany("ContactPatch", [["CamberSetup", 0.52], ["AlignmentStability", 0.44], ["DamperCapacity", 0.42], ["TireGrip", 0.30]]);

linkMany("SpringRate", [["DamperCapacity", 0.66], ["ContactPatch", 0.30], ["ChassisRigidity", 0.24]]);
linkMany("DamperCapacity", [["ContactPatch", 0.46], ["SteeringFeedback", 0.28], ["DriverSkillFit", 0.20]]);
linkMany("CamberSetup", [["TireTempWindow", 0.30], ["ContactPatch", 0.42]]);
linkMany("AlignmentStability", [["ContactPatch", 0.36], ["SteeringFeedback", 0.32]]);

linkMany("BrakeTorque", [["TireGrip", 0.70], ["BrakeCooling", 0.62], ["BrakeFluidTemp", 0.48], ["BrakeBiasControl", 0.44], ["DriverSkillFit", 0.22]]);
linkMany("BrakeCooling", [["BrakeFluidTemp", 0.28], ["DataLogging", 0.22]]);
linkMany("BrakeBiasControl", [["TireGrip", 0.24], ["DriverSkillFit", 0.20]]);

linkMany("ClutchCapacity", [["GearboxCapacity", 0.20]]);
linkMany("GearboxCapacity", [["LSDLock", 0.22]]);
linkMany("LSDLock", [["TireGrip", 0.52], ["TractionControl", 0.32], ["DriverSkillFit", 0.30]]);
linkMany("TractionControl", [["ECUSafety", 0.28], ["FailSafe", 0.30]]);

linkMany("RadiatorCapacity", [["EngineReliability", 0.40], ["DataLogging", 0.18]]);
linkMany("OilCooling", [["EngineReliability", 0.48], ["FailSafe", 0.18]]);
linkMany("IntercoolerEfficiency", [["EnginePower", 0.28], ["EngineReliability", 0.34], ["ECUSafety", 0.22]]);
linkMany("EngineReliability", [["FailSafe", 0.22], ["DataLogging", 0.18]]);

linkMany("VehicleMass", [["TireGrip", 0.54], ["BrakeTorque", 0.58], ["BrakeCooling", 0.48], ["SpringRate", 0.42], ["DamperCapacity", 0.38]]);
linkMany("ChassisRigidity", [["AlignmentStability", 0.34], ["SteeringFeedback", 0.26], ["DamperCapacity", 0.20]]);
linkMany("AeroDownforce", [["TireGrip", 0.46], ["SpringRate", 0.48], ["DamperCapacity", 0.44], ["AeroBalance", 0.56], ["EnginePower", 0.18]]);
linkMany("AeroBalance", [["SteeringFeedback", 0.24], ["DriverSkillFit", 0.26], ["FailSafe", 0.18]]);

linkMany("SteeringFeedback", [["DriverSkillFit", 0.24]]);
linkMany("DriverSkillFit", [["FailSafe", 0.28], ["TractionControl", 0.24]]);
linkMany("DataLogging", [["ECUSafety", 0.22], ["FailSafe", 0.18]]);
linkMany("FailSafe", [["EngineReliability", 0.24], ["ECUSafety", 0.22]]);

const inputRoot = document.getElementById("inputs");
const categoryFilter = document.getElementById("categoryFilter");
const searchInput = document.getElementById("searchInput");
const resultText = document.getElementById("resultText");
const computeBtn = document.getElementById("computeBtn");
const resetBtn = document.getElementById("resetBtn");
const sampleBtn = document.getElementById("sampleBtn");
const topNode = document.getElementById("topNode");
const collapseNode = document.getElementById("collapseNode");
const lowestNode = document.getElementById("lowestNode");
const topShare = document.getElementById("topShare");

let rawValues = parameters.map((p) => p.base);

function normalizeParam(p, value) {
  const t = clamp((value - p.min) / (p.max - p.min), 0, 1);
  return (p.invert ? 1 - t : t) * 10;
}

function scoreToRaw(p, score) {
  const t = p.invert ? 1 - score / 10 : score / 10;
  return p.min + t * (p.max - p.min);
}

function buildFilters() {
  categoryFilter.innerHTML = `<option value="全部">全部</option>` + categories.map((c) => `<option value="${c}">${c}</option>`).join("");
  categoryFilter.addEventListener("change", renderInputs);
  searchInput.addEventListener("input", renderInputs);
}

function renderInputs() {
  const selectedCategory = categoryFilter.value || "全部";
  const keyword = searchInput.value.trim().toLowerCase();
  inputRoot.innerHTML = "";

  for (const category of categories) {
    if (selectedCategory !== "全部" && selectedCategory !== category) continue;
    const items = parameters
      .map((p, i) => ({ ...p, i }))
      .filter((p) => p.category === category)
      .filter((p) => !keyword || `${p.key} ${p.zh} ${p.hint} ${p.unit}`.toLowerCase().includes(keyword));

    if (!items.length) continue;

    const title = document.createElement("div");
    title.className = "category-title";
    title.textContent = category;
    inputRoot.appendChild(title);

    for (const item of items) {
      const score = normalizeParam(item, rawValues[item.i]);
      const row = document.createElement("label");
      row.className = "metric-row";
      row.innerHTML = `
        <span class="metric-label">
          <strong>${item.key}（${item.zh}）<span class="score-pill">${score.toFixed(1)} / 10</span></strong>
          <span>${item.hint}</span>
        </span>
        <input id="value-${item.i}" type="number" min="${item.min}" max="${item.max}" step="${item.step}" value="${formatRaw(item, rawValues[item.i])}">
        <span class="unit">${item.unit}</span>
        <input id="slider-${item.i}" class="slider" type="range" min="0" max="10" step="0.1" value="${score.toFixed(1)}" aria-label="${item.key}">
        <span class="range-note">範圍 ${item.min} - ${item.max} ${item.unit}；滑桿調的是內部能力分數</span>
      `;
      inputRoot.appendChild(row);

      const number = row.querySelector(`#value-${item.i}`);
      const slider = row.querySelector(`#slider-${item.i}`);
      number.addEventListener("input", () => {
        rawValues[item.i] = clamp(parseFloat(number.value) || item.min, item.min, item.max);
        renderInputs();
        computeAndShow();
      });
      slider.addEventListener("input", () => {
        rawValues[item.i] = scoreToRaw(item, parseFloat(slider.value) || 0);
        renderInputs();
        computeAndShow();
      });
    }
  }
}

function formatRaw(p, value) {
  return Number(value).toFixed(p.step < 1 ? 2 : 0).replace(/\.00$/, "");
}

function setValues(values) {
  rawValues = values.map((v, i) => clamp(v, parameters[i].min, parameters[i].max));
  renderInputs();
  computeAndShow();
}

function computeAndShow() {
  const scores = parameters.map((p, i) => normalizeParam(p, rawValues[i]));
  const influenceMatrix = W.map((row, r) => row.map((weight, c) => scores[r] * weight * scores[c]));
  const svd = powerSvdTopK(influenceMatrix, 8);
  const leverage = calcLeverageScores(svd);
  const pressure = calcIncomingPressure(scores);

  const collapse = parameters.map((p, i) => {
    const demand = pressure[i];
    const capacity = scores[i] + 0.5;
    const gap = demand - capacity;
    const lowPenalty = Math.max(0, 6 - scores[i]) * 0.75;
    const collapseScore = gap + lowPenalty;
    return { i, demand, capacity, gap, collapseScore, risk: demand > 0 ? demand / capacity : 0 };
  }).sort((a, b) => b.collapseScore - a.collapseScore);

  const rankedLeverage = Array.from({ length: n }, (_, i) => i).sort((a, b) => leverage[b] - leverage[a]);
  const rankedLow = Array.from({ length: n }, (_, i) => i).sort((a, b) => scores[a] - scores[b]);
  const topIndex = rankedLeverage[0];
  const collapseIndex = collapse[0].i;
  const lowIndex = rankedLow[0];

  const sSum = svd.S.reduce((sum, s) => sum + s, 0);
  const topSProportion = sSum > 0 ? svd.S[0] / sSum : 0;

  topNode.textContent = `${parameters[topIndex].zh} ${leverage[topIndex].toFixed(2)}`;
  collapseNode.textContent = `${parameters[collapseIndex].zh} ${collapse[0].collapseScore.toFixed(2)}`;
  lowestNode.textContent = `${parameters[lowIndex].zh} ${scores[lowIndex].toFixed(1)}/10`;
  topShare.textContent = percent(topSProportion, 2);

  const lines = [];
  lines.push("=== 車輛改裝 SVD 槓桿分析 ===");
  lines.push(`核心項目數: ${n}`);
  lines.push(`主模態集中度: ${percent(topSProportion, 2)}`);
  lines.push("說明: 真實輸入會先依照各自單位範圍轉成 0~10 分數，再進入矩陣與 SVD。");
  lines.push("");

  lines.push("Top 12 最適合強化的槓桿");
  rankedLeverage.slice(0, 12).forEach((i, rank) => {
    lines.push(`${rank + 1}. ${padName(names[i])} Raw=${formatRaw(parameters[i], rawValues[i])}${parameters[i].unit}  Score=${scores[i].toFixed(1)}  Leverage=${leverage[i].toFixed(4)}  Demand=${pressure[i].toFixed(2)}`);
  });
  lines.push("");

  lines.push("Top 12 可能崩潰點：低分 + 系統需求高");
  collapse.slice(0, 12).forEach((item, rank) => {
    const status = item.collapseScore > 4 ? "高風險" : item.collapseScore > 1.5 ? "注意" : "觀察";
    lines.push(`${rank + 1}. ${padName(names[item.i])} ${status}  Score=${scores[item.i].toFixed(1)}  Demand=${item.demand.toFixed(2)}  Gap=${item.gap.toFixed(2)}  Risk=${item.risk.toFixed(2)}x`);
    lines.push(`   可能現象: ${failureHint(parameters[item.i].key)}`);
  });
  lines.push("");

  lines.push("倒數 12 能力分數：這些不是一定先壞，但要和崩潰榜交叉看");
  rankedLow.slice(0, 12).forEach((i, rank) => {
    const alsoRisk = collapse.slice(0, 12).some((item) => item.i === i) ? "  *也在崩潰榜*" : "";
    lines.push(`${rank + 1}. ${padName(names[i])} Raw=${formatRaw(parameters[i], rawValues[i])}${parameters[i].unit}  Score=${scores[i].toFixed(1)}  Demand=${pressure[i].toFixed(2)}${alsoRisk}`);
  });
  lines.push("");

  lines.push("Singular values");
  svd.S.forEach((s, i) => lines.push(`  S[${i}] = ${s.toFixed(6)}`));
  lines.push("");

  lines.push("判讀建議");
  lines.push("  - 最值得優先處理的是：同時出現在「崩潰榜」和「倒數能力分數」的項目。");
  lines.push("  - 只有分數低但 Demand 也低，代表它弱，但目前不一定最快崩潰。");
  lines.push("  - 只有 Leverage 高但分數不低，代表它是升級槓桿，不一定是危險點。");
  lines.push("  - 動力升級後，請優先交叉檢查輪胎抓地、煞車散熱、離合器/變速箱承受度、水油溫與 ECU 保護。");

  resultText.textContent = lines.join("\n");
  drawHeatmap(influenceMatrix);
  drawBarChart("leverageChart", rankedLeverage.slice(0, 20), leverage, scores, pressure, "leverage");
  drawBarChart("weaknessChart", rankedLow.slice(0, 20), scores.map((s) => 10 - s), scores, pressure, "weakness");
}

function calcIncomingPressure(scores) {
  return W[0].map((_, c) => {
    let sum = 0;
    for (let r = 0; r < n; r += 1) sum += scores[r] * W[r][c];
    return sum;
  });
}

function calcLeverageScores(svd) {
  const scores = Array(n).fill(0);
  for (let k = 0; k < svd.S.length; k += 1) {
    const col = svd.U.map((row) => Math.abs(row[k] || 0));
    const sum = col.reduce((acc, v) => acc + v, 0) || 1;
    for (let i = 0; i < n; i += 1) scores[i] += svd.S[k] * (col[i] / sum);
  }
  return scores;
}

function powerSvdTopK(A, topK) {
  const At = transpose(A);
  let B = multiply(At, A);
  const S = [];
  const U = Array.from({ length: A.length }, () => []);

  for (let k = 0; k < topK; k += 1) {
    let v = Array.from({ length: n }, (_, i) => ((i + k * 13) % 17) + 1);
    v = normalizeVector(v);
    for (let iter = 0; iter < 90; iter += 1) v = normalizeVector(multiplyMatrixVector(B, v));

    const Bv = multiplyMatrixVector(B, v);
    const eigenValue = Math.max(0, dot(v, Bv));
    const s = Math.sqrt(eigenValue);
    if (s < 1e-8) break;

    const Av = multiplyMatrixVector(A, v);
    const u = Av.map((x) => x / s);
    S.push(s);
    for (let r = 0; r < A.length; r += 1) U[r][k] = u[r];

    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) B[r][c] -= eigenValue * v[r] * v[c];
    }
  }
  return { S, U };
}

function transpose(matrix) {
  return matrix[0].map((_, c) => matrix.map((row) => row[c]));
}

function multiply(A, B) {
  const out = Array.from({ length: A.length }, () => Array(B[0].length).fill(0));
  for (let r = 0; r < A.length; r += 1) {
    for (let c = 0; c < B[0].length; c += 1) {
      for (let k = 0; k < B.length; k += 1) out[r][c] += A[r][k] * B[k][c];
    }
  }
  return out;
}

function multiplyMatrixVector(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, i) => sum + value * vector[i], 0));
}

function normalizeVector(vector) {
  const len = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / len);
}

function dot(a, b) {
  return a.reduce((sum, value, i) => sum + value * b[i], 0);
}

function failureHint(key) {
  const hints = {
    TireGrip: "出彎打滑、煞車距離變長、彎中推頭或甩尾",
    BrakeCooling: "連續重煞後熱衰退，踏板變長或煞不住",
    BrakeFluidTemp: "高溫後踏板海綿感、氣阻、制動不穩",
    ClutchCapacity: "大扭力時離合器打滑，轉速上升但車速不上升",
    GearboxCapacity: "齒輪、同步機構、傳動衝擊負荷過大",
    IntercoolerEfficiency: "進氣溫過高，馬力衰退或爆震風險上升",
    RadiatorCapacity: "水溫上升，長時間高負載無法降溫",
    OilCooling: "油溫過高，油壓下降，潤滑保護不足",
    EngineReliability: "爆震、過熱、縮缸或保護模式頻繁介入",
    ContactPatch: "輪胎不能穩定貼地，坑洞或重煞時突然失去抓地",
    DamperCapacity: "輪胎跳動、車身浮動，彎中突然失去貼地",
    DriverSkillFit: "車比人快，修正不及導致失控風險增加",
    FailSafe: "小異常無法及時降載，容易擴大成零件損壞"
  };
  return hints[key] || "該項目目前能力偏低或承受需求偏高，可能成為可靠度或操控瓶頸";
}

function drawHeatmap(M) {
  const canvas = document.getElementById("heatmap");
  const ctx = setupCanvas(canvas);
  const w = canvas.clientWidth || 900;
  const h = Math.max(360, w * 0.5);
  const max = Math.max(1, ...M.flat().map((v) => Math.abs(v)));
  const cell = Math.min((w - 24) / n, (h - 36) / n);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      ctx.fillStyle = colorRamp(Math.abs(M[r][c]) / max);
      ctx.fillRect(12 + c * cell, 12 + r * cell, Math.max(1, cell), Math.max(1, cell));
    }
  }
  ctx.fillStyle = "#667076";
  ctx.font = "12px Segoe UI, Arial";
  ctx.fillText("顏色越深代表標準化後的系統連動越強", 12, h - 10);
}

function drawBarChart(canvasId, items, values, scores, pressure, mode) {
  const canvas = document.getElementById(canvasId);
  const ctx = setupCanvas(canvas);
  const w = canvas.clientWidth || 900;
  const h = Math.max(360, w * 0.5);
  const maxValue = Math.max(1, ...items.map((i) => values[i]));
  const marginL = Math.max(205, w * 0.28);
  const rowH = Math.max(18, (h - 24) / items.length);
  const graphW = w - marginL - 80;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.font = "12px Segoe UI, Arial";
  ctx.textBaseline = "middle";

  items.forEach((idx, row) => {
    const y = 12 + row * rowH;
    const barW = graphW * (values[idx] / maxValue);
    const risky = pressure[idx] > scores[idx] + 0.5;
    ctx.fillStyle = risky ? "rgba(180, 35, 24, 0.12)" : "rgba(36, 92, 115, 0.08)";
    ctx.fillRect(0, y - 1, w, rowH);
    ctx.fillStyle = "#161a1d";
    ctx.fillText(`${row + 1}. ${parameters[idx].zh}`, 8, y + rowH / 2);
    ctx.fillStyle = mode === "weakness" ? "#b42318" : risky ? "#b42318" : "#245c73";
    ctx.fillRect(marginL, y + 4, Math.max(1, barW), rowH - 8);
    ctx.fillStyle = "#667076";
    const label = mode === "weakness" ? `Score ${scores[idx].toFixed(1)}` : values[idx].toFixed(2);
    ctx.fillText(label, marginL + graphW + 8, y + rowH / 2);
  });
}

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 900;
  const h = Math.max(360, w * 0.5);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  return ctx;
}

function colorRamp(t) {
  const clamped = clamp(t, 0, 1);
  const stops = [[255, 255, 255], [235, 244, 246], [36, 92, 115], [180, 35, 24]];
  const scaled = clamped * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(scaled));
  const local = scaled - i;
  const rgb = stops[i].map((channel, idx) => Math.round(channel + (stops[i + 1][idx] - channel) * local));
  return `rgb(${rgb.join(",")})`;
}

function sampleValues() {
  return parameters.map((p) => p.sample ?? p.base);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function percent(value, digits) {
  return `${(value * 100).toFixed(digits)}%`;
}

function padName(name) {
  return name.padEnd(32, " ");
}

buildFilters();
renderInputs();
computeBtn.addEventListener("click", computeAndShow);
resetBtn.addEventListener("click", () => setValues(parameters.map((p) => p.base)));
sampleBtn.addEventListener("click", () => setValues(sampleValues()));
window.addEventListener("resize", computeAndShow);
computeAndShow();
