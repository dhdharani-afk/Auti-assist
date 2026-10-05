import os
from typing import Any, Dict, List, Optional

import requests

from services.ollama_service import OllamaService, OllamaUnavailable


class AIUnavailable(Exception):
    """Raised when the configured AI provider cannot serve a response."""


class AIService:
    @staticmethod
    def provider() -> str:
        default = 'openai_compatible' if os.getenv('AUTIASSIST_ENV', 'development').lower() == 'production' else 'ollama'
        return os.getenv('AI_PROVIDER', default).strip().lower()

    @staticmethod
    def build_system_prompt() -> str:
        return OllamaService.build_system_prompt()

    @staticmethod
    def warm_up() -> Dict[str, Any]:
        if AIService.provider() == 'ollama':
            return OllamaService.warm_up()
        return AIService.health_check()

    @staticmethod
    def health_check() -> Dict[str, Any]:
        provider = AIService.provider()
        if provider == 'ollama':
            result = OllamaService.health_check()
            return {**result, 'provider': provider}
        if provider == 'openai_compatible':
            configured = bool(os.getenv('AI_API_URL') and os.getenv('AI_MODEL') and os.getenv('AI_API_KEY'))
            return {
                'success': configured,
                'ollama': False,
                'provider': provider,
                'model': os.getenv('AI_MODEL', ''),
                **({} if configured else {'message': 'Hosted AI is not configured.'}),
            }
        return {
            'success': False,
            'ollama': False,
            'provider': provider,
            'model': '',
            'message': 'The configured AI provider is not supported.',
        }

    @staticmethod
    def generate_child_response(message: str, conversation_context: Optional[List[str]] = None) -> str:
        provider = AIService.provider()
        if provider == 'ollama':
            try:
                return OllamaService.generate_child_response(message, conversation_context)
            except OllamaUnavailable as error:
                raise AIUnavailable(str(error)) from error
        if provider != 'openai_compatible':
            raise AIUnavailable('The AI helper is temporarily unavailable.')

        api_url = os.getenv('AI_API_URL', '').strip()
        api_key = os.getenv('AI_API_KEY', '').strip()
        model = os.getenv('AI_MODEL', '').strip()
        if not api_url or not api_key or not model:
            raise AIUnavailable('The AI helper is temporarily unavailable.')

        messages = [{'role': 'system', 'content': AIService.build_system_prompt()}]
        for entry in (conversation_context or [])[-8:]:
            if isinstance(entry, str) and entry.strip():
                role, separator, content = entry.partition(':')
                message_role = 'user' if separator and role.strip().lower() in {'child', 'user'} else 'assistant'
                messages.append({'role': message_role, 'content': (content if separator else entry).strip()[:2000]})
        messages.append({'role': 'user', 'content': message.strip()[:4000]})

        try:
            response = requests.post(
                api_url,
                headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
                json={'model': model, 'messages': messages, 'temperature': 0.6, 'max_tokens': 350},
                timeout=(5, 30),
            )
            response.raise_for_status()
            payload = response.json()
            reply = payload['choices'][0]['message']['content']
            if not isinstance(reply, str) or not reply.strip():
                raise ValueError('AI provider returned an empty response.')
            return ' '.join(reply.strip().split())[:4000]
        except (requests.RequestException, ValueError, KeyError, IndexError, TypeError) as error:
            raise AIUnavailable('The AI helper is temporarily unavailable. Please try again soon.') from error
