"""
Wrapper around the Anthropic SDK.
Uses structured JSON output via tool_use for guaranteed schema compliance.
"""
import json
import anthropic
from app.config import settings

_client: anthropic.AsyncAnthropic | None = None

MODEL = "claude-sonnet-4-6"


def get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


async def ask_structured(
    system_prompt: str,
    user_message: str,
    output_schema: dict,
    tool_name: str = "output",
    tool_description: str = "Return structured output",
) -> dict:
    """
    Ask Claude a question and get back a structured JSON response.
    Uses tool_use to guarantee the output matches the provided JSON schema.
    """
    client = get_client()

    tool = {
        "name": tool_name,
        "description": tool_description,
        "input_schema": output_schema,
    }

    response = await client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=system_prompt,
        tools=[tool],
        tool_choice={"type": "tool", "name": tool_name},
        messages=[{"role": "user", "content": user_message}],
    )

    # Extract tool input from response
    for block in response.content:
        if block.type == "tool_use" and block.name == tool_name:
            return block.input

    raise ValueError("Claude did not return a tool_use block")


async def ask_freeform(system_prompt: str, user_message: str) -> str:
    """Ask Claude a free-form question and get a text response."""
    client = get_client()

    response = await client.messages.create(
        model=MODEL,
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    return response.content[0].text
