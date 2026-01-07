import React, { useState, useEffect } from 'react';
import { X, Settings, Zap, Globe, Save, RotateCcw, Languages, Loader2 } from 'lucide-react';
import { AppSettings, Lorebook } from '../types';
import { Button } from './Button';
import { GEMINI_MODELS, INITIAL_SETTINGS, API_PROVIDERS, OPENROUTER_MODELS, PROMPT_TEMPLATES } from '../constants';
import { googleTranslateFree } from '../services/apiService';

interface TranslatableInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  isTextArea?: boolean;
}

const TranslatableInput: React.FC<TranslatableInputProps> = ({ label, value, onChange, placeholder, rows = 3, className = "", isTextArea = false }) => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [originalValue, setOriginalValue] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (originalValue !== null) {
      onChange(originalValue);
      setOriginalValue(null);
      return;
    }
    if (!value.trim()) return;
    setIsTranslating(true);
    try {
      const hasArabic = /[\u0600-\u06FF]/.test(value);
      const target = hasArabic ? 'en' : 'ar';
      const result = await googleTranslateFree(value, target);
      setOriginalValue(value);
      onChange(result);
    } catch (e) {
      console.error("Translation failed", e);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
        <button
          onClick={handleTranslate}
          disabled={isTranslating}
          className="flex items-center gap-1 text-[10px] font-bold uppercase text-zinc-500 hover:text-orange-500 transition-colors disabled:opacity-50"
        >
          {isTranslating ? <Loader2 size={10} className="animate-spin" /> : originalValue ? <RotateCcw size={10} /> : <Languages size={10} />}
          {originalValue ? 'Restore' : 'Translate'}
        </button>
      </div>
      {isTextArea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={`w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 focus:border-orange-500/50 focus:outline-none transition-colors resize-none ${className}`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 focus:border-orange-500/50 focus:outline-none transition-colors ${className}`}
        />
      )}
    </div>
  );
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  initialTab?: 'general' | 'generation' | 'world';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  initialTab = 'general'
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'generation' | 'world'>(initialTab);
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(INITIAL_SETTINGS);
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Settings },
    { id: 'generation' as const, label: 'Generation', icon: Zap },
    { id: 'world' as const, label: 'World', icon: Globe },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-modal-enter">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-serif font-bold text-white tracking-wide">Configuration</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b border-zinc-800">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 p-4 text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id 
                  ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-500/5' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          {activeTab === 'general' && (
            <>
              <div className="space-y-4">
                <TranslatableInput
                  label="User Name"
                  value={localSettings.userName}
                  onChange={(val) => updateSetting('userName', val)}
                />

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">User Avatar URL</label>
                  <input
                    type="text"
                    value={localSettings.userAvatarUrl}
                    onChange={(e) => updateSetting('userAvatarUrl', e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 focus:border-orange-500/50 focus:outline-none transition-colors"
                  />
                </div>

                <TranslatableInput
                  label="User Persona"
                  value={localSettings.userPersona}
                  onChange={(val) => updateSetting('userPersona', val)}
                  isTextArea={true}
                  placeholder="Describe yourself for the AI..."
                />

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Background Image URL</label>
                  <input
                    type="text"
                    value={localSettings.customBackgroundUrl}
                    onChange={(e) => updateSetting('customBackgroundUrl', e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 focus:border-orange-500/50 focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Background Blur</label>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={localSettings.backgroundBlur}
                      onChange={(e) => updateSetting('backgroundBlur', parseInt(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-zinc-500">{localSettings.backgroundBlur}px</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Background Opacity</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={localSettings.backgroundOpacity}
                      onChange={(e) => updateSetting('backgroundOpacity', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-xs text-zinc-500">{localSettings.backgroundOpacity}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Dialogue Color</label>
                    <input
                      type="color"
                      value={localSettings.dialogueColor}
                      onChange={(e) => updateSetting('dialogueColor', e.target.value)}
                      className="w-full h-10 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Thought Color</label>
                    <input
                      type="color"
                      value={localSettings.thoughtColor}
                      onChange={(e) => updateSetting('thoughtColor', e.target.value)}
                      className="w-full h-10 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'generation' && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">API Key</label>
                  <input
                    type="password"
                    value={localSettings.apiKey}
                    onChange={(e) => updateSetting('apiKey', e.target.value)}
                    placeholder="Your Gemini API key..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 focus:border-orange-500/50 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">API Provider</label>
                  <select
                    value={localSettings.apiProvider}
                    onChange={(e) => updateSetting('apiProvider', e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 focus:border-orange-500/50 focus:outline-none transition-colors"
                  >
                    {API_PROVIDERS.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>

                {localSettings.apiProvider !== 'gemini' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Base URL / Endpoint</label>
                    <input
                      type="text"
                      value={localSettings.customEndpoint}
                      onChange={(e) => updateSetting('customEndpoint', e.target.value)}
                      placeholder={localSettings.apiProvider === 'openrouter' ? "https://openrouter.ai/api/v1" : "http://localhost:5001/api"}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 focus:border-orange-500/50 focus:outline-none transition-colors"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Model</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={localSettings.modelName}
                      onChange={(e) => updateSetting('modelName', e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 focus:border-orange-500/50 focus:outline-none transition-colors"
                    />
                    <select
                      value=""
                      onChange={(e) => updateSetting('modelName', e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 text-zinc-400 focus:outline-none"
                    >
                      <option value="" disabled>Presets</option>
                      {(localSettings.apiProvider === 'gemini' ? GEMINI_MODELS : OPENROUTER_MODELS).map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Temperature: {localSettings.temperature}</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={localSettings.temperature}
                      onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Top P: {localSettings.topP}</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={localSettings.topP}
                      onChange={(e) => updateSetting('topP', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Top K: {localSettings.topK}</label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={localSettings.topK}
                      onChange={(e) => updateSetting('topK', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Max Tokens: {localSettings.maxOutputTokens}</label>
                    <input
                      type="range"
                      min="256"
                      max="8192"
                      step="256"
                      value={localSettings.maxOutputTokens}
                      onChange={(e) => updateSetting('maxOutputTokens', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Prompt Template</label>
                    <select
                      value={localSettings.promptTemplate}
                      onChange={(e) => updateSetting('promptTemplate', e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 focus:border-orange-500/50 focus:outline-none transition-colors"
                    >
                      {PROMPT_TEMPLATES.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Repetition Penalty</label>
                    <input
                      type="range"
                      min="1"
                      max="2"
                      step="0.05"
                      value={localSettings.repetitionPenalty}
                      onChange={(e) => updateSetting('repetitionPenalty', parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                      <span>1.0</span>
                      <span>{localSettings.repetitionPenalty}</span>
                      <span>2.0</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.streamResponse}
                      onChange={(e) => updateSetting('streamResponse', e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-900 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm text-zinc-300">Stream Response</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {activeTab === 'world' && (
            <>
              <div className="space-y-4">
                <TranslatableInput
                  label="System Prompt"
                  value={localSettings.systemPromptOverride}
                  onChange={(val) => updateSetting('systemPromptOverride', val)}
                  isTextArea={true}
                  rows={6}
                  className="font-mono text-xs"
                />

                <TranslatableInput
                  label="Jailbreak / Uncensor Prompt"
                  value={localSettings.jailbreakOverride}
                  onChange={(val) => updateSetting('jailbreakOverride', val)}
                  isTextArea={true}
                  rows={4}
                  className="font-mono text-xs"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-zinc-800 bg-zinc-900/50">
          <Button variant="ghost" onClick={handleReset}>
            <RotateCcw size={16} /> Reset
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>
              <Save size={16} /> Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
