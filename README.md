# 📘 CET-6 Spaced Repetition (SM-2)

> 一个基于 SM-2 记忆算法的六级词汇复习工具，极简主义，暗黑酷炫，纯本地运行。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

## 🌟 简介 (Introduction)

这是一个轻量级的 Web 应用程序，旨在帮助学生利用 **间隔重复 (Spaced Repetition)** 科学地记忆英语单词。核心采用经典的 **SuperMemo-2 (SM-2) 算法**，根据你对每个单词的熟悉程度（评分 0-5），自动安排下一次最佳复习时间。

**特点：**
- 🌑 **酷炫暗黑模式**：沉浸式学习体验，保护视力。
- 🧠 **智能算法**：基于 SM-2 算法，告别死记硬背，只背该背的。
- 📂 **CSV 导入**：支持自定义词库，格式简单通用。
- 💾 **自动保存**：学习进度实时保存在浏览器本地（LocalStorage），刷新不丢失。
- 📊 **数据统计**：实时概览学习进度、待复习数及错题数。
- 📅 **计划导出**：可导出未来 4 天的复习计划表。

## 🚀 快速开始 (Quick Start)

本项目不需要任何服务器或安装过程，**开箱即用**。

1.  **下载代码**：确保文件夹内包含 `index.html`, `style.css`, `sm2.js` 三个文件。
2.  **准备词库**：准备一个 CSV 格式的单词表（参考下方格式）。
3.  **运行**：直接双击打开 `index.html` 文件（建议使用 Chrome, Edge 或 Firefox 浏览器）。

## 📝 词库格式 (CSV Format)

请准备一个 `.csv` 文件（UTF-8 编码），第一行必须是表头。

**必需列：**
- `word`: 单词拼写

**可选列（推荐）：**
- `pos`: 词性
- `cn`: 中文释义
- `ex`: 例句

**CSV 示例内容：**
```csv
word,pos,cn,ex
Abolish,v.,废除，取消,The government decided to abolish outdated regulations.
Accelerate,v.,加速，促进,Technology can accelerate economic growth.
Accumulate,v.,积累，积聚,We accumulate experience through practice.