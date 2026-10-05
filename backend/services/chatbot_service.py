from services.ai_service import AIService, AIUnavailable


class ChatbotService:
    @staticmethod
    def warm_up():
        return AIService.warm_up()

    @staticmethod
    def generate_response(message: str, conversation_context=None) -> str:
        return AIService.generate_child_response(message, conversation_context=conversation_context)

    @staticmethod
    def health_check():
        return AIService.health_check()

    @staticmethod
    def system_prompt() -> str:
        return AIService.build_system_prompt()


generate_child_response = ChatbotService.generate_response
OllamaUnavailable = AIUnavailable
