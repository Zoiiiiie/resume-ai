import { useState } from "react";

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  bg: "#F5F3EF", surface: "#FFFFFF", surfaceHigh: "#EEF0F8",
  border: "#E2DDD6", accent: "#3B5BDB", accentDim: "#2F4AC0",
  gold: "#E07B39", text: "#1A1C2E", muted: "#8A8FA8",
  danger: "#D63030", success: "#2A9D5C",
};

// ── Claude API — routed through Netlify Function proxy ────────────────────────
async function claude(system, user, json = false) {
  const res = await fetch("/.netlify/functions/claude-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: json ? system + "\n\n严格要求：只输出合法JSON，不含markdown代码块，不含任何解释。" : system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  if (json) {
    try { return JSON.parse(text.replace(/```json|```/g, "").trim()); }
    catch { return null; }
  }
  return text;
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Tag({ label, color = T.accent }) {
  return (
    <span style={{ background: color + "22", color, border: `1px solid ${color}44`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11, fontFamily: "monospace" }}>
      {label}
    </span>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, small, style = {} }) {
  const base = { borderRadius: 8, fontFamily: "inherit", fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
    transition: "all 0.15s", border: "none", fontSize: small ? 12 : 13,
    padding: small ? "5px 12px" : "9px 18px", display: "inline-flex", alignItems: "center", gap: 6 };
  const v = {
    primary: { background: T.accent, color: "#fff", boxShadow: `0 2px 8px ${T.accent}44` },
    ghost: { background: "transparent", color: T.accent, border: `1.5px solid ${T.accent}66` },
    subtle: { background: T.surfaceHigh, color: T.text, border: `1.5px solid ${T.border}` },
    danger: { background: T.danger + "10", color: T.danger, border: `1.5px solid ${T.danger}44` },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...v[variant], ...style }}>{children}</button>;
}

function Field({ label, value, onChange, placeholder, multiline, rows = 2, hint }) {
  const shared = { width: "100%", background: "#FAFAF8", border: `1.5px solid ${T.border}`, borderRadius: 8,
    color: T.text, padding: "10px 13px", fontSize: 13, fontFamily: "inherit",
    outline: "none", boxSizing: "border-box", lineHeight: 1.6, resize: "vertical" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ color: T.muted, fontSize: 12 }}>{label}</label>}
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={shared} />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...shared, resize: undefined }} />}
      {hint && <span style={{ color: T.muted, fontSize: 11 }}>{hint}</span>}
    </div>
  );
}

function Card({ children, style = {}, glow }) {
  return (
    <div style={{ background: T.surface, border: `1.5px solid ${glow ? T.accent + "88" : T.border}`,
      borderRadius: 14, padding: "20px 24px",
      boxShadow: glow ? `0 4px 20px ${T.accent}18` : "0 1px 4px rgba(0,0,0,0.06)", ...style }}>
      {children}
    </div>
  );
}

function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: T.accent,
          animation: `dot 1.2s ${i * 0.2}s ease-in-out infinite` }} />
      ))}
      <style>{`@keyframes dot{0%,80%,100%{opacity:.2}40%{opacity:1}}`}</style>
    </span>
  );
}

function Empty({ icon, text }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 12, padding: "60px 20px", color: T.muted }}>
      <div style={{ fontSize: 36, opacity: 0.35 }}>{icon}</div>
      <div style={{ fontSize: 13 }}>{text}</div>
    </div>
  );
}

