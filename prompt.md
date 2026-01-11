你是一个“资深全栈 + IoT 平台 + 低代码编排”工程师/架构师。请为我生成一个完整可运行的原型项目：基于元建模的物联网设备描述与应用开发方法（包含：设备元模型/DSL、跨电脑可发现可控制的模拟设备、Web 平台、低代码编排、以及可选的 Home Assistant / KubeEdge 导出）。项目必须从 0 到 1 提供：仓库结构、所有关键代码文件、依赖、docker-compose、一键启动脚本、以及详细运行说明。

核心背景与目标（必须严格满足）：
- 我没有真实 IoT 设备。必须提供“模拟设备”程序，并且支持与平台跨电脑通信：设备在电脑B运行，平台在电脑A运行，平台能自动发现并控制设备。
- 研究目标对齐：元建模（Meta-modeling）+ DSL + 低代码（可视化编排）+ 语义增强注册与发现 + 分层抽象与自动导出（跨平台示例：Home Assistant 与 KubeEdge 可选导出）。
- MVP 先跑通：发现 → 控制 → 状态回传 → 前端实时显示 → 低代码编排触发执行。

技术栈强制要求（除非你给出充分理由，否则按此实现）：
- Monorepo：pnpm workspace（或 npm workspace）
- 前端：Next.js + TypeScript + React
- 低代码画布：React Flow
- 后端：NestJS + TypeScript
- 通信：MQTT（Mosquitto broker）
- 数据库：PostgreSQL（用 Prisma ORM）
- 实时推送：WebSocket（NestJS Gateway）
- 本地开发：Docker Compose 一键启动（Postgres + Mosquitto + 可选 Adminer）
- 模拟设备：Node.js (TypeScript 或 JavaScript 都可，但要易运行)

========================
A. 交付物清单（必须全部生成）
========================
1) 仓库结构（必须按此或更合理的等价结构）：
- /apps/web            (Next.js 前端)
- /apps/api            (NestJS 后端)
- /apps/sim-device     (模拟设备程序)
- /packages/shared     (共享 types / topic 常量 / DTO schema)
- docker-compose.yml
- README.md
- .env.example
- pnpm-workspace.yaml (或 npm workspace 等价)
- scripts/  (一键启动/初始化脚本)

2) MQTT 协议（必须实现并在 packages/shared 里固化常量）：
Topic 约定（必须实现 v1）：
- presence: iot/v1/devices/{deviceId}/presence     (retain=true)
- desc:     iot/v1/devices/{deviceId}/desc         (retain=true)
- state:    iot/v1/devices/{deviceId}/state/{propertyName}
- event:    iot/v1/devices/{deviceId}/event/{eventName}
- cmd:      iot/v1/devices/{deviceId}/cmd/{actionName}
- resp:     iot/v1/devices/{deviceId}/resp/{requestId}

消息格式要求：
- presence JSON: { deviceId, online, ts, ip?, descTopic? }
  - 设备设置 MQTT Last Will：同一 presence topic 发布 online=false 且 retain=true
- desc JSON: { deviceId, modelId, name, capabilities, semantic{type,location,tags}, control{protocol,cmdTopicPrefix,stateTopicPrefix,respTopicPrefix} }
- cmd JSON: { requestId, actionName, params, ts }
- resp JSON: { requestId, ok, result?, error?, ts }

发现机制要求：
- 平台订阅 iot/v1/devices/+/presence；依靠 retained presence 自动恢复在线列表
- 平台能在设备上线后自动出现在 UI，无需手工输入IP

3) 模拟设备（apps/sim-device）必须实现：
- CLI 参数：--deviceId --modelId --name --mqttUrl
- 启动后：
  - 发布 retained presence online=true
  - 发布 retained desc
  - 周期性上报 state（例如亮度/温度等）
  - 可选周期性上报 event（如 overheat）
- 订阅 cmd/# 并实现 action：
  - turnOn / turnOff / setBrightness（brightness 0~100）
  - 每个命令都按 requestId 发布 resp，并更新 state
- 必须打印日志，包含收到命令/发布 state/resp
- 支持跨电脑：只要 mqttUrl 指向同一 broker，平台即可发现与控制

