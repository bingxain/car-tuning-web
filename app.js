// 車輛改裝 SVD 槓桿分析器
// ------------------------------------------------------------
// 初學者閱讀方式：
// 1. parameters：80 個車輛改裝參數，每個都有分類、名稱、說明。
// 2. W：影響矩陣，W[from][to] 代表 from 會對 to 造成多少壓力或依賴。
// 3. computeAndShow：主流程，讀輸入、算 SVD、抓崩潰點、輸出報告、畫圖。
// 4. powerSvdTopK：不用外部 library 的簡化 SVD，適合瀏覽器直接跑。

const parameters = [
  // 動力系統 10
  { category: "動力系統", key: "EnginePower", zh: "引擎輸出", hint: "馬力/扭力的整體輸出能力" },
  { category: "動力系統", key: "TurboBoost", zh: "增壓值", hint: "渦輪或機械增壓壓力" },
  { category: "動力系統", key: "ThrottleResponse", zh: "油門反應", hint: "踩下油門後動力建立速度" },
  { category: "動力系統", key: "TorqueCurve", zh: "扭力曲線", hint: "中低轉與高轉輸出銜接" },
  { category: "動力系統", key: "FuelFlow", zh: "供油能力", hint: "噴油嘴、油泵、油壓調節" },
  { category: "動力系統", key: "IgnitionTiming", zh: "點火調校", hint: "點火角與爆震安全餘裕" },
  { category: "動力系統", key: "AirIntake", zh: "進氣效率", hint: "空濾、管路、進氣溫度" },
  { category: "動力系統", key: "ExhaustFlow", zh: "排氣效率", hint: "頭段、觸媒、尾段排氣阻力" },
  { category: "動力系統", key: "ECUTune", zh: "ECU 調校", hint: "燃油、點火、增壓與保護策略" },
  { category: "動力系統", key: "EngineReliability", zh: "引擎耐用度", hint: "內部強度、爆震與熱負荷容忍" },

  // 輪胎與抓地 10
  { category: "輪胎與抓地", key: "TireGrip", zh: "輪胎抓地力係數", hint: "加速、煞車、過彎的底層上限" },
  { category: "輪胎與抓地", key: "TireWidth", zh: "胎寬", hint: "接地面積與滾阻" },
  { category: "輪胎與抓地", key: "TireCompound", zh: "胎質配方", hint: "熱熔、街胎、雨胎等配方適配" },
  { category: "輪胎與抓地", key: "TireTempControl", zh: "胎溫控制", hint: "是否能維持工作溫度窗" },
  { category: "輪胎與抓地", key: "TirePressure", zh: "胎壓設定", hint: "接地形狀與胎壁支撐" },
  { category: "輪胎與抓地", key: "WheelWeight", zh: "輪圈重量", hint: "簧下重量與轉動慣量" },
  { category: "輪胎與抓地", key: "WheelRigidity", zh: "輪圈剛性", hint: "受力變形與路感回饋" },
  { category: "輪胎與抓地", key: "ContactPatch", zh: "接地面穩定", hint: "輪胎是否能穩定貼地" },
  { category: "輪胎與抓地", key: "WetGrip", zh: "濕地抓地", hint: "雨天排水與低摩擦路面能力" },
  { category: "輪胎與抓地", key: "HeatCycleLife", zh: "熱循環壽命", hint: "多次熱衰退後仍保有性能" },

  // 懸吊與定位 10
  { category: "懸吊與定位", key: "SpringRate", zh: "彈簧硬度", hint: "支撐車重與負載轉移" },
  { category: "懸吊與定位", key: "DamperCompression", zh: "避震壓縮阻尼", hint: "壓縮時控制車身速度" },
  { category: "懸吊與定位", key: "DamperRebound", zh: "避震回彈阻尼", hint: "回彈時維持輪胎貼地" },
  { category: "懸吊與定位", key: "AntiRollBar", zh: "防傾桿", hint: "左右側傾控制與輪荷分配" },
  { category: "懸吊與定位", key: "Camber", zh: "外傾角", hint: "過彎時接地面角度" },
  { category: "懸吊與定位", key: "Toe", zh: "前束角", hint: "直線穩定與轉向反應" },
  { category: "懸吊與定位", key: "Caster", zh: "後傾角", hint: "回正力與彎中動態外傾" },
  { category: "懸吊與定位", key: "RideHeight", zh: "車高", hint: "重心、幾何、下壓力工作高度" },
  { category: "懸吊與定位", key: "BumpTravel", zh: "避震行程", hint: "遇到坑洞或重煞是否觸底" },
  { category: "懸吊與定位", key: "SuspensionBearing", zh: "懸吊襯套/魚眼", hint: "定位保持與震動容忍" },

  // 煞車系統 10
  { category: "煞車系統", key: "BrakeTorque", zh: "煞車力矩", hint: "卡鉗、碟盤、來令片的制動能力" },
  { category: "煞車系統", key: "BrakeCooling", zh: "煞車散熱", hint: "導風、碟盤熱容量、冷卻效率" },
  { category: "煞車系統", key: "BrakePadFriction", zh: "來令摩擦係數", hint: "冷熱狀態下的咬合力" },
  { category: "煞車系統", key: "BrakeBias", zh: "煞車比例", hint: "前後制動平衡" },
  { category: "煞車系統", key: "ABSCalibration", zh: "ABS 標定", hint: "鎖死介入與輪胎抓地匹配" },
  { category: "煞車系統", key: "BrakeFluid", zh: "煞車油耐溫", hint: "高溫下是否氣阻" },
  { category: "煞車系統", key: "PedalFeel", zh: "踏板腳感", hint: "踏板線性與可控制性" },
  { category: "煞車系統", key: "RotorCapacity", zh: "碟盤熱容量", hint: "連續重煞吸熱能力" },
  { category: "煞車系統", key: "BrakeLineRigidity", zh: "油管剛性", hint: "油壓傳遞與踏板變形" },
  { category: "煞車系統", key: "BrakeFadeResistance", zh: "抗熱衰退", hint: "長時間激烈駕駛後仍維持煞車" },

  // 傳動與差速 10
  { category: "傳動與差速", key: "ClutchCapacity", zh: "離合器承受度", hint: "能否承受扭力不打滑" },
  { category: "傳動與差速", key: "GearRatio", zh: "齒比設定", hint: "加速、極速、轉速銜接" },
  { category: "傳動與差速", key: "LSDLock", zh: "LSD 鎖定率", hint: "左右輪扭力分配與出彎牽引" },
  { category: "傳動與差速", key: "DriveshaftStrength", zh: "傳動軸強度", hint: "扭力衝擊承受能力" },
  { category: "傳動與差速", key: "GearboxStrength", zh: "變速箱強度", hint: "齒輪與同步機構耐用度" },
  { category: "傳動與差速", key: "ShiftSpeed", zh: "換檔速度", hint: "換檔時間與動力中斷" },
  { category: "傳動與差速", key: "FinalDrive", zh: "終傳設定", hint: "整體扭力放大倍率" },
  { category: "傳動與差速", key: "TractionControl", zh: "循跡控制", hint: "打滑介入與動力管理" },
  { category: "傳動與差速", key: "LaunchControl", zh: "起步控制", hint: "起步轉速與輪胎滑移控制" },
  { category: "傳動與差速", key: "DifferentialCooling", zh: "差速器冷卻", hint: "長時間負載下油溫控制" },

  // 車體與空力 10
  { category: "車體與空力", key: "ChassisRigidity", zh: "車體剛性", hint: "懸吊受力基準與回饋穩定" },
  { category: "車體與空力", key: "WeightReduction", zh: "輕量化", hint: "車重降低與慣性減少" },
  { category: "車體與空力", key: "WeightDistribution", zh: "前後配重", hint: "轉向、煞車、出彎平衡" },
  { category: "車體與空力", key: "AeroDownforce", zh: "下壓力", hint: "高速抓地與彎中穩定" },
  { category: "車體與空力", key: "AeroBalance", zh: "空力平衡", hint: "前後下壓力分配" },
  { category: "車體與空力", key: "DragEfficiency", zh: "風阻效率", hint: "高速加速與極速效率" },
  { category: "車體與空力", key: "UnderbodyFlow", zh: "底盤氣流", hint: "擴散器與底盤平整化效果" },
  { category: "車體與空力", key: "BodyRollControl", zh: "車身側傾控制", hint: "彎中姿態與輪荷轉移" },
  { category: "車體與空力", key: "NVHControl", zh: "震動噪音控制", hint: "舒適與零件疲勞控制" },
  { category: "車體與空力", key: "SafetyStructure", zh: "安全結構", hint: "防滾籠、座椅、固定點安全性" },

  // 冷卻與耐久 10
  { category: "冷卻與耐久", key: "RadiatorCapacity", zh: "水箱能力", hint: "冷卻液散熱能力" },
  { category: "冷卻與耐久", key: "OilCooling", zh: "機油冷卻", hint: "高負載下油溫控制" },
  { category: "冷卻與耐久", key: "IntercoolerEfficiency", zh: "中冷效率", hint: "進氣溫度與增壓穩定" },
  { category: "冷卻與耐久", key: "CoolantFlow", zh: "水路流量", hint: "水泵、水道與節溫器效率" },
  { category: "冷卻與耐久", key: "HeatShielding", zh: "隔熱處理", hint: "降低熱浸與周邊零件負荷" },
  { category: "冷卻與耐久", key: "OilPressure", zh: "油壓穩定", hint: "高 G 或高轉下潤滑供應" },
  { category: "冷卻與耐久", key: "FuelCooling", zh: "燃油溫控", hint: "燃油溫度與供油穩定" },
  { category: "冷卻與耐久", key: "SensorHealth", zh: "感測器健康", hint: "溫度、壓力、含氧等訊號可靠性" },
  { category: "冷卻與耐久", key: "MaintenanceMargin", zh: "保養餘裕", hint: "耗材、油液、螺絲扭力與檢查頻率" },
  { category: "冷卻與耐久", key: "HeatSoakResistance", zh: "抗熱浸", hint: "停走或連續圈速後性能維持" },

  // 電子與控制 10
  { category: "電子與控制", key: "SteeringResponse", zh: "轉向反應", hint: "方向盤輸入到車頭反應" },
  { category: "電子與控制", key: "SteeringFeedback", zh: "轉向回饋", hint: "駕駛是否能感知抓地邊界" },
  { category: "電子與控制", key: "StabilityControl", zh: "車身穩定控制", hint: "失控介入與安全保護" },
  { category: "電子與控制", key: "DataLogging", zh: "資料記錄", hint: "油溫、胎溫、圈速、G 值紀錄" },
  { category: "電子與控制", key: "SensorCalibration", zh: "感測器校正", hint: "訊號準確度與控制可信度" },
  { category: "電子與控制", key: "DriverSkillFit", zh: "駕駛適配", hint: "車輛設定是否符合駕駛能力" },
  { category: "電子與控制", key: "Ergonomics", zh: "人因座艙", hint: "座椅、踏板、方向盤位置" },
  { category: "電子與控制", key: "Visibility", zh: "視野", hint: "彎道判斷、後照與盲區" },
  { category: "電子與控制", key: "FailSafe", zh: "保護模式", hint: "異常時降載、限壓、警示" },
  { category: "電子與控制", key: "TrackSetupData", zh: "場地設定資料", hint: "針對不同賽道/道路的設定記錄" }
];

