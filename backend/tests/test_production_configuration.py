from services.ai_service import AIService, AIUnavailable
from database import normalize_database_url
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_postgres_provider_urls_use_psycopg_driver():
    assert normalize_database_url('postgres://user:pass@host/db') == 'postgresql+psycopg://user:pass@host/db'
    assert normalize_database_url('postgresql://user:pass@host/db') == 'postgresql+psycopg://user:pass@host/db'
    assert normalize_database_url('sqlite:///./autiassist.db') == 'sqlite:///./autiassist.db'


def test_hosted_ai_provider_uses_server_key_and_child_prompt(monkeypatch):
    monkeypatch.setenv('AUTIASSIST_ENV', 'production')
    monkeypatch.setenv('AI_PROVIDER', 'openai_compatible')
    monkeypatch.setenv('AI_API_URL', 'https://ai.example.test/v1/chat/completions')
    monkeypatch.setenv('AI_API_KEY', 'server-only-test-key')
    monkeypatch.setenv('AI_MODEL', 'friendly-model')
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        @staticmethod
        def json():
            return {'choices': [{'message': {'content': 'Let us learn together!'}}]}

    def fake_post(url, **kwargs):
        captured['url'] = url
        captured.update(kwargs)
        return FakeResponse()

    monkeypatch.setattr('services.ai_service.requests.post', fake_post)
    response = AIService.generate_child_response(
        'Teach me colours',
        ['Child: What is red?', 'AutiAssist: Red is the colour of an apple.'],
    )

    assert response == 'Let us learn together!'
    assert captured['headers']['Authorization'] == 'Bearer server-only-test-key'
    assert captured['json']['model'] == 'friendly-model'
    assert captured['json']['messages'][1]['role'] == 'user'
    assert 'Never diagnose autism' in captured['json']['messages'][0]['content']


def test_hosted_ai_is_unavailable_without_secrets(monkeypatch):
    monkeypatch.setenv('AUTIASSIST_ENV', 'production')
    monkeypatch.setenv('AI_PROVIDER', 'openai_compatible')
    monkeypatch.delenv('AI_API_KEY', raising=False)
    monkeypatch.setenv('AI_API_URL', 'https://ai.example.test/v1/chat/completions')
    monkeypatch.setenv('AI_MODEL', 'friendly-model')

    assert AIService.health_check()['success'] is False
    try:
        AIService.generate_child_response('Teach me colours')
    except AIUnavailable:
        pass
    else:
        raise AssertionError('Unconfigured hosted AI must fail as unavailable.')


def test_health_endpoint_checks_database():
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json() == {'status': 'ok', 'database': 'ok'}


def test_development_cors_is_not_wildcard():
    allowed = client.options(
        '/api/auth/login',
        headers={
            'Origin': 'http://localhost:5173',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type',
        },
    )
    denied = client.options(
        '/api/auth/login',
        headers={
            'Origin': 'https://untrusted.example',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type',
        },
    )
    assert allowed.status_code == 200
    assert allowed.headers['access-control-allow-origin'] == 'http://localhost:5173'
    assert 'access-control-allow-origin' not in denied.headers