// ── Page 1: Weekly Log ────────────────────────────────────────────────────────
function WeeklyPage({ logs, setLogs }) {
  const [form, setForm] = useState({ name: "", project: "", goals: "", done: "", result: "" });
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const s = k => v => setForm(p => ({ ...p, [k]: v }));

  const generate = async () => {
    if (!form.done.trim()) return;
    setLoading(true); setSummary(""); setTags([]);
    try {
      const r = await claude(
        `你是职业发展顾问。分析周报，返回JSON：{"summary":"2句话摘要，突出动词和成果，50字内","tags":["技能标签1","标签2","标签3"]}`,
        `项目：${form.project||"未填"}\n目标：${form.goals||"未填"}\n完成：${form.done}\n结果：${form.result||"未填"}`,
        true
      );
      if (r) { setSummary(r.summary || ""); setTags(r.tags || []); }
    } finally { setLoading(false); }
  };

  const save = () => {
    setLogs(prev => [{
      id: Date.now(), name: form.name, project: form.project || "未命名项目",
      goals: form.goals, done: form.done, result: form.result,
      summary, tags, week: `第${prev.length + 1}周`,
      date: new Date().toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }),
    }, ...prev]);
    setForm({ name: "", project: "", goals: "", done: "", result: "" });
    setSummary(""); setTags([]);
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <h2 style={{ color: T.text, fontSize: 18, fontWeight: 700, margin: 0 }}>填写本周工作记录</h2>
          <p style={{ color: T.muted, fontSize: 13, margin: "4px 0 0" }}>真实填写后，AI 帮你提炼成简历语言</p>
        </div>
        <Field label="你的名字（可选）" value={form.name} onChange={s("name")} placeholder="e.g. 李明" />
        <Field label="项目 / 工作方向" value={form.project} onChange={s("project")} placeholder="e.g. 电商首页改版、数据平台搭建" />
        <Field label="本周目标" value={form.goals} onChange={s("goals")} placeholder="本周计划做什么？" multiline rows={2} />
        <Field label="实际完成了什么 *" value={form.done} onChange={s("done")}
          placeholder="尽量详细！e.g. 完成了3套原型方案、和研发对齐了技术方案、跑通了AB测试流程..." multiline rows={4}
          hint="越详细，AI 提炼越准确" />
        <Field label="成果数据（可选）" value={form.result} onChange={s("result")}
          placeholder="e.g. 点击率提升15%、节省3小时/天、覆盖1万用户" />

        {summary && (
          <Card glow style={{ padding: "14px 18px", background: "#F0F4FF" }}>
            <div style={{ color: T.accent, fontSize: 11, marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>✦ AI 摘要</div>
            <div style={{ color: T.text, fontSize: 13, lineHeight: 1.7 }}>{summary}</div>
            {tags.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {tags.map(t => <Tag key={t} label={t} />)}
              </div>
            )}
          </Card>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Btn onClick={generate} disabled={loading || !form.done.trim()} variant="ghost">
            {loading ? <><Dots /> 分析中…</> : "✦ AI 生成摘要"}
          </Btn>
          {summary && <Btn onClick={save}>保存到记录库</Btn>}
          {saved && <span style={{ color: T.success, fontSize: 12 }}>✓ 已保存！</span>}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ color: T.text, fontSize: 15, fontWeight: 600, margin: 0 }}>
          记录库 <span style={{ color: T.muted, fontWeight: 400 }}>({logs.length} 条)</span>
        </h3>
        {logs.length === 0
          ? <Empty icon="◷" text="还没有周报，填写第一条吧" />
          : logs.map(log => (
            <Card key={log.id} style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: T.text, fontWeight: 600 }}>{log.project}</span>
                <span style={{ color: T.muted, fontSize: 11 }}>{log.week} · {log.date}</span>
              </div>
              <p style={{ color: T.muted, fontSize: 12, lineHeight: 1.6, margin: "0 0 10px" }}>{log.summary}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {log.tags?.map(t => <Tag key={t} label={t} />)}
                {log.result && <Tag label={log.result} color={T.gold} />}
              </div>
            </Card>
          ))
        }
      </div>
    </div>
  );
}

