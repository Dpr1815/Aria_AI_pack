import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Save,
  Power,
  PowerOff,
  Settings,
  Mic,
  Monitor,
  ToggleLeft,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils";
import { useLabels } from "@/i18n";
import { useAgentMutations } from "../../hooks";
import type {
  Agent,
  AgentFeatures,
  RenderConfig,
  UpdateAgentPayload,
  VoiceConfig,
} from "../../types";
import { PanelError } from "@/components/ui/panel-error";
import { CatalogSelect } from "@/components/ui/catalog-select";
import {
  useConversationTypes,
  useSummaryTypes,
  useStatisticsTypes,
  useLanguages,
  useVoices,
} from "../../hooks";
/* ── Section card ────────────────────────────────────────── */

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Settings;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="panel-section flex flex-col gap-3">
      <legend className="flex items-center gap-2 panel-label">
        <Icon size={13} className="text-primary/70" />
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

/* ── Toggle row ──────────────────────────────────────────── */

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-0.5">
      <span className="panel-toggle-label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full",
          "transition-colors duration-200",
          checked ? "bg-primary" : "bg-surface-overlay",
        )}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm",
            "transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

/* ── Segmented control ───────────────────────────────────── */

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (val: T) => void;
}) {
  return (
    <div className="relative flex rounded-button bg-surface p-1">
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-1 rounded-[calc(var(--radius-button)-4px)]",
          "bg-primary/90 shadow-sm transition-all duration-200 ease-out",
        )}
        style={{
          width: `calc(${100 / options.length}% - 4px)`,
          transform: `translateX(calc(${options.indexOf(value)} * (100% + ${4 / (options.length - 1 || 1)}px)))`,
        }}
      />
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "relative z-[1] flex-1 py-1.5 text-center capitalize",
            "font-medium transition-colors duration-200",
            value === opt
              ? "text-text-inverse"
              : "text-text-secondary hover:text-text",
          )}
          style={{ fontSize: "var(--pt-sm)" }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ── Component ───────────────────────────────────────────── */

interface AgentSettingsPanelProps {
  agent: Agent;
}

export function AgentSettingsPanel({ agent }: AgentSettingsPanelProps) {
  const { agent: { settings: l } } = useLabels();
  const { updateAgent, activateAgent, deactivateAgent } = useAgentMutations(
    agent._id,
  );

  const [label, setLabel] = useState(agent.label);
  const [voice, setVoice] = useState<VoiceConfig>(agent.voice);
  const [features, setFeatures] = useState<AgentFeatures>(agent.features);
  const [render, setRender] = useState<RenderConfig>(agent.render);
  const [conversationTypeId, setConversationTypeId] = useState(
    agent.conversationTypeId ?? "",
  );
  const [summaryTypeId, setSummaryTypeId] = useState(agent.summaryTypeId ?? "");
  const [statisticsTypeId, setStatisticsTypeId] = useState(
    agent.statisticsTypeId ?? "",
  );

  /* ── Catalog data ──────────────────────────────────────── */
  const { data: languages, isLoading: languagesLoading } = useLanguages(
    conversationTypeId || undefined,
  );
  const { data: voices, isLoading: voicesLoading } = useVoices(
    conversationTypeId && voice.languageCode ? voice.languageCode : undefined,
  );
  const { data: conversationTypes, isLoading: conversationTypesLoading } =
    useConversationTypes();
  const { data: summaryTypes, isLoading: summaryTypesLoading } =
    useSummaryTypes(conversationTypeId || undefined);
  const { data: statisticsTypes, isLoading: statisticsTypesLoading } =
    useStatisticsTypes(summaryTypeId || undefined);

  /* Reset dependents when parent changes (cascade: language → voice name) */
  const prevLanguageRef = useRef(voice.languageCode);
  useEffect(() => {
    if (prevLanguageRef.current !== voice.languageCode) {
      const wasInitial = prevLanguageRef.current === agent.voice.languageCode;
      prevLanguageRef.current = voice.languageCode;
      if (!wasInitial) {
        setVoice((v) => ({ ...v, name: "" }));
      }
    }
  }, [voice.languageCode, agent.voice.languageCode]);

  /* Reset dependents when parent changes (cascade: conversation → language + summary → statistics) */
  const prevConversationRef = useRef(conversationTypeId);
  useEffect(() => {
    if (prevConversationRef.current !== conversationTypeId) {
      const wasInitial = prevConversationRef.current === (agent.conversationTypeId ?? "");
      prevConversationRef.current = conversationTypeId;
      if (!wasInitial) {
        setVoice((v) => ({ ...v, languageCode: "", name: "" }));
        setSummaryTypeId("");
        setStatisticsTypeId("");
      }
    }
  }, [conversationTypeId, agent.conversationTypeId]);

  const prevSummaryRef = useRef(summaryTypeId);
  useEffect(() => {
    if (prevSummaryRef.current !== summaryTypeId) {
      const wasInitial = prevSummaryRef.current === (agent.summaryTypeId ?? "");
      prevSummaryRef.current = summaryTypeId;
      if (!wasInitial) {
        setStatisticsTypeId("");
      }
    }
  }, [summaryTypeId, agent.summaryTypeId]);

  const agentJson = JSON.stringify({
    label: agent.label,
    voice: agent.voice,
    features: agent.features,
    render: agent.render,
    conversationTypeId: agent.conversationTypeId ?? "",
    summaryTypeId: agent.summaryTypeId ?? "",
    statisticsTypeId: agent.statisticsTypeId ?? "",
  });

  useMemo(() => {
    const parsed = JSON.parse(agentJson) as {
      label: string;
      voice: VoiceConfig;
      features: AgentFeatures;
      render: RenderConfig;
      conversationTypeId: string;
      summaryTypeId: string;
      statisticsTypeId: string;
    };
    setLabel(parsed.label);
    setVoice(parsed.voice);
    setFeatures(parsed.features);
    setRender(parsed.render);
    setConversationTypeId(parsed.conversationTypeId);
    setSummaryTypeId(parsed.summaryTypeId);
    setStatisticsTypeId(parsed.statisticsTypeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentJson]);

  const isDirty =
    JSON.stringify({
      label,
      voice,
      features,
      render,
      conversationTypeId,
      summaryTypeId,
      statisticsTypeId,
    }) !== agentJson;

  const handleSave = useCallback(() => {
    const payload: UpdateAgentPayload = {};
    if (label !== agent.label) payload.label = label;
    if (JSON.stringify(voice) !== JSON.stringify(agent.voice))
      payload.voice = voice;
    if (JSON.stringify(features) !== JSON.stringify(agent.features))
      payload.features = features;
    if (JSON.stringify(render) !== JSON.stringify(agent.render))
      payload.render = render;
    if (conversationTypeId !== (agent.conversationTypeId ?? ""))
      payload.conversationTypeId = conversationTypeId || undefined;
    if (summaryTypeId !== (agent.summaryTypeId ?? ""))
      payload.summaryTypeId = summaryTypeId || undefined;
    if (statisticsTypeId !== (agent.statisticsTypeId ?? ""))
      payload.statisticsTypeId = statisticsTypeId || undefined;

    if (Object.keys(payload).length > 0) updateAgent.mutate(payload);
  }, [
    label,
    voice,
    features,
    render,
    conversationTypeId,
    summaryTypeId,
    statisticsTypeId,
    agent,
    updateAgent,
  ]);

  const isActive = agent.status === "active";
  const statusPending = activateAgent.isPending || deactivateAgent.isPending;

  const toggleStatus = useCallback(() => {
    if (isActive) deactivateAgent.mutate();
    else activateAgent.mutate();
  }, [isActive, activateAgent, deactivateAgent]);

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="panel-header-gradient relative z-[1] flex items-center justify-between border-b border-border px-[var(--panel-px)] py-[var(--panel-py)]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-light">
            <Settings size={15} className="text-primary" />
          </div>
          <h3 className="panel-title">{l.title}</h3>
        </div>

        <button
          type="button"
          disabled={statusPending}
          onClick={toggleStatus}
          className={cn(
            "flex items-center gap-1.5 rounded-button px-3 py-1.5 font-semibold",
            "transition-colors",
            isActive
              ? "bg-success/15 text-success hover:bg-success/25"
              : "bg-error/15 text-error hover:bg-error/25",
          )}
          style={{ fontSize: "var(--pt-xs)" }}
        >
          {isActive ? <Power size={12} /> : <PowerOff size={12} />}
          {isActive ? l.active : l.inactive}
        </button>
      </div>
      <PanelError
        errors={[updateAgent.error, activateAgent.error, deactivateAgent.error]}
      />
      {/* ── Form ── */}
      <div className="panel-scroll flex-1 overflow-y-auto px-[var(--panel-px)] py-[var(--panel-py)]">
        <div className="flex flex-col" style={{ gap: "var(--panel-gap)" }}>
          <Section title={l.identity} icon={Settings}>
            <Input
              label={l.agentName}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={l.agentNamePlaceholder}
            />
          </Section>

          <Section title={l.render} icon={Monitor}>
            <SegmentedControl
              options={["avatar", "presentation"] as const}
              value={render.mode}
              onChange={(m) =>
                setRender((r) => ({
                  ...r,
                  mode: m,
                  ...(m === "avatar" ? { presentation: undefined } : {}),
                }))
              }
            />
            {render.mode === "presentation" && (
              <div className="animate-[fade-in_200ms_ease-out]">
                <Input
                  label={l.presentationLink}
                  value={render.presentation?.link ?? ""}
                  onChange={(e) =>
                    setRender((r) => ({
                      ...r,
                      presentation: { ...r.presentation, link: e.target.value },
                    }))
                  }
                  placeholder={l.presentationLinkPlaceholder}
                />
              </div>
            )}
          </Section>
          <Section title={l.processing} icon={Database}>
            <CatalogSelect
              label={l.conversationType}
              value={conversationTypeId}
              onChange={setConversationTypeId}
              options={conversationTypes}
              isLoading={conversationTypesLoading}
              placeholder={l.conversationTypePlaceholder}
              clearable
            />
            <CatalogSelect
              label={l.summaryType}
              value={summaryTypeId}
              onChange={setSummaryTypeId}
              options={summaryTypes}
              isLoading={summaryTypesLoading}
              placeholder={
                conversationTypeId
                  ? l.summaryTypePlaceholder
                  : l.chooseConversationTypeFirst
              }
              clearable
            />
            <CatalogSelect
              label={l.statisticsType}
              value={statisticsTypeId}
              onChange={setStatisticsTypeId}
              options={statisticsTypes}
              isLoading={statisticsTypesLoading}
              placeholder={
                summaryTypeId
                  ? l.statisticsTypePlaceholder
                  : l.chooseSummaryFirst
              }
              clearable
            />
          </Section>

          <Section title={l.voice} icon={Mic}>
            <CatalogSelect
              label={l.languageCode}
              value={voice.languageCode}
              onChange={(code) =>
                setVoice((v) => ({ ...v, languageCode: code }))
              }
              options={languages}
              isLoading={languagesLoading}
              placeholder={
                conversationTypeId
                  ? l.languageCodePlaceholder
                  : l.chooseConversationTypeFirst
              }
              clearable
            />
            <CatalogSelect
              label={l.voiceName}
              value={voice.name}
              onChange={(name) =>
                setVoice((v) => ({ ...v, name }))
              }
              options={voice.languageCode ? voices : undefined}
              isLoading={voice.languageCode ? voicesLoading : false}
              placeholder={
                voice.languageCode
                  ? l.voiceNamePlaceholder
                  : l.chooseLanguageFirst
              }
              clearable
            />
            <div className="flex flex-col gap-1.5">
              <label className="panel-field-label">{l.gender}</label>
              <SegmentedControl
                options={["MALE", "FEMALE", "NEUTRAL"] as const}
                value={voice.gender}
                onChange={(g) => setVoice((v) => ({ ...v, gender: g }))}
              />
            </div>
          </Section>

          <Section title={l.features} icon={ToggleLeft}>
            <ToggleRow
              label={l.lipSync}
              checked={features.lipSync}
              onChange={(v) => setFeatures((f) => ({ ...f, lipSync: v }))}
            />
            <ToggleRow
              label={l.sessionPersistence}
              checked={features.sessionPersistence}
              onChange={(v) =>
                setFeatures((f) => ({ ...f, sessionPersistence: v }))
              }
            />
            <ToggleRow
              label={l.autoSummary}
              checked={features.autoSummary}
              onChange={(v) => setFeatures((f) => ({ ...f, autoSummary: v }))}
            />
            <ToggleRow
              label={l.videoRecording}
              checked={features.videoRecording}
              onChange={(v) =>
                setFeatures((f) => ({ ...f, videoRecording: v }))
              }
            />
          </Section>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-border px-[var(--panel-px)] py-[clamp(0.625rem,1vw,0.875rem)]">
        <Button
          size="sm"
          disabled={!isDirty || updateAgent.isPending}
          onClick={handleSave}
          className="w-full"
        >
          {updateAgent.isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Save size={14} className="mr-2" />
              {l.saveSettings}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
