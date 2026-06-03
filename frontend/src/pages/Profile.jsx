import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
    Award,
    BookOpen,
    BriefcaseBusiness,
    ChevronDown,
    CheckCircle2,
    Circle,
    FileSearch,
    Github,
    GraduationCap,
    Link as LinkIcon,
    Loader2,
    Mail,
    MapPin,
    Minus,
    Pencil,
    Plus,
    Save,
    ShieldCheck,
    Sparkles,
    Trash2,
    Upload,
    UserRound,
    X,
} from "lucide-react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiFetch, apiUpload } from "@/lib/api";
import { useAuthState } from "react-firebase-hooks/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const PROFILE_ACCENT = "#5d681c";
const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const PDF_MIME_TYPE = "application/pdf";
const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const RESUME_FILE_ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PROJECT_LABELS = [
    "Full-stack web application",
    "Frontend",
    "Backend",
    "Mobile",
    "ML/AI",
    "Data",
    "DevOps",
    "Research",
];
const SUGGESTED_SKILLS = [
    "React",
    "JavaScript",
    "Python",
    "Django",
    "REST APIs",
    "Firebase",
    "SQL",
    "PostgreSQL",
    "Machine Learning",
    "Git",
];
const SUGGESTED_STACK = ["React", "Vite", "Django", "Firebase", "Tailwind CSS", "PostgreSQL", "Python", "Docker"];
const PHONE_COUNTRY_CODES = [
    { value: "+1", label: "United States / Canada (+1)" },
    { value: "+44", label: "United Kingdom (+44)" },
    { value: "+61", label: "Australia (+61)" },
    { value: "+64", label: "New Zealand (+64)" },
    { value: "+33", label: "France (+33)" },
    { value: "+49", label: "Germany (+49)" },
    { value: "+31", label: "Netherlands (+31)" },
    { value: "+91", label: "India (+91)" },
    { value: "+81", label: "Japan (+81)" },
    { value: "+82", label: "South Korea (+82)" },
    { value: "+86", label: "China (+86)" },
    { value: "+52", label: "Mexico (+52)" },
    { value: "+55", label: "Brazil (+55)" },
    { value: "+84", label: "Vietnam (+84)" },
];
const PHONE_NUMBER_HINTS = {
    "+1": "US/Canada numbers are 10 digits, e.g. 5551234567.",
    "+44": "Enter the UK number without the leading 0.",
    "+61": "Enter the Australian number without the leading 0.",
    "+64": "Enter the New Zealand number without the leading 0.",
    "+33": "Enter the French number without the leading 0.",
    "+49": "Enter the German local number without the country code.",
    "+31": "Enter the Dutch number without the leading 0.",
    "+91": "India numbers are usually 10 digits.",
    "+81": "Enter the Japanese number without the leading 0.",
    "+82": "Enter the Korean number without the leading 0.",
    "+86": "China mobile numbers are usually 11 digits.",
    "+52": "Mexico numbers are usually 10 digits.",
    "+55": "Brazil numbers are usually 10 or 11 digits.",
    "+84": "Enter the Vietnamese number without the leading 0.",
};
const PROFILE_REVIEW_SECTIONS = ["experience", "projects", "education", "certificates", "skills"];
const REVIEW_SECTION_LABELS = {
    experience: "Experience",
    projects: "Projects",
    education: "Education",
    certificates: "Certificates",
    skills: "Skills",
};
const REVIEW_ACTION_LABELS = {
    keep_existing: "Keep existing",
    use_parsed: "Use parsed",
    merge: "Merge",
    add: "Add",
    skip: "Skip",
};

function emptyBasic() {
    return {
        phone_country_code: "+1",
        phone: "",
        contact_email: "",
        location: "",
        headline: "",
        github_url: "",
        linkedin_url: "",
        portfolio_url: "",
        summary: "",
    };
}

function emptyExperience() {
    return {
        company: "",
        role: "",
        location: "",
        start_date: "",
        end_date: "",
        is_current: false,
        description: [],
    };
}

function emptyProject() {
    return {
        name: "",
        label: "",
        stack: [],
        description: [],
        live_url: "",
        github_url: "",
        start_date: "",
        end_date: "",
    };
}

function emptyEducation() {
    return {
        school: "",
        degree: "",
        major: "",
        location: "",
        start_date: "",
        end_date: "",
        gpa: "",
        awards: [],
        relevant_coursework: [],
    };
}

function emptyCertificate() {
    return {
        name: "",
        issuer: "",
        issue_date: "",
        expiration_date: "",
        credential_id: "",
        credential_url: "",
    };
}

function emptySkill(name = "", category = "") {
    return { name, category };
}

function cleanString(value) {
    return String(value || "").trim();
}

function cleanStringList(value, limit) {
    const cleaned = Array.isArray(value) ? value.map(cleanString).filter(Boolean) : [];
    return typeof limit === "number" ? cleaned.slice(0, limit) : cleaned;
}