const n = parameters.length;
const names = parameters.map((p) => `${p.key}（${p.zh}）`);
const categories = [...new Set(parameters.map((p) => p.category))];
const indexByKey = new Map(parameters.map((p, i) => [p.key, i]));

// W 是「需求/壓力矩陣」。
// W[from][to] 越大，代表 from 升級後越會要求 to 也跟上。
// 例：EnginePower -> TireGrip，馬力越高，輪胎抓地需求越高。
const W = Array.from({ length: n }, () => Array(n).fill(0));

function link(fromKey, toKey, weight) {
  W[indexByKey.get(fromKey)][indexByKey.get(toKey)] = weight;
}

function linkMany(fromKey, pairs) {
  pairs.forEach(([toKey, weight]) => link(fromKey, toKey, weight));
}

// 同分類的項目通常會互相牽動，所以給一點基礎關聯。
for (const category of categories) {
  const idxs = parameters.map((p, i) => (p.category === category ? i : -1)).filter((i) => i >= 0);
  for (const from of idxs) {
    for (const to of idxs) {
      if (from !== to) W[from][to] = Math.max(W[from][to], 0.05);
    }
  }
}

// 重要的跨系統關係。
// 這些關係讓模型能看出「某個改裝變強後，別的零件是否開始不夠用」。
linkMany("EnginePower", [["TireGrip", 0.62], ["ClutchCapacity", 0.55], ["GearboxStrength", 0.45], ["BrakeTorque", 0.42], ["RadiatorCapacity", 0.45], ["OilCooling", 0.38], ["EngineReliability", 0.52]]);
linkMany("TurboBoost", [["FuelFlow", 0.55], ["IntercoolerEfficiency", 0.62], ["EngineReliability", 0.58], ["HeatSoakResistance", 0.45], ["ECUTune", 0.48]]);
linkMany("TorqueCurve", [["LSDLock", 0.42], ["TireGrip", 0.38], ["ClutchCapacity", 0.34], ["TractionControl", 0.32]]);
linkMany("ECUTune", [["IgnitionTiming", 0.35], ["FuelFlow", 0.30], ["FailSafe", 0.42], ["SensorHealth", 0.25]]);
linkMany("AirIntake", [["ECUTune", 0.18], ["IntercoolerEfficiency", 0.22]]);
linkMany("ExhaustFlow", [["ECUTune", 0.18], ["HeatShielding", 0.28]]);

