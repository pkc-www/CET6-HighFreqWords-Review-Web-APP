/**
 * sm2.js - 完整版
 * 包含：CSV解析、SM-2算法、界面交互、数据存储
 */

document.addEventListener('DOMContentLoaded', () => {
    // 启动应用
    initApp();
});

// ==========================================
// 1. 全局变量与配置
// ==========================================
const STORAGE_KEY = "cet6_sm2_data_v2";
let appData = {
    items: [] // 存放所有单词卡片
};

// 当前复习会话的状态
let sessionQueue = [];
let currentCardIndex = 0;
let sessionStats = { correct: 0, wrong: 0 };
let isWrongOnlyMode = false;

// DOM 元素缓存
const UI = {
    fileInput: document.getElementById('csvFileInput'),
    btnExport: document.getElementById('btnExportPlan'),
    btnReset: document.getElementById('btnResetState'),
    statTotal: document.getElementById('statTotal'),
    statDue: document.getElementById('statDue'),
    statWrong: document.getElementById('statWrong'),
    statDaysLeft: document.getElementById('statDaysLeft'),
    btnStartDue: document.getElementById('btnStartDue'),
    btnStartWrong: document.getElementById('btnStartWrong'),
    
    // 面板
    panelOverview: document.querySelector('.panel:not(.session-panel)'),
    panelSession: document.getElementById('sessionPanel'),
    
    // 会话元素
    progressText: document.getElementById('progressText'),
    sessionMeta: document.getElementById('sessionMeta'),
    btnExit: document.getElementById('btnExitSession'),
    
    // 卡片元素
    cardWord: document.getElementById('cardWord'),
    cardPos: document.getElementById('cardPos'),
    cardCn: document.getElementById('cardCn'),
    cardEx: document.getElementById('cardEx'),
    cardFront: document.getElementById('cardFront'),
    cardBack: document.getElementById('cardBack'),
    btnFlip: document.getElementById('btnShowMeaning'),
    
    // 评分按钮组
    qualityBtns: document.querySelectorAll('.qbtn')
};

// ==========================================
// 2. 初始化与事件绑定
// ==========================================
function initApp() {
    loadData();
    renderDashboard();
    bindEvents();
    console.log("App initialized.");
}

function bindEvents() {
    // 1. 导入 CSV
    UI.fileInput.addEventListener('change', handleFileImport);

    // 2. 导出计划
    UI.btnExport.addEventListener('click', exportPlan);

    // 3. 重置数据
    UI.btnReset.addEventListener('click', () => {
        if (confirm("【警告】确定要清空所有数据吗？此操作无法撤销！")) {
            appData.items = [];
            saveData();
            renderDashboard();
            alert("数据已重置。");
        }
    });

    // 4. 开始复习（今日到期）
    UI.btnStartDue.addEventListener('click', () => startSession(false));

    // 5. 开始复习（只看错题）
    UI.btnStartWrong.addEventListener('click', () => startSession(true));

    // 6. 退出复习
    UI.btnExit.addEventListener('click', endSession);

    // 7. 翻转卡片
    UI.btnFlip.addEventListener('click', showAnswer);

    // 8. 评分按钮
    UI.qualityBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const q = parseInt(e.target.dataset.q, 10);
            submitQuality(q);
        });
    });
}

// ==========================================
// 3. 核心业务逻辑：导入与解析
// ==========================================
function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const text = event.target.result;
            const newItems = parseCSV(text);
            
            if (newItems.length === 0) {
                alert("未在文件中找到有效数据，请检查格式。");
                return;
            }

            // 合并数据（去重：基于 word）
            let addedCount = 0;
            newItems.forEach(newItem => {
                const exists = appData.items.some(old => old.word === newItem.word);
                if (!exists) {
                    appData.items.push(newItem);
                    addedCount++;
                }
            });

            saveData();
            renderDashboard();
            alert(`导入成功！\n文件包含: ${newItems.length} 条\n实际新增: ${addedCount} 条\n当前总数: ${appData.items.length} 条`);
        } catch (err) {
            console.error(err);
            alert("解析 CSV 失败: " + err.message);
        } finally {
            e.target.value = ""; // 清空 input，允许再次选择同名文件
        }
    };
    reader.onerror = () => alert("文件读取出错");
    reader.readAsText(file);
}

