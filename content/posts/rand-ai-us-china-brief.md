+++ 
title = "兰德公司《美国与中国的人工智能发展》核心发现（中英对照·精简版）"
date = 2026-09-28T13:00:00+08:00
author = "Songsir（松朗）"
description = "基于1181家AI开发企业的实证数据，RAND最新报告揭示中美AI产业生态：底层架构高度趋同，真正分野在落地形态——美国偏纯软件与知识密集型行业，中国偏具身载体与实体经济；中国开源模型正以约1/4价格快速追赶。"
categories = ["科技前沿"]
tags = ["AI","中美","RAND","具身智能","开源模型"]
featured_image = "/images/rand-ai-us-china-brief-cover.png"
+++ 

## 执行摘要 / Executive Summary

> 原始报告 / Source：RAND RRA5043-1《AI Development in the United States and China — Key Findings》，美国兰德公司 AI、安全与技术中心，2026-08-17 发布。本精简版为中英对照编译，数据与判断以原报告为准。

本报告用一份 1,181 家商业化 AI 开发企业的实证数据集，系统刻画中美两国 AI 产业生态。核心结论是：**两国在底层技术架构上高度趋同，真正显著的分野不在模型，而在 AI 的落地形态与应用领域**——美国偏「纯软件 + 知识密集型行业」，中国偏「具身载体 + 实体经济」。此外，中国开源模型正凭借约 1/4—1/5 的价格提供接近前沿的性能，开发者采用份额快速追赶美国。

**核心数字 / Headline numbers**

- 样本：26,629 个候选机构 → 1,181 家最终样本（筛选率 4.4%）；美国 743 家 / 中国 438 家
- 纯软件型 AI 企业占比：美国 **61%** vs 中国 **26%**
- 基础模型开发企业占比：中美均约 19–20%；Transformer 架构占比 美国 28% / 中国 27%
- OpenRouter 平台中国模型 token 份额：2024 年末近零 → 2026 年 4 月与美国基本持平

## 研究背景与方法 / Background & Method

美国政策界长期流传两种判断：其一，美国 AI 技术路线过度集中于 Transformer、缺乏多元化；其二，中国在具身智能（机器人、自动驾驶、工业系统）上可能形成先发优势。兰德研究团队据此构建了全新数据集进行实证检验。

研究团队从 **26,629** 个候选机构中，依据「自主开发生成式 AI 或具身智能模型」且「面向商业市场」等严格标准，筛出 1,181 家符合条件的企业（美国 743 家、中国 438 家），数据截取时间为 2026 年 1—2 月。仅做下游部署、系统集成或只提供算力/数据等基础设施的企业不在样本内。

| 维度 / Dimension | 美国 / U.S. | 中国 / China |
| --- | --- | --- |
| 样本企业数 / Firms | 743 | 438 |
| 成立年份中位数 / Median founded | 2016 | 2014 |
| 上市企业占比 / Listed | 13.6% | 33.8% |
| 隶属多元化集团 / Conglomerate | 28.8% | 56.6% |
| 具军事 AI 关联 / Military-AI link | 30.0% | 16.2%* |

\* 中国军工相关活动公开披露有限，此比例可能偏低。 / * Chinese defense-related activity is less publicly disclosed; this figure likely understates the true share.

## 核心发现 / Key Findings

### 发现 1　技术架构高度趋同 / Finding 1 — Near-Identical Architectures

中美 AI 企业在底层架构上的相似度远超外界通常认知——「中国在非 Transformer 路线上形成显著偏移」的担忧，在企业层面数据中未获支持。

| 维度 / Dimension | 美国 / U.S. | 中国 / China |
| --- | --- | --- |
| 采用 Transformer / Transformer-based | 28% | 27% |
| 采用 CNN / CNN-based | 13% | 11% |
| 扩散模型 / Diffusion models | ~7% | ~7% |
| 基础模型开发占比 / Foundation-model devs | ~20% | ~19% |
| 应用型 AI 产品占比 / Applied-AI product firms | ~90% | ~75% |
| 发布开源权重模型 / Open-weight publishers | ~15% | ~17% |

### 发现 2　最大分野：软件 vs 具身 / Finding 2 — Software vs. Embodiment

产品形态是两国差异最显著的维度。中国企业更倾向「软件 + 硬件」协同落地，把智能放进机器人、汽车与工厂；美国企业更偏纯软件交付，服务医疗、科研与网络安全等知识密集型行业。

| 维度 / Dimension | 美国 / U.S. | 中国 / China |
| --- | --- | --- |
| 纯软件产品 / Pure-software products | **61%** | **26%** |
| 人形机器人 / Humanoid robots | 2% | 12% |
| 地面/四足机器人 / Ground-quadruped | 16% | 24% |
| 自动驾驶汽车 / Autonomous vehicles | 7% | 14% |
| 制造业 / Manufacturing | 15% | 30% |
| 交通 / Transportation | 15% | 26% |
| 能源 / Energy | 6% | 12% |
| 医疗保健/生命科学 / Healthcare & life sci | 28% | 17% |
| 科学研究 / Scientific research | 10% | 5% |
| 网络安全 / Cybersecurity | 7% | 3% |
| 国防 / Defense | 13% | 4%* |

{{< figure src="/images/rand-ai-us-china-brief-01.png" caption="图1 中美AI企业生态分野：纯软件 vs 具身（RAND RRA5043-1）" >}}

> **战略含义**：若通往 AGI 的路径需要与机器人、世界模型、物理环境学习协同演进，中国企业较宽的具身 AI 组合构成美国以软件为主的生态所缺乏的一项「对冲」。

### 发现 3　中国开源模型成本优势正在转化为采用 / Finding 3 — China's Open-Source Cost Advantage

OpenRouter（面向开发者的模型路由网关，覆盖约 300 个前沿与开源模型）的 token 调用量显示：**2024 年末美国模型约占前七名模型 token 量的 85%—90%，中国接近于零；到 2026 年 4 月两国份额已大致相当**。截至该月平台流量居前的 9 家供应商中，中国占 6 家（腾讯、月之暗面、DeepSeek、阿里通义、MiniMax、智谱），美国占 3 家（Anthropic、谷歌、OpenAI）。

| 价格/性能区间 | 中国开源 / China (open) | 美国专有 / U.S. (proprietary) |
| --- | --- | --- |
| 每百万 token 成本 / Cost | ~$1–$2 | ~$1–$12 |
| 外部智能基准分 / Benchmark | ~48–54 | ~48–60 |

{{< figure src="/images/rand-ai-us-china-brief-02.png" caption="图2 OpenRouter平台中美模型token份额变化（2024末→2026-04，示意）" >}}

> **数据使用注意**：OpenRouter 用户偏技术型、成本敏感型开发者，更适合反映变化趋势，不能直接等同于全球 AI 市场份额。兰德另一项全网流量分析显示，同期中国模型的全球份额约由 3% 升至 13%，明显低于 OpenRouter 所呈现的水平。

## 局限与边界 / Limitations

- 企业信息采集于 2026 年 1—2 月，只能反映当时状况；
- 中美企业公开信息完整度不同，中国企业在部分变量上的缺失率更高，相关计数应视为下限；
- 样本只覆盖商业企业，高校、政府研究机构及其他非营利主体均未纳入；
- 本报告以美国政策争论为问题起点，结论适合识别企业生态的结构特征，不宜直接解读为两国全部 AI 能力的排名。

> 来源 / Source：RAND Corporation, *AI Development in the United States and China: Evidence from a New Dataset of AI Developer Firms*（RRA5043-1，2026-08-17）。官方链接：https://www.rand.org/t/RRA5043-1
