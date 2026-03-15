const defaultResumeState = {
  heading: {
    name: "",
    phone: "",
    email: "",
    linkedin: "",
    github: "",
    location: "",
  },
  education: [{
    school: "",
    location: "",
    degree: "",
    gradDate: "",
  }],
  experience: [{
    role: "",
    company: "",
    location: "",
    date: "",
    bullets: [""],
  }],
  projects: [{
    title: "",
    technologies: "",
    date: "",
    bullets: [""],
  }],
  technicalSkills: {
    languages: "",
    frameworks: "",
    tools: "",
    libraries: "",
  },
};

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultResumeState));
}

function escapeLatex(input = "") {
  return String(input)
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function unescapeLatex(input = "") {
  return String(input)
    .replace(/\\textbackslash\{\}/g, "\\")
    .replace(/\\&/g, "&")
    .replace(/\\%/g, "%")
    .replace(/\\\$/g, "$")
    .replace(/\\#/g, "#")
    .replace(/\\_/g, "_")
    .replace(/\\\{/g, "{")
    .replace(/\\\}/g, "}")
    .replace(/\\textasciitilde\{\}/g, "~")
    .replace(/\\textasciicircum\{\}/g, "^");
}

function captureValue(text, regex) {
  const match = text.match(regex);
  return match?.[1]?.trim() || "";
}

function extractHrefLabel(part = "") {
  const underlined = captureValue(part, /\\underline\{([\s\S]*?)\}/);
  if (underlined) {
    return unescapeLatex(underlined);
  }

  const hrefValue = captureValue(part, /\\href\{([\s\S]*?)\}/);
  return unescapeLatex(hrefValue);
}

function parseHeadingFromLatex(latex = "") {
  const heading = {
    name: "",
    phone: "",
    email: "",
    linkedin: "",
    github: "",
    location: "",
  };

  const centerBlock = captureValue(latex, /\\begin\{center\}([\s\S]*?)\\end\{center\}/);
  if (!centerBlock) {
    return heading;
  }

  heading.name = unescapeLatex(captureValue(centerBlock, /\\textbf\{\\Huge \\scshape ([^}]*)\}/));

  const compactContactLine = centerBlock.replace(/\s+/g, " ");
  const smallIndex = compactContactLine.indexOf("\\small");
  if (smallIndex === -1) {
    return heading;
  }

  const contactString = compactContactLine.slice(smallIndex + "\\small".length).trim();
  const contactParts = contactString.split(/\$\|\$/).map((part) => part.trim()).filter(Boolean);
  const plainParts = [];

  contactParts.forEach((part) => {
    if (part.includes("mailto:")) {
      heading.email = extractHrefLabel(part);
      return;
    }

    if (part.includes("linkedin.com")) {
      heading.linkedin = extractHrefLabel(part);
      return;
    }

    if (part.includes("github.com")) {
      heading.github = extractHrefLabel(part);
      return;
    }

    plainParts.push(unescapeLatex(part));
  });

  heading.phone = plainParts[0] || "";
  heading.location = plainParts[1] || "";

  return heading;
}

function stripLatexComments(latex = "") {
  return latex
    .split("\n")
    .map((line) => {
      let cursor = 0;
      while (cursor < line.length) {
        if (line[cursor] === "%" && line[cursor - 1] !== "\\") {
          return line.slice(0, cursor);
        }
        cursor += 1;
      }
      return line;
    })
    .join("\n");
}

function readBalancedBraces(text = "", openBraceIndex = -1) {
  if (openBraceIndex < 0 || text[openBraceIndex] !== "{") {
    return null;
  }

  let depth = 0;
  let cursor = openBraceIndex;

  while (cursor < text.length) {
    const char = text[cursor];
    const prev = text[cursor - 1];

    if (char === "{" && prev !== "\\") {
      depth += 1;
    }

    if (char === "}" && prev !== "\\") {
      depth -= 1;
      if (depth === 0) {
        return {
          value: text.slice(openBraceIndex + 1, cursor),
          end: cursor + 1,
        };
      }
    }

    cursor += 1;
  }

  return null;
}

function parseCommandCalls(text = "", command = "", argCount = 1) {
  const calls = [];
  let searchCursor = 0;

  while (searchCursor < text.length) {
    const commandIndex = text.indexOf(command, searchCursor);
    if (commandIndex === -1) {
      break;
    }

    let cursor = commandIndex + command.length;
    const args = [];
    let valid = true;

    for (let i = 0; i < argCount; i += 1) {
      while (cursor < text.length && /\s/.test(text[cursor])) {
        cursor += 1;
      }

      if (text[cursor] !== "{") {
        valid = false;
        break;
      }

      const parsed = readBalancedBraces(text, cursor);
      if (!parsed) {
        valid = false;
        break;
      }

      args.push(parsed.value);
      cursor = parsed.end;
    }

    if (valid) {
      calls.push({
        args,
        start: commandIndex,
        end: cursor,
      });
      searchCursor = cursor;
    } else {
      searchCursor = commandIndex + command.length;
    }
  }

  return calls;
}

function getSectionContent(latex = "", sectionName = "") {
  const sectionMarker = `\\section{${sectionName}}`;
  const start = latex.indexOf(sectionMarker);
  if (start === -1) {
    return "";
  }

  const contentStart = start + sectionMarker.length;
  const nextSection = latex.indexOf("\\section{", contentStart);
  return nextSection === -1
    ? latex.slice(contentStart)
    : latex.slice(contentStart, nextSection);
}

function splitBullets(block = "") {
  return parseCommandCalls(block, "\\resumeItem", 1)
    .map((entry) => unescapeLatex(entry.args[0].trim()))
    .filter(Boolean);
}

function extractProjectParts(projectHeading = "") {
  const title = captureValue(projectHeading, /\\textbf\{([\s\S]*?)\}/);
  const technologies = captureValue(projectHeading, /\\emph\{([\s\S]*?)\}/);

  return {
    title: unescapeLatex(title),
    technologies: unescapeLatex(technologies),
  };
}

export function parseLatexToForm(latex = "") {
  const source = stripLatexComments(latex);
  const parsed = cloneDefaultState();

  const parsedHeading = parseHeadingFromLatex(source);
  parsed.heading.name = parsedHeading.name;
  parsed.heading.phone = parsedHeading.phone;
  parsed.heading.email = parsedHeading.email;
  parsed.heading.linkedin = parsedHeading.linkedin;
  parsed.heading.github = parsedHeading.github;
  parsed.heading.location = parsedHeading.location;

  parsed.heading.name = parsed.heading.name || captureValue(source, /\\textbf\{\\Huge \\scshape ([^}]*)\}/);
  parsed.heading.phone = parsed.heading.phone || captureValue(source, /\\small\s+([^$\n]*)\s+\$\|\$/);
  parsed.heading.email = parsed.heading.email || captureValue(source, /\\href\{mailto:[^}]*\}\{\\underline\{([^}]*)\}\}/);
  parsed.heading.linkedin = parsed.heading.linkedin || captureValue(source, /\\href\{https:\/\/linkedin\.com\/in\/[^}]*\}\{\\underline\{([^}]*)\}\}/);
  parsed.heading.github = parsed.heading.github || captureValue(source, /\\href\{https:\/\/github\.com\/[^}]*\}\{\\underline\{([^}]*)\}\}/);

  const educationSection = getSectionContent(source, "Education");
  const educationCalls = parseCommandCalls(educationSection, "\\resumeSubheading", 4);
  if (educationCalls.length > 0) {
    parsed.education = educationCalls.map((row) => ({
      school: unescapeLatex(row.args[0]),
      location: unescapeLatex(row.args[1]),
      degree: unescapeLatex(row.args[2]),
      gradDate: unescapeLatex(row.args[3]),
    }));
  }

  const experienceSection = getSectionContent(source, "Experience");
  const experienceCalls = parseCommandCalls(experienceSection, "\\resumeSubheading", 4);
  if (experienceCalls.length > 0) {
    parsed.experience = experienceCalls.map((row, index) => {
      const blockStart = row.end;
      const blockEnd = experienceCalls[index + 1]?.start ?? experienceSection.length;
      const entryBlock = experienceSection.slice(blockStart, blockEnd);

      return {
        role: unescapeLatex(row.args[0]),
        date: unescapeLatex(row.args[1]),
        company: unescapeLatex(row.args[2]),
        location: unescapeLatex(row.args[3]),
        bullets: splitBullets(entryBlock),
      };
    });
  }

  const projectsSection = getSectionContent(source, "Projects");
  const projectCalls = parseCommandCalls(projectsSection, "\\resumeProjectHeading", 2);
  if (projectCalls.length > 0) {
    parsed.projects = projectCalls.map((row, index) => {
      const blockStart = row.end;
      const blockEnd = projectCalls[index + 1]?.start ?? projectsSection.length;
      const entryBlock = projectsSection.slice(blockStart, blockEnd);
      const projectParts = extractProjectParts(row.args[0]);

      return {
        title: projectParts.title,
        technologies: projectParts.technologies,
        date: unescapeLatex(row.args[1]),
        bullets: splitBullets(entryBlock),
      };
    });
  }

  parsed.technicalSkills.languages = captureValue(source, /\\textbf\{Languages\}\{: ([^}]*)\}/);
  parsed.technicalSkills.frameworks = captureValue(source, /\\textbf\{Frameworks\}\{: ([^}]*)\}/);
  parsed.technicalSkills.tools = captureValue(source, /\\textbf\{Developer Tools\}\{: ([^}]*)\}/);
  parsed.technicalSkills.libraries = captureValue(source, /\\textbf\{Libraries\}\{: ([^}]*)\}/);

  return parsed;
}