linkMany("TireGrip", [["BrakeTorque", 0.42], ["SpringRate", 0.28], ["DamperCompression", 0.30], ["DamperRebound", 0.30], ["ChassisRigidity", 0.26], ["DriverSkillFit", 0.32]]);
linkMany("TireWidth", [["TireTempControl", 0.28], ["WheelWeight", 0.30], ["SteeringResponse", 0.22], ["DragEfficiency", 0.18]]);
linkMany("TireCompound", [["TireTempControl", 0.45], ["HeatCycleLife", 0.38], ["WetGrip", 0.30]]);
linkMany("ContactPatch", [["Camber", 0.42], ["Toe", 0.28], ["RideHeight", 0.25], ["SuspensionBearing", 0.22]]);

linkMany("SpringRate", [["DamperCompression", 0.55], ["DamperRebound", 0.50], ["TireGrip", 0.30], ["BodyRollControl", 0.32]]);
linkMany("DamperCompression", [["ContactPatch", 0.36], ["BumpTravel", 0.34], ["TireTempControl", 0.22]]);
linkMany("DamperRebound", [["ContactPatch", 0.42], ["SteeringFeedback", 0.28], ["SuspensionBearing", 0.25]]);
linkMany("AntiRollBar", [["TireGrip", 0.26], ["BodyRollControl", 0.44], ["WeightDistribution", 0.24]]);
linkMany("RideHeight", [["AeroDownforce", 0.35], ["UnderbodyFlow", 0.38], ["BumpTravel", 0.30]]);

linkMany("BrakeTorque", [["TireGrip", 0.55], ["BrakeCooling", 0.46], ["BrakeBias", 0.38], ["BrakeFluid", 0.32], ["RotorCapacity", 0.40]]);
linkMany("BrakeCooling", [["BrakeFadeResistance", 0.48], ["RotorCapacity", 0.30]]);
linkMany("BrakePadFriction", [["BrakeCooling", 0.34], ["PedalFeel", 0.28], ["ABSCalibration", 0.30]]);
linkMany("ABSCalibration", [["TireGrip", 0.30], ["WetGrip", 0.28], ["SensorCalibration", 0.32]]);

linkMany("ClutchCapacity", [["GearboxStrength", 0.30], ["DriveshaftStrength", 0.28]]);
linkMany("GearRatio", [["TireGrip", 0.30], ["EnginePower", 0.20], ["ShiftSpeed", 0.22]]);
linkMany("LSDLock", [["TireGrip", 0.42], ["TractionControl", 0.30], ["DifferentialCooling", 0.35], ["DriverSkillFit", 0.28]]);
linkMany("FinalDrive", [["TireGrip", 0.36], ["ClutchCapacity", 0.26], ["GearboxStrength", 0.24]]);
linkMany("LaunchControl", [["TireGrip", 0.44], ["ClutchCapacity", 0.34], ["DriveshaftStrength", 0.32]]);