function normalizeKey(value) {
    return cleanString(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function mergeUniqueStrings(existing, parsed, limit) {
    const merged = [];
    const seen = new Set();

    [...cleanStringList(existing), ...cleanStringList(parsed)].forEach((item) => {
        const key = normalizeKey(item);
        if (!item || seen.has(key)) return;
        seen.add(key);
        merged.push(item);
    });

    return typeof limit === "number" ? merged.slice(0, limit) : merged;
}

function mergeShape(template, value) {
    const source = value && typeof value === "object" ? value : {};
    return Object.keys(template).reduce((next, key) => {
        if (Array.isArray(template[key])) {
            next[key] = Array.isArray(source[key]) ? source[key] : [];
            return next;
        }
        if (typeof template[key] === "boolean") {
            next[key] = Boolean(source[key]);
            return next;
        }
        next[key] = cleanString(source[key]);
        return next;
    }, {});
}

function normalizeFormProfile(data = {}, user) {
    return {
        fullName: cleanString(data.full_name),
        displayName: cleanString(data.display_name || user?.displayName),
        basic: mergeShape(emptyBasic(), data.basic),
        experience: Array.isArray(data.experience) ? data.experience.map((item) => mergeShape(emptyExperience(), item)) : [],
        projects: Array.isArray(data.projects) ? data.projects.map((item) => mergeShape(emptyProject(), item)) : [],
        education: Array.isArray(data.education) ? data.education.map((item) => mergeShape(emptyEducation(), item)) : [],
        certificates: Array.isArray(data.certificates) ? data.certificates.map((item) => mergeShape(emptyCertificate(), item)) : [],
        skills: Array.isArray(data.skills) ? data.skills.map((item) => mergeShape(emptySkill(), item)) : [],
    };
}

function normalizeReviewProfile(data = {}, user) {
    return normalizeFormProfile(data, user);
}

function getSectionTemplate(section) {
    switch (section) {
        case "experience":
            return emptyExperience();
        case "projects":
            return emptyProject();
        case "education":
            return emptyEducation();
        case "certificates":
            return emptyCertificate();
        case "skills":
            return emptySkill();
        default:
            return {};
    }
}

function mergeReviewEntry(section, existing, parsed) {
    const template = getSectionTemplate(section);
    const current = mergeShape(template, existing);
    const incoming = mergeShape(template, parsed);
    const merged = { ...current };

    Object.keys(template).forEach((field) => {
        if (Array.isArray(template[field])) {
            merged[field] = mergeUniqueStrings(current[field], incoming[field], section === "projects" && field === "stack" ? 5 : undefined);
            return;
        }

        if (typeof template[field] === "boolean") {
            merged[field] = Boolean(current[field] || incoming[field]);
            return;
        }

        if (!cleanString(current[field]) && cleanString(incoming[field])) {
            merged[field] = incoming[field];
        }
    });

    return merged;
}

function buildReviewDecisionKey(item) {
    return `${item.section}:${item.parsed_index}`;
}

function buildDefaultReviewDecisions(reviewItems) {
    return reviewItems.reduce((next, item) => {
        next[buildReviewDecisionKey(item)] = item.recommended_action || (item.status === "duplicate" ? "merge" : "add");
        return next;
    }, {});
}

function applyResumeReviewDecisions(currentFormData, payload, decisions, user) {
    const parsedProfile = normalizeReviewProfile(payload?.parsed_profile || {}, user);
    const mergedProfile = normalizeReviewProfile(payload?.merged_profile || {}, user);
    const reviewItems = Array.isArray(payload?.review_items) ? payload.review_items : [];
    const nextProfile = {
        ...currentFormData,
        fullName: mergedProfile.fullName,
        displayName: mergedProfile.displayName,
        basic: mergedProfile.basic,
    };

    PROFILE_REVIEW_SECTIONS.forEach((section) => {
        nextProfile[section] = Array.isArray(currentFormData[section])
            ? currentFormData[section].map((item) => ({ ...item }))
            : [];
    });

    reviewItems.forEach((item) => {
        const section = item.section;
        if (!PROFILE_REVIEW_SECTIONS.includes(section)) return;

        const parsedItem = parsedProfile[section]?.[item.parsed_index];
        if (!parsedItem) return;

        const action = decisions[buildReviewDecisionKey(item)] || item.recommended_action;
        if (item.status === "duplicate") {
            const existingIndex = item.existing_index;
            if (!Number.isInteger(existingIndex) || !nextProfile[section][existingIndex]) return;

            if (action === "use_parsed") {
                nextProfile[section][existingIndex] = parsedItem;
            } else if (action === "merge") {
                nextProfile[section][existingIndex] = mergeReviewEntry(section, nextProfile[section][existingIndex], parsedItem);
            }
            return;
        }

        if (action === "add") {
            nextProfile[section].push(parsedItem);
        }
    });

    return nextProfile;
}

function buildSavePayload(formData) {
    return {
        full_name: cleanString(formData.fullName),
        display_name: cleanString(formData.displayName),
        basic: {
            phone_country_code: cleanString(formData.basic.phone_country_code) || "+1",
            phone: cleanString(formData.basic.phone),
            contact_email: cleanString(formData.basic.contact_email),
            location: cleanString(formData.basic.location),
            headline: cleanString(formData.basic.headline),
            github_url: cleanString(formData.basic.github_url),
            linkedin_url: cleanString(formData.basic.linkedin_url),
            portfolio_url: cleanString(formData.basic.portfolio_url),
            summary: cleanString(formData.basic.summary),
        },
        experience: formData.experience.map((item) => ({
            company: cleanString(item.company),
            role: cleanString(item.role),
            location: cleanString(item.location),
            start_date: cleanString(item.start_date),
            end_date: cleanString(item.end_date),
            is_current: Boolean(item.is_current),
            description: cleanStringList(item.description),
        })),
        projects: formData.projects.map((item) => ({
            name: cleanString(item.name),
            label: cleanString(item.label),
            stack: cleanStringList(item.stack, 5),
            description: cleanStringList(item.description),
            live_url: cleanString(item.live_url),
            github_url: cleanString(item.github_url),
            start_date: cleanString(item.start_date),
            end_date: cleanString(item.end_date),
        })),
        education: formData.education.map((item) => ({
            school: cleanString(item.school),
            degree: cleanString(item.degree),
            major: cleanString(item.major),
            location: cleanString(item.location),
            start_date: cleanString(item.start_date),
            end_date: cleanString(item.end_date),
            gpa: cleanString(item.gpa),
            awards: cleanStringList(item.awards),
            relevant_coursework: cleanStringList(item.relevant_coursework),
        })),
        certificates: formData.certificates.map((item) => ({
            name: cleanString(item.name),
            issuer: cleanString(item.issuer),
            issue_date: cleanString(item.issue_date),
            expiration_date: cleanString(item.expiration_date),
            credential_id: cleanString(item.credential_id),
            credential_url: cleanString(item.credential_url),
        })),
        skills: formData.skills.map((item) => ({
            name: cleanString(item.name),
            category: cleanString(item.category),
        })),
    };
}

function getInitials(name) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function hasText(value) {
    return cleanString(value).length > 0;
}

function hasListItem(value) {
    return cleanStringList(value).length > 0;
}

function getPhoneNumberHint(countryCode) {
    return PHONE_NUMBER_HINTS[countryCode] || "Enter the local number without the country code.";
}

function isResumeImportFile(file) {
    const name = file?.name?.toLowerCase() || "";
    return file?.type === PDF_MIME_TYPE || file?.type === DOCX_MIME_TYPE || name.endsWith(".pdf") || name.endsWith(".docx");
}

function validateResumeImportFile(file) {
    if (!file) {
        return "Please upload your resume as a PDF or DOCX file.";
    }
    if (!isResumeImportFile(file)) {
        return "Resume must be a PDF or DOCX file.";
    }
    if (file.size > MAX_RESUME_BYTES) {
        return "Resume file must be 10MB or smaller.";
    }
    return "";
}

function isProfileMeaningfullyEmpty(formData) {
    const basicValues = Object.entries(formData.basic || {})
        .filter(([key]) => key !== "phone_country_code")
        .map(([, value]) => value);
    const hasBasic = basicValues.some(hasText);
    const hasExperience = formData.experience.some((item) => hasText(item.company) || hasText(item.role) || hasListItem(item.description));
    const hasProjects = formData.projects.some((item) => hasText(item.name) || hasListItem(item.stack) || hasListItem(item.description));
    const hasEducation = formData.education.some((item) => hasText(item.school) || hasText(item.degree) || hasText(item.major));
    const hasCertificates = formData.certificates.some((item) => hasText(item.name) || hasText(item.issuer));
    const hasSkills = formData.skills.some((item) => hasText(item.name));

    return !hasBasic && !hasExperience && !hasProjects && !hasEducation && !hasCertificates && !hasSkills;
}

function calculateChecklist(formData, fallbackEmail) {
    const basicsComplete = Boolean(
        hasText(formData.fullName) &&
        hasText(formData.basic.phone) &&
        hasText(formData.basic.location) &&
        (hasText(formData.basic.contact_email) || hasText(fallbackEmail))
    );
    const experienceComplete = formData.experience.some((item) => hasText(item.company) && hasText(item.role) && hasListItem(item.description));
    const projectsComplete = formData.projects.some((item) => hasText(item.name) && hasListItem(item.stack) && hasListItem(item.description));
    const educationComplete = formData.education.some((item) => hasText(item.school) && (hasText(item.degree) || hasText(item.major)));
    const skillsComplete = formData.skills.some((item) => hasText(item.name));
    const certificatesComplete = formData.certificates.some((item) => hasText(item.name) && hasText(item.issuer));

    return [
        { key: "basic", label: "Basics", complete: basicsComplete, required: true },
        { key: "experience", label: "Experience", complete: experienceComplete, required: true },
        { key: "projects", label: "Projects", complete: projectsComplete, required: true },
        { key: "education", label: "Education", complete: educationComplete, required: true },
        { key: "skills", label: "Skills", complete: skillsComplete, required: true },
        { key: "certificates", label: "Certificates", complete: certificatesComplete, required: false },
    ];
}

function Panel({ children, className = "", panelRef = null }) {
    return (
        <section ref={panelRef} className={`rounded-xl border border-[#ded7c8] bg-[#fffdf8] shadow-[0_18px_55px_rgba(32,31,22,0.06)] ${className}`}>
            {children}
        </section>
    );
}

function TextArea({ className = "", ...props }) {
    return (
        <textarea
            className={`min-h-28 w-full rounded-lg border border-[#d9d2c2] bg-white px-3 py-2 text-sm leading-6 text-zinc-900 shadow-xs outline-none transition focus-visible:border-[#7c8730] focus-visible:ring-3 focus-visible:ring-[#7c8730]/20 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            {...props}
        />
    );
}

function CollapsibleContent({ isOpen, children, contentId }) {
    return (
        <div
            id={contentId}
            className={`grid transition-[grid-template-rows,opacity] duration-250 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
        >
            <div className="overflow-hidden">
                <div className={`transition-transform duration-250 ease-out ${isOpen ? "translate-y-0" : "-translate-y-2"}`}>
                    {children}
                </div>
            </div>
        </div>
    );
}

function SectionHeader({ title, description, icon, action, collapsible = false, isOpen = true, onToggle, contentId }) {
    const IconComponent = icon;

    if (collapsible) {
        return (
            <div className="mb-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <button
                    type="button"
                    onClick={onToggle}
                    className="group flex min-w-0 cursor-pointer items-start gap-3 text-left"
                    aria-expanded={isOpen}
                    aria-controls={contentId}
                >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#eef2d8] text-[#5d681c]">
                        <IconComponent className="size-5" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold tracking-tight text-zinc-950">{title}</h2>
                        <p className="mt-1 text-sm leading-6 text-zinc-600">{description}</p>
                    </div>
                </button>
                <div className="flex shrink-0 items-start gap-3 sm:justify-end">
                    <button
                        type="button"
                        onClick={onToggle}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-md text-[#5d681c] transition-colors hover:bg-[#eef2d8] focus-visible:bg-[#eef2d8]"
                        aria-expanded={isOpen}
                        aria-controls={contentId}
                        aria-label={`${isOpen ? "Collapse" : "Expand"} ${title}`}
                    >
                        <ChevronDown
                            className={`size-4 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`}
                            strokeWidth={2}
                        />
                    </button>
                    {action && <div className="flex min-w-36 justify-end">{action}</div>}
                </div>
            </div>
        );
    }

    return (
        <div className="mb-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#eef2d8] text-[#5d681c]">
                    <IconComponent className="size-5" strokeWidth={1.8} />
                </div>
                <div>
                    <h2 className="text-lg font-semibold tracking-tight text-zinc-950">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-600">{description}</p>
                </div>
            </div>
            {action && <div className="flex shrink-0 sm:justify-end">{action}</div>}
        </div>
    );
}

function Field({ label, children, className = "" }) {
    return (
        <div className={`space-y-2 ${className}`}>
            <Label>{label}</Label>
            {children}
        </div>
    );
}

function SmallButton({ children, className = "", ...props }) {
    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            className={`rounded-md border-[#cfc7b7] bg-white text-zinc-800 hover:bg-[#f8f5ed] ${className}`}
            {...props}
        >
            {children}
        </Button>
    );
}

function BulletEditor({ label, bullets, onChange, onAdd, onRemove, placeholder }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <Label>{label}</Label>
                <SmallButton onClick={onAdd}>
                    <Plus className="size-4" strokeWidth={1.8} />
                    Add bullet
                </SmallButton>
            </div>
            <div className="space-y-2">
                {bullets.length === 0 && (
                    <p className="rounded-lg border border-dashed border-[#d8d0bd] bg-[#fbfaf5] px-3 py-2 text-sm text-zinc-500">
                        No bullets added.
                    </p>
                )}
                {bullets.map((bullet, bulletIndex) => (
                    <div key={bulletIndex} className="grid grid-cols-[20px_1fr_auto] items-center gap-2">
                        <span className="text-center text-lg leading-none text-[#7a6f58]">-</span>
                        <Input
                            value={bullet}
                            placeholder={placeholder}
                            onChange={(event) => onChange(bulletIndex, event.target.value)}
                            className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove ${label.toLowerCase()} bullet`}
                            onClick={() => onRemove(bulletIndex)}
                            className="text-zinc-500 hover:bg-red-50 hover:text-red-600"
                        >
                            <Minus className="size-4" strokeWidth={1.8} />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Chip({ children, onRemove }) {
    return (
        <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-[#cbd3ad] bg-[#f4f6e8] px-2.5 py-1 text-sm text-[#46511a]">
            <span className="truncate">{children}</span>
            {onRemove && (
                <button
                    type="button"
                    aria-label={`Remove ${children}`}
                    onClick={onRemove}
                    className="rounded-sm p-0.5 text-[#687228] transition hover:bg-white"
                >
                    <Minus className="size-3.5" strokeWidth={2} />
                </button>
            )}
        </span>
    );
}

function getReviewEntryTitle(section, item = {}) {
    if (section === "experience") {
        return [item.role, item.company].map(cleanString).filter(Boolean).join(" at ") || "Untitled experience";
    }
    if (section === "projects") {
        return cleanString(item.name) || "Untitled project";
    }
    if (section === "education") {
        return [item.degree || item.major, item.school].map(cleanString).filter(Boolean).join(" at ") || "Untitled education";
    }
    if (section === "certificates") {
        return [item.name, item.issuer].map(cleanString).filter(Boolean).join(" by ") || "Untitled certificate";
    }
    if (section === "skills") {
        return [item.name, item.category].map(cleanString).filter(Boolean).join(" - ") || "Untitled skill";
    }
    return "Parsed entry";
}

function getReviewEntryDetails(item = {}) {
    return Object.entries(item).flatMap(([field, value]) => {
        if (Array.isArray(value)) {
            const list = cleanStringList(value);
            return list.length ? [{ field, value: list.join(", ") }] : [];
        }
        if (typeof value === "boolean") {
            return value ? [{ field, value: "Current" }] : [];
        }
        const cleaned = cleanString(value);
        return cleaned ? [{ field, value: cleaned }] : [];
    });
}

function ReviewEntryPreview({ label, section, item }) {
    const details = getReviewEntryDetails(item);

    return (
        <div className="rounded-lg border border-[#e2d9c8] bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b741f]">{label}</p>
            <h4 className="mt-1 text-sm font-semibold text-zinc-950">{getReviewEntryTitle(section, item)}</h4>
            {details.length > 0 && (
                <dl className="mt-3 grid gap-1.5 text-xs leading-5 text-zinc-600">
                    {details.slice(0, 7).map((detail) => (
                        <div key={`${detail.field}-${detail.value}`} className="grid gap-1 sm:grid-cols-[92px_1fr]">
                            <dt className="capitalize text-zinc-500">{detail.field.replaceAll("_", " ")}</dt>
                            <dd className="min-w-0 break-words">{detail.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </div>
    );
}

function ResumeReviewModal({ isOpen, payload, existingProfile, decisions, onDecisionChange, onApply, onClose, user }) {
    const reviewItems = useMemo(() => (Array.isArray(payload?.review_items) ? payload.review_items : []), [payload]);
    const sectionGroups = useMemo(() => PROFILE_REVIEW_SECTIONS
        .map((section) => ({
            section,
            items: reviewItems.filter((item) => item.section === section),
        }))
        .filter((group) => group.items.length > 0), [reviewItems]);
    const [openSections, setOpenSections] = useState({});

    if (!isOpen || !payload) return null;

    const parsedProfile = normalizeReviewProfile(payload.parsed_profile || {}, user);
    const duplicateCount = reviewItems.filter((item) => item.status === "duplicate").length;
    const newCount = reviewItems.filter((item) => item.status === "new").length;
    const toggleSection = (section) => {
        setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };
    const applySectionAction = (section, action) => {
        reviewItems
            .filter((item) => item.section === section)
            .filter((item) => {
                if (item.status === "duplicate") return ["keep_existing", "use_parsed", "merge"].includes(action);
                return ["add", "skip"].includes(action);
            })
            .forEach((item) => onDecisionChange(buildReviewDecisionKey(item), action));
    };

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center px-4 py-6">
            <div className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
            <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#ded7c8] bg-[#fffdf8] shadow-[0_28px_80px_rgba(0,0,0,0.22)]">
                <div className="border-b border-[#e3dece] px-5 py-4 sm:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b741f]">Resume import review</p>
                            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">Choose what goes into your profile</h2>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                                The parser found {duplicateCount} possible duplicate{duplicateCount === 1 ? "" : "s"} and {newCount} new entr{newCount === 1 ? "y" : "ies"}.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Close resume import review"
                            onClick={onClose}
                            className="self-start text-zinc-500 hover:bg-[#f8f5ed] hover:text-zinc-900"
                        >
                            <X className="size-4" strokeWidth={1.8} />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                    <div className="space-y-4">
                        {sectionGroups.map((group, groupIndex) => {
                            const sectionDuplicateCount = group.items.filter((item) => item.status === "duplicate").length;
                            const sectionNewCount = group.items.filter((item) => item.status === "new").length;
                            const isSectionOpen = openSections[group.section] ?? groupIndex === 0;
                            return (
                                <section key={group.section} className="overflow-hidden rounded-lg border border-[#ded7c8] bg-[#fbfaf5]">
                                    <div className="border-b border-[#e3dece] bg-[#fffdf8] p-4">
                                        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                                            <button
                                                type="button"
                                                onClick={() => toggleSection(group.section)}
                                                className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                                                aria-expanded={isSectionOpen}
                                            >
                                                <span className="flex size-8 shrink-0 items-center justify-center rounded-md text-[#5d681c] transition-colors group-hover:bg-[#eef2d8] group-focus-visible:bg-[#eef2d8]">
                                                    <ChevronDown
                                                        className={`size-4 transition-transform ${isSectionOpen ? "rotate-0" : "-rotate-90"}`}
                                                        strokeWidth={2}
                                                    />
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-semibold text-zinc-950">
                                                        {REVIEW_SECTION_LABELS[group.section] || group.section}
                                                    </span>
                                                    <span className="mt-1 block text-xs text-zinc-500">
                                                        {group.items.length} entr{group.items.length === 1 ? "y" : "ies"}
                                                        {sectionDuplicateCount > 0 ? `, ${sectionDuplicateCount} duplicate${sectionDuplicateCount === 1 ? "" : "s"}` : ""}
                                                        {sectionNewCount > 0 ? `, ${sectionNewCount} new` : ""}
                                                    </span>
                                                </span>
                                            </button>

                                            <div className="flex flex-wrap gap-2 xl:justify-end">
                                                {sectionDuplicateCount > 0 && (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="xs"
                                                            onClick={() => applySectionAction(group.section, "keep_existing")}
                                                            className="rounded-md border-[#cfc7b7] bg-white text-zinc-800 hover:bg-[#f8f5ed]"
                                                        >
                                                            Keep all
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="xs"
                                                            onClick={() => applySectionAction(group.section, "use_parsed")}
                                                            className="rounded-md border-[#cfc7b7] bg-white text-zinc-800 hover:bg-[#f8f5ed]"
                                                        >
                                                            Use parsed all
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="xs"
                                                            onClick={() => applySectionAction(group.section, "merge")}
                                                            className="rounded-md border-[#cfc7b7] bg-white text-zinc-800 hover:bg-[#f8f5ed]"
                                                        >
                                                            Merge all
                                                        </Button>
                                                    </>
                                                )}
                                                {sectionNewCount > 0 && (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="xs"
                                                            onClick={() => applySectionAction(group.section, "add")}
                                                            className="rounded-md border-[#cfc7b7] bg-white text-zinc-800 hover:bg-[#f8f5ed]"
                                                        >
                                                            Add all
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="xs"
                                                            onClick={() => applySectionAction(group.section, "skip")}
                                                            className="rounded-md border-[#cfc7b7] bg-white text-zinc-800 hover:bg-[#f8f5ed]"
                                                        >
                                                            Skip all
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`grid transition-[grid-template-rows,opacity] duration-250 ease-out ${isSectionOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                                        <div className="overflow-hidden">
                                            <div className={`space-y-3 p-4 transition-transform duration-250 ease-out ${isSectionOpen ? "translate-y-0" : "-translate-y-2"}`}>
                                                {group.items.map((item) => {
                                                    const key = buildReviewDecisionKey(item);
                                                    const section = item.section;
                                                    const parsedItem = parsedProfile[section]?.[item.parsed_index];
                                                    const existingItem = item.status === "duplicate" ? existingProfile[section]?.[item.existing_index] : null;
                                                    const actions = item.status === "duplicate"
                                                        ? ["keep_existing", "use_parsed", "merge"]
                                                        : ["add", "skip"];

                                                    return (
                                                        <article key={key} className="rounded-lg border border-[#ded7c8] bg-white p-4">
                                                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                                <div>
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <span className="rounded-md border border-[#d8d0bd] bg-[#fbfaf5] px-2 py-1 text-xs text-zinc-600">
                                                                            {item.status === "duplicate" ? "Possible duplicate" : "New entry"}
                                                                        </span>
                                                                        {Number.isFinite(item.confidence) && (
                                                                            <span className="text-xs text-zinc-500">{Math.round(item.confidence * 100)}% confidence</span>
                                                                        )}
                                                                    </div>
                                                                    {item.reason && <p className="mt-2 text-sm leading-6 text-zinc-600">{item.reason}</p>}
                                                                </div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {actions.map((action) => (
                                                                        <Button
                                                                            key={action}
                                                                            type="button"
                                                                            variant={decisions[key] === action ? "default" : "outline"}
                                                                            size="sm"
                                                                            onClick={() => onDecisionChange(key, action)}
                                                                            className={
                                                                                decisions[key] === action
                                                                                    ? "rounded-md bg-[#5d681c] text-white hover:bg-[#4d5818]"
                                                                                    : "rounded-md border-[#cfc7b7] bg-white text-zinc-800 hover:bg-[#f8f5ed]"
                                                                            }
                                                                        >
                                                                            {REVIEW_ACTION_LABELS[action]}
                                                                        </Button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className={`mt-4 grid gap-3 ${existingItem ? "lg:grid-cols-2" : ""}`}>
                                                                {existingItem && <ReviewEntryPreview label="Existing profile" section={section} item={existingItem} />}
                                                                <ReviewEntryPreview label="Parsed resume" section={section} item={parsedItem} />
                                                            </div>
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-[#e3dece] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                    <Button type="button" variant="ghost" className="rounded-md" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={onApply} className="rounded-md bg-[#5d681c] text-white hover:bg-[#4d5818]">
                        Apply selected changes
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function Profile() {
    const [user, loading] = useAuthState(auth);
    const parserPanelRef = useRef(null);
    const basicsPanelRef = useRef(null);
    const resumeInputRef = useRef(null);
    const [backendProfile, setBackendProfile] = useState(null);
    const [backendLoading, setBackendLoading] = useState(false);
    const [backendError, setBackendError] = useState("");
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSaveError, setProfileSaveError] = useState("");
    const [profileSaveSuccess, setProfileSaveSuccess] = useState("");
    const [emptyPromptDismissed, setEmptyPromptDismissed] = useState(false);
    const [resumeFile, setResumeFile] = useState(null);
    const [resumeInputKey, setResumeInputKey] = useState(0);
    const [resumeParseLoading, setResumeParseLoading] = useState(false);
    const [resumeParseError, setResumeParseError] = useState("");
    const [resumeParseResult, setResumeParseResult] = useState(null);
    const [resumeReviewPayload, setResumeReviewPayload] = useState(null);
    const [resumeReviewOpen, setResumeReviewOpen] = useState(false);
    const [resumeReviewDecisions, setResumeReviewDecisions] = useState({});
    const [profileSectionsOpen, setProfileSectionsOpen] = useState({});
    const [formData, setFormData] = useState(() => normalizeFormProfile({}, user));
    const [skillInput, setSkillInput] = useState("");
    const [skillCategoryInput, setSkillCategoryInput] = useState("");
    const [stackInputs, setStackInputs] = useState({});
    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors: pwErrors },
    } = useForm();
    const [pwLoading, setPwLoading] = useState(false);
    const [pwError, setPwError] = useState(null);
    const [pwSuccess, setPwSuccess] = useState(null);

    const email = user?.email || "";
    const profileDisplayName = (formData.displayName || backendProfile?.display_name || user?.displayName || "User").trim() || "User";
    const firstName = profileDisplayName.split(" ")[0] || "U";
    const photoURL = user?.photoURL;
    const initials = getInitials(profileDisplayName) || firstName[0];
    const checklist = useMemo(() => calculateChecklist(formData, email), [formData, email]);
    const requiredChecklist = checklist.filter((item) => item.required);
    const requiredComplete = requiredChecklist.filter((item) => item.complete).length;
    const completionPercent = Math.round((requiredComplete / requiredChecklist.length) * 100);
    const showEmptyProfilePrompt = Boolean(
        user &&
        backendProfile &&
        !backendLoading &&
        !emptyPromptDismissed &&
        isProfileMeaningfullyEmpty(formData)
    );
    const isProfileSectionOpen = (section) => profileSectionsOpen[section] ?? true;
    const toggleProfileSection = (section) => {
        setProfileSectionsOpen((prev) => ({ ...prev, [section]: !(prev[section] ?? true) }));
    };

    const updateField = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const updateBasicField = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            basic: {
                ...prev.basic,
                [field]: value,
            },
        }));
    };

    const updateItem = (section, index, field, value) => {
        setFormData((prev) => ({
            ...prev,
            [section]: prev[section].map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
        }));
    };

    const addItem = (section, createItem) => {
        setFormData((prev) => ({
            ...prev,
            [section]: [...prev[section], createItem()],
        }));
    };

    const removeItem = (section, index) => {
        setFormData((prev) => ({
            ...prev,
            [section]: prev[section].filter((_, itemIndex) => itemIndex !== index),
        }));
    };

    const updateBullet = (section, index, field, bulletIndex, value) => {
        setFormData((prev) => ({
            ...prev,
            [section]: prev[section].map((item, itemIndex) => {
                if (itemIndex !== index) return item;
                return {
                    ...item,
                    [field]: item[field].map((bullet, nextBulletIndex) => (nextBulletIndex === bulletIndex ? value : bullet)),
                };
            }),
        }));
    };

    const addBullet = (section, index, field) => {
        setFormData((prev) => ({
            ...prev,
            [section]: prev[section].map((item, itemIndex) => {
                if (itemIndex !== index) return item;
                return { ...item, [field]: [...item[field], ""] };
            }),
        }));
    };

    const removeBullet = (section, index, field, bulletIndex) => {
        setFormData((prev) => ({
            ...prev,
            [section]: prev[section].map((item, itemIndex) => {
                if (itemIndex !== index) return item;
                return { ...item, [field]: item[field].filter((_, nextBulletIndex) => nextBulletIndex !== bulletIndex) };
            }),
        }));
    };

    const addSkill = (name = skillInput, category = skillCategoryInput) => {
        const nextName = cleanString(name);
        const nextCategory = cleanString(category);
        if (!nextName || formData.skills.some((skill) => skill.name.toLowerCase() === nextName.toLowerCase())) return;
        setFormData((prev) => ({
            ...prev,
            skills: [...prev.skills, emptySkill(nextName, nextCategory)],
        }));
        setSkillInput("");
        setSkillCategoryInput("");
    };

    const removeSkill = (index) => {
        removeItem("skills", index);
    };

    const addStack = (projectIndex, value = stackInputs[projectIndex]) => {
        const nextStack = cleanString(value);
        if (!nextStack) return;

        setFormData((prev) => ({
            ...prev,
            projects: prev.projects.map((project, itemIndex) => {
                if (itemIndex !== projectIndex) return project;
                if (project.stack.length >= 5 || project.stack.some((item) => item.toLowerCase() === nextStack.toLowerCase())) return project;
                return { ...project, stack: [...project.stack, nextStack] };
            }),
        }));
        setStackInputs((prev) => ({ ...prev, [projectIndex]: "" }));
    };

    const removeStack = (projectIndex, stackIndex) => {
        setFormData((prev) => ({
            ...prev,
            projects: prev.projects.map((project, itemIndex) => {
                if (itemIndex !== projectIndex) return project;
                return { ...project, stack: project.stack.filter((_, nextStackIndex) => nextStackIndex !== stackIndex) };
            }),
        }));
    };

    useEffect(() => {
        if (!user) {
            setBackendProfile(null);
            setBackendError("");
            setBackendLoading(false);
            return;
        }

        let isMounted = true;

        const fetchBackendProfile = async () => {
            setBackendLoading(true);
            setBackendError("");

            try {
                const data = await apiFetch("/api/users/me/");
                if (isMounted) {
                    setBackendProfile(data);
                    setFormData(normalizeFormProfile(data, user));
                }
            } catch (error) {
                if (isMounted) {
                    setBackendError(error.message || "Failed to load backend profile.");
                }
            } finally {
                if (isMounted) {
                    setBackendLoading(false);
                }
            }
        };

        fetchBackendProfile();

        return () => {
            isMounted = false;
        };
    }, [user]);

    const handleProfileSave = async () => {
        const payload = buildSavePayload(formData);

        setProfileSaveError("");
        setProfileSaveSuccess("");
        setProfileSaving(true);

        try {
            const updated = await apiFetch("/api/users/me/", {
                method: "PUT",
                body: JSON.stringify(payload),
            });

            if (user) {
                try {
                    await updateProfile(user, { displayName: payload.display_name });
                } catch (firebaseSyncError) {
                    console.error("Failed to sync Firebase display name:", firebaseSyncError);
                }
            }

            const mergedProfile = {
                ...(backendProfile || {}),
                ...(updated || {}),
                ...payload,
            };
            setBackendProfile(mergedProfile);
            setFormData(normalizeFormProfile(mergedProfile, user));
            setProfileSaveSuccess("Profile updated successfully.");
        } catch (error) {
            setProfileSaveError(error.message || "Failed to update profile.");
        } finally {
            setProfileSaving(false);
        }
    };

    const scrollToParser = () => {
        parserPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(() => {
            resumeInputRef.current?.click();
        }, 250);
    };

    const scrollToBasics = () => {
        basicsPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(() => {
            document.getElementById("profile-full-name")?.focus();
        }, 250);
    };

    const handleResumeFileChange = (event) => {
        const selectedFile = event.target.files?.[0] || null;
        const fileError = validateResumeImportFile(selectedFile);

        if (fileError) {
            setResumeFile(null);
            setResumeInputKey((prev) => prev + 1);
            setResumeParseError(fileError);
            setResumeParseResult(null);
            setResumeReviewPayload(null);
            setResumeReviewOpen(false);
            setResumeReviewDecisions({});
            return;
        }

        setResumeFile(selectedFile);
        setResumeParseError("");
        setResumeParseResult(null);
        setResumeReviewPayload(null);
        setResumeReviewOpen(false);
        setResumeReviewDecisions({});
    };

    const handleRemoveResumeFile = () => {
        setResumeFile(null);
        setResumeParseError("");
        setResumeParseResult(null);
        setResumeReviewPayload(null);
        setResumeReviewOpen(false);
        setResumeReviewDecisions({});
        setResumeInputKey((prev) => prev + 1);
    };

    const handleResumeParse = async () => {
        const fileError = validateResumeImportFile(resumeFile);
        if (fileError) {
            setResumeParseError(fileError);
            return;
        }

        setResumeParseLoading(true);
        setResumeParseError("");
        setResumeParseResult(null);
        setResumeReviewPayload(null);
        setResumeReviewOpen(false);
        setResumeReviewDecisions({});
        setProfileSaveSuccess("");

        const form = new FormData();
        form.append("resume", resumeFile);

        try {
            const payload = await apiUpload("/api/users/me/parse-resume/", form);
            const reviewItems = Array.isArray(payload?.review_items) ? payload.review_items : [];
            setResumeParseResult(payload);
            setResumeReviewPayload(payload);
            setResumeReviewDecisions(buildDefaultReviewDecisions(reviewItems));
            setEmptyPromptDismissed(true);
            if (reviewItems.length > 0) {
                setResumeReviewOpen(true);
                setProfileSaveSuccess("Resume parsed. Review the import choices, then apply the selected changes.");
            } else {
                const mergedProfile = payload?.merged_profile || {};
                setFormData(normalizeFormProfile(mergedProfile, user));
                setProfileSaveSuccess("Resume parsed. Review the imported fields, then save your profile.");
            }
        } catch (error) {
            setResumeParseError(error.message || "Failed to parse resume.");
        } finally {
            setResumeParseLoading(false);
        }
    };

    const handleResumeReviewDecisionChange = (key, action) => {
        setResumeReviewDecisions((prev) => ({ ...prev, [key]: action }));
    };

    const handleResumeReviewApply = () => {
        if (!resumeReviewPayload) return;

        setFormData((prev) => applyResumeReviewDecisions(prev, resumeReviewPayload, resumeReviewDecisions, user));
        setResumeReviewOpen(false);
        setResumeReviewPayload(null);
        setResumeReviewDecisions({});
        setProfileSaveSuccess("Resume import choices applied. Review the profile, then save your changes.");
    };

    const onChangePassword = async (data) => {
        setPwError(null);
        setPwSuccess(null);
        setPwLoading(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, data.newPassword);
            setPwSuccess("Password updated successfully.");
            reset();
        } catch (error) {
            switch (error.code) {
                case "auth/wrong-password":
                case "auth/invalid-credential":
                    setPwError("Current password is incorrect.");
                    break;
                case "auth/requires-recent-login":
                    setPwError("Please log out and log back in before changing your password.");
                    break;
                default:
                    setPwError(error.message);
            }
        } finally {
            setPwLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl px-4 pb-24 text-sm text-zinc-600 sm:px-6 lg:px-8">
                Loading profile...
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
            <ResumeReviewModal
                isOpen={resumeReviewOpen}
                payload={resumeReviewPayload}
                existingProfile={formData}
                decisions={resumeReviewDecisions}
                onDecisionChange={handleResumeReviewDecisionChange}
                onApply={handleResumeReviewApply}
                onClose={() => setResumeReviewOpen(false)}
                user={user}
            />
            <header className="mb-8 grid gap-6 border-b border-[#e3dece] pb-6 lg:grid-cols-[1fr_360px] lg:items-end">
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6b741f]">Resume profile</p>
                    <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Profile settings</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">
                        Keep account details, resume bullets, projects, education, certificates, and skills in one reusable profile.
                    </p>
                </div>
                <Panel className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="size-12 overflow-hidden rounded-full border border-[#d9d2c2] bg-[#eef2d8]">
                            {photoURL ? (
                                <img src={photoURL} alt="avatar" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#5d681c]">
                                    {initials}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-zinc-950">{profileDisplayName}</p>
                            <p className="truncate text-sm text-zinc-600">{email}</p>
                        </div>
                    </div>
                </Panel>
            </header>

            {showEmptyProfilePrompt && (
                <section className="mb-6 overflow-hidden rounded-xl border border-[#cbd3ad] bg-[#f4f6e8] shadow-[0_18px_55px_rgba(32,31,22,0.06)]">
                    <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-white text-[#5d681c] shadow-sm">
                                <FileSearch className="size-5" strokeWidth={1.8} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#687228]">Start your profile</p>
                                <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">Import your resume to fill this in faster</h2>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-700">
                                    Upload a PDF or DOCX resume and review the parsed profile before saving. Existing profile fields stay under your control.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                            <Button
                                type="button"
                                onClick={scrollToParser}
                                className="rounded-md bg-[#5d681c] text-white hover:bg-[#4d5818]"
                            >
                                <Upload className="size-4" strokeWidth={1.8} />
                                Parse resume
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={scrollToBasics}
                                className="rounded-md border-[#cfc7b7] bg-white text-zinc-800 hover:bg-[#fffdf8]"
                            >
                                Fill manually
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Dismiss empty profile prompt"
                                onClick={() => setEmptyPromptDismissed(true)}
                                className="text-zinc-500 hover:bg-white/70 hover:text-zinc-900"
                            >
                                <X className="size-4" strokeWidth={1.8} />
                            </Button>
                        </div>
                    </div>
                </section>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-6">
                    <Panel panelRef={parserPanelRef} className="p-5 lg:p-6">
                        <SectionHeader
                            title="Resume parser"
                            description="Import a PDF or DOCX resume into an editable profile draft."
                            icon={FileSearch}
                            collapsible
                            isOpen={isProfileSectionOpen("parser")}
                            onToggle={() => toggleProfileSection("parser")}
                            contentId="profile-section-parser"
                        />

                        <CollapsibleContent isOpen={isProfileSectionOpen("parser")} contentId="profile-section-parser">
                            <div className="space-y-4">
                                <input
                                    key={resumeInputKey}
                                    ref={resumeInputRef}
                                    id="profile-resume-parser-upload"
                                    type="file"
                                    accept={RESUME_FILE_ACCEPT}
                                    onChange={handleResumeFileChange}
                                    className="sr-only"
                                />
                                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-[#cfc7b7] bg-[#faf8f1] p-4">
                                    <label
                                        htmlFor="profile-resume-parser-upload"
                                        className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-[#5d681c] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4d5818]"
                                    >
                                        <Upload className="size-4" strokeWidth={1.8} />
                                    Choose resume
                                    </label>
                                    <p className="min-w-0 flex-1 truncate text-sm text-zinc-600">
                                        {resumeFile ? resumeFile.name : "PDF or DOCX, up to 10MB"}
                                    </p>
                                    {resumeFile && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="rounded-md border-[#cfc7b7] bg-white"
                                            onClick={handleRemoveResumeFile}
                                        >
                                            <X className="size-4" strokeWidth={1.8} />
                                        Remove
                                        </Button>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <Button
                                        type="button"
                                        onClick={handleResumeParse}
                                        disabled={resumeParseLoading || !resumeFile}
                                        className="rounded-md bg-[#5d681c] text-white hover:bg-[#4d5818]"
                                    >
                                        {resumeParseLoading ? (
                                            <>
                                                <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
                                            Parsing...
                                            </>
                                        ) : (
                                            <>
                                                <FileSearch className="size-4" strokeWidth={1.8} />
                                            Parse into profile
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-sm leading-6 text-zinc-600">
                                    Parsed data updates this form only. Save after reviewing.
                                    </p>
                                </div>

                                {resumeParseError && (
                                    <p className="whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                        {resumeParseError}
                                    </p>
                                )}

                                {resumeParseResult && (
                                    <div className="grid gap-3 rounded-lg border border-[#cbd3ad] bg-[#f4f6e8] p-4 text-sm text-zinc-700 md:grid-cols-3">
                                        <div>
                                            <p className="font-semibold text-zinc-950">Matched entries</p>
                                            <p className="mt-1">
                                                {resumeParseResult.matches?.filter((item) => item.action === "updated").length || 0} updated
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-zinc-950">New entries</p>
                                            <p className="mt-1">
                                                {resumeParseResult.matches?.filter((item) => item.action === "added").length || 0} added
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-zinc-950">Suggestions</p>
                                            <p className="mt-1">
                                                {resumeParseResult.suggestions?.length || 0} conflicts kept unchanged
                                            </p>
                                        </div>
                                        {resumeReviewPayload?.review_items?.length > 0 && (
                                            <div className="md:col-span-3">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setResumeReviewOpen(true)}
                                                    className="rounded-md border-[#cfc7b7] bg-white text-zinc-800 hover:bg-[#f8f5ed]"
                                                >
                                                Review import choices
                                                </Button>
                                            </div>
                                        )}
                                        {resumeParseResult.warnings?.length > 0 && (
                                            <div className="md:col-span-3">
                                                <p className="font-semibold text-zinc-950">Review notes</p>
                                                <ul className="mt-1 list-disc space-y-1 pl-5">
                                                    {resumeParseResult.warnings.map((warning) => (
                                                        <li key={warning}>{warning}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CollapsibleContent>
                    </Panel>

                    <Panel panelRef={basicsPanelRef} className="p-5 lg:p-6">
                        <SectionHeader
                            title="Basics"
                            description="Primary contact details and professional summary."
                            icon={UserRound}
                            action={(
                                <Button
                                    type="button"
                                    onClick={handleProfileSave}
                                    disabled={backendLoading || profileSaving}
                                    className="rounded-md bg-[#5d681c] text-white hover:bg-[#4d5818]"
                                >
                                    <Save className="size-4" strokeWidth={1.8} />
                                    {profileSaving ? "Saving..." : "Save profile"}
                                </Button>
                            )}
                            collapsible
                            isOpen={isProfileSectionOpen("basics")}
                            onToggle={() => toggleProfileSection("basics")}
                            contentId="profile-section-basics"
                        />

                        <CollapsibleContent isOpen={isProfileSectionOpen("basics")} contentId="profile-section-basics">
                            <div className="grid gap-5 md:grid-cols-2">
                                <Field label="Full Name">
                                    <Input
                                        id="profile-full-name"
                                        placeholder="Taylor Avery"
                                        value={formData.fullName}
                                        onChange={(event) => updateField("fullName", event.target.value)}
                                        className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                    />
                                </Field>
                                <Field label="Display Name">
                                    <Input
                                        placeholder="Taylor"
                                        value={formData.displayName}
                                        onChange={(event) => updateField("displayName", event.target.value)}
                                        className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                    />
                                </Field>
                                <Field label="Phone">
                                    <div className="grid gap-2 sm:grid-cols-[190px_1fr]">
                                        <select
                                            value={formData.basic.phone_country_code || "+1"}
                                            onChange={(event) => updateBasicField("phone_country_code", event.target.value)}
                                            className="h-11 w-full rounded-lg border border-[#d9d2c2] bg-white px-3 text-sm text-zinc-900 shadow-xs outline-none transition focus-visible:border-[#7c8730] focus-visible:ring-3 focus-visible:ring-[#7c8730]/20"
                                            aria-label="Phone country code"
                                        >
                                            {PHONE_COUNTRY_CODES.map((countryCode) => (
                                                <option key={countryCode.value} value={countryCode.value}>
                                                    {countryCode.label}
                                                </option>
                                            ))}
                                        </select>
                                        <Input
                                            placeholder="5551234567"
                                            value={formData.basic.phone}
                                            onChange={(event) => updateBasicField("phone", event.target.value)}
                                            className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                        />
                                    </div>
                                    <p className="text-xs leading-5 text-zinc-500">
                                        {getPhoneNumberHint(formData.basic.phone_country_code || "+1")}
                                    </p>
                                </Field>
                                <Field label="Contact Email">
                                    <Input
                                        placeholder={email || "taylor@example.com"}
                                        value={formData.basic.contact_email}
                                        onChange={(event) => updateBasicField("contact_email", event.target.value)}
                                        className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                    />
                                </Field>
                                <Field label="Location">
                                    <Input
                                        placeholder="Edmonton, AB"
                                        value={formData.basic.location}
                                        onChange={(event) => updateBasicField("location", event.target.value)}
                                        className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                    />
                                </Field>
                                <Field label="Headline">
                                    <Input
                                        placeholder="Software Developer"
                                        value={formData.basic.headline}
                                        onChange={(event) => updateBasicField("headline", event.target.value)}
                                        className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                    />
                                </Field>
                                <Field label="GitHub">
                                    <Input
                                        placeholder="https://github.com/taylor"
                                        value={formData.basic.github_url}
                                        onChange={(event) => updateBasicField("github_url", event.target.value)}
                                        className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                    />
                                </Field>
                                <Field label="LinkedIn">
                                    <Input
                                        placeholder="https://linkedin.com/in/taylor"
                                        value={formData.basic.linkedin_url}
                                        onChange={(event) => updateBasicField("linkedin_url", event.target.value)}
                                        className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                    />
                                </Field>
                                <Field label="Portfolio" className="md:col-span-2">
                                    <Input
                                        placeholder="https://taylor.dev"
                                        value={formData.basic.portfolio_url}
                                        onChange={(event) => updateBasicField("portfolio_url", event.target.value)}
                                        className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                    />
                                </Field>
                                <Field label="Summary" className="md:col-span-2">
                                    <TextArea
                                        placeholder="Short professional summary for resume drafts."
                                        value={formData.basic.summary}
                                        onChange={(event) => updateBasicField("summary", event.target.value)}
                                    />
                                </Field>
                            </div>

                            <div className="mt-5 space-y-2">
                                {backendLoading && <p className="text-sm text-zinc-600">Loading profile...</p>}
                                {backendError && <p className="whitespace-pre-wrap text-sm text-red-600">{backendError}</p>}
                                {profileSaveError && <p className="whitespace-pre-wrap text-sm text-red-600">{profileSaveError}</p>}
                                {profileSaveSuccess && <p className="text-sm text-[#5d681c]">{profileSaveSuccess}</p>}
                            </div>
                        </CollapsibleContent>
                    </Panel>

                    <Panel className="p-5 lg:p-6">
                        <SectionHeader
                            title="Experience"
                            description="Work history with resume-ready achievement bullets."
                            icon={BriefcaseBusiness}
                            action={(
                                <SmallButton onClick={() => addItem("experience", emptyExperience)}>
                                    <Plus className="size-4" strokeWidth={1.8} />
                                    Add experience
                                </SmallButton>
                            )}
                            collapsible
                            isOpen={isProfileSectionOpen("experience")}
                            onToggle={() => toggleProfileSection("experience")}
                            contentId="profile-section-experience"
                        />
                        <CollapsibleContent isOpen={isProfileSectionOpen("experience")} contentId="profile-section-experience">
                            <div className="space-y-5">
                                {formData.experience.length === 0 && (
                                    <p className="rounded-lg border border-dashed border-[#d8d0bd] bg-[#fbfaf5] px-4 py-3 text-sm text-zinc-500">
                                    No experience added.
                                    </p>
                                )}
                                {formData.experience.map((item, index) => (
                                    <div key={index} className="rounded-lg border border-[#e0d8c8] bg-[#fbfaf5] p-4">
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <h3 className="font-semibold text-zinc-950">Experience {index + 1}</h3>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label="Remove experience"
                                                onClick={() => removeItem("experience", index)}
                                                className="text-zinc-500 hover:bg-red-50 hover:text-red-600"
                                            >
                                                <Trash2 className="size-4" strokeWidth={1.8} />
                                            </Button>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <Field label="Company">
                                                <Input
                                                    value={item.company}
                                                    placeholder="Acme Corp"
                                                    onChange={(event) => updateItem("experience", index, "company", event.target.value)}
                                                    className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                />
                                            </Field>
                                            <Field label="Role">
                                                <Input
                                                    value={item.role}
                                                    placeholder="Software Developer"
                                                    onChange={(event) => updateItem("experience", index, "role", event.target.value)}
                                                    className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                />
                                            </Field>
                                            <Field label="Location">
                                                <Input
                                                    value={item.location}
                                                    placeholder="Remote"
                                                    onChange={(event) => updateItem("experience", index, "location", event.target.value)}
                                                    className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                />
                                            </Field>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <Field label="Start">
                                                    <Input
                                                        value={item.start_date}
                                                        placeholder="Jan 2024"
                                                        onChange={(event) => updateItem("experience", index, "start_date", event.target.value)}
                                                        className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                    />
                                                </Field>
                                                <Field label="End">
                                                    <Input
                                                        value={item.end_date}
                                                        placeholder="Present"
                                                        onChange={(event) => updateItem("experience", index, "end_date", event.target.value)}
                                                        className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                    />
                                                </Field>
                                            </div>
                                            <label className="flex items-center gap-2 text-sm text-zinc-700 md:col-span-2">
                                                <input
                                                    type="checkbox"
                                                    checked={item.is_current}
                                                    onChange={(event) => updateItem("experience", index, "is_current", event.target.checked)}
                                                    className="size-4 rounded border-[#bcb29e] text-[#5d681c]"
                                                />
                                            Current role
                                            </label>
                                            <div className="md:col-span-2">
                                                <BulletEditor
                                                    label="Description bullets"
                                                    bullets={item.description}
                                                    placeholder="Accomplished X measured by Y by doing Z"
                                                    onAdd={() => addBullet("experience", index, "description")}
                                                    onChange={(bulletIndex, value) => updateBullet("experience", index, "description", bulletIndex, value)}
                                                    onRemove={(bulletIndex) => removeBullet("experience", index, "description", bulletIndex)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Panel>

                    <Panel className="p-5 lg:p-6">
                        <SectionHeader
                            title="Projects"
                            description="Portfolio work, labels, links, and up to five technologies per project."
                            icon={Sparkles}
                            action={(
                                <SmallButton onClick={() => addItem("projects", emptyProject)}>
                                    <Plus className="size-4" strokeWidth={1.8} />
                                    Add project
                                </SmallButton>
                            )}
                            collapsible
                            isOpen={isProfileSectionOpen("projects")}
                            onToggle={() => toggleProfileSection("projects")}
                            contentId="profile-section-projects"
                        />
                        <CollapsibleContent isOpen={isProfileSectionOpen("projects")} contentId="profile-section-projects">
                            <datalist id="project-labels">
                                {PROJECT_LABELS.map((label) => (
                                    <option key={label} value={label} />
                                ))}
                            </datalist>
                            <div className="space-y-5">
                                {formData.projects.length === 0 && (
                                    <p className="rounded-lg border border-dashed border-[#d8d0bd] bg-[#fbfaf5] px-4 py-3 text-sm text-zinc-500">
                                    No projects added.
                                    </p>
                                )}
                                {formData.projects.map((item, index) => (
                                    <div key={index} className="rounded-lg border border-[#e0d8c8] bg-[#fbfaf5] p-4">
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <h3 className="font-semibold text-zinc-950">Project {index + 1}</h3>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label="Remove project"
                                                onClick={() => removeItem("projects", index)}
                                                className="text-zinc-500 hover:bg-red-50 hover:text-red-600"
                                            >
                                                <Trash2 className="size-4" strokeWidth={1.8} />
                                            </Button>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <Field label="Project Name">
                                                <Input
                                                    value={item.name}
                                                    placeholder="Cover Pilot"
                                                    onChange={(event) => updateItem("projects", index, "name", event.target.value)}
                                                    className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                />
                                            </Field>
                                            <Field label="Label">
                                                <Input
                                                    list="project-labels"
                                                    value={item.label}
                                                    placeholder="Full-stack web application"
                                                    onChange={(event) => updateItem("projects", index, "label", event.target.value)}
                                                    className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                />
                                            </Field>
                                            <Field label="Live Page">
                                                <Input
                                                    value={item.live_url}
                                                    placeholder="https://example.com"
                                                    onChange={(event) => updateItem("projects", index, "live_url", event.target.value)}
                                                    className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                />
                                            </Field>
                                            <Field label="GitHub">
                                                <Input
                                                    value={item.github_url}
                                                    placeholder="https://github.com/taylor/project"
                                                    onChange={(event) => updateItem("projects", index, "github_url", event.target.value)}
                                                    className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                />
                                            </Field>
                                            <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
                                                <Field label="Start">
                                                    <Input
                                                        value={item.start_date}
                                                        placeholder="Feb 2024"
                                                        onChange={(event) => updateItem("projects", index, "start_date", event.target.value)}
                                                        className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                    />
                                                </Field>
                                                <Field label="End">
                                                    <Input
                                                        value={item.end_date}
                                                        placeholder="Apr 2024"
                                                        onChange={(event) => updateItem("projects", index, "end_date", event.target.value)}
                                                        className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                    />
                                                </Field>
                                            </div>
                                            <div className="space-y-3 md:col-span-2">
                                                <Label>Project Stack</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {item.stack.map((stack, stackIndex) => (
                                                        <Chip key={`${stack}-${stackIndex}`} onRemove={() => removeStack(index, stackIndex)}>
                                                            {stack}
                                                        </Chip>
                                                    ))}
                                                </div>
                                                <div className="flex flex-col gap-2 sm:flex-row">
                                                    <Input
                                                        value={stackInputs[index] || ""}
                                                        placeholder={item.stack.length >= 5 ? "Stack limit reached" : "Add technology"}
                                                        disabled={item.stack.length >= 5}
                                                        onChange={(event) => setStackInputs((prev) => ({ ...prev, [index]: event.target.value }))}
                                                        onKeyDown={(event) => {
                                                            if (event.key === "Enter") {
                                                                event.preventDefault();
                                                                addStack(index);
                                                            }
                                                        }}
                                                        className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                    />
                                                    <SmallButton disabled={item.stack.length >= 5} onClick={() => addStack(index)}>
                                                        <Plus className="size-4" strokeWidth={1.8} />
                                                    Add stack
                                                    </SmallButton>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {SUGGESTED_STACK.map((stack) => (
                                                        <button
                                                            key={stack}
                                                            type="button"
                                                            onClick={() => addStack(index, stack)}
                                                            disabled={item.stack.length >= 5}
                                                            className="rounded-md border border-[#ded7c8] bg-white px-2.5 py-1 text-xs text-zinc-600 transition hover:border-[#a9b36b] hover:text-[#4d5818] disabled:cursor-not-allowed disabled:opacity-45"
                                                        >
                                                            {stack}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="md:col-span-2">
                                                <BulletEditor
                                                    label="Project bullets"
                                                    bullets={item.description}
                                                    placeholder="Built an application that..."
                                                    onAdd={() => addBullet("projects", index, "description")}
                                                    onChange={(bulletIndex, value) => updateBullet("projects", index, "description", bulletIndex, value)}
                                                    onRemove={(bulletIndex) => removeBullet("projects", index, "description", bulletIndex)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Panel>

                    <Panel className="p-5 lg:p-6">
                        <SectionHeader
                            title="Education"
                            description="Schools, degrees, GPA, awards, and relevant coursework."
                            icon={GraduationCap}
                            action={(
                                <SmallButton onClick={() => addItem("education", emptyEducation)}>
                                    <Plus className="size-4" strokeWidth={1.8} />
                                    Add education
                                </SmallButton>
                            )}
                            collapsible
                            isOpen={isProfileSectionOpen("education")}
                            onToggle={() => toggleProfileSection("education")}
                            contentId="profile-section-education"
                        />
                        <CollapsibleContent isOpen={isProfileSectionOpen("education")} contentId="profile-section-education">
                            <div className="space-y-5">
                                {formData.education.length === 0 && (
                                    <p className="rounded-lg border border-dashed border-[#d8d0bd] bg-[#fbfaf5] px-4 py-3 text-sm text-zinc-500">
                                    No education added.
                                    </p>
                                )}
                                {formData.education.map((item, index) => (
                                    <div key={index} className="rounded-lg border border-[#e0d8c8] bg-[#fbfaf5] p-4">
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <h3 className="font-semibold text-zinc-950">Education {index + 1}</h3>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label="Remove education"
                                                onClick={() => removeItem("education", index)}
                                                className="text-zinc-500 hover:bg-red-50 hover:text-red-600"
                                            >
                                                <Trash2 className="size-4" strokeWidth={1.8} />
                                            </Button>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <Field label="School">
                                                <Input
                                                    value={item.school}
                                                    placeholder="University of Alberta"
                                                    onChange={(event) => updateItem("education", index, "school", event.target.value)}
                                                    className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                />
                                            </Field>
                                            <Field label="Location">
                                                <Input
                                                    value={item.location}
                                                    placeholder="Edmonton, AB"
                                                    onChange={(event) => updateItem("education", index, "location", event.target.value)}
                                                    className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                />
                                            </Field>
                                            <Field label="Degree">
                                                <Input
                                                    value={item.degree}
                                                    placeholder="Bachelor of Science"
                                                    onChange={(event) => updateItem("education", index, "degree", event.target.value)}
                                                    className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                />
                                            </Field>
                                            <Field label="Major">
                                                <Input
                                                    value={item.major}
                                                    placeholder="Computing Science"
                                                    onChange={(event) => updateItem("education", index, "major", event.target.value)}
                                                    className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                />
                                            </Field>
                                            <div className="grid gap-4 sm:grid-cols-3 md:col-span-2">
                                                <Field label="Start">
                                                    <Input
                                                        value={item.start_date}
                                                        placeholder="2020"
                                                        onChange={(event) => updateItem("education", index, "start_date", event.target.value)}
                                                        className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                    />
                                                </Field>
                                                <Field label="End">
                                                    <Input
                                                        value={item.end_date}
                                                        placeholder="2024"
                                                        onChange={(event) => updateItem("education", index, "end_date", event.target.value)}
                                                        className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                    />
                                                </Field>
                                                <Field label="GPA">
                                                    <Input
                                                        value={item.gpa}
                                                        placeholder="3.8/4.0"
                                                        onChange={(event) => updateItem("education", index, "gpa", event.target.value)}
                                                        className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                    />
                                                </Field>
                                            </div>
                                            <div className="md:col-span-2">
                                                <BulletEditor
                                                    label="Awards"
                                                    bullets={item.awards}
                                                    placeholder="Dean's List"
                                                    onAdd={() => addBullet("education", index, "awards")}
                                                    onChange={(bulletIndex, value) => updateBullet("education", index, "awards", bulletIndex, value)}
                                                    onRemove={(bulletIndex) => removeBullet("education", index, "awards", bulletIndex)}
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <BulletEditor
                                                    label="Relevant coursework"
                                                    bullets={item.relevant_coursework}
                                                    placeholder="Algorithms and Data Structures"
                                                    onAdd={() => addBullet("education", index, "relevant_coursework")}
                                                    onChange={(bulletIndex, value) => updateBullet("education", index, "relevant_coursework", bulletIndex, value)}
                                                    onRemove={(bulletIndex) => removeBullet("education", index, "relevant_coursework", bulletIndex)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Panel>

                    <Panel className="p-5 lg:p-6">
                        <SectionHeader
                            title="Certificates"
                            description="Optional credentials, issuers, IDs, and verification links."
                            icon={Award}
                            action={(
                                <SmallButton onClick={() => addItem("certificates", emptyCertificate)}>
                                    <Plus className="size-4" strokeWidth={1.8} />
                                    Add certificate
                                </SmallButton>
                            )}
                            collapsible
                            isOpen={isProfileSectionOpen("certificates")}
                            onToggle={() => toggleProfileSection("certificates")}
                            contentId="profile-section-certificates"
                        />
                        <CollapsibleContent isOpen={isProfileSectionOpen("certificates")} contentId="profile-section-certificates">
                            <div className="space-y-5">
                                {formData.certificates.length === 0 && (
                                    <p className="rounded-lg border border-dashed border-[#d8d0bd] bg-[#fbfaf5] px-4 py-3 text-sm text-zinc-500">
                                    No certificates added.
                                    </p>
                                )}
                                {formData.certificates.map((item, index) => (
                                    <div key={index} className="rounded-lg border border-[#e0d8c8] bg-[#fbfaf5] p-4">
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <h3 className="font-semibold text-zinc-950">Certificate {index + 1}</h3>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-sm"
                                                aria-label="Remove certificate"
                                                onClick={() => removeItem("certificates", index)}
                                                className="text-zinc-500 hover:bg-red-50 hover:text-red-600"
                                            >
                                                <Trash2 className="size-4" strokeWidth={1.8} />
                                            </Button>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <Field label="Name">
                                                <Input
                                                    value={item.name}
                                                    placeholder="AWS Cloud Practitioner"
                                                    onChange={(event) => updateItem("certificates", index, "name", event.target.value)}
                                                    className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                />
                                            </Field>
                                            <Field label="Issuer">
                                                <Input
                                                    value={item.issuer}
                                                    placeholder="Amazon Web Services"
                                                    onChange={(event) => updateItem("certificates", index, "issuer", event.target.value)}
                                                    className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                />
                                            </Field>
                                            <Field label="Issue Date">
                                                <Input
                                                    value={item.issue_date}
                                                    placeholder="2024"
                                                    onChange={(event) => updateItem("certificates", index, "issue_date", event.target.value)}
                                                    className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                />
                                            </Field>
                                            <Field label="Expiration Date">
                                                <Input
                                                    value={item.expiration_date}
                                                    placeholder="2027"
                                                    onChange={(event) => updateItem("certificates", index, "expiration_date", event.target.value)}
                                                    className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                />
                                            </Field>
                                            <Field label="Credential ID">
                                                <Input
                                                    value={item.credential_id}
                                                    placeholder="ABC123"
                                                    onChange={(event) => updateItem("certificates", index, "credential_id", event.target.value)}
                                                    className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                />
                                            </Field>
                                            <Field label="Credential URL">
                                                <Input
                                                    value={item.credential_url}
                                                    placeholder="https://example.com/cert"
                                                    onChange={(event) => updateItem("certificates", index, "credential_url", event.target.value)}
                                                    className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                                />
                                            </Field>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Panel>

                    <Panel className="p-5 lg:p-6">
                        <SectionHeader
                            title="Skills"
                            description="Add skills manually or choose from the suggested set."
                            icon={BookOpen}
                            collapsible
                            isOpen={isProfileSectionOpen("skills")}
                            onToggle={() => toggleProfileSection("skills")}
                            contentId="profile-section-skills"
                        />
                        <CollapsibleContent isOpen={isProfileSectionOpen("skills")} contentId="profile-section-skills">
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {formData.skills.length === 0 && (
                                        <p className="rounded-lg border border-dashed border-[#d8d0bd] bg-[#fbfaf5] px-4 py-3 text-sm text-zinc-500">
                                        No skills added.
                                        </p>
                                    )}
                                    {formData.skills.map((skill, index) => (
                                        <Chip key={`${skill.name}-${index}`} onRemove={() => removeSkill(index)}>
                                            {skill.name}{skill.category ? ` - ${skill.category}` : ""}
                                        </Chip>
                                    ))}
                                </div>
                                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                                    <Input
                                        value={skillInput}
                                        placeholder="Add a skill"
                                        onChange={(event) => setSkillInput(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                                event.preventDefault();
                                                addSkill();
                                            }
                                        }}
                                        className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                    />
                                    <Input
                                        value={skillCategoryInput}
                                        placeholder="Category"
                                        onChange={(event) => setSkillCategoryInput(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                                event.preventDefault();
                                                addSkill();
                                            }
                                        }}
                                        className="h-10 rounded-lg border-[#d9d2c2] bg-white"
                                    />
                                    <SmallButton onClick={() => addSkill()}>
                                        <Plus className="size-4" strokeWidth={1.8} />
                                    Add skill
                                    </SmallButton>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {SUGGESTED_SKILLS.map((skill) => (
                                        <button
                                            key={skill}
                                            type="button"
                                            onClick={() => addSkill(skill)}
                                            className="rounded-md border border-[#ded7c8] bg-white px-2.5 py-1 text-xs text-zinc-600 transition hover:border-[#a9b36b] hover:text-[#4d5818]"
                                        >
                                            {skill}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CollapsibleContent>
                    </Panel>

                    <Panel className="p-5 lg:p-6">
                        <SectionHeader
                            title="Change password"
                            description="Use a current password and a stronger replacement."
                            icon={ShieldCheck}
                            collapsible
                            isOpen={isProfileSectionOpen("password")}
                            onToggle={() => toggleProfileSection("password")}
                            contentId="profile-section-password"
                        />

                        <CollapsibleContent isOpen={isProfileSectionOpen("password")} contentId="profile-section-password">
                            <form onSubmit={handleSubmit(onChangePassword)} className="grid gap-5 md:grid-cols-2">
                                <Field label="Current Password" className="md:col-span-2">
                                    <Input
                                        id="currentPassword"
                                        type="password"
                                        placeholder="Enter your current password"
                                        className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                        {...register("currentPassword", {
                                            required: "Current password is required",
                                        })}
                                    />
                                    {pwErrors.currentPassword && (
                                        <p className="text-xs text-red-600">{pwErrors.currentPassword.message}</p>
                                    )}
                                </Field>

                                <Field label="New Password">
                                    <Input
                                        id="newPassword"
                                        type="password"
                                        placeholder="Enter new password"
                                        className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                        {...register("newPassword", {
                                            required: "Password is required",
                                            minLength: {
                                                value: 8,
                                                message: "Password must be at least 8 characters",
                                            },
                                            pattern: {
                                                value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
                                                message: "Must include uppercase, lowercase, a number, and a special character",
                                            },
                                        })}
                                    />
                                    {pwErrors.newPassword && (
                                        <p className="text-xs text-red-600">{pwErrors.newPassword.message}</p>
                                    )}
                                </Field>

                                <Field label="Confirm New Password">
                                    <Input
                                        id="confirmNewPassword"
                                        type="password"
                                        placeholder="Re-enter new password"
                                        className="h-11 rounded-lg border-[#d9d2c2] bg-white"
                                        {...register("confirmNewPassword", {
                                            required: "Please confirm your new password",
                                            validate: (value) => value === watch("newPassword") || "Passwords do not match",
                                        })}
                                    />
                                    {pwErrors.confirmNewPassword && (
                                        <p className="text-xs text-red-600">{pwErrors.confirmNewPassword.message}</p>
                                    )}
                                </Field>

                                <div className="flex flex-col gap-2 md:col-span-2">
                                    <Button
                                        type="submit"
                                        disabled={pwLoading}
                                        className="w-fit rounded-md bg-[#5d681c] px-6 text-white hover:bg-[#4d5818]"
                                    >
                                        {pwLoading ? "Updating..." : "Change password"}
                                    </Button>
                                    {pwError && <p className="text-sm text-red-600">{pwError}</p>}
                                    {pwSuccess && <p className="text-sm text-[#5d681c]">{pwSuccess}</p>}
                                </div>
                            </form>
                        </CollapsibleContent>
                    </Panel>
                </div>

                <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                    <Panel className="p-5">
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="font-semibold text-zinc-950">Profile checklist</h2>
                                <p className="mt-1 text-sm text-zinc-600">{completionPercent}% required complete</p>
                            </div>
                            <div
                                className="flex size-16 items-center justify-center rounded-full p-1"
                                style={{
                                    background: `conic-gradient(${PROFILE_ACCENT} ${completionPercent * 3.6}deg, #e7e2d6 0deg)`,
                                }}
                            >
                                <div className="flex h-full w-full items-center justify-center rounded-full bg-[#fffdf8] text-sm font-semibold text-zinc-950">
                                    {completionPercent}%
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {checklist.map((item) => (
                                <div key={item.key} className="flex items-center justify-between gap-3 rounded-lg border border-[#e6dece] bg-[#fbfaf5] px-3 py-2">
                                    <span className="flex items-center gap-2 text-sm text-zinc-700">
                                        {item.complete ? (
                                            <CheckCircle2 className="size-4 text-[#5f6c1c]" strokeWidth={1.8} />
                                        ) : (
                                            <Circle className="size-4 text-zinc-400" strokeWidth={1.8} />
                                        )}
                                        {item.label}
                                    </span>
                                    {!item.required && <span className="text-xs text-zinc-500">Optional</span>}
                                </div>
                            ))}
                        </div>
                    </Panel>

                    <Panel className="p-5">
                        <div className="flex items-start gap-3">
                            <div className="flex size-10 items-center justify-center rounded-md bg-[#eef2d8] text-[#5d681c]">
                                <Mail className="size-5" strokeWidth={1.8} />
                            </div>
                            <div>
                                <h2 className="font-semibold text-zinc-950">Primary email</h2>
                                <p className="mt-1 break-all text-sm text-zinc-600">{email}</p>
                            </div>
                        </div>
                    </Panel>

                    <Panel className="p-5">
                        <div className="flex items-start gap-3">
                            <div className="flex size-10 items-center justify-center rounded-md bg-[#eef2d8] text-[#5d681c]">
                                <ShieldCheck className="size-5" strokeWidth={1.8} />
                            </div>
                            <div>
                                <h2 className="font-semibold text-zinc-950">Profile quality</h2>
                                <p className="mt-1 text-sm leading-6 text-zinc-600">
                                    A complete profile gives generated drafts more reliable sender details.
                                </p>
                            </div>
                        </div>
                    </Panel>

                    <Panel className="border-[#cbd3ad] bg-[#f4f6e8] p-5">
                        <div className="space-y-3 text-sm text-zinc-700">
                            <div className="flex items-center gap-2">
                                <MapPin className="size-4 text-[#5d681c]" strokeWidth={1.8} />
                                <span className="truncate">{formData.basic.location || "Location not set"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Github className="size-4 text-[#5d681c]" strokeWidth={1.8} />
                                <span className="truncate">{formData.basic.github_url || "GitHub not set"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <LinkIcon className="size-4 text-[#5d681c]" strokeWidth={1.8} />
                                <span className="truncate">{formData.basic.portfolio_url || "Portfolio not set"}</span>
                            </div>
                        </div>
                    </Panel>

                    <Button
                        type="button"
                        onClick={handleProfileSave}
                        disabled={backendLoading || profileSaving}
                        className="w-full rounded-md bg-[#5d681c] text-white hover:bg-[#4d5818]"
                    >
                        <Pencil className="size-4" strokeWidth={1.8} />
                        {profileSaving ? "Saving..." : "Save all profile changes"}
                    </Button>
                </aside>
            </div>
        </div>
    );
}
