import { GoogleGenAI } from '@google/genai';
import { Message, Character, AppSettings } from '../types';

const getApiKey = (settings: AppSettings): string => {
  return settings.apiKey || process.env.GEMINI_API_KEY || '';
};

function buildSystemPrompt(character: Character, settings: AppSettings, summary: string = ''): string {
  let prompt = settings.systemPromptOverride || '';
  
  prompt = prompt.replace(/\{\{char\}\}/g, character.name);
  prompt = prompt.replace(/\{\{user\}\}/g, settings.userName || 'User');
  
  prompt += `\n\n## Character Profile: ${character.name}`;
  if (character.tagline) prompt += `\nTagline: ${character.tagline}`;
  if (character.description) prompt += `\nDescription: ${character.description}`;
  if (character.appearance) prompt += `\nAppearance: ${character.appearance}`;
  if (character.personality) prompt += `\nPersonality: ${character.personality}`;
  if (character.scenario) prompt += `\nScenario: ${character.scenario}`;
  if (character.eventSequence) prompt += `\nEvent Sequence: ${character.eventSequence}`;
  if (character.style) prompt += `\nWriting Style: ${character.style}`;
  if (character.chatExamples) prompt += `\n\n## Example Dialogue:\n${character.chatExamples}`;
  
  if (settings.userPersona) {
    prompt += `\n\n## User Persona:\n${settings.userPersona}`;
  }
  
  if (summary) {
    prompt += `\n\n## Previous Context Summary:\n${summary}`;
  }
  
  const activeLorebooks = [
    ...(character.lorebooks || []).filter(lb => lb.enabled),
    ...(settings.globalLorebooks || []).filter(lb => lb.enabled)
  ];
  
  if (activeLorebooks.length > 0) {
    prompt += `\n\n## World Information:`;
    activeLorebooks.forEach(lb => {
      lb.entries.filter(e => e.enabled).forEach(entry => {
        prompt += `\n- ${entry.keys.join(', ')}: ${entry.content}`;
      });
    });
  }
  
  if (settings.jailbreakOverride) {
    prompt += `\n\n${settings.jailbreakOverride}`;
  }
  
  if (character.jailbreak) {
    prompt += `\n\n${character.jailbreak}`;
  }
  
  return prompt;
}

function convertHistoryGemini(messages: Message[]): { role: 'user' | 'model'; parts: { text: string }[] }[] {
  return messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
      parts: [{ text: m.content }]
    }));
}

function convertHistoryOpenAI(messages: Message[], systemPrompt: string): { role: string; content: string }[] {
  const history = [{ role: 'system', content: systemPrompt }];
  messages.forEach(m => {
    history.push({ 
      role: m.role === 'user' ? 'user' : 'assistant', 
      content: m.content 
    });
  });
  return history;
}

export async function* generateResponse(
  messages: Message[],
  character: Character,
  settings: AppSettings,
  summary: string = '',
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const apiKey = getApiKey(settings);
  const provider = settings.apiProvider as string || 'gemini';
  
  if (!apiKey && provider !== 'kobold') {
    throw new Error('API key is required.');
  }
  
  const systemPrompt = buildSystemPrompt(character, settings, summary);

  if (provider === 'gemini') {
    const genAI = new GoogleGenAI({ apiKey });
    const history = convertHistoryGemini(messages);
    const generationConfig: any = {
      temperature: settings.temperature,
      topP: settings.topP,
      topK: settings.topK,
      maxOutputTokens: settings.maxOutputTokens,
    };

    try {
      if (settings.streamResponse) {
        const response = await genAI.models.generateContentStream({
          model: settings.modelName,
          contents: history,
          config: { ...generationConfig, systemInstruction: systemPrompt }
        });
        for await (const chunk of response) {
          if (signal?.aborted) throw new Error('Aborted');
          const text = chunk.text;
          if (text) yield text;
        }
      } else {
        const response = await genAI.models.generateContent({
          model: settings.modelName,
          contents: history,
          config: { ...generationConfig, systemInstruction: systemPrompt }
        });
        if (signal?.aborted) throw new Error('Aborted');
        const text = response.text;
        if (text) yield text;
      }
    } catch (error: any) {
      if (error.message?.includes('quota') || error.message?.includes('429')) throw new Error('QUOTA_EXCEEDED');
      throw error;
    }
  } else {
    // OpenAI-compatible providers (OpenRouter, Kobold, Custom)
    const baseUrl = settings.customEndpoint || 
      (provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : 
       provider === 'horde' ? 'https://stablehorde.net/api/v2/generate/text/async' : '');
    
    const history = convertHistoryOpenAI(messages, systemPrompt);
    
    const body: any = {
      model: settings.modelName,
      messages: history,
      temperature: settings.temperature,
      top_p: settings.topP,
      max_tokens: settings.maxOutputTokens,
      stream: settings.streamResponse
    };

    const headers: any = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };

    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'Velvet Roleplay';
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `API Error: ${response.status}`);
    }

    if (settings.streamResponse) {
      const reader = response.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              const content = json.choices[0]?.delta?.content || '';
              if (content) yield content;
            } catch (e) {}
          }
        }
      }
    } else {
      const data = await response.json();
      yield data.choices[0]?.message?.content || '';
    }
  }
}

