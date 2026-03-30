import anthropic
import pdfplumber
import re
from pathlib import Path
from django.conf import settings
from openai import OpenAI


# TODO: define full LaTeX preambles per template style
TEMPLATE_PREAMBLES: dict[str, str] = {
    "classic": "",
    "modern": "",
    "minimal": "",
    "academic": "",
    "jakes": "Use Jake's Resume macro structure and spacing exactly.",
}

SYSTEM_PROMPT = (
    "You are an expert resume writer and LaTeX typesetter. "
    "Given a candidate's resume text and a job description, rewrite the resume "
    "to best match the role. Output ONLY valid LaTeX source — no markdown, "
    "no explanation, no code fences."
)

JAKES_SYSTEM_PROMPT = (
    "You are an expert resume writer and LaTeX editor. "
    "You are filling content into a locked LaTeX template. "
    "Do NOT output a full document. "
    "Output only the requested snippet blocks with the exact delimiters."
)

JAKES_TEMPLATE_NAME = "jakes"
JAKES_SHELL_PATH = Path(__file__).resolve().parent / "templates" / "jakes_shell.tex"
JAKES_SECTIONS: tuple[str, ...] = ("HEADER", "EDUCATION", "EXPERIENCE", "PROJECTS", "SKILLS")
JAKES_PLACEHOLDERS: dict[str, str] = {
    "HEADER": "%%__JAKES_HEADER__%%",
    "EDUCATION": "%%__JAKES_EDUCATION__%%",
    "EXPERIENCE": "%%__JAKES_EXPERIENCE__%%",
    "PROJECTS": "%%__JAKES_PROJECTS__%%",
    "SKILLS": "%%__JAKES_SKILLS__%%",
}
JAKES_FORBIDDEN_PATTERNS: tuple[str, ...] = (
    r"\\documentclass\b",
    r"\\usepackage\b",
    r"\\begin\{document\}",
    r"\\end\{document\}",
    r"\\newcommand\b",
    r"\\renewcommand\b",
    r"\\input\b",
    r"\\include\b",
    r"\\write18\b",
)
EMAIL_PATTERN = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
HTTP_URL_PATTERN = r"^https?://\S+$"
DOMAIN_URL_PATTERN = r"^[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:/\S*)?$"

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
        "In bullet points, bold measurable metrics/outcomes (percentages, counts, time reductions, dollar impact) using \\textbf{...}.\n"
        "In bullet points, bold technologies/tools used to achieve the outcome using \\textbf{...}.\n\n"
        f"Compact it into 1 page; auto generate bullet points based on the job title (use the XYZ method) if needed to fit more content.\n\n"
        "Generate the complete LaTeX resume document now."
    )