function serializeBullets(bullets = []) {
  const lines = bullets
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `        \\resumeItem{${escapeLatex(item)}}`);

  if (!lines.length) {
    return "        \\resumeItem{Add detail here}";
  }

  return lines.join("\n");
}

function serializeEducation(items = []) {
  const rows = items
    .map((item) => ({
      school: item.school?.trim(),
      location: item.location?.trim(),
      degree: item.degree?.trim(),
      gradDate: item.gradDate?.trim(),
    }))
    .filter((item) => item.school || item.degree);

  if (!rows.length) {
    return `    \\resumeSubheading\n      {Add School}{City, Country}\n      {Degree}{Start -- End}`;
  }

  return rows
    .map((item) => `    \\resumeSubheading\n      {${escapeLatex(item.school || "School")}}{${escapeLatex(item.location || "Location")}}\n      {${escapeLatex(item.degree || "Degree")}}{${escapeLatex(item.gradDate || "Date")}}`)
    .join("\n");
}

function serializeExperience(items = []) {
  const rows = items
    .map((item) => ({
      role: item.role?.trim(),
      date: item.date?.trim(),
      company: item.company?.trim(),
      location: item.location?.trim(),
      bullets: Array.isArray(item.bullets) ? item.bullets : [],
    }))
    .filter((item) => item.role || item.company);

  if (!rows.length) {
    return `    \\resumeSubheading\n      {Role}{Date Range}\n      {Company}{Location}\n      \\resumeItemListStart\n${serializeBullets(["Add impact-focused bullet"]) }\n      \\resumeItemListEnd`;
  }

  return rows
    .map((item) => `    \\resumeSubheading\n      {${escapeLatex(item.role || "Role")}}{${escapeLatex(item.date || "Date")}}\n      {${escapeLatex(item.company || "Company")}}{${escapeLatex(item.location || "Location")}}\n      \\resumeItemListStart\n${serializeBullets(item.bullets)}\n      \\resumeItemListEnd`)
    .join("\n\n");
}