function parseCSV(text) {
    // 1. 去除 BOM
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    
    // 2. 统一换行符并分割
    const lines = text.split(/\r\n|\n|\r/).filter(l => l.trim().length > 0);
    if (lines.length < 2) throw new Error("行数过少，至少需要表头和一行数据");

    // 3. 探测分隔符（第一行）
    const headerLine = lines[0];
    const delimiters = [",", "\t", ";"];
    let delimiter = ",";
    let maxCount = 0;
    for (const d of delimiters) {
        const count = (headerLine.match(new RegExp(`\\${d}`, "g")) || []).length;
        if (count > maxCount) {
            maxCount = count;
            delimiter = d;
        }
    }

    // 4. 解析表头
    // 简单的 split 即可处理表头（假设表头无引号包裹的逗号）
    const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase());
    const idxWord = headers.indexOf("word");
    
    if (idxWord === -1) throw new Error("CSV 表头必须包含 'word' 列");

    // 可选列
    const idxPos = headers.indexOf("pos");
    const idxCn = headers.indexOf("cn");
    const idxEx = headers.indexOf("ex");

    const result = [];
    
    // 5. 解析数据行（使用增强的解析器）
    for (let i = 1; i < lines.length; i++) {
        const rowData = parseCSVLine(lines[i], delimiter);
        
        // 数据列数可能不一致，做防御性处理
        const word = (rowData[idxWord] || "").trim();
        if (!word) continue;

        const pos = idxPos > -1 ? (rowData[idxPos] || "").trim() : "";
        const cn = idxCn > -1 ? (rowData[idxCn] || "").trim() : "";
        const ex = idxEx > -1 ? (rowData[idxEx] || "").trim() : "";

        result.push({
            id: generateUUID(),
            word, pos, cn, ex,
            // SM-2 初始状态
            interval: 0,
            repetitions: 0,
            ef: 2.5,
            // 关键：新词默认复习时间设为“昨天”，确保今天一定到期
            nextReviewDate: new Date(new Date().getTime() - 86400000).toISOString(),
            history: []
        });
    }
    return result;
}

// 单行解析（处理引号和逗号）
function parseCSVLine(line, delimiter) {
    const result = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (inQuotes) {
            if (char === '"') {
                // 检查是否是转义引号 ""
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                current += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === delimiter) {
                result.push(current);
                current = "";
            } else {
                current += char;
            }
        }
    }
    result.push(current);
    return result;
}

// ==========================================
// 4. SM-2 算法与复习逻辑
// ==========================================
function startSession(wrongOnly) {
    isWrongOnlyMode = wrongOnly;
    const now = new Date();

    // 筛选逻辑
    sessionQueue = appData.items.filter(item => {
        const dueDate = new Date(item.nextReviewDate);
        const isDue = dueDate <= now; // 只要时间到了，或者过了，就算到期
        
        if (wrongOnly) {
            // 错题定义：到期 且 (上次做错 或 处于初始学习阶段)
            const lastQ = item.history.length > 0 ? item.history[item.history.length - 1].q : 0;
            return isDue && lastQ < 3;
        } else {
            return isDue;
        }
    });

    if (sessionQueue.length === 0) {
        alert(wrongOnly ? "太棒了！没有到期的错题需要复习。" : "今日任务已完成！没有到期的单词。");
        return;
    }

    // 初始化会话
    currentCardIndex = 0;
    sessionStats = { correct: 0, wrong: 0 };
    
    // 切换界面
    UI.panelOverview.classList.add('hidden');
    UI.panelSession.classList.remove('hidden');
    
    renderCard();
}

function renderCard() {
    if (currentCardIndex >= sessionQueue.length) {
        // 会话结束
        alert(`本轮复习结束！\n✅ 记得: ${sessionStats.correct}\n❌ 模糊: ${sessionStats.wrong}`);
        endSession();
        return;
    }

    const item = sessionQueue[currentCardIndex];
    
    // 填充内容
    UI.cardWord.innerText = item.word;
    UI.cardPos.innerText = item.pos || "";
    UI.cardCn.innerText = item.cn || "暂无释义";
    UI.cardEx.innerText = item.ex || "暂无例句";

    // 状态重置
    UI.cardFront.classList.remove('hidden');
    UI.cardBack.classList.add('hidden');
    UI.btnFlip.style.display = 'inline-block';

    // 更新 Meta 信息
    UI.progressText.innerText = `进度: ${currentCardIndex + 1} / ${sessionQueue.length}`;
    UI.sessionMeta.innerText = `间隔: ${item.interval}天 | EF: ${item.ef.toFixed(2)}`;
}