def _build_jakes_user_message(
    resume_text: str,
    job_description: str,
    prompt: str,
) -> str:
    return (
        "Fill content for a locked Jake's Resume LaTeX template while preserving style.\n"
        "Replace content (name, education, experience, projects, technical skills) using resume + job description.\n"
        "Use concise, impact-focused bullets and the XYZ method where possible.\n"
        "In bullets, bold measurable metrics/outcomes and bold technologies/tools with \\textbf{...}.\n"
        "Keep the resume compact and optimized to fit one page.\n"
        "Do not emit preamble/macros/document wrappers.\n\n"
        "Output EXACTLY these blocks, in this exact order:\n"
        "[[[HEADER]]]\n"
        r"\textbf{\Huge \scshape <Full Name>} \\ \vspace{1pt}" "\n"
        r"\small <phone/email/linkedin/github separated by $|$>" "\n"
        "[[[/HEADER]]]\n"
        "[[[EDUCATION]]]\n"
        "(one or more \\resumeSubheading entries)\n"
        "[[[/EDUCATION]]]\n"
        "[[[EXPERIENCE]]]\n"
        "(one or more \\resumeSubheading blocks with \\resumeItemListStart/End)\n"
        "[[[/EXPERIENCE]]]\n"
        "[[[PROJECTS]]]\n"
        "(one or more \\resumeProjectHeading blocks with \\resumeItemListStart/End)\n"
        "[[[/PROJECTS]]]\n"
        "[[[SKILLS]]]\n"
        "(content for Technical Skills itemize body; include \\textbf labels)\n"
        "[[[/SKILLS]]]\n\n"
        "No text outside the delimiters.\n\n"
        f"--- RESUME ---\n{resume_text}\n\n"
        f"--- JOB DESCRIPTION ---\n{job_description}\n\n"
        f"--- ADDITIONAL INSTRUCTIONS ---\n{prompt or 'None'}\n"
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


def _generate_with_openai(
    model: str,
    user_message: str,
    system_prompt: str = SYSTEM_PROMPT,
) -> str:
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured.")

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.responses.create(
        model=model,
        max_output_tokens=4096,
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
    )
    return _extract_openai_text(response)


def _generate_with_anthropic(
    model: str,
    user_message: str,
    system_prompt: str = SYSTEM_PROMPT,
) -> str:
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured.")

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=model,
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    return _extract_anthropic_text(message.content)


def _load_jakes_shell() -> str:
    if not JAKES_SHELL_PATH.exists():
        raise RuntimeError(f"Jake template shell not found at: {JAKES_SHELL_PATH}")
    return JAKES_SHELL_PATH.read_text(encoding="utf-8")


def _parse_jakes_snippets(raw_text: str) -> dict[str, str]:
    cleaned = _normalize_latex_output(raw_text)
    snippets: dict[str, str] = {}
    spans: list[tuple[int, int]] = []

    for section in JAKES_SECTIONS:
        pattern = rf"\[\[\[{section}\]\]\](.*?)\[\[\[/{section}\]\]\]"
        matches = list(re.finditer(pattern, cleaned, flags=re.DOTALL))
        if len(matches) != 1:
            raise RuntimeError(
                f"Jake template output must include exactly one '{section}' block."
            )

        match = matches[0]
        value = match.group(1).strip()
        if not value:
            raise RuntimeError(f"Jake template '{section}' block is empty.")

        snippets[section] = value
        spans.append((match.start(), match.end()))

    spans.sort()
    cursor = 0
    leftovers: list[str] = []
    for start, end in spans:
        leftovers.append(cleaned[cursor:start])
        cursor = end
    leftovers.append(cleaned[cursor:])
    if "".join(leftovers).strip():
        raise RuntimeError("Jake template output contains text outside required snippet blocks.")

    return snippets


def _escape_latex_text(text: str) -> str:
    escaped = text
    replacements = (
        ("\\", r"\textbackslash{}"),
        ("&", r"\&"),
        ("%", r"\%"),
        ("$", r"\$"),
        ("#", r"\#"),
        ("_", r"\_"),
        ("{", r"\{"),
        ("}", r"\}"),
        ("~", r"\textasciitilde{}"),
        ("^", r"\textasciicircum{}"),
    )
    for old, new in replacements:
        escaped = escaped.replace(old, new)
    return escaped


def _strip_latex_to_text(text: str) -> str:
    stripped = text
    stripped = re.sub(r"\\href\{[^}]*\}\{([^}]*)\}", r"\1", stripped)
    stripped = re.sub(r"\\underline\{([^}]*)\}", r"\1", stripped)
    stripped = re.sub(r"\\textbf\{([^}]*)\}", r"\1", stripped)
    stripped = re.sub(r"\\[A-Za-z]+\*?(?:\[[^\]]*\])?", " ", stripped)
    stripped = stripped.replace("{", " ").replace("}", " ")
    stripped = stripped.replace("$|$", " | ")
    stripped = re.sub(r"\s+", " ", stripped).strip()
    return stripped


def _normalize_contact_item(item: str) -> str:
    token = item.strip()
    if not token:
        return ""

    if r"\href{" in token:
        return token

    token_no_label = re.sub(r"^(email|linkedin|github|phone)\s*:\s*", "", token, flags=re.IGNORECASE)

    if re.match(EMAIL_PATTERN, token_no_label):
        safe_email = _escape_latex_text(token_no_label)
        return rf"\href{{mailto:{token_no_label}}}{{\underline{{{safe_email}}}}}"

    if re.match(HTTP_URL_PATTERN, token_no_label):
        label = _escape_latex_text(re.sub(r"^https?://", "", token_no_label))
        return rf"\href{{{token_no_label}}}{{\underline{{{label}}}}}"

    if re.match(DOMAIN_URL_PATTERN, token_no_label):
        label = _escape_latex_text(token_no_label)
        return rf"\href{{https://{token_no_label}}}{{\underline{{{label}}}}}"

    return _escape_latex_text(token)


def _normalize_jakes_header(header_snippet: str) -> str:
    lines = [line.strip() for line in header_snippet.splitlines() if line.strip()]
    if not lines:
        raise RuntimeError("Could not parse Jake header: missing name or contact fields.")

    name: str | None = None
    name_line_index: int | None = None

    textbf_match = re.search(r"\\textbf\{(.+?)\}", header_snippet, flags=re.DOTALL)
    if textbf_match:
        candidate = _strip_latex_to_text(textbf_match.group(1))
        if candidate:
            name = candidate

    if not name:
        for idx, line in enumerate(lines):
            if r"\small" in line:
                continue
            parts = re.split(r"\s*(?:\$\|\$|\|)\s*", line)
            if len(parts) > 1:
                candidate = _strip_latex_to_text(parts[0])
            else:
                candidate = _strip_latex_to_text(line)

            if not candidate:
                continue
            if "@" in candidate or re.search(r"\d{3}", candidate):
                continue

            name = candidate
            name_line_index = idx
            break

    contacts_source = ""
    small_lines = []
    for line in lines:
        small_match = re.search(r"\\small\s*(.*)", line)
        if small_match:
            small_lines.append(small_match.group(1).strip())
    if small_lines:
        contacts_source = " | ".join([line for line in small_lines if line])

    if not contacts_source and name_line_index is not None:
        remaining = [line for idx, line in enumerate(lines) if idx != name_line_index]
        cleaned_remaining = []
        for line in remaining:
            cleaned = line.replace(r"\small", "").strip()
            if cleaned:
                cleaned_remaining.append(cleaned)
        contacts_source = " | ".join(cleaned_remaining)

    if not contacts_source:
        for line in lines:
            parts = re.split(r"\s*(?:\$\|\$|\|)\s*", line)
            if len(parts) > 1:
                if not name:
                    name_candidate = _strip_latex_to_text(parts[0])
                    if name_candidate:
                        name = name_candidate
                contacts_source = " | ".join(parts[1:])
                break

    if not name or not contacts_source.strip():
        raise RuntimeError("Could not parse Jake header: missing name or contact fields.")

    contact_items = []
    for raw_item in re.split(r"\s*(?:\$\|\$|\|)\s*", contacts_source.replace("\n", " | ")):
        normalized = _normalize_contact_item(raw_item)
        if normalized:
            contact_items.append(normalized)

    if not contact_items:
        raise RuntimeError("Could not parse Jake header: missing name or contact fields.")

    safe_name = _escape_latex_text(name)
    contact_line = " $|$ ".join(contact_items)
    return (
        rf"\textbf{{\Huge \scshape {safe_name}}} \\ \vspace{{1pt}}" "\n"
        rf"\small {contact_line}"
    )


def _validate_jakes_snippets(snippets: dict[str, str]) -> None:
    for section, snippet in snippets.items():
        for pattern in JAKES_FORBIDDEN_PATTERNS:
            if re.search(pattern, snippet, flags=re.IGNORECASE):
                raise RuntimeError(
                    f"Jake template '{section}' block contains a forbidden command."
                )

        if "%%__JAKES_" in snippet:
            raise RuntimeError(f"Jake template '{section}' block contains a reserved marker.")

    snippets["HEADER"] = _normalize_jakes_header(snippets["HEADER"])

    if "\\resumeSubheading" not in snippets["EDUCATION"]:
        raise RuntimeError("Jake template 'EDUCATION' block must contain \\resumeSubheading entries.")

    if "\\resumeSubheading" not in snippets["EXPERIENCE"]:
        raise RuntimeError("Jake template 'EXPERIENCE' block must contain \\resumeSubheading entries.")

    if "\\resumeProjectHeading" not in snippets["PROJECTS"]:
        raise RuntimeError("Jake template 'PROJECTS' block must contain \\resumeProjectHeading entries.")

    if "\\textbf{" not in snippets["SKILLS"]:
        raise RuntimeError("Jake template 'SKILLS' block must include labeled skill groups.")


def _render_jakes_resume(snippets: dict[str, str]) -> str:
    shell = _load_jakes_shell()
    for section, marker in JAKES_PLACEHOLDERS.items():
        if marker not in shell:
            raise RuntimeError(f"Jake template shell is missing marker: {marker}")
        shell = shell.replace(marker, snippets[section].strip())
    return shell


def generate_latex_resume(
    resume_text: str,
    job_description: str,
    template: str,
    provider: str,
    model: str,
    prompt: str = "",
) -> str:
    if template == JAKES_TEMPLATE_NAME:
        user_message = _build_jakes_user_message(
            resume_text=resume_text,
            job_description=job_description,
            prompt=prompt,
        )
        if provider == "openai":
            generated = _generate_with_openai(
                model=model,
                user_message=user_message,
                system_prompt=JAKES_SYSTEM_PROMPT,
            )
        elif provider == "anthropic":
            generated = _generate_with_anthropic(
                model=model,
                user_message=user_message,
                system_prompt=JAKES_SYSTEM_PROMPT,
            )
        else:
            raise RuntimeError(f"Unsupported provider: {provider}")

        snippets = _parse_jakes_snippets(generated)
        _validate_jakes_snippets(snippets)
        latex = _render_jakes_resume(snippets)
        if not latex.strip():
            raise RuntimeError("Jake template rendering produced an empty resume.")
        return latex

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