linkMany("ChassisRigidity", [["SuspensionBearing", 0.30], ["SteeringFeedback", 0.25], ["SafetyStructure", 0.22]]);
linkMany("WeightReduction", [["BrakeTorque", 0.20], ["SpringRate", 0.22], ["WeightDistribution", 0.28], ["SafetyStructure", 0.20]]);
linkMany("WeightDistribution", [["BrakeBias", 0.40], ["SpringRate", 0.30], ["AntiRollBar", 0.30], ["TireGrip", 0.30]]);
linkMany("AeroDownforce", [["SpringRate", 0.38], ["DamperCompression", 0.32], ["TireGrip", 0.35], ["DragEfficiency", 0.40], ["AeroBalance", 0.45]]);
linkMany("AeroBalance", [["StabilityControl", 0.28], ["SteeringResponse", 0.26], ["DriverSkillFit", 0.25]]);
linkMany("UnderbodyFlow", [["RideHeight", 0.35], ["AeroBalance", 0.30]]);

linkMany("RadiatorCapacity", [["HeatSoakResistance", 0.38], ["CoolantFlow", 0.34]]);
linkMany("OilCooling", [["OilPressure", 0.35], ["EngineReliability", 0.42]]);
linkMany("IntercoolerEfficiency", [["EnginePower", 0.30], ["TurboBoost", 0.28], ["HeatSoakResistance", 0.36]]);
linkMany("OilPressure", [["EngineReliability", 0.50], ["MaintenanceMargin", 0.24]]);
linkMany("SensorHealth", [["ECUTune", 0.32], ["FailSafe", 0.30], ["DataLogging", 0.25]]);
linkMany("MaintenanceMargin", [["EngineReliability", 0.30], ["BrakeFadeResistance", 0.22], ["HeatCycleLife", 0.20]]);

linkMany("SteeringResponse", [["TireGrip", 0.24], ["SteeringFeedback", 0.30], ["DriverSkillFit", 0.30]]);
linkMany("StabilityControl", [["SensorCalibration", 0.35], ["TractionControl", 0.28], ["ABSCalibration", 0.28]]);
linkMany("DataLogging", [["TrackSetupData", 0.36], ["SensorCalibration", 0.28], ["MaintenanceMargin", 0.22]]);
linkMany("DriverSkillFit", [["StabilityControl", 0.34], ["PedalFeel", 0.22], ["SteeringFeedback", 0.24]]);
linkMany("FailSafe", [["EngineReliability", 0.32], ["SensorHealth", 0.28], ["ECUTune", 0.25]]);

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
      .filter((p) => !keyword || `${p.key} ${p.zh} ${p.hint}`.toLowerCase().includes(keyword));

    if (!items.length) continue;

    const title = document.createElement("div");
    title.className = "category-title";
    title.textContent = category;
    inputRoot.appendChild(title);

    for (const item of items) {
      const row = document.createElement("label");
      row.className = "metric-row";
      row.innerHTML = `
        <span class="metric-label">
          <strong>${item.key}（${item.zh}）</strong>
          <span>${item.hint}</span>
        </span>
        <input id="value-${item.i}" type="number" min="0" max="10" step="0.1" value="${getStoredValue(item.i).toFixed(1)}">
        <input id="slider-${item.i}" class="slider" type="range" min="0" max="10" step="0.1" value="${getStoredValue(item.i).toFixed(1)}" aria-label="${item.key}">
      `;
      inputRoot.appendChild(row);

      const number = row.querySelector(`#value-${item.i}`);
      const slider = row.querySelector(`#slider-${item.i}`);
      number.addEventListener("input", () => {
        const val = clamp(parseFloat(number.value) || 0, 0, 10);
        currentValues[item.i] = val;
        slider.value = String(val);
        computeAndShow();
      });
      slider.addEventListener("input", () => {
        const val = parseFloat(slider.value) || 0;
        currentValues[item.i] = val;
        number.value = val.toFixed(1);
        computeAndShow();
      });
    }
  }
}

