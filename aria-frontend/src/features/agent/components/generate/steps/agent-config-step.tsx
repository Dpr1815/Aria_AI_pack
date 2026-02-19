/* ─────────────────────────────────────────────────────────
 * Step 2: Agent Config — voice, render, features, processing
 *
 * Mirrors the agent settings panel sections.
 * ───────────────────────────────────────────────────────── */

import { useEffect, useRef } from "react";
import { Mic, Monitor, ToggleLeft, Database } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CatalogSelect } from "@/components/ui/catalog-select";
import { cn } from "@/utils";
import { useLabels } from "@/i18n";
import {
  useConversationTypes,
  useSummaryTypes,
  useStatisticsTypes,
  useLanguages,
  useVoices,
} from "../../../hooks";
import { useGenerateWizardStore } from "../../../stores/generate-wizard.store";
import type { VoiceConfig, RenderConfig, AgentFeatures } from "../../../types";

/* ── Section wrapper ──────────────────────────────────── */

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Mic;
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

/* ── SegmentedControl ─────────────────────────────────── */

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

/* ── ToggleRow ────────────────────────────────────────── */

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

/* ── Component ────────────────────────────────────────── */

export function AgentConfigStep() {
  const { agent: { settings: sl, generate: gl } } = useLabels();

  const voice = useGenerateWizardStore((s) => s.voice);
  const render = useGenerateWizardStore((s) => s.render);
  const features = useGenerateWizardStore((s) => s.features);
  const conversationTypeId = useGenerateWizardStore((s) => s.conversationTypeId);
  const summaryTypeId = useGenerateWizardStore((s) => s.summaryTypeId);
  const statisticsTypeId = useGenerateWizardStore((s) => s.statisticsTypeId);
  const setField = useGenerateWizardStore((s) => s.setField);

  /* ── Catalog data ──────────────────────────────────── */
  const { data: languages, isLoading: langLoading } = useLanguages(
    conversationTypeId || undefined,
  );
  const { data: voices, isLoading: voicesLoading } = useVoices(
    conversationTypeId && voice.languageCode ? voice.languageCode : undefined,
  );
  const { data: conversationTypes, isLoading: ctLoading } = useConversationTypes();
  const { data: summaryTypes, isLoading: stLoading } = useSummaryTypes(
    conversationTypeId || undefined,
  );
  const { data: statisticsTypes, isLoading: statLoading } = useStatisticsTypes(
    summaryTypeId || undefined,
  );

  /* Cascade resets (language → voice name) */
  const prevLangRef = useRef(voice.languageCode);
  useEffect(() => {
    if (prevLangRef.current !== voice.languageCode) {
      prevLangRef.current = voice.languageCode;
      setField("voice", { ...voice, name: "" });
    }
  }, [voice, setField]);

  /* Cascade resets (conversation → language + summary → statistics) */
  const prevConvRef = useRef(conversationTypeId);
  useEffect(() => {
    if (prevConvRef.current !== conversationTypeId) {
      prevConvRef.current = conversationTypeId;
      setField("voice", { ...voice, languageCode: "", name: "" });
      setField("summaryTypeId", "");
      setField("statisticsTypeId", "");
    }
  }, [conversationTypeId, setField]);

  const prevSumRef = useRef(summaryTypeId);
  useEffect(() => {
    if (prevSumRef.current !== summaryTypeId) {
      prevSumRef.current = summaryTypeId;
      setField("statisticsTypeId", "");
    }
  }, [summaryTypeId, setField]);

  const setVoice = (patch: Partial<VoiceConfig>) =>
    setField("voice", { ...voice, ...patch });

  const setRender = (patch: Partial<RenderConfig>) =>
    setField("render", { ...render, ...patch });

  const setFeature = (key: keyof AgentFeatures, val: boolean) =>
    setField("features", { ...features, [key]: val });

  return (
    <div className="flex flex-col" style={{ gap: "var(--panel-gap)" }}>
      {/* ── Render ── */}
      <Section title={gl.render} icon={Monitor}>
        <SegmentedControl
          options={["avatar", "presentation"] as const}
          value={render.mode}
          onChange={(m) =>
            setRender({
              mode: m,
              ...(m === "avatar" ? { presentation: undefined } : {}),
            })
          }
        />
        {render.mode === "presentation" && (
          <div className="animate-[fade-in_200ms_ease-out]">
            <Input
              label={sl.presentationLink}
              value={render.presentation?.link ?? ""}
              onChange={(e) =>
                setRender({
                  presentation: { ...render.presentation, link: e.target.value },
                })
              }
              placeholder={sl.presentationLinkPlaceholder}
            />
          </div>
        )}
      </Section>

      {/* ── Processing ── */}
      <Section title={gl.processing} icon={Database}>
        <CatalogSelect
          label={sl.conversationType}
          value={conversationTypeId}
          onChange={(id) => setField("conversationTypeId", id)}
          options={conversationTypes}
          isLoading={ctLoading}
          placeholder={sl.conversationTypePlaceholder}
          clearable
        />
        <CatalogSelect
          label={sl.summaryType}
          value={summaryTypeId}
          onChange={(id) => setField("summaryTypeId", id)}
          options={summaryTypes}
          isLoading={stLoading}
          placeholder={
            conversationTypeId ? sl.summaryTypePlaceholder : sl.chooseConversationTypeFirst
          }
          clearable
        />
        <CatalogSelect
          label={sl.statisticsType}
          value={statisticsTypeId}
          onChange={(id) => setField("statisticsTypeId", id)}
          options={statisticsTypes}
          isLoading={statLoading}
          placeholder={
            summaryTypeId ? sl.statisticsTypePlaceholder : sl.chooseSummaryFirst
          }
          clearable
        />
      </Section>

      {/* ── Voice ── */}
      <Section title={gl.voice} icon={Mic}>
        <CatalogSelect
          label={sl.languageCode}
          value={voice.languageCode}
          onChange={(code) => setVoice({ languageCode: code })}
          options={languages}
          isLoading={langLoading}
          placeholder={
            conversationTypeId
              ? sl.languageCodePlaceholder
              : sl.chooseConversationTypeFirst
          }
          clearable
        />
        <CatalogSelect
          label={sl.voiceName}
          value={voice.name}
          onChange={(name) => setVoice({ name })}
          options={voice.languageCode ? voices : undefined}
          isLoading={voice.languageCode ? voicesLoading : false}
          placeholder={
            voice.languageCode
              ? sl.voiceNamePlaceholder
              : sl.chooseLanguageFirst
          }
          clearable
        />
        <div className="flex flex-col gap-1.5">
          <label className="panel-field-label">{sl.gender}</label>
          <SegmentedControl
            options={["MALE", "FEMALE", "NEUTRAL"] as const}
            value={voice.gender}
            onChange={(g) => setVoice({ gender: g })}
          />
        </div>
      </Section>

      {/* ── Features ── */}
      <Section title={gl.features} icon={ToggleLeft}>
        <ToggleRow label={sl.lipSync} checked={features.lipSync} onChange={(v) => setFeature("lipSync", v)} />
        <ToggleRow label={sl.sessionPersistence} checked={features.sessionPersistence} onChange={(v) => setFeature("sessionPersistence", v)} />
        <ToggleRow label={sl.autoSummary} checked={features.autoSummary} onChange={(v) => setFeature("autoSummary", v)} />
        <ToggleRow label={sl.videoRecording} checked={features.videoRecording} onChange={(v) => setFeature("videoRecording", v)} />
      </Section>
    </div>
  );
}
