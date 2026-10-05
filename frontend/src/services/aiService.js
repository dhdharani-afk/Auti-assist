import api from './api';

export const aiService = {
  async healthCheck() {
    return api.get('/api/ai/health');
  },

  async sendChatMessage(message, conversationContext = []) {
    return api.post('/api/chat', {
      message,
      conversation_context: conversationContext,
    });
  },

  async getHistory() {
    return api.get('/api/chat/history');
  },

  async clearHistory() {
    return api.delete('/api/chat/history');
  },
};

export default aiService;
