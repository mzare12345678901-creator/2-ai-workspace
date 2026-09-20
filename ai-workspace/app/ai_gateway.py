import httpx
import json
from typing import List, Dict, AsyncGenerator, Optional
from app.config import settings

DEFAULT_SYSTEM_PROMPT = """تو یک دستیار هوشمند، دقیق و مفید هستی.
پاسخ‌ها را به زبان کاربر بده. اگر کاربر فارسی نوشت، فارسی پاسخ بده.
برای کد از بلوک‌های مارک‌داون استفاده کن."""


class AIGateway:
    def __init__(self, api_key: str = None, base_url: str = None, model: str = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.base_url = (base_url or settings.OPENAI_BASE_URL).rstrip("/")
        self.model = model or settings.OPENAI_MODEL

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _build_payload(self, messages, system_prompt, temperature, max_tokens, model, stream=False):
        sys = system_prompt if system_prompt else DEFAULT_SYSTEM_PROMPT
        payload = {
            "model": model or self.model,
            "messages": [{"role": "system", "content": sys}] + messages,
            "temperature": temperature if temperature is not None else 0.7,
            "max_tokens": max_tokens if max_tokens is not None else 2048,
        }
        if stream:
            payload["stream"] = True
        return payload

    async def chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> str:
        if not self.api_key:
            return "⚠️ کلید API تنظیم نشده. از پنل ادمین یا فایل .env مقداردهی کن."

        payload = self._build_payload(messages, system_prompt, temperature, max_tokens, model, stream=False)

        async with httpx.AsyncClient(timeout=120) as client:
            try:
                r = await client.post(f"{self.base_url}/chat/completions", json=payload, headers=self._headers())
                r.raise_for_status()
                return r.json()["choices"][0]["message"]["content"]
            except httpx.HTTPStatusError as e:
                return f"❌ خطای API ({e.response.status_code}): {e.response.text[:300]}"
            except Exception as e:
                return f"❌ خطا در ارتباط با AI: {e}"

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        model: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        if not self.api_key:
            yield "⚠️ کلید API تنظیم نشده."
            return

        payload = self._build_payload(messages, system_prompt, temperature, max_tokens, model, stream=True)

        async with httpx.AsyncClient(timeout=120) as client:
            try:
                async with client.stream("POST", f"{self.base_url}/chat/completions",
                                         json=payload, headers=self._headers()) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        data = line[6:].strip()
                        if data == "[DONE]":
                            break
                        try:
                            parsed = json.loads(data)
                            delta = parsed.get("choices", [{}])[0].get("delta", {}).get("content")
                            if delta:
                                yield delta
                        except Exception:
                            continue
            except Exception as e:
                yield f"\n\n❌ خطا: {e}"


ai_gateway = AIGateway()