// ── Page 2: STAR Refine ───────────────────────────────────────────────────────
function StarPage({ logs, starItems, setStarItems }) {
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");

  const refineText = async () => {
    if (!raw.trim()) return;
    setLoading(true);
    try {
      const r = await claude(
        `你是顶级简历专家，擅长STAR法则（情境-任务-行动-结果）。
将用户输入的工作描述转化为专业简历条目。
返回JSON数组，每个元素：{"original":"原始描述","star":"STAR优化版，强动词开头，含数据，50字内","tags":["标签1","标签2"],"score":质量分0-100}
如果有多条（换行分隔），分别处理。`,
        raw.trim(), true
      );
      if (Array.isArray(r)) {
        setStarItems(prev => [...r.map((x, i) => ({ ...x, id: Date.now() + i })), ...prev]);
        setRaw("");
      }
    } finally { setLoading(false); }
  };

  const refineFromLogs = async () => {
    if (!logs.length) return;
    setLoading(true);
    try {
      const text = logs.map((l, i) =>
        `${i+1}. 项目：${l.project}，完成：${l.done}${l.result ? "，结果：" + l.result : ""}`
      ).join("\n");
      const r = await claude(
        `你是顶级简历专家。将周报记录转化为STAR法则简历条目。
返回JSON数组，每个元素：{"original":"周报摘要（20字内）","star":"STAR优化版，强动词开头，50字内","tags":["标签"],"score":0-100}`,
        text, true
      );
      if (Array.isArray(r)) setStarItems(prev => [...r.map((x, i) => ({ ...x, id: Date.now() + i })), ...prev]);
    } finally { setLoading(false); }
  };

  const scoreColor = s => s >= 85 ? T.success : s >= 65 ? T.gold : T.danger;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ color: T.text, fontSize: 18, fontWeight: 700, margin: 0 }}>STAR 简历提炼</h2>
          <p style={{ color: T.muted, fontSize: 13, margin: "4px 0 0" }}>
            {logs.length > 0
              ? `已有 ${logs.length} 条周报可转化，也可直接粘贴工作描述`
              : "粘贴工作描述，AI 转化为有力的简历表达"}
          </p>
        </div>
        {logs.length > 0 && (
          <Btn onClick={refineFromLogs} disabled={loading} variant="ghost">
            {loading ? <><Dots /> 转化中…</> : `✦ 转化全部周报 (${logs.length}条)`}
          </Btn>
        )}
      </div>

      <Card>
        <div style={{ color: T.muted, fontSize: 12, marginBottom: 8 }}>直接粘贴工作描述（支持多行，每行一条）</div>
        <textarea value={raw} onChange={e => setRaw(e.target.value)}
          placeholder={"例如：\n负责APP的性能优化工作\n和客户沟通了需求，完成了设计稿\n每周出数据分析报告，支持运营决策"}
          rows={4}
          style={{ width: "100%", background: "#FAFAF8", border: `1.5px solid ${T.border}`, borderRadius: 8,
            color: T.text, padding: "10px 13px", fontSize: 13, fontFamily: "inherit",
            outline: "none", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6 }} />
        <div style={{ marginTop: 10 }}>
          <Btn onClick={refineText} disabled={loading || !raw.trim()}>
            {loading ? <><Dots /> AI 提炼中…</> : "✦ AI STAR 提炼"}
          </Btn>
        </div>
      </Card>

      {starItems.length === 0
        ? <Empty icon="✦" text="提炼后的简历条目会出现在这里" />
        : starItems.map(item => (
          <Card key={item.id}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 20 }}>
              <div>
                <div style={{ color: T.muted, fontSize: 11, marginBottom: 8 }}>● 原始描述</div>
                <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.6, margin: 0 }}>{item.original}</p>
              </div>
              <div>
                <div style={{ color: T.accent, fontSize: 11, marginBottom: 8 }}>✦ STAR 优化</div>
                {editId === item.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} autoFocus
                      style={{ width: "100%", background: "#FAFAF8", border: `1.5px solid ${T.accent}`,
                        borderRadius: 6, color: T.text, padding: "8px 10px", fontSize: 13,
                        fontFamily: "inherit", resize: "none", boxSizing: "border-box", outline: "none" }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn small onClick={() => { setStarItems(p => p.map(x => x.id === item.id ? { ...x, star: editText } : x)); setEditId(null); }}>保存</Btn>
                      <Btn small variant="subtle" onClick={() => setEditId(null)}>取消</Btn>
                    </div>
                  </div>
                ) : (
                  <p onClick={() => { setEditId(item.id); setEditText(item.star); }} title="点击编辑"
                    style={{ color: T.text, fontSize: 13, lineHeight: 1.6, margin: 0, cursor: "text",
                      borderRadius: 6, padding: "4px 6px", border: "1px solid transparent" }}>
                    {item.star}
                  </p>
                )}
              </div>
            </div>
            <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {item.tags?.map(t => <Tag key={t} label={t} />)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 80, height: 4, background: T.border, borderRadius: 2 }}>
                    <div style={{ width: `${item.score}%`, height: "100%", background: scoreColor(item.score), borderRadius: 2 }} />
                  </div>
                  <span style={{ color: scoreColor(item.score), fontSize: 11, fontFamily: "monospace" }}>{item.score}</span>
                </div>
                <Btn small variant="danger" onClick={() => setStarItems(p => p.filter(x => x.id !== item.id))}>删除</Btn>
              </div>
            </div>
          </Card>
        ))
      }
    </div>
  );
}