let currentValues = Array(n).fill(5);

function getStoredValue(i) {
  return currentValues[i] ?? 5;
}

function setValues(values) {
  currentValues = values.map((v) => clamp(v, 0, 10));
  renderInputs();
  computeAndShow();
}

function computeAndShow() {
  const vals = [...currentValues];

  // influenceMatrix 用在 SVD：兩端都乘上目前分數。
  // 如果某個項目很強，而且它跟其他項目關聯很多，通常會在 SVD 裡變成主要槓桿。
  const influenceMatrix = W.map((row, r) => row.map((weight, c) => vals[r] * weight * vals[c]));
  const svd = powerSvdTopK(influenceMatrix, 8);
  const leverage = calcLeverageScores(svd);

  // pressure 不乘上 target 自己的分數。
  // 這樣才能抓到「別的改裝都上去了，但這個零件跟不上」的情境。
  const pressure = calcIncomingPressure(vals);
  const collapse = parameters.map((p, i) => {
    const demand = pressure[i];
    const capacity = vals[i] + 0.5;
    const gap = demand - capacity;
    const risk = demand > 0 ? demand / capacity : 0;
    return { i, demand, capacity, gap, risk };
  }).sort((a, b) => b.gap - a.gap);

  const rankedLeverage = Array.from({ length: n }, (_, i) => i).sort((a, b) => leverage[b] - leverage[a]);
  const rankedLow = Array.from({ length: n }, (_, i) => i).sort((a, b) => vals[a] - vals[b]);
  const topIndex = rankedLeverage[0];
  const collapseIndex = collapse[0].i;
  const lowIndex = rankedLow[0];

  const sSum = svd.S.reduce((sum, s) => sum + s, 0);
  const topSProportion = sSum > 0 ? svd.S[0] / sSum : 0;

  topNode.textContent = `${names[topIndex]} ${leverage[topIndex].toFixed(3)}`;
  collapseNode.textContent = `${names[collapseIndex]} Gap=${collapse[0].gap.toFixed(2)}`;
  lowestNode.textContent = `${names[lowIndex]} ${vals[lowIndex].toFixed(1)}`;
  topShare.textContent = percent(topSProportion, 2);

  const lines = [];
  lines.push("=== 車輛改裝 SVD 槓桿分析 ===");
  lines.push(`參數數量: ${n}`);
  lines.push(`主模態集中度: ${percent(topSProportion, 2)}`);
  lines.push("");

  lines.push("Top 12 最適合強化的槓桿");
  rankedLeverage.slice(0, 12).forEach((i, rank) => {
    lines.push(`${rank + 1}. ${padName(names[i])} Input=${vals[i].toFixed(1)}  Leverage=${leverage[i].toFixed(4)}  壓力=${pressure[i].toFixed(2)}`);
  });
  lines.push("");

  lines.push("Top 12 可能崩潰點 / 跟不上其他改裝的項目");
  collapse.slice(0, 12).forEach((item, rank) => {
    const status = item.gap > 2 ? "高風險" : item.gap > 0 ? "注意" : "尚可";
    lines.push(`${rank + 1}. ${padName(names[item.i])} ${status}  Input=${vals[item.i].toFixed(1)}  Demand=${item.demand.toFixed(2)}  Gap=${item.gap.toFixed(2)}  Risk=${item.risk.toFixed(2)}x`);
    lines.push(`   可能現象: ${failureHint(parameters[item.i].key)}`);
  });
  lines.push("");

  lines.push("最低分 Top 12");
  rankedLow.slice(0, 12).forEach((i, rank) => {
    lines.push(`${rank + 1}. ${padName(names[i])} Input=${vals[i].toFixed(1)}  壓力=${pressure[i].toFixed(2)}  槓桿=${leverage[i].toFixed(4)}`);
  });
  lines.push("");

  lines.push("Singular values");
  svd.S.forEach((s, i) => lines.push(`  S[${i}] = ${s.toFixed(6)}`));
  lines.push("");

  lines.push("行動建議");
  lines.push(`  - 第一優先槓桿: ${names[topIndex]}，它對整車系統的連動最大。`);
  lines.push(`  - 第一崩潰風險: ${names[collapseIndex]}，目前受到其他改裝推高需求，可能先出問題。`);
  lines.push(`  - 最低分項目: ${names[lowIndex]}，若它同時出現在崩潰榜，就應該優先處理。`);
  lines.push("  - 如果你是賽道車，先看抓地、煞車散熱、油溫、水溫、傳動承受度。");
  lines.push("  - 如果你是街車，除了輸出，也要看濕地抓地、煞車腳感、保護模式與保養餘裕。");

  resultText.textContent = lines.join("\n");
  drawHeatmap(influenceMatrix);
  drawLeverageChart(rankedLeverage, leverage, vals, pressure);
}

