import OpenAI from 'openai';

import config from '../config/config';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIRequestOptions {
  model?: string;
  messages: Message[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

const sendAIRequest = async (options: AIRequestOptions) => {
  const {
    model = 'gemini-2.0-flash',
    messages,
    stream = false,
    temperature = 0.7,
    maxTokens,
  } = options;

  try {
    if (stream) {
      const completion = await openai.chat.completions.create({
        model,
        messages,
        stream: true,
        temperature,
        max_tokens: maxTokens,
      });

      let streamResponse = '';
      for await (const chunk of completion) {
        const content = chunk.choices[0].delta.content;
        if (content) {
          streamResponse += content;
        }
      }
      return streamResponse;
    } else {
      const completion = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      return completion.choices[0].message.content;
    }
  } catch (error) {
    console.error('Error in AI request:', error);
    throw error;
  }
};

export default sendAIRequest;
