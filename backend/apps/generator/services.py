import re

from apps.tailor.services import JAKES_TEMPLATE_NAME, generate_latex_resume

MIN_TARGET_ENTRIES = 5
MIN_TARGET_EXPERIENCE = 2
MIN_TARGET_PROJECTS = 2


def _clean_string(value) -> str:
    return str(value).strip() if value is not None else ""


def _clean_list(value) -> list[str]:
    if not isinstance(value, list):
        return []
    return [_clean_string(item) for item in value if _clean_string(item)]


def _profile_name(profile: dict) -> str:
    return (
        _clean_string(profile.get("full_name"))
        or _clean_string(profile.get("display_name"))
        or _clean_string(profile.get("email")).split("@")[0]
        or "Candidate"
    )


def _format_date_range(item: dict) -> str:
    start = _clean_string(item.get("start_date"))
    end = "Present" if item.get("is_current") else _clean_string(item.get("end_date"))
    if start and end:
        return f"{start} - {end}"
    return start or end


def _append_bullets(lines: list[str], bullets: list[str], indent: str = "    ") -> None:
    for bullet in bullets:
        lines.append(f"{indent}- {bullet}")


def build_profile_resume_context(profile: dict) -> str:
    basic = profile.get("basic") if isinstance(profile.get("basic"), dict) else {}
    experience = profile.get("experience") if isinstance(profile.get("experience"), list) else []
    projects = profile.get("projects") if isinstance(profile.get("projects"), list) else []
    education = profile.get("education") if isinstance(profile.get("education"), list) else []
    certificates = profile.get("certificates") if isinstance(profile.get("certificates"), list) else []
    skills = profile.get("skills") if isinstance(profile.get("skills"), list) else []

    lines = [
        "PROFILE SOURCE OF TRUTH",
        "Use only the information below. Do not invent missing employers, projects, schools, dates, links, skills, tools, or metrics.",
        "",
        "BASIC",
        f"Name: {_profile_name(profile)}",
        f"Email: {_clean_string(basic.get('contact_email')) or _clean_string(profile.get('email'))}",
        f"Phone: {_clean_string(basic.get('phone_country_code'))} {_clean_string(basic.get('phone'))}".strip(),
        f"Location: {_clean_string(basic.get('location'))}",
        f"Headline: {_clean_string(basic.get('headline'))}",
        f"GitHub: {_clean_string(basic.get('github_url'))}",
        f"LinkedIn: {_clean_string(basic.get('linkedin_url'))}",
        f"Portfolio: {_clean_string(basic.get('portfolio_url'))}",
        f"Summary: {_clean_string(basic.get('summary'))}",
        "",
        f"EXPERIENCE SOURCE ITEMS ({len(experience)} available)",
    ]

    for index, item in enumerate(experience, start=1):
        if not isinstance(item, dict):
            continue
        lines.extend([
            f"{index}. {_clean_string(item.get('role'))} at {_clean_string(item.get('company'))}",
            f"    Location: {_clean_string(item.get('location'))}",
            f"    Dates: {_format_date_range(item)}",
        ])
        _append_bullets(lines, _clean_list(item.get("description")))

    lines.extend(["", f"PROJECT SOURCE ITEMS ({len(projects)} available)"])
    for index, item in enumerate(projects, start=1):
        if not isinstance(item, dict):
            continue
        lines.extend([
            f"{index}. {_clean_string(item.get('name'))}",
            f"    Label: {_clean_string(item.get('label'))}",
            f"    Stack: {', '.join(_clean_list(item.get('stack')))}",
            f"    Dates: {_clean_string(item.get('start_date'))} - {_clean_string(item.get('end_date'))}".strip(" -"),
            f"    Live URL: {_clean_string(item.get('live_url'))}",
            f"    GitHub URL: {_clean_string(item.get('github_url'))}",
        ])
        _append_bullets(lines, _clean_list(item.get("description")))

    lines.extend(["", "EDUCATION"])
    for index, item in enumerate(education, start=1):
        if not isinstance(item, dict):
            continue
        lines.extend([
            f"{index}. {_clean_string(item.get('school'))}",
            f"    Degree: {_clean_string(item.get('degree'))}",
            f"    Major: {_clean_string(item.get('major'))}",
            f"    Location: {_clean_string(item.get('location'))}",
            f"    Dates: {_clean_string(item.get('start_date'))} - {_clean_string(item.get('end_date'))}".strip(" -"),
            f"    GPA: {_clean_string(item.get('gpa'))}",
            f"    Awards: {', '.join(_clean_list(item.get('awards')))}",
            f"    Relevant coursework: {', '.join(_clean_list(item.get('relevant_coursework')))}",
        ])

    lines.extend(["", "CERTIFICATES"])
    for index, item in enumerate(certificates, start=1):
        if not isinstance(item, dict):
            continue
        lines.append(
            f"{index}. {_clean_string(item.get('name'))} | {_clean_string(item.get('issuer'))} | "
            f"{_clean_string(item.get('issue_date'))} | {_clean_string(item.get('credential_url'))}"
        )

    lines.extend(["", "SKILLS"])
    for item in skills:
        if not isinstance(item, dict):
            continue
        name = _clean_string(item.get("name"))
        category = _clean_string(item.get("category"))
        if name:
            lines.append(f"- {category}: {name}" if category else f"- {name}")

    return "\n".join(lines)