function calcIncomingPressure(vals) {
  return W[0].map((_, c) => {
    let sum = 0;
    for (let r = 0; r < n; r += 1) {
      sum += vals[r] * W[r][c];
    }
    return sum;
  });
}

function calcLeverageScores(svd) {
  const scores = Array(n).fill(0);
  for (let k = 0; k < svd.S.length; k += 1) {
    const col = svd.U.map((row) => Math.abs(row[k] || 0));
    const sum = col.reduce((acc, v) => acc + v, 0) || 1;
    for (let i = 0; i < n; i += 1) {
      scores[i] += svd.S[k] * (col[i] / sum);
    }
  }
  return scores;
}

// 這裡用 power iteration 找前 K 個 singular values。
// 好處是 80x80 也能在瀏覽器快速跑，不需要載入 MathNet 或其他套件。
function powerSvdTopK(A, topK) {
  const At = transpose(A);
  let B = multiply(At, A);
  const S = [];
  const V = [];
  const U = Array.from({ length: A.length }, () => []);

  for (let k = 0; k < topK; k += 1) {
    let v = Array.from({ length: n }, (_, i) => ((i + k * 13) % 17) + 1);
    v = normalizeVector(v);

    for (let iter = 0; iter < 80; iter += 1) {
      v = normalizeVector(multiplyMatrixVector(B, v));
    }

    const Bv = multiplyMatrixVector(B, v);
    const eigenValue = Math.max(0, dot(v, Bv));
    const s = Math.sqrt(eigenValue);
    if (s < 1e-8) break;

    const Av = multiplyMatrixVector(A, v);
    const u = Av.map((x) => x / s);
    S.push(s);
    V.push(v);
    for (let r = 0; r < A.length; r += 1) U[r][k] = u[r];

    // Deflation：把已經找到的方向從 B 扣掉，下一輪才會找新的方向。
    for (let r = 0; r < n; r += 1) {
      for (let c = 0; c < n; c += 1) {
        B[r][c] -= eigenValue * v[r] * v[c];
      }
    }
  }

  return { S, U, V };
}

function transpose(matrix) {
  return matrix[0].map((_, c) => matrix.map((row) => row[c]));
}

function multiply(A, B) {
  const rows = A.length;
  const cols = B[0].length;
  const inner = B.length;
  const out = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      let sum = 0;
      for (let k = 0; k < inner; k += 1) sum += A[r][k] * B[k][c];
      out[r][c] = sum;
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
    ContactPatch: "輪胎不能穩定貼地，坑洞或重煞時突然失去抓地",
    BrakeCooling: "連續重煞後熱衰退，踏板變長或煞不住",
    BrakeFadeResistance: "跑幾圈後制動力明顯下降",
    ClutchCapacity: "大扭力時離合器打滑，轉速上升但車速不上升",
    GearboxStrength: "換檔困難、齒輪受損、同步機構負荷過大",
    EngineReliability: "爆震、過熱、縮缸或保護模式頻繁介入",
    RadiatorCapacity: "水溫上升，長時間高負載無法降溫",
    OilCooling: "油溫過高，油壓下降，潤滑保護不足",
    IntercoolerEfficiency: "進氣溫過高，馬力衰退或爆震風險上升",
    DriverSkillFit: "車比人快，修正不及導致失控風險增加",
    StabilityControl: "車身動態超出電子系統可控範圍",
    SuspensionBearing: "定位跑掉，車身反應不一致"
  };
  return hints[key] || "該項目承受的系統需求偏高，可能成為可靠度或操控瓶頸";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function percent(value, digits) {
  return `${(value * 100).toFixed(digits)}%`;
}