export async function summarizeChat(
  messages: Message[],
  settings: AppSettings,
  existingSummary?: string,
  length?: 'short' | 'medium' | 'detailed'
): Promise<string> {
  const apiKey = getApiKey(settings);
  if (!apiKey) throw new Error('API key is required for summarization.');
  
  const genAI = new GoogleGenAI({ apiKey });
  const lengthInstruction = length === 'short' ? 'Keep the summary brief (2-3 sentences).' : length === 'detailed' ? 'Provide a detailed summary.' : 'Provide a moderate summary.';
  let prompt = `Summarize the following conversation for context memory. ${lengthInstruction}\n\n`;
  if (existingSummary) prompt += `Previous Summary:\n${existingSummary}\n\nNew messages:\n`;
  messages.forEach(m => prompt += `${m.role === 'user' ? 'User' : 'Character'}: ${m.content}\n\n`);
  prompt += '\nProvide a cohesive summary:';

  try {
    const response = await genAI.models.generateContent({
      model: settings.modelName,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.3, maxOutputTokens: 1024 }
    });
    return response.text || '';
  } catch (error) {
    console.error('Summarization error:', error);
    throw error;
  }
}

export async function conjureCharacter(
  prompt: string, 
  settings: AppSettings, 
  options: { length?: 'short' | 'medium' | 'long', includeSequence?: boolean } = {}
): Promise<Partial<Character>> {
  const apiKey = getApiKey(settings);
  if (!apiKey) throw new Error('API key is required for Conjure.');
  
  const genAI = new GoogleGenAI({ apiKey });
  const { length = 'medium', includeSequence = false } = options;

  const lengthGuide = {
    short: "Keep descriptions very concise and punchy (1-2 sentences).",
    medium: "Provide balanced descriptions with good detail.",
    long: "Provide extremely detailed, verbose, and atmospheric descriptions."
  }[length];

  const systemInstruction = `You are a master character designer. Generate a detailed character in JSON format based on the user's concept.
  ${lengthGuide}
  The JSON must follow this structure:
  {
    "name": "Full Name",
    "tagline": "Short catchphrase",
    "description": "Full backstory",
    "appearance": "Physical description",
    "personality": "Traits and mindset",
    "firstMessage": "Opening greeting",
    "chatExamples": "Example dialogue",
    "style": "Narrative writing style",
    "jailbreak": "Character-specific rules"${includeSequence ? ',\n    "eventSequence": "A list of potential plot points or events for the character\'s story"' : ''}
  }`;

  try {
    const response = await genAI.models.generateContent({
      model: settings.modelName,
      contents: [{ role: 'user', parts: [{ text: `Conjure a ${length} character based on: ${prompt}` }] }],
      config: {
        temperature: 0.8,
        responseMimeType: "application/json",
        systemInstruction
      }
    });
    
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Conjure error:', error);
    throw error;
  }
}

export async function googleTranslateFree(text: string, targetLang: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data && data[0]) return data[0].map((item: any) => item[0]).join('');
    throw new Error('Translation failed');
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}