function serializeProjects(items = []) {
  const rows = items
    .map((item) => ({
      title: item.title?.trim(),
      technologies: item.technologies?.trim(),
      date: item.date?.trim(),
      bullets: Array.isArray(item.bullets) ? item.bullets : [],
    }))
    .filter((item) => item.title || item.technologies);

  if (!rows.length) {
    return `      \\resumeProjectHeading\n          {\\textbf{Project Name} $|$ \\emph{Tech Stack}}{Date Range}\n          \\resumeItemListStart\n${serializeBullets(["Describe outcome and technical impact"]) }\n          \\resumeItemListEnd`;
  }

  return rows
    .map((item) => `      \\resumeProjectHeading\n          {\\textbf{${escapeLatex(item.title || "Project")}} $|$ \\emph{${escapeLatex(item.technologies || "Tech")}}}{${escapeLatex(item.date || "Date")}}\n          \\resumeItemListStart\n${serializeBullets(item.bullets)}\n          \\resumeItemListEnd`)
    .join("\n");
}

export function formToLatex(formState = defaultResumeState) {
  const heading = formState.heading || defaultResumeState.heading;
  const skills = formState.technicalSkills || defaultResumeState.technicalSkills;

  const contactLine = [
    heading.phone?.trim() || "Phone",
    heading.location?.trim() || "Location",
  ].filter(Boolean).join(" $|$ ");

  return String.raw`%-------------------------
% Resume in Latex (Generated by Cover Pilot Easy Editor)
%------------------------

\documentclass[letterpaper,11pt]{article}

\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage[usenames,dvipsnames]{color}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\input{glyphtounicode}

\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.5in}
\addtolength{\textheight}{1.0in}

\urlstyle{same}
\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

\pdfgentounicode=1

\newcommand{\resumeItem}[1]{
  \item\small{{#1 \vspace{-2pt}}}
}
\newcommand{\resumeSubheading}[4]{
  \vspace{-2pt}\item
    \begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & #2 \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-7pt}
}
\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \small#1 & #2 \\
    \end{tabular*}\vspace{-7pt}
}
\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}

\begin{document}

\begin{center}
    \textbf{\Huge \scshape ${escapeLatex(heading.name || "Your Name")}} \\ \vspace{1pt}
    \small ${escapeLatex(contactLine)} $|$ \href{mailto:${escapeLatex(heading.email || "your@email.com")}}{\underline{${escapeLatex(heading.email || "your@email.com")}}} $|$
    \href{https://linkedin.com/in/${escapeLatex((heading.linkedin || "your-linkedin").replace("linkedin.com/in/", ""))}}{\underline{${escapeLatex(heading.linkedin || "linkedin.com/in/your-linkedin")}}} $|$
    \href{https://github.com/${escapeLatex((heading.github || "your-github").replace("github.com/", ""))}}{\underline{${escapeLatex(heading.github || "github.com/your-github")}}}
\end{center}

\section{Education}
  \resumeSubHeadingListStart
${serializeEducation(formState.education)}
  \resumeSubHeadingListEnd

\section{Experience}
  \resumeSubHeadingListStart
${serializeExperience(formState.experience)}
  \resumeSubHeadingListEnd

\section{Projects}
    \resumeSubHeadingListStart
${serializeProjects(formState.projects)}
    \resumeSubHeadingListEnd

\section{Technical Skills}
 \begin{itemize}[leftmargin=0.15in, label={}]
    \small{\item{
     \textbf{Languages}{: ${escapeLatex(skills.languages || "")}} \\
     \textbf{Frameworks}{: ${escapeLatex(skills.frameworks || "")}} \\
     \textbf{Developer Tools}{: ${escapeLatex(skills.tools || "")}} \\
     \textbf{Libraries}{: ${escapeLatex(skills.libraries || "")}}
    }}
 \end{itemize}

\end{document}
`;
}

export function getDefaultResumeState() {
  return cloneDefaultState();
}
