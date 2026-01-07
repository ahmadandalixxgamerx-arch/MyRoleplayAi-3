import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, BookOpen, Plus, ChevronDown, ChevronUp, Sparkles, Loader2, Check, Languages, RotateCcw, BrainCircuit } from 'lucide-react';
import { Character, Lorebook, LorebookEntry, AppSettings } from '../types';
import { Button } from './Button';
import { conjureCharacter, googleTranslateFree } from '../services/apiService';

interface TranslatableTextareaProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

const TranslatableTextarea: React.FC<TranslatableTextareaProps> = ({ label, value, onChange, placeholder, rows = 3, className = "" }) => {
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
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={`w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 focus:border-orange-500/50 focus:outline-none transition-colors resize-none ${className}`}
      />
    </div>
  );
};

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (character: Character) => void;
  character: Character | null;
  currentSummary?: string;
  currentLastSummarizedId?: string;
  onSummarize?: (mode: 'full' | 'incremental', length?: 'short' | 'medium' | 'detailed') => Promise<{ summary: string; lastId: string } | null>;
  onSaveSession?: (summary: string, lastId?: string) => void;
  hasNewMessages?: boolean;
  settings?: AppSettings;
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const defaultCharacter: Character = {
  id: '',
  name: '',
  tagline: '',
  description: '',
  appearance: '',
  personality: '',
  firstMessage: '',
  chatExamples: '',
  avatarUrl: '',
  scenario: '',
  eventSequence: '',
  style: '',
  jailbreak: '',
  lorebooks: []
};

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  character,
  currentSummary,
  currentLastSummarizedId,
  onSummarize,
  onSaveSession,
  hasNewMessages,
  settings,
  summaryLength = 'medium',
  onSummaryLengthChange
}) => {
  const [localChar, setLocalChar] = useState<Character>(defaultCharacter);
  const [activeSection, setActiveSection] = useState<string>('basic');
  const [summary, setSummary] = useState(currentSummary || '');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [conjurePrompt, setConjurePrompt] = useState('');
  const [isConjuring, setIsConjuring] = useState(false);
  const [conjureLength, setConjureLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [includeSequence, setIncludeSequence] = useState(false);

  useEffect(() => {
    if (character) {
      setLocalChar(character);
    } else {
      setLocalChar({ ...defaultCharacter, id: generateId() });
    }
    setSummary(currentSummary || '');
  }, [character, currentSummary]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!localChar.name.trim()) return;
    onSave(localChar);
    onClose();
  };

  const updateField = <K extends keyof Character>(key: K, value: Character[K]) => {
    setLocalChar(prev => ({ ...prev, [key]: value }));
  };

  const handleSummarize = async (mode: 'full' | 'incremental') => {
    if (!onSummarize) return;
    setIsSummarizing(true);
    try {
      const result = await onSummarize(mode, summaryLength);
      if (result) {
        setSummary(result.summary);
        if (onSaveSession) {
          onSaveSession(result.summary, result.lastId);
        }
      }
    } finally {
      setIsSummarizing(false);
    }
  };

  const sections = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'personality', label: 'Personality' },
    { id: 'dialogue', label: 'Dialogue' },
    { id: 'lorebook', label: 'Lorebook' },
    { id: 'memory', label: 'Memory' },
    { id: 'conjure', label: 'Conjure' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-modal-enter">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-serif font-bold text-white tracking-wide">
            {character ? 'Edit Entity' : 'Create Entity'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b border-zinc-800 overflow-x-auto">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex-shrink-0 px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                activeSection === section.id 
                  ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-500/5' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          {activeSection === 'basic' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <TranslatableTextarea
                  label="Name"
                  value={localChar.name}
                  onChange={(val) => updateField('name', val)}
                  rows={1}
                  placeholder="Character name..."
                />
                <TranslatableTextarea
                  label="Tagline"
                  value={localChar.tagline}
                  onChange={(val) => updateField('tagline', val)}
                  rows={1}
                  placeholder="Short description..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Avatar URL</label>
                <input
                  type="text"
                  value={localChar.avatarUrl}
                  onChange={(e) => updateField('avatarUrl', e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-200 focus:border-orange-500/50 focus:outline-none transition-colors"
                  placeholder="https://..."
                />
              </div>

              <div>
                <TranslatableTextarea
                  label="Description"
                  value={localChar.description}
                  onChange={(val) => updateField('description', val)}
                  rows={4}
                  placeholder="Character description..."
                />
              </div>

              <div>
                <TranslatableTextarea
                  label="Appearance"
                  value={localChar.appearance}
                  onChange={(val) => updateField('appearance', val)}
                  rows={3}
                  placeholder="Physical appearance..."
                />
              </div>

              <div>
                <TranslatableTextarea
                  label="Scenario"
                  value={localChar.scenario || ''}
                  onChange={(val) => updateField('scenario', val)}
                  rows={2}
                  placeholder="Setting and context..."
                />
              </div>
            </>
          )}

          {activeSection === 'personality' && (
            <>
              <div>
                <TranslatableTextarea
                  label="Personality"
                  value={localChar.personality}
                  onChange={(val) => updateField('personality', val)}
                  rows={5}
                  placeholder="Personality traits, mindset, behavior..."
                />
              </div>

              <div>
                <TranslatableTextarea
                  label="Writing Style"
                  value={localChar.style || ''}
                  onChange={(val) => updateField('style', val)}
                  rows={3}
                  placeholder="Writing style and narrative direction..."
                />
              </div>

              <div>
                <TranslatableTextarea
                  label="Event Sequence / Plot"
                  value={localChar.eventSequence || ''}
                  onChange={(val) => updateField('eventSequence', val)}
                  rows={3}
                  placeholder="Story progression, key events..."
                />
              </div>

              <div>
                <TranslatableTextarea
                  label="System Logic / Jailbreak"
                  value={localChar.jailbreak || ''}
                  onChange={(val) => updateField('jailbreak', val)}
                  rows={3}
                  className="font-mono text-xs"
                  placeholder="Special instructions..."
                />
              </div>
            </>
          )}

          {activeSection === 'dialogue' && (
            <>
              <div>
                <TranslatableTextarea
                  label="First Message"
                  value={localChar.firstMessage}
                  onChange={(val) => updateField('firstMessage', val)}
                  rows={5}
                  placeholder="The character's opening message..."
                />
              </div>

              <div>
                <TranslatableTextarea
                  label="Chat Examples"
                  value={localChar.chatExamples || ''}
                  onChange={(val) => updateField('chatExamples', val)}
                  rows={6}
                  className="font-mono text-xs"
                  placeholder="Example dialogue format...&#10;<START>&#10;{{user}}: Hello&#10;{{char}}: *waves* Hello there!"
                />
              </div>
            </>
          )}

          {activeSection === 'lorebook' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-400">Lorebooks ({localChar.lorebooks?.length || 0})</h3>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const newLorebook: Lorebook = {
                      id: generateId(),
                      name: 'New Lorebook',
                      description: '',
                      entries: [],
                      enabled: true
                    };
                    updateField('lorebooks', [...(localChar.lorebooks || []), newLorebook]);
                  }}
                >
                  <Plus size={14} /> Add Lorebook
                </Button>
              </div>

              {(localChar.lorebooks || []).map((lb, lbIdx) => (
                <div key={lb.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={lb.name}
                      onChange={(e) => {
                        const updated = [...(localChar.lorebooks || [])];
                        updated[lbIdx] = { ...lb, name: e.target.value };
                        updateField('lorebooks', updated);
                      }}
                      className="bg-transparent text-zinc-200 font-medium focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={lb.enabled}
                          onChange={(e) => {
                            const updated = [...(localChar.lorebooks || [])];
                            updated[lbIdx] = { ...lb, enabled: e.target.checked };
                            updateField('lorebooks', updated);
                          }}
                          className="rounded border-zinc-700 bg-zinc-900 text-orange-500"
                        />
                        <span className="text-xs text-zinc-500">Enabled</span>
                      </label>
                      <button
                        onClick={() => {
                          const updated = (localChar.lorebooks || []).filter((_, i) => i !== lbIdx);
                          updateField('lorebooks', updated);
                        }}
                        className="text-zinc-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {lb.entries.map((entry, entryIdx) => (
                      <div key={entry.id} className="bg-zinc-900 p-3 rounded border border-zinc-800">
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={entry.keys.join(', ')}
                            onChange={(e) => {
                              const updated = [...(localChar.lorebooks || [])];
                              updated[lbIdx].entries[entryIdx] = {
                                ...entry,
                                keys: e.target.value.split(',').map(k => k.trim())
                              };
                              updateField('lorebooks', updated);
                            }}
                            placeholder="Keywords (comma separated)"
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-orange-500/50"
                          />
                          <button
                            onClick={() => {
                              const updated = [...(localChar.lorebooks || [])];
                              updated[lbIdx].entries = lb.entries.filter((_, i) => i !== entryIdx);
                              updateField('lorebooks', updated);
                            }}
                            className="text-zinc-600 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <textarea
                          value={entry.content}
                          onChange={(e) => {
                            const updated = [...(localChar.lorebooks || [])];
                            updated[lbIdx].entries[entryIdx] = { ...entry, content: e.target.value };
                            updateField('lorebooks', updated);
                          }}
                          placeholder="Entry content..."
                          rows={2}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-orange-500/50 resize-none"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const updated = [...(localChar.lorebooks || [])];
                        updated[lbIdx].entries.push({
                          id: generateId(),
                          keys: [],
                          content: '',
                          enabled: true
                        });
                        updateField('lorebooks', updated);
                      }}
                      className="text-xs text-orange-500 hover:text-orange-400 transition-colors"
                    >
                      + Add Entry
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'memory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-2">
                  <BrainCircuit size={12} /> Memory Configuration
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={summaryLength}
                    onChange={(e) => onSummaryLengthChange?.(e.target.value as any)}
                    className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] rounded px-2 py-1 outline-none focus:border-orange-500/50 transition-colors"
                  >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="detailed">Long</option>
                  </select>
                  {summary && (
                    <button
                      onClick={() => {
                        if (confirm("Clear memory bank?")) {
                          setSummary("");
                          onSaveSession?.("");
                        }
                      }}
                      className="p-1 text-zinc-600 hover:text-red-500 transition-colors"
                      title="Clear Memory Bank"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>
              </div>

              <TranslatableTextarea
                label="Memory Bank Content"
                value={summary}
                onChange={(val) => setSummary(val)}
                rows={8}
                placeholder="Chat summary / memory..."
              />

              <div className="flex flex-col gap-2">
                {summary ? (
                  <>
                    {hasNewMessages && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant="primary" 
                          onClick={() => handleSummarize('incremental')}
                          disabled={isSummarizing}
                          className="bg-orange-600/20 text-orange-400 border-orange-500/30"
                        >
                          {isSummarizing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                          Update Memory
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            if (confirm("Overwrite existing memory?")) handleSummarize('full');
                          }}
                          disabled={isSummarizing}
                        >
                          {isSummarizing ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                          Overwrite
                        </Button>
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => onSaveSession?.(summary)}
                      className="w-full"
                    >
                      <Save size={14} /> Save Changes
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="primary" 
                    onClick={() => handleSummarize('full')}
                    disabled={isSummarizing}
                    className="w-full h-12"
                  >
                    {isSummarizing ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                    Generate Memory Bank
                  </Button>
                )}
              </div>
            </div>
          )}

          {activeSection === 'conjure' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <h3 className="text-sm font-bold text-orange-500 flex items-center gap-2 mb-2">
                  <Sparkles size={16} /> Character Conjurer
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Describe the character you want to create, and the AI will generate their full profile, personality, and lore automatically.
                </p>
              </div>

              <TranslatableTextarea
                label="Prompt"
                value={conjurePrompt}
                onChange={(val) => setConjurePrompt(val)}
                rows={5}
                placeholder="e.g. A grumpy space pirate with a mechanical parrot..."
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Complexity</label>
                  <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                    {(['short', 'medium', 'long'] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => setConjureLength(l)}
                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${
                          conjureLength === l 
                            ? 'bg-orange-500 text-white' 
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Options</label>
                  <button
                    onClick={() => setIncludeSequence(!includeSequence)}
                    className={`w-full py-2.5 px-3 text-[10px] font-bold uppercase rounded-lg border transition-all flex items-center justify-center gap-2 ${
                      includeSequence 
                        ? 'bg-orange-500/10 border-orange-500 text-orange-500' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-sm border ${includeSequence ? 'bg-orange-500 border-orange-400' : 'border-zinc-700'}`}>
                      {includeSequence && <Check size={10} className="text-white" />}
                    </div>
                    Generate Sequence
                  </button>
                </div>
              </div>

              <Button 
                variant="primary" 
                className="w-full h-12"
                disabled={!conjurePrompt.trim() || isConjuring || !settings?.apiKey}
                onClick={async () => {
                  if (!settings) return;
                  setIsConjuring(true);
                  try {
                    const result = await conjureCharacter(conjurePrompt, settings, { 
                      length: conjureLength, 
                      includeSequence 
                    });
                    setLocalChar(prev => ({ ...prev, ...result }));
                    setConjurePrompt('');
                    setActiveSection('basic');
                  } catch (e) {
                    console.error("Conjure failed", e);
                  } finally {
                    setIsConjuring(false);
                  }
                }}
              >
                {isConjuring ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                {isConjuring ? 'Conjuring...' : 'Conjure Entity'}
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-800 bg-zinc-900/50">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={!localChar.name.trim()}>
            <Save size={16} /> Save Entity
          </Button>
        </div>
      </div>
    </div>
  );
};