// ── Page 3: JD Match ──────────────────────────────────────────────────────────
function JDPage({ starItems }) {
  const [jd, setJd] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!jd.trim()) return;
    setLoading(true); setResult(null);
    try {
      const resumeText = starItems.length > 0
        ? starItems.map((x, i) => `${i+1}. ${x.star}`).join("\n")
        : "（用户暂无简历条目）";
      const r = await claude(
        `你是职业顾问和简历专家。分析JD，对比候选人简历，返回JSON：
{"match_score":0-100,"summary":"2-3句总评","jd_keywords":["关键词1","关键词2","关键词3","关键词4","关键词5"],"strengths":["优势1","优势2","优势3"],"gaps":["差距1","差距2"],"optimized":[{"index":1,"original":"原条目摘要","suggestion":"优化后表达"}],"advice":"最重要的一条求职建议"}`,
        `目标JD：\n${jd}\n\n候选人简历：\n${resumeText}`,
        true
      );
      setResult(r);
    } finally { setLoading(false); }
  };

  const sc = s => s >= 80 ? T.success : s >= 60 ? T.gold : T.danger;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <h2 style={{ color: T.text, fontSize: 18, fontWeight: 700, margin: 0 }}>JD 智能匹配</h2>
          <p style={{ color: T.muted, fontSize: 13, margin: "4px 0 0" }}>
            粘贴目标岗位 JD，AI 分析匹配度并给出优化建议
            {starItems.length === 0 && <span style={{ color: T.gold }}> · 建议先添加简历条目</span>}
          </p>
        </div>
        <textarea value={jd} onChange={e => setJd(e.target.value)}
          placeholder={"粘贴完整 JD，例如：\n\n岗位：高级产品经理\n\n岗位职责：\n1. 负责核心产品规划与设计\n2. 数据驱动产品增长\n\n岗位要求：\n1. 5年以上产品经验\n2. 有用户增长经验"}
          rows={16}
          style={{ flex: 1, background: "#FAFAF8", border: `1.5px solid ${T.border}`, borderRadius: 8,
            color: T.text, padding: "14px", fontSize: 13, fontFamily: "inherit",
            outline: "none", boxSizing: "border-box", resize: "none", lineHeight: 1.7 }} />
        <Btn onClick={analyze} disabled={loading || !jd.trim()}>
          {loading ? <><Dots /> AI 分析中…</> : "✦ 开始匹配分析"}
        </Btn>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", maxHeight: "80vh" }}>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 16, padding: "80px 0" }}>
            <Dots /><div style={{ color: T.muted, fontSize: 13 }}>AI 深度分析中…</div>
          </div>
        )}
        {!result && !loading && <Empty icon="◎" text="粘贴 JD 后点击分析" />}
        {result && (
          <>
            <Card style={{ textAlign: "center", padding: 28 }}>
              <div style={{ fontSize: 56, fontWeight: 900, color: sc(result.match_score),
                fontFamily: "monospace", lineHeight: 1 }}>{result.match_score}</div>
              <div style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>综合匹配度</div>
              <p style={{ color: T.text, fontSize: 13, lineHeight: 1.6, margin: "12px 0 0" }}>{result.summary}</p>
            </Card>

            <Card>
              <div style={{ color: T.muted, fontSize: 11, marginBottom: 10 }}>JD 核心关键词</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {result.jd_keywords?.map(k => <Tag key={k} label={k} color={T.gold} />)}
              </div>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Card>
                <div style={{ color: T.success, fontSize: 11, marginBottom: 10 }}>✓ 你的优势</div>
                {result.strengths?.map((s, i) => (
                  <div key={i} style={{ color: T.text, fontSize: 12, lineHeight: 1.6, marginBottom: 6, display: "flex", gap: 8 }}>
                    <span style={{ color: T.success }}>·</span>{s}
                  </div>
                ))}
              </Card>
              <Card>
                <div style={{ color: T.danger, fontSize: 11, marginBottom: 10 }}>△ 待补强</div>
                {result.gaps?.map((g, i) => (
                  <div key={i} style={{ color: T.text, fontSize: 12, lineHeight: 1.6, marginBottom: 6, display: "flex", gap: 8 }}>
                    <span style={{ color: T.danger }}>·</span>{g}
                  </div>
                ))}
              </Card>
            </div>

            {result.optimized?.length > 0 && (
              <Card>
                <div style={{ color: T.muted, fontSize: 11, marginBottom: 12 }}>✦ 条目定向优化建议</div>
                {result.optimized.map((opt, i) => (
                  <div key={i} style={{ marginBottom: 14, paddingBottom: 14,
                    borderBottom: i < result.optimized.length - 1 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ color: T.muted, fontSize: 11, marginBottom: 4 }}>原：{opt.original}</div>
                    <div style={{ color: T.accent, fontSize: 13, lineHeight: 1.6 }}>→ {opt.suggestion}</div>
                  </div>
                ))}
              </Card>
            )}

            {result.advice && (
              <Card style={{ background: "#FFF8F0", border: `1.5px solid ${T.gold}44` }}>
                <div style={{ color: T.gold, fontSize: 11, marginBottom: 8, fontWeight: 600 }}>💡 关键建议</div>
                <div style={{ color: T.text, fontSize: 13, lineHeight: 1.6 }}>{result.advice}</div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Page 4: Resume Preview ────────────────────────────────────────────────────
function ResumePage({ logs, starItems }) {
  const [profile, setProfile] = useState({ name: "", title: "", email: "", phone: "", school: "", degree: "", year: "", skills: "" });
  const [resumeHTML, setResumeHTML] = useState("");
  const [loading, setLoading] = useState(false);
  const s = k => v => setProfile(p => ({ ...p, [k]: v }));

  const build = async () => {
    setLoading(true);
    try {
      const items = starItems.length > 0
        ? starItems.map(x => x.star).join("\n")
        : logs.map(l => l.summary).filter(Boolean).join("\n");

      const html = await claude(
        `你是专业简历设计师。根据用户信息生成美观的HTML简历片段。
要求：
1. 返回可直接渲染的HTML片段，从<div>开始，内嵌所有CSS
2. 白色背景，专业商务风格，清晰视觉层次，字体用系统中文字体
3. 结构：顶部个人信息 → 工作经历 → 教育背景 → 技能
4. 工作条目用<ul><li>呈现，数字用<b>标注
5. 只返回HTML，不含任何解释文字`,
        `姓名：${profile.name||"姓名"}\n职位：${profile.title||"职位"}\n邮箱：${profile.email||""}\n电话：${profile.phone||""}\n学校：${profile.school||""}，专业：${profile.degree||""}，毕业：${profile.year||""}\n技能：${profile.skills||""}\n\n工作经历：\n${items || "（暂无内容，请先添加简历条目）"}`
      );
      setResumeHTML(html);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <h2 style={{ color: T.text, fontSize: 18, fontWeight: 700, margin: 0 }}>生成简历预览</h2>
          <p style={{ color: T.muted, fontSize: 13, margin: "4px 0 0" }}>填写信息，AI 生成完整排版</p>
        </div>
        <Card style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: T.muted, fontSize: 11 }}>个人信息</div>
          <Field label="姓名" value={profile.name} onChange={s("name")} placeholder="张三" />
          <Field label="目标职位" value={profile.title} onChange={s("title")} placeholder="高级产品经理" />
          <Field label="邮箱" value={profile.email} onChange={s("email")} placeholder="name@email.com" />
          <Field label="电话" value={profile.phone} onChange={s("phone")} placeholder="138-0000-0000" />
        </Card>
        <Card style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: T.muted, fontSize: 11 }}>教育背景</div>
          <Field label="学校" value={profile.school} onChange={s("school")} placeholder="北京大学" />
          <Field label="专业" value={profile.degree} onChange={s("degree")} placeholder="计算机科学" />
          <Field label="毕业年份" value={profile.year} onChange={s("year")} placeholder="2021" />
        </Card>
        <Card style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: T.muted, fontSize: 11 }}>技能</div>
          <Field value={profile.skills} onChange={s("skills")} placeholder="Python · SQL · 产品设计" multiline rows={2} />
        </Card>
        <div style={{ color: T.muted, fontSize: 12 }}>
          将使用 <b style={{ color: T.accent }}>{starItems.length}</b> 条简历条目
          {starItems.length === 0 && logs.length > 0 && `（回退使用 ${logs.length} 条周报摘要）`}
        </div>
        <Btn onClick={build} disabled={loading}>
          {loading ? <><Dots /> AI 生成中…</> : "✦ 生成简历"}
        </Btn>
        {resumeHTML && (
          <Btn variant="ghost" onClick={() => navigator.clipboard.writeText(resumeHTML).catch(() => {})}>
            复制 HTML 代码
          </Btn>
        )}
      </div>

      <div>
        <div style={{ color: T.muted, fontSize: 11, marginBottom: 8 }}>简历预览</div>
        <div style={{ background: "#fff", borderRadius: 10, minHeight: 640, overflow: "auto",
          boxShadow: "0 2px 24px rgba(59,91,219,0.10), 0 1px 4px rgba(0,0,0,0.06)", border: `1px solid ${T.border}` }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: 400, gap: 16, color: "#aaa" }}>
              <Dots /><div style={{ fontSize: 13 }}>AI 排版生成中…</div>
            </div>
          ) : resumeHTML ? (
            <div dangerouslySetInnerHTML={{ __html: resumeHTML }}
              style={{ padding: "32px 40px", fontFamily: "'PingFang SC','Hiragino Sans GB','Microsoft YaHei',Georgia,serif" }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: 400, gap: 12, color: "#ccc" }}>
              <div style={{ fontSize: 36, opacity: 0.3 }}>∑</div>
              <div style={{ fontSize: 13 }}>填写信息后点击「生成简历」</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