function showAnswer() {
    UI.btnFlip.style.display = 'none';
    UI.cardBack.classList.remove('hidden');
}

function submitQuality(quality) {
    const item = sessionQueue[currentCardIndex];
    
    // 1. 更新统计
    if (quality >= 3) sessionStats.correct++;
    else sessionStats.wrong++;

    // 2. 执行 SM-2 算法
    calculateSM2(item, quality);

    // 3. 保存数据（防止中途退出丢失）
    saveData();

    // 4. 下一张
    currentCardIndex++;
    renderCard();
}

function calculateSM2(item, q) {
    // 备份旧数据
    let { interval, repetitions, ef } = item;

    // 算法核心
    if (q >= 3) {
        if (repetitions === 0) interval = 1;
        else if (repetitions === 1) interval = 6;
        else interval = Math.round(interval * ef);
        repetitions++;
    } else {
        repetitions = 0;
        interval = 1; // 忘记了，重置为1天
    }

    // 更新 EF
    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (ef < 1.3) ef = 1.3;

    // 计算下次日期
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);
    // 设置为当天凌晨，避免时间偏移导致的问题
    nextDate.setHours(0,0,0,0);

    // 应用更新
    item.interval = interval;
    item.repetitions = repetitions;
    item.ef = ef;
    item.nextReviewDate = nextDate.toISOString();
    
    // 记录历史
    if (!item.history) item.history = [];
    item.history.push({ date: new Date().toISOString(), q: q });
}

function endSession() {
    UI.panelSession.classList.add('hidden');
    UI.panelOverview.classList.remove('hidden');
    renderDashboard();
}

// ==========================================
// 5. 辅助功能与数据管理
// ==========================================

function loadData() {
    const json = localStorage.getItem(STORAGE_KEY);
    if (json) {
        try {
            appData = JSON.parse(json);
        } catch (e) {
            console.error("Load failed", e);
        }
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function renderDashboard() {
    const total = appData.items.length;
    const now = new Date();
    
    // 计算到期数
    const dueCount = appData.items.filter(i => new Date(i.nextReviewDate) <= now).length;
    
    // 计算错题数 (最近一次评分 < 3)
    const wrongCount = appData.items.filter(i => {
        if (i.history && i.history.length > 0) {
            return i.history[i.history.length - 1].q < 3;
        }
        return false;
    }).length;

    UI.statTotal.innerText = total;
    UI.statDue.innerText = dueCount;
    UI.statWrong.innerText = wrongCount;
    
    // 按钮状态
    UI.btnStartDue.disabled = dueCount === 0;
    UI.btnStartWrong.disabled = wrongCount === 0;
    
    if (dueCount > 0) {
        UI.btnStartDue.textContent = `开始今日复习 (${dueCount})`;
        UI.btnStartDue.classList.add('primary');
    } else {
        UI.btnStartDue.textContent = "今日任务已完成";
        UI.btnStartDue.classList.remove('primary');
    }
}

function exportPlan() {
    if (appData.items.length === 0) return alert("没有数据");

    let csvContent = "Date,Count,Word_Preview\n";
    const today = new Date();
    today.setHours(0,0,0,0);

    for (let i = 0; i < 4; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        
        // 查找该日期需复习的词
        const list = appData.items.filter(item => {
            const d = new Date(item.nextReviewDate);
            d.setHours(0,0,0,0);
            // 如果是今天(i=0)，则包含所有滞后的；否则必须精确匹配日期
            if (i === 0) return d <= targetDate;
            return d.getTime() === targetDate.getTime();
        });

        const preview = list.slice(0, 5).map(x => x.word).join("; ");
        csvContent += `${targetDate.toISOString().split('T')[0]},${list.length},"${preview}"\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "study_plan_4days.csv";
    link.click();
}

function generateUUID() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}