def build_profile_warnings(profile: dict) -> list[str]:
    experience = profile.get("experience") if isinstance(profile.get("experience"), list) else []
    projects = profile.get("projects") if isinstance(profile.get("projects"), list) else []
    total_entries = len(experience) + len(projects)
    warnings: list[str] = []

    if total_entries < MIN_TARGET_ENTRIES:
        warnings.append(
            f"Profile has {total_entries} total work/project entries; generated resume used the best available truthful entries."
        )
    if len(experience) < MIN_TARGET_EXPERIENCE:
        warnings.append(
            f"Profile has {len(experience)} work experience entries; target is 2-3 when available."
        )
    if len(projects) < MIN_TARGET_PROJECTS:
        warnings.append(
            f"Profile has {len(projects)} project entries; target is 2-3 when available."
        )

    return warnings


def build_profile_generation_prompt(role: str, company_name: str, prompt: str) -> str:
    company_line = f"Target company: {company_name}" if company_name else "Target company: Not specified"
    extra = prompt or "None"
    return (
        "You are generating a new resume from a saved candidate profile, not tailoring an uploaded resume.\n"
        f"Target role: {role}\n"
        f"{company_line}\n"
        "Use Jake's Resume style through the required snippet blocks.\n"
        "Select the most relevant truthful content from the profile for the target role.\n"
        "Aim for exactly 5 total entries across Experience and Projects when source material supports it.\n"
        "Use 2-3 work experiences and 2-3 projects; if the source has fewer entries, use all available relevant truthful entries.\n"
        "Project labels, stacks, and descriptions are evidence for choosing the closest projects.\n"
        "Filter and group skills according to the selected evidence and target role.\n"
        "Never invent employers, projects, dates, links, tools, skills, responsibilities, or concrete metrics.\n"
        "Additional user instructions:\n"
        f"{extra}"
    )


def generate_profile_resume_latex(
    profile: dict,
    role: str,
    company_name: str,
    job_description: str,
    provider: str,
    model: str,
    prompt: str = "",
) -> tuple[str, str, list[str]]:
    profile_context = build_profile_resume_context(profile)
    warnings = build_profile_warnings(profile)
    target_context = (
        f"Target role: {role}\n"
        f"Target company: {company_name or 'Not specified'}\n\n"
        f"Job posting or role context:\n{job_description or 'No job posting provided.'}"
    )
    latex = generate_latex_resume(
        resume_text=profile_context,
        job_description=target_context,
        template=JAKES_TEMPLATE_NAME,
        provider=provider,
        model=model,
        prompt=build_profile_generation_prompt(role, company_name, prompt),
    )
    return latex, JAKES_TEMPLATE_NAME, warnings


def build_document_name(role: str, company_name: str = "") -> str:
    role = _clean_string(role)
    company_name = _clean_string(company_name)
    return f"{company_name} - {role}" if company_name else role


def _filename_part(value: str, fallback: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]+", "_", _clean_string(value)).strip("_")
    return cleaned or fallback


def build_resume_download_filename(role: str, profile: dict) -> str:
    role_part = _filename_part(role, "Role")
    name_part = _filename_part(_profile_name(profile), "Candidate")
    return f"{role_part}_{name_part}_Resume.pdf"