function padName(name) {
  return name.padEnd(30, " ");
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

function drawHeatmap(M) {
  const canvas = document.getElementById("heatmap");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 900;
  const cssHeight = Math.max(360, cssWidth * 0.58);
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  const max = Math.max(1, ...M.flat().map((v) => Math.abs(v)));
  const left = 12;
  const top = 12;
  const cell = Math.min((cssWidth - 24) / n, (cssHeight - 24) / n);

  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      ctx.fillStyle = colorRamp(Math.abs(M[r][c]) / max);
      ctx.fillRect(left + c * cell, top + r * cell, Math.max(1, cell), Math.max(1, cell));
    }
  }

  ctx.fillStyle = "#667076";
  ctx.font = "12px Segoe UI, Arial";
  ctx.fillText("80x80 influence matrix：顏色越深，代表兩項改裝的連動越強", 12, cssHeight - 10);
}

function drawLeverageChart(ranked, leverage, vals, pressure) {
  const canvas = document.getElementById("leverageChart");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 900;
  const cssHeight = Math.max(360, cssWidth * 0.58);
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  const topItems = ranked.slice(0, 20);
  const maxScore = Math.max(1, ...topItems.map((i) => leverage[i]));
  const marginL = Math.max(210, cssWidth * 0.28);
  const marginR = 70;
  const rowH = Math.max(18, (cssHeight - 32) / topItems.length);
  const graphW = cssWidth - marginL - marginR;

  ctx.font = "12px Segoe UI, Arial";
  ctx.textBaseline = "middle";

  topItems.forEach((idx, row) => {
    const y = 16 + row * rowH;
    const width = graphW * (leverage[idx] / maxScore);
    const pressureGap = pressure[idx] - (vals[idx] + 0.5);

    ctx.fillStyle = pressureGap > 0 ? "rgba(180, 35, 24, 0.12)" : "rgba(36, 92, 115, 0.08)";
    ctx.fillRect(0, y - 1, cssWidth, rowH);

    ctx.fillStyle = "#161a1d";
    ctx.fillText(`${row + 1}. ${parameters[idx].zh}`, 8, y + rowH / 2);

    ctx.fillStyle = pressureGap > 0 ? "#b42318" : "#245c73";
    ctx.fillRect(marginL, y + 4, width, rowH - 8);

    ctx.fillStyle = "#667076";
    ctx.fillText(leverage[idx].toFixed(3), marginL + graphW + 8, y + rowH / 2);
  });
}

function sampleValues() {
  const values = Array(n).fill(5);
  const set = (key, value) => { values[indexByKey.get(key)] = value; };

  // 範例：動力大幅升級，但輪胎、煞車散熱、離合器與冷卻還沒完全跟上。
  set("EnginePower", 8.8); set("TurboBoost", 8.4); set("TorqueCurve", 8.0); set("ECUTune", 7.8);
  set("FuelFlow", 7.0); set("IntercoolerEfficiency", 5.0); set("EngineReliability", 4.8);
  set("TireGrip", 4.2); set("TireWidth", 5.5); set("TireCompound", 4.8); set("ContactPatch", 4.5);
  set("SpringRate", 5.2); set("DamperCompression", 4.7); set("DamperRebound", 4.8); set("Camber", 5.0);
  set("BrakeTorque", 6.0); set("BrakeCooling", 3.8); set("BrakeFluid", 4.0); set("BrakeFadeResistance", 3.7);
  set("ClutchCapacity", 4.2); set("GearboxStrength", 4.8); set("LSDLock", 5.2); set("TractionControl", 4.5);
  set("RadiatorCapacity", 4.2); set("OilCooling", 4.0); set("HeatSoakResistance", 3.8);
  set("DriverSkillFit", 5.0); set("DataLogging", 3.5); set("FailSafe", 4.0);
  return values;
}

buildFilters();
renderInputs();
computeBtn.addEventListener("click", computeAndShow);
resetBtn.addEventListener("click", () => setValues(Array(n).fill(5)));
sampleBtn.addEventListener("click", () => setValues(sampleValues()));
window.addEventListener("resize", computeAndShow);
computeAndShow();
