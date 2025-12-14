import os
import google.generativeai as genai
from app.core.config import settings
from app.services.settings_file import settings_service

class GeminiService:
    def __init__(self):
        self._configure()

    def _configure(self):
        # Prefer dynamic settings, fallback to config
        key = self._get_api_key()
        if not key:
            print("Warning: GEMINI_API_KEY is not set.")
        else:
            genai.configure(api_key=key)

    def _get_api_key(self):
        # Look in settings.yaml (via service) then env
        try:
            user_settings = settings_service.get_general_settings()
            if user_settings.get("gemini_api_key"):
                return user_settings.get("gemini_api_key")
        except Exception:
            pass
        return settings.GEMINI_API_KEY

    def transcribe(self, file_path: str, model_name: str = "gemini-1.5-flash") -> str:
        """
        Transcribes audio using Gemini 1.5 Flash.
        Uploads file to Google AI Studio, generates content, then deletes file?
        Note: Files uploaded to File API are temporary but should be managed.
        """
        try:
            print(f"Uploading file {file_path} to Gemini...")
            # Determine mime type
            mime_type = "audio/mpeg"
            if file_path.endswith(".wav"): mime_type = "audio/wav"
            elif file_path.endswith(".m4a"): mime_type = "audio/mp4"

            uploaded_file = genai.upload_file(file_path, mime_type=mime_type)
            print(f"File uploaded: {uploaded_file.name}")

            model = genai.GenerativeModel(model_name)
            
            # Prompt for transcription
            prompt = "Transcribe the following audio file verbatim. Do not add any commentary or markdown formatting unless requested. Just the text."
            
            response = model.generate_content([prompt, uploaded_file])
            
            # Cleanup? (Wait for processing? upload_file handles waiting for processing state?)
            # genai.upload_file returns partially processed file maybe?
            # Usually for audio it's fast. Video needs processing.
            
            text = response.text
            return text

        except Exception as e:
            print(f"Gemini Transcription Error: {e}")
            raise e

    def stream_chat(self, messages: list, model_name: str = "gemini-1.5-flash"):
        """
        Streams chat response.
        Messages format: [{"role": "user", "content": "..."}]
        Gemini format: history=[{"role": "user", "parts": ["..."]}]
        """
        try:
            # Convert messages to Gemini history
            gemini_history = []
            last_message = None
            
            for msg in messages:
                role = "user" if msg["role"] == "user" else "model"
                # System prompt handling? Gemini uses system_instruction in model init
                if msg["role"] == "system":
                    # Current lib structure supports system_instruction argument
                    pass 
                else:
                    gemini_history.append({"role": role, "parts": [msg["content"]]})
            
            if gemini_history:
                last_message = gemini_history.pop() # The prompt is the last message
            
            # Extract system instruction if present
            system_instruction = None
            for msg in messages:
                if msg["role"] == "system":
                    system_instruction = msg["content"]
                    break

            model = genai.GenerativeModel(
                model_name,
                system_instruction=system_instruction
            )
            
            chat = model.start_chat(history=gemini_history)
            
            if last_message:
                response = chat.send_message(last_message["parts"][0], stream=True)
                for chunk in response:
                    if chunk.text:
                        yield chunk.text
            else:
                 yield ""

        except Exception as e:
            print(f"Gemini Chat Error: {e}")
            raise e

    def complete_chat(self, messages: list, model_name: str = "gemini-1.5-flash") -> str:
        """
        Non-streaming chat completion.
        """
        try:
            full_text = ""
            for chunk in self.stream_chat(messages, model_name):
                full_text += chunk
            return full_text
        except Exception as e:
             # If stream fails, maybe try direct generate?
             # For now reuse stream logic for consistency
             raise e

gemini_service = GeminiService()
