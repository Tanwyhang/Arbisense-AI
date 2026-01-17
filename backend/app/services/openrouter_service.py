"""
OpenRouter API Service
Provides unified access to multiple LLM providers through OpenRouter
"""
import os
import asyncio
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
import httpx
from datetime import datetime


@dataclass
class ChatMessage:
    """Chat message schema"""
    role: str
    content: str


@dataclass
class LLMResponse:
    """LLM response with metadata"""
    content: str
    model: str
    tokens_used: int = 0
    cost_estimate_usd: float = 0.0
    latency_ms: float = 0.0
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class ModelInfo:
    """Model information"""
    id: str
    name: str
    provider: str
    context_length: int
    pricing_input_per_1k: float
    pricing_output_per_1k: float


class OpenRouterService:
    """
    OpenRouter API client for multi-model LLM access
    Supports model selection, fallback, and cost tracking
    """

    # Model pricing information (per 1K tokens)
    MODELS = {
        "anthropic/claude-3.5-sonnet": ModelInfo(
            id="anthropic/claude-3.5-sonnet",
            name="Claude 3.5 Sonnet",
            provider="Anthropic",
            context_length=200000,
            pricing_input_per_1k=0.003,
            pricing_output_per_1k=0.015
        ),
        "openai/gpt-4-turbo": ModelInfo(
            id="openai/gpt-4-turbo",
            name="GPT-4 Turbo",
            provider="OpenAI",
            context_length=128000,
            pricing_input_per_1k=0.01,
            pricing_output_per_1k=0.03
        ),
        "google/gemini-pro-1.5": ModelInfo(
            id="google/gemini-pro-1.5",
            name="Gemini Pro 1.5",
            provider="Google",
            context_length=1000000,
            pricing_input_per_1k=0.00125,
            pricing_output_per_1k=0.005
        ),
        "meta-llama/llama-3.1-70b-instruct": ModelInfo(
            id="meta-llama/llama-3.1-70b-instruct",
            name="Llama 3.1 70B",
            provider="Meta",
            context_length=131072,
            pricing_input_per_1k=0.00059,
            pricing_output_per_1k=0.00079
        )
    }

    def __init__(self, api_key: Optional[str] = None, default_model: str = "anthropic/claude-3.5-sonnet"):
        """
        Initialize OpenRouter service

        Args:
            api_key: OpenRouter API key (defaults to OPENROUTER_API_KEY env var)
            default_model: Default model to use
        """
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            import logging
            logging.getLogger(__name__).warning("OpenRouter API key not provided and OPENROUTER_API_KEY not set. LLM features will be disabled.")

        self.default_model = default_model
        self.fallback_model = "openai/gpt-4-turbo"
        self.base_url = "https://openrouter.ai/api/v1"

        # Usage tracking
        self.total_tokens_used = 0
        self.total_cost_usd = 0.0
        self.request_count = 0

        # HTTP client
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(60.0, connect=10.0),
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
        )

    def _calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Calculate cost for a request"""
        if model not in self.MODELS:
            # Default pricing if model not found
            return 0.01  # Conservative estimate

        model_info = self.MODELS[model]
        input_cost = (input_tokens / 1000) * model_info.pricing_input_per_1k
        output_cost = (output_tokens / 1000) * model_info.pricing_output_per_1k
        return input_cost + output_cost

    async def chat_completion(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        use_fallback: bool = True,
        retry_count: int = 2
    ) -> LLMResponse:
        """
        Send chat completion request to OpenRouter

        Args:
            messages: List of chat messages
            model: Model to use (defaults to default_model)
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens in response
            use_fallback: Use fallback model on failure
            retry_count: Number of retries on failure

        Returns:
            LLMResponse with content and metadata
        """
        target_model = model or self.default_model
        
        if not self.api_key:
            raise ValueError("OpenRouter API key is missing. Please set OPENROUTER_API_KEY environment variable to use LLM features.")
            
        start_time = datetime.utcnow()

        # Prepare request
        request_data = {
            "model": target_model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "provider": {
                "order": ["Anthropic", "OpenAI", "Google", "Meta"],
                "allow_fallbacks": True
            }
        }

        # Retry logic
        last_error = None
        for attempt in range(retry_count + 1):
            try:
                response = await self.client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "HTTP-Referer": "https://arbisense.ai",
                        "X-Title": "Arbisense AI Optimizer"
                    },
                    json=request_data,
                    timeout=30.0
                )

                response.raise_for_status()
                data = response.json()

                # Extract response data
                content = data["choices"][0]["message"]["content"]
                usage = data.get("usage", {})

                input_tokens = usage.get("prompt_tokens", 0)
                output_tokens = usage.get("completion_tokens", 0)
                total_tokens = usage.get("total_tokens", 0)

                # Calculate metrics
                end_time = datetime.utcnow()
                latency_ms = (end_time - start_time).total_seconds() * 1000
                cost = self._calculate_cost(target_model, input_tokens, output_tokens)

                # Update tracking
                self.total_tokens_used += total_tokens
                self.total_cost_usd += cost
                self.request_count += 1

                return LLMResponse(
                    content=content,
                    model=target_model,
                    tokens_used=total_tokens,
                    cost_estimate_usd=cost,
                    latency_ms=latency_ms,
                    timestamp=end_time
                )

            except httpx.HTTPStatusError as e:
                last_error = e
                if e.response.status_code in [429, 500, 502, 503, 504]:
                    # Retryable errors
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    continue
                else:
                    break

            except httpx.TimeoutError:
                last_error = Exception("Request timeout")
                await asyncio.sleep(2 ** attempt)
                continue

            except Exception as e:
                last_error = e
                break

        # If all retries failed and fallback is enabled
        if use_fallback and target_model != self.fallback_model:
            return await self.chat_completion(
                messages=messages,
                model=self.fallback_model,
                temperature=temperature,
                max_tokens=max_tokens,
                use_fallback=False  # Prevent infinite fallback loop
            )

        # All attempts failed
        raise Exception(f"OpenRouter API request failed after {retry_count + 1} attempts: {last_error}")

    async def chat_completion_stream(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ):
        """
        Send streaming chat completion request (for real-time updates)

        Args:
            messages: List of chat messages
            model: Model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens

        Yields:
            Chunks of the response as they arrive
        """
        target_model = model or self.default_model

        request_data = {
            "model": target_model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True
        }

        try:
            async with self.client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "HTTP-Referer": "https://arbisense.ai",
                    "X-Title": "Arbisense AI Optimizer"
                },
                json=request_data,
                timeout=60.0
            ) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break

                        try:
                            import json
                            data = json.loads(data_str)
                            delta = data["choices"][0].get("delta", {})
                            if "content" in delta:
                                yield delta["content"]
                        except (KeyError, json.JSONDecodeError):
                            continue

        except Exception as e:
            raise Exception(f"Streaming request failed: {e}")

    def get_model_info(self, model: str) -> Optional[ModelInfo]:
        """Get information about a specific model"""
        return self.MODELS.get(model)

    def list_models(self) -> List[ModelInfo]:
        """List all available models"""
        return list(self.MODELS.values())

    def get_usage_stats(self) -> Dict[str, Any]:
        """Get usage statistics"""
        return {
            "total_tokens_used": self.total_tokens_used,
            "total_cost_usd": round(self.total_cost_usd, 4),
            "request_count": self.request_count,
            "average_tokens_per_request": self.total_tokens_used / max(self.request_count, 1),
            "average_cost_per_request": round(self.total_cost_usd / max(self.request_count, 1), 4)
        }

    def reset_usage_stats(self):
        """Reset usage statistics"""
        self.total_tokens_used = 0
        self.total_cost_usd = 0.0
        self.request_count = 0

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()


# Singleton instance
_openrouter_service: Optional[OpenRouterService] = None


def get_openrouter_service() -> OpenRouterService:
    """Get or create the singleton OpenRouter service"""
    global _openrouter_service
    if _openrouter_service is None:
        from app.config import config
        _openrouter_service = OpenRouterService(
            default_model=config.optimizer_default_model
        )
    return _openrouter_service
