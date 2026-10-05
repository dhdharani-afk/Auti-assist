import os
from typing import Any, Dict, List, Optional
from urllib.parse import urlsplit, urlunsplit

from dotenv import load_dotenv
import requests

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434/api/generate')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'gemma3')
OLLAMA_KEEP_ALIVE = os.getenv('OLLAMA_KEEP_ALIVE', '24h')


class OllamaUnavailable(Exception):
    pass


class OllamaService:
    @staticmethod
    def warm_up() -> Dict[str, Any]:
        """Load the configured model without making the child wait for first use."""
        health = OllamaService.health_check()
        if not health.get('success'):
            return health

        try:
            response = requests.post(
                OLLAMA_URL,
                json={
                    'model': OLLAMA_MODEL,
                    'prompt': '',
                    'stream': False,
                    'keep_alive': OLLAMA_KEEP_ALIVE,
                    'options': {'num_predict': 0},
                },
                timeout=30,
            )
            if response.status_code != 200:
                raise RuntimeError('Ollama warm-up request failed')

            return {
                'success': True,
                'ollama': True,
                'model': OLLAMA_MODEL,
                'keep_alive': OLLAMA_KEEP_ALIVE,
                'message': 'AI model is ready.',
            }
        except Exception:
            return {
                'success': False,
                'ollama': True,
                'model': OLLAMA_MODEL,
                'message': 'The AI model could not be prepared.',
            }

    @staticmethod
    def build_system_prompt() -> str:
        return (
            'You are AutiAssist, a friendly educational learning companion for children.\n'
            'Your purpose is to help children learn, communicate, explore ideas, and practice simple educational activities.\n'
            'Use very simple language. Keep answers short and clear. Be patient, positive, encouraging, and respectful.\n'
            'Use examples children can understand. Use short stories when requested. Ask simple follow-up questions when useful.\n'
            'Encourage the child when they try. Never shame the child for incorrect answers.\n'
            'You are not a doctor, therapist, psychologist, or diagnostic system.\n'
            'Never diagnose autism or any medical condition. Never assess autism severity.\n'
            'Never claim to know the child\'s emotional or psychological state.\n'
            'Never provide medical treatment or clinical advice.\n'
            'If a question requires medical or professional advice, politely suggest talking to a trusted adult or a qualified professional.\n'
            'Focus on learning, communication, creativity, and positive educational interaction.\n'
            'Use short paragraphs, small lists, and encouraging tone.\n'
            'Avoid long blocks of text. Keep the child engaged and calm.'
        )

    @staticmethod
    def get_health_url() -> str:
        parsed = urlsplit(OLLAMA_URL)
        path = '/api/tags'
        if parsed.path and parsed.path.endswith('/api/generate'):
            path = '/api/tags'
        return urlunsplit((parsed.scheme, parsed.netloc, path, '', ''))

    @staticmethod
    def health_check() -> Dict[str, Any]:
        try:
            response = requests.get(OllamaService.get_health_url(), timeout=8)
            if response.status_code != 200:
                return {
                    'success': False,
                    'ollama': False,
                    'model': OLLAMA_MODEL,
                    'message': 'Ollama is not running.',
                }

            payload = response.json()
            models = payload.get('models', []) or []
            model_names = []
            for item in models:
                if isinstance(item, dict):
                    name = item.get('name') or item.get('model')
                    if name:
                        model_names.append(name)

            available = any(name == OLLAMA_MODEL or name.startswith(f'{OLLAMA_MODEL}:') for name in model_names)
            if not available and model_names:
                return {
                    'success': False,
                    'ollama': True,
                    'model': OLLAMA_MODEL,
                    'message': f'The configured model {OLLAMA_MODEL} is not available in Ollama.',
                }

            return {
                'success': True,
                'ollama': True,
                'model': OLLAMA_MODEL,
            }
        except Exception:
            return {
                'success': False,
                'ollama': False,
                'model': OLLAMA_MODEL,
                'message': 'Ollama is not running.',
            }

    @staticmethod
    def generate_child_response(message: str, conversation_context: Optional[List[str]] = None) -> str:
        cleaned_message = (message or '').strip()
        if not cleaned_message:
            return 'Please tell me what you would like to learn today. 😊'

        history = conversation_context or []
        context_text = '\n'.join(f'- {entry}' for entry in history[-4:]) if history else 'No recent conversation.'
        prompt = (
            f'{OllamaService.build_system_prompt()}\n\n'
            f'Child message: {cleaned_message}\n\n'
            f'Recent conversation context:\n{context_text}\n\n'
            'Answer as a helpful, encouraging learning companion. Keep it short, simple, and child-friendly.'
        )

        try:
            response = requests.post(
                OLLAMA_URL,
                json={
                    'model': OLLAMA_MODEL,
                    'prompt': prompt,
                    'stream': False,
                    'keep_alive': OLLAMA_KEEP_ALIVE,
                },
                timeout=30,
            )

            if response.status_code != 200:
                raise RuntimeError('Ollama request failed')

            payload = response.json()
            reply = payload.get('response') or payload.get('content') or ''
            cleaned_reply = ' '.join(reply.strip().split())
            if not cleaned_reply:
                raise RuntimeError('Ollama returned an empty response')
            return cleaned_reply
        except Exception as exc:
            raise OllamaUnavailable('The AI helper is taking a short break. Please try again soon.') from exc
