import anthropic
import pdfplumber
from django.conf import settings
from openai import OpenAI


# TODO: define full LaTeX preambles per template style
TEMPLATE_PREAMBLES: dict[str, str] = {
    "classic": "",
    "modern": "",
    "minimal": "",
    "academic": "",
}

SYSTEM_PROMPT = (
    "You are an expert resume writer and LaTeX typesetter. "
    "Given a candidate's resume text and a job description, rewrite the resume "
    "to best match the role. Output ONLY valid LaTeX source — no markdown, "
    "no explanation, no code fences."
)

SUPPORTED_PROVIDER_MODELS: dict[str, tuple[str, ...]] = {
    "openai": ("gpt-5.4-mini", "gpt-5.2"),
    "anthropic": ("claude-sonnet-4-5", "claude-sonnet-4-6"),
}


def supported_provider_models() -> dict[str, tuple[str, ...]]:
    return SUPPORTED_PROVIDER_MODELS


def is_supported_provider_model(provider: str, model: str) -> bool:
    return model in SUPPORTED_PROVIDER_MODELS.get(provider, ())


def extract_pdf_text(pdf_file) -> str:
    with pdfplumber.open(pdf_file) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def _build_user_message(
    resume_text: str,
    job_description: str,
    template: str,
    prompt: str,
) -> str:
    return (
        f"Template style: {template}\n"
        f"LaTeX preamble hint: {TEMPLATE_PREAMBLES.get(template, '')}\n\n"
        f"--- RESUME ---\n{resume_text}\n\n"
        f"--- JOB DESCRIPTION ---\n{job_description}\n\n"
        f"--- ADDITIONAL INSTRUCTIONS ---\n{prompt or 'None'}\n\n"
        f"For experience bullet points, always look to optimize the points by using the XYZ method - 'Accomplished [X] as measured by [Y] by doing [Z]'. By doing this, bullet points become quantifiable achievements.\n\n"
        f"Compact it into 1 page; auto generate bullet points based on the job title (use the XYZ method) if needed to fit more content.\n\n"
        "Generate the complete LaTeX resume document now."
    )


def _extract_openai_text(response) -> str:
    output_text = (getattr(response, "output_text", "") or "").strip()
    if output_text:
        return output_text

    chunks: list[str] = []
    for item in getattr(response, "output", []) or []:
        for content in getattr(item, "content", []) or []:
            text = getattr(content, "text", None)
            if text:
                chunks.append(text)
    return "\n".join(chunks).strip()


def _extract_anthropic_text(content_blocks) -> str:
    chunks: list[str] = []
    for block in content_blocks or []:
        if getattr(block, "type", None) != "text":
            continue
        text = getattr(block, "text", None)
        if text:
            chunks.append(text)
    return "\n".join(chunks).strip()


def _normalize_latex_output(text: str) -> str:
    normalized = (text or "").strip()
    if not normalized:
        return ""

    if normalized.startswith("```"):
        lines = normalized.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        normalized = "\n".join(lines).strip()

    return normalized


def _generate_with_openai(model: str, user_message: str) -> str:
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.responses.create(
        model=model,
        max_output_tokens=4096,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
    )
    return _extract_openai_text(response)


def _generate_with_anthropic(model: str, user_message: str) -> str:
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured.")

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=model,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )
    return _extract_anthropic_text(message.content)


def generate_latex_resume(
    resume_text: str,
    job_description: str,
    template: str,
    provider: str,
    model: str,
    prompt: str = "",
) -> str:
    user_message = _build_user_message(
        resume_text=resume_text,
        job_description=job_description,
        template=template,
        prompt=prompt,
    )

    if provider == "openai":
        generated = _generate_with_openai(model=model, user_message=user_message)
    elif provider == "anthropic":
        generated = _generate_with_anthropic(model=model, user_message=user_message)
    else:
        raise RuntimeError(f"Unsupported provider: {provider}")

    latex = _normalize_latex_output(generated)
    if not latex:
        raise RuntimeError("Provider returned an empty response.")

    return latex


def process_resume_request(
    pdf_file,
    template: str,
    job_description: str,
    provider: str,
    model: str,
    prompt: str = "",
) -> tuple[str, str]:
    """Returns (latex, template)."""
    resume_text = extract_pdf_text(pdf_file)
    latex = generate_latex_resume(
        resume_text=resume_text,
        job_description=job_description,
        template=template,
        provider=provider,
        model=model,
        prompt=prompt,
    )
    return latex, template
