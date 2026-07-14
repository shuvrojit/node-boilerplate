jest.mock('../../../src/config/config', () => ({
  __esModule: true,
  default: {
    openai: {
      apiKey: 'configured-api-key',
    },
  },
}));

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

import OpenAI from 'openai';
import '../../../src/utils/AIRequest';

describe('AIRequest client configuration', () => {
  it('uses the validated API key from application configuration', () => {
    expect(OpenAI).toHaveBeenCalledWith({
      apiKey: 'configured-api-key',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
  });
});
