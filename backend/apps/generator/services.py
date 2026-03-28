import anthropic
import pdfplumber
from django.conf import settings


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


def extract_pdf_text(pdf_file) -> str:
    with pdfplumber.open(pdf_file) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def generate_latex_resume(
    resume_text: str,
    job_description: str,
    template: str,
    prompt: str = "",
) -> str:
    client = anthropic.Anthropic(api_key=settings.AI_API_KEY)

    user_message = (
        f"Template style: {template}\n"
        f"LaTeX preamble hint: {TEMPLATE_PREAMBLES.get(template, '')}\n\n"
        f"--- RESUME ---\n{resume_text}\n\n"
        f"--- JOB DESCRIPTION ---\n{job_description}\n\n"
        f"--- ADDITIONAL INSTRUCTIONS ---\n{prompt or 'None'}\n\n"
        "Generate the complete LaTeX resume document now."
    )

    message = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )
    return message.content[0].text


def process_resume_request(
    pdf_file,
    template: str,
    job_description: str,
    prompt: str = "",
) -> tuple[str, str]:
    """Returns (latex, template)."""
    resume_text = extract_pdf_text(pdf_file)
    latex = generate_latex_resume(
        resume_text=resume_text,
        job_description=job_description,
        template=template,
        prompt=prompt,
    )
    return latex, template
