# ML4EDA 考点优先级排序

> 依据：Mock Exam（官方模拟题+解答）+ Part A 必背代码模块 + 全部讲义/lab。
> 老师定位：**以概念理解问答题为主（不考繁琐计算），外加少量代码题**（典型是"搭建/扩展一个 Keras 模型 + compile + fit + evaluate"）。

## 一、从 Mock Exam 反推的出题规律

Mock Exam 共 4 题，精准对应 4 类考点：

| 题号 | 考什么 | 类型 | 对应章节 |
|---|---|---|---|
| Q1 | 损失函数选择（6 分类用什么、不用什么、为什么） | 概念 | ch03 |
| Q2 | 写/扩展 Keras 模型 + compile/fit/evaluate + 解释 train/val/test | **代码** | ch06 / ch03 |
| Q3 | CNN：卷积 vs 全连接、padding 作用、输出尺寸公式计算 | 概念+小计算 | ch06 |
| Q4 | KNN：怎么"训练"、怎么测试、怎么选 K、bias-variance | 概念 | ch02 |

**核心规律**
- 代码题几乎必然是 **Keras Sequential 搭建/扩展**这一套（Q2 是原型）。
- 概念题覆盖：损失函数、CNN 原理、经典算法（KNN/SVM/RF）、正则化/过拟合、优化器、bias-variance。
- 代码题给分点：**层选择合理、激活函数写没写、compile 的 loss/optimizer 对不对、fit 有没有给 validation、evaluate 有没有做**。语法小错一般不致命，"忘记写激活 / 忘记 compile"才致命。

## 二、考点优先级排序（Tier 1 → Tier 4）

### ⭐⭐⭐ Tier 1 — 核心必考（务必默写/脱口而出）

1. **Keras 模型搭建/扩展 + compile/fit/evaluate**（代码题原型，几乎必考）— `ch03`, `ch06`
2. **损失函数选择 + 输出层激活对照**（softmax+交叉熵 vs MSE；为什么不用 MSE）— `ch03`
3. **Train / Validation / Test 划分 + 各自作用**（几乎每道代码题的 (d) 小问）— `ch03`, `ch04`
4. **CNN 原理**（卷积 vs 全连接三大优点、padding 作用）**+ 输出尺寸公式** $\left\lfloor\frac{W-F+2P}{S}\right\rfloor+1$ — `ch06`
5. **KNN**（lazy learning、距离+投票、用 CV 选 K、bias-variance 权衡）— `ch02`

### ⭐⭐ Tier 2 — 高频概念（能用 2–3 句讲清）

6. **过拟合与正则化**：L2 / Dropout / EarlyStopping / 减小容量 / 数据增强 — `ch05`, `ch04`
7. **权重初始化**：Xavier = $1/\sqrt{n}$（配 tanh）、He = $\sqrt{2/n}$（配 ReLU）；太大→爆炸、太小→消失 — `ch04`
8. **优化器**：SGD / Momentum / Adam 默认值 / 学习率与衰减 — `ch05`
9. **激活函数**：ReLU / sigmoid / softmax；sigmoid 的问题、dead ReLU — `ch04`
10. **BatchNormalization** 作用（Mock Q2 直接用到）— `ch04`, `ch06`
11. **经典算法 SVM / 随机森林** + GridSearchCV 调参 — `ch02`

### ⭐ Tier 3 — 次高频（了解 + 会看代码）

12. **RNN / LSTM + 词嵌入**：recurrence、梯度消失、门控、Embedding、`return_sequences=True` — `ch07`
13. **数据预处理**：reshape / 归一化 / one-hot / `get_dummies` / `np.argmax` 取标签 — `ch01`, `ch02`

### ○ Tier 4 — 了解即可（低概率代码题，概念为主）

14. 语言模型 / 注意力 / Transformer / VLM — `ch08`
15. GNN / PINN（**注意用 PyTorch，非 Keras**；概念为主）— `ch09`
16. 生成式 AI / RAG（检索+生成，缓解幻觉）— `ch10`
17. 强化学习 / DQN（exploration-exploitation、replay、Bellman、γ；不太会手写）— `ch11`
18. EDA 应用 / Agentic AI（概念）— `ch12`
19. 学习理论（VC 维 / PAC）—— 老师"不考繁琐计算"，了解概念即可 — `ch01`

## 三、复习建议

- **代码题准备**：把 Part A 的 A1（Sequential 模板）、A3（compile/fit/evaluate）、A2（CNN）背到能默写；Mock Q2 的 `.add()` 扩展写法要会。这些已作为"⭐ Must-Memorize Templates"卡片放进网站 ch03/ch06 首个知识点。
- **概念题准备**：Tier 1–2 每条都要能用 2–3 句话讲清，尤其"为什么"（为什么不用 MSE、为什么要 padding、为什么要 val/test 分开、为什么要标准化再做 KNN）。
- **网站已同步**：Mock Exam 4 题已作为官方真题卡片加入（来源标 `Mock`，可在首页"By exam → Mock Exam"单独浏览）；各章 blurb 标注了 ★ 优先级；高频考点的题目 freq 提高，会以 🔥 徽章置顶排序。

*本文件基于现有材料整理，供个人复习参考。*