4) 后端（apps/api）必须实现模块：
- Prisma schema + migrations
  表至少包括：
  - device_models(id, version, name, schemaJson, createdAt)
  - devices(deviceId, name, modelId, online, lastSeen, descJson, createdAt, updatedAt)
  - device_state_log(id, deviceId, key, valueJson, ts)
  - device_event_log(id, deviceId, eventName, payloadJson, ts)
  - flows(id, name, enabled, graphJson, createdAt, updatedAt)
  - flow_runs(id, flowId, status, logsJson, startedAt, endedAt)
- MQTT Gateway Service（核心）：
  - 连接 broker（MQTT_URL）
  - 订阅 presence/desc/state/event
  - 更新 devices 表、写入 log 表
  - 提供 publishCmd 并等待 resp（Map<requestId, resolver> + timeout 5s）
- WebSocket Gateway：
  - 前端连接后按 deviceId / global channel 推送 state/event/presence 更新
- REST API（必须实现）：
  - GET  /api/devices
  - GET  /api/devices/:id
  - POST /api/devices/:id/actions/:actionName   (params in body)
  - GET  /api/device-models
  - POST /api/device-models
  - GET  /api/device-models/:id
  - PUT  /api/device-models/:id
  - GET  /api/flows
  - POST /api/flows
  - GET  /api/flows/:id
  - PUT  /api/flows/:id
  - POST /api/flows/:id/enable
  - POST /api/flows/:id/disable
  - GET  /api/flows/:id/runs
- DeviceModel 元模型校验：
  - 用 AJV 校验 DeviceModel JSON（保存/更新必须通过，否则 400 + 错误列表）
  - 提供一个示例 DeviceModel：model.sim.light.v1
- Orchestrator（低代码编排执行引擎）：
  - 从数据库加载 enabled flows
  - 监听设备 event（由 MQTT Gateway 抛出）
  - 匹配触发器后执行图（Trigger -> If -> Action）
  - If 条件：必须用安全表达式（推荐 JSONLogic；严禁直接 eval）
  - Action：调用内部 publishCmd（MQTT）
  - 每次执行写 flow_runs（包含每一步日志、耗时、错误）

5) 前端（apps/web）必须实现页面：
- 设备列表页：
  - 在线/离线、lastSeen、capabilities/tags
  - 实时刷新（WebSocket）
- 设备详情页：
  - 实时 state 面板（on/brightness）
  - event 流
  - action 控制（turnOn/turnOff/setBrightness）
- DeviceModel 管理页（DSL 编辑器）：
  - Monaco Editor 或简单 textarea（优先 Monaco）
  - 校验提示（调用后端校验或后端返回错误）
  - 保存/更新
- Flow Builder（低代码编排页，React Flow）：
  - Node types（至少）：
    1) TriggerDeviceEvent（选择 deviceId + eventName）
    2) IfCondition（JSONLogic 编辑器：输入规则 JSON）
    3) DeviceAction（选择 deviceId + actionName + params）
  - 右侧属性面板编辑节点配置
  - Validate 按钮：
    - 图必须从 Trigger 可到达 Action
    - 禁止环
    - IfCondition 必须有 true/false 两个输出端口（不同 edge）
  - Enable/Disable 按钮
  - 显示最近一次 runs 结果（可简化）
- 前端必须配置环境变量：API_BASE_URL、WS_URL

6) 可选高级交付（写在 /docs 或 README 中，代码可先 stub，但尽量实现）：
- Home Assistant MQTT Discovery 导出器：
  - 将 Light 设备导出到 homeassistant/light/{deviceId}/config
  - command_topic/state_topic 对接我们的 MQTT topic
  - 提供按钮“一键发布 discovery 配置”
- KubeEdge 导出器（至少生成 YAML）：
  - 从 DeviceModel/DeviceInstance 生成 DeviceModel/Device YAML
  - 作为“自动代码生成/跨平台映射”示例

========================
B. 必须的工程质量要求
========================
- 所有服务都要有清晰 README（含：安装、启动、环境变量、跨电脑运行步骤）
- 代码必须可运行、可 lint、关键逻辑有注释
- 错误处理要合理：
  - MQTT 断线重连
  - cmd/resp 超时
  - 设备离线时控制返回可解释错误
- Types 统一：共享 DTO/Topic 常量放 packages/shared
- 不要引入难以安装的依赖；尽量保持轻量

========================
C. 默认配置（可以改，但要说明）
========================
- API 端口：3001
- Web 端口：3000
- MQTT broker：1883
- Postgres：5432
- WebSocket：跟 API 同端口路径 /ws
- 默认 deviceId：sim-light-001
- 默认 modelId：model.sim.light.v1