const NAV = [
  { id: "weekly", label: "周记录", icon: "◷" },
  { id: "star",   label: "STAR 提炼", icon: "✦" },
  { id: "jd",     label: "JD 匹配", icon: "◎" },
  { id: "resume", label: "生成简历", icon: "∑" },
];

export default function App() {
  const [page, setPage] = useState("weekly");
  const [logs, setLogs] = useState([]);
  const [starItems, setStarItems] = useState([]);
  const Pages = { weekly: WeeklyPage, star: StarPage, jd: JDPage, resume: ResumePage };
  const Active = Pages[page];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text,
      fontFamily: "'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif",
      backgroundImage: "radial-gradient(circle at 20% 10%, rgba(59,91,219,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(224,123,57,0.04) 0%, transparent 50%)" }}>

      <header style={{ position: "sticky", top: 0, zIndex: 100, height: 56,
        borderBottom: `1px solid ${T.border}`, background: "rgba(245,243,239,0.92)",
        backdropFilter: "blur(12px)", display: "flex", alignItems: "center", padding: "0 28px", gap: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg, ${T.accent}, ${T.accentDim})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#fff", boxShadow: `0 2px 8px ${T.accent}44` }}>R</div>
          <span style={{ fontWeight: 800, fontSize: 15, color: T.text, letterSpacing: -0.3 }}>ResumeAI</span>
          <span style={{ color: T.muted, fontSize: 10, border: `1px solid ${T.border}`,
            borderRadius: 4, padding: "1px 6px", marginLeft: 2, background: T.surface }}>demo</span>
        </div>

        <nav style={{ display: "flex", gap: 2 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              background: page === n.id ? T.accent + "12" : "transparent", border: "none",
              borderBottom: `2px solid ${page === n.id ? T.accent : "transparent"}`,
              padding: "8px 16px", color: page === n.id ? T.accent : T.muted,
              cursor: "pointer", fontSize: 13, fontFamily: "inherit",
              fontWeight: page === n.id ? 700 : 400, transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 6 }}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>

        <div style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center" }}>
          {[
            { label: `${logs.length} 条周报`, active: logs.length > 0, color: T.success },
            { label: `${starItems.length} 条简历`, active: starItems.length > 0, color: T.accent },
          ].map(({ label, active, color }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, color: T.muted, fontSize: 11 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? color : T.border }} />
              {label}
            </div>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 28px 60px" }}>
        <Active logs={logs} setLogs={setLogs} starItems={starItems} setStarItems={setStarItems} />
      </main>
    </div>
  );
}
