import { useEffect, useMemo, useState } from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { ArrowLeft, Download, FileText, RefreshCw, Save, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStorageMode, listStorageTexFiles, readStorageFile } from "@/lib/editorStorage";
import { formToLatex, getDefaultResumeState, parseLatexToForm } from "@/lib/latexResume";

const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingHorizontal: 36,
    paddingBottom: 18,
    fontSize: 10,
    fontFamily: "Times-Roman",
    color: "#111111",
  },
  headingName: {
    fontSize: 30,
    fontFamily: "Times-Bold",
    textAlign: "center",
    marginBottom: 4,
  },
  headingContact: {
    fontSize: 11,
    textAlign: "center",
    color: "#1f2937",
    marginBottom: 8,
    lineHeight: 1.15,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Times-Bold",
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#111111",
    paddingBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  row: {
    marginBottom: 4,
  },
  rowTop: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  primaryText: {
    fontFamily: "Times-Bold",
    fontSize: 12,
  },
  secondaryText: {
    fontSize: 11,
    color: "#111111",
  },
  italicText: {
    fontFamily: "Times-Italic",
    fontSize: 11,
    color: "#2f2f2f",
  },
  bullet: {
    fontSize: 11,
    marginLeft: 18,
    marginTop: 1,
    lineHeight: 1.12,
  },
  skillsLine: {
    fontSize: 11,
    marginBottom: 1,
    lineHeight: 1.12,
  },
  skillsLabel: {
    fontFamily: "Times-Bold",
  },
});

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toRenderModel(formState) {
  const heading = formState?.heading || {};
  const skills = formState?.technicalSkills || {};

  return {
    heading: {
      name: normalizeText(heading.name) || "Your Name",
      phone: normalizeText(heading.phone),
      email: normalizeText(heading.email),
      location: normalizeText(heading.location),
      linkedin: normalizeText(heading.linkedin),
      github: normalizeText(heading.github),
    },
    education: Array.isArray(formState?.education) ? formState.education : [],
    experience: Array.isArray(formState?.experience) ? formState.experience : [],
    projects: Array.isArray(formState?.projects) ? formState.projects : [],
    technicalSkills: {
      languages: normalizeText(skills.languages),
      frameworks: normalizeText(skills.frameworks),
      tools: normalizeText(skills.tools),
      libraries: normalizeText(skills.libraries),
    },
  };
}

function RenderPreviewDocument({ resume }) {
  const headingParts = [
    resume.heading.phone,
    resume.heading.email,
    resume.heading.location,
    resume.heading.linkedin,
    resume.heading.github,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.headingName}>{resume.heading.name}</Text>
                <Text style={pdfStyles.headingContact}>{headingParts.join(" | ")}</Text>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Education</Text>
          {resume.education.map((item, index) => (
            <View key={`edu-${index}`} style={pdfStyles.row}>
              <View style={pdfStyles.rowTop}>
                <Text style={pdfStyles.primaryText}>{item.school || "School"}</Text>
                <Text style={pdfStyles.secondaryText}>{item.gradDate || "Date"}</Text>
              </View>
              <View style={pdfStyles.rowTop}>
                <Text style={pdfStyles.italicText}>{item.degree || "Degree"}</Text>
                <Text style={pdfStyles.secondaryText}>{item.location || "Location"}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Experience</Text>
          {resume.experience.map((item, index) => (
            <View key={`exp-${index}`} style={pdfStyles.row}>
              <View style={pdfStyles.rowTop}>
                <Text style={pdfStyles.primaryText}>{item.role || "Role"}</Text>
                <Text style={pdfStyles.secondaryText}>{item.date || "Date"}</Text>
              </View>
              <View style={pdfStyles.rowTop}>
                <Text style={pdfStyles.italicText}>{item.company || "Company"}</Text>
                <Text style={pdfStyles.secondaryText}>{item.location || "Location"}</Text>
              </View>
              {(Array.isArray(item.bullets) ? item.bullets : []).filter(Boolean).map((bullet, bulletIndex) => (
                <Text key={`exp-b-${index}-${bulletIndex}`} style={pdfStyles.bullet}>
                  • {bullet}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Projects</Text>
          {resume.projects.map((item, index) => (
            <View key={`proj-${index}`} style={pdfStyles.row}>
              <View style={pdfStyles.rowTop}>
                <Text style={pdfStyles.primaryText}>{item.title || "Project"}</Text>
                <Text style={pdfStyles.secondaryText}>{item.date || "Date"}</Text>
              </View>
              {item.technologies ? <Text style={pdfStyles.italicText}>{item.technologies}</Text> : null}
              {(Array.isArray(item.bullets) ? item.bullets : []).filter(Boolean).map((bullet, bulletIndex) => (
                <Text key={`proj-b-${index}-${bulletIndex}`} style={pdfStyles.bullet}>
                  • {bullet}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Technical Skills</Text>
          {resume.technicalSkills.languages ? (
            <Text style={pdfStyles.skillsLine}>
              <Text style={pdfStyles.skillsLabel}>Languages: </Text>
              {resume.technicalSkills.languages}
            </Text>
          ) : null}
          {resume.technicalSkills.frameworks ? (
            <Text style={pdfStyles.skillsLine}>
              <Text style={pdfStyles.skillsLabel}>Frameworks: </Text>
              {resume.technicalSkills.frameworks}
            </Text>
          ) : null}
          {resume.technicalSkills.tools ? (
            <Text style={pdfStyles.skillsLine}>
              <Text style={pdfStyles.skillsLabel}>Developer Tools: </Text>
              {resume.technicalSkills.tools}
            </Text>
          ) : null}
          {resume.technicalSkills.libraries ? (
            <Text style={pdfStyles.skillsLine}>
              <Text style={pdfStyles.skillsLabel}>Libraries: </Text>
              {resume.technicalSkills.libraries}
            </Text>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-12 items-center rounded-full transition ${
        checked ? "bg-zinc-900" : "bg-zinc-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SectionHeader({ title, onAdd }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      {onAdd ? (
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          Add
        </Button>
      ) : null}
    </div>
  );
}

function Editor() {
  const [storageMode, setStorageMode] = useState("development");
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState("");
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState("");

  const [editorMode, setEditorMode] = useState(() => sessionStorage.getItem("editor-mode") || "easy");
  const [latexText, setLatexText] = useState("");
  const [formState, setFormState] = useState(() => getDefaultResumeState());

  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadName, setDownloadName] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const activeFile = useMemo(
    () => files.find((file) => file.id === activeFileId) || null,
    [files, activeFileId],
  );

  function clearRenderedOutput() {
    setShowPreview(false);
    setRenderError("");
    setDownloadName("");
    setDownloadUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return "";
    });
  }

  useEffect(() => {
    sessionStorage.setItem("editor-mode", editorMode);
  }, [editorMode]);

  useEffect(() => {
    setStorageMode(getStorageMode());
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadFiles() {
      try {
        const texFiles = await listStorageTexFiles();
        if (!mounted) {
          return;
        }

        setFiles(texFiles);

        const lastFile = sessionStorage.getItem("editor-active-file");
        const hasLastFile = texFiles.some((item) => item.id === lastFile);
        const nextFileId = hasLastFile ? lastFile : texFiles[0]?.id || "";
        setActiveFileId(nextFileId);
      } catch {
        if (mounted) {
          setError("Unable to list files in storage.");
        }
      } finally {
        if (mounted) {
          setIsLoadingFiles(false);
        }
      }
    }

    loadFiles();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeFile) {
      return;
    }

    sessionStorage.setItem("editor-active-file", activeFile.id);

    let mounted = true;

    async function loadLatex() {
      setIsLoadingContent(true);
      setError("");

      try {
        const content = await readStorageFile(activeFile.path);
        if (!mounted) {
          return;
        }

        setLatexText(content);
        setFormState(parseLatexToForm(content));
        clearRenderedOutput();
      } catch {
        if (mounted) {
          setError("Unable to open this file.");
        }
      } finally {
        if (mounted) {
          setIsLoadingContent(false);
        }
      }
    }

    loadLatex();

    return () => {
      mounted = false;
    };
  }, [activeFile]);

  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  function updateHeading(key, value) {
    clearRenderedOutput();
    setFormState((prev) => ({
      ...prev,
      heading: {
        ...prev.heading,
        [key]: value,
      },
    }));
  }

  function updateSkills(key, value) {
    clearRenderedOutput();
    setFormState((prev) => ({
      ...prev,
      technicalSkills: {
        ...prev.technicalSkills,
        [key]: value,
      },
    }));
  }

  function updateListRow(section, index, key, value) {
    clearRenderedOutput();
    setFormState((prev) => ({
      ...prev,
      [section]: prev[section].map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        return {
          ...row,
          [key]: value,
        };
      }),
    }));
  }

  function updateBulletField(section, index, value) {
    const bullets = value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    updateListRow(section, index, "bullets", bullets.length ? bullets : [""]);
  }

  function addRow(section, template) {
    clearRenderedOutput();
    setFormState((prev) => ({
      ...prev,
      [section]: [...prev[section], template],
    }));
  }

  function removeRow(section, index) {
    clearRenderedOutput();
    setFormState((prev) => {
      const nextRows = prev[section].filter((_, rowIndex) => rowIndex !== index);

      return {
        ...prev,
        [section]: nextRows.length
          ? nextRows
          : [
              section === "education"
                ? { school: "", location: "", degree: "", gradDate: "" }
                : section === "experience"
                  ? { role: "", company: "", location: "", date: "", bullets: [""] }
                  : { title: "", technologies: "", date: "", bullets: [""] },
            ],
      };
    });
  }

  function handleSaveSync() {
    if (editorMode === "easy") {
      const generatedLatex = formToLatex(formState);
      setLatexText(generatedLatex);
      setFormState(parseLatexToForm(generatedLatex));
      clearRenderedOutput();
      return;
    }

    const parsedForm = parseLatexToForm(latexText);
    setFormState(parsedForm);
    setLatexText(formToLatex(parsedForm));
    clearRenderedOutput();
  }

  async function handleRender() {
    setIsRendering(true);
    setRenderError("");

    try {
      const renderFormState = editorMode === "easy" ? formState : parseLatexToForm(latexText);
      const doc = <RenderPreviewDocument resume={toRenderModel(renderFormState)} />;
      const blob = await pdf(doc).toBlob();
      const objectUrl = URL.createObjectURL(blob);

      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }

      setDownloadUrl(objectUrl);
      setDownloadName(`${(activeFile?.name || "resume").replace(/\.tex$/i, "")}.pdf`);
      setShowPreview(true);
    } catch {
      setRenderError("Render failed. Please try again.");
    } finally {
      setIsRendering(false);
    }
  }

  return (
    <div className="px-4 pb-10 lg:px-8">
      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Resume Editor</h1>
            <p className="text-sm text-zinc-500">
              Storage mode: <span className="font-medium text-zinc-700">{storageMode}</span>
              {storageMode === "development" ? " (public/tests/input)" : " (bucket integration pending)"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-600">Easy Editor</span>
            <Toggle checked={editorMode === "latex"} onChange={(isLatex) => setEditorMode(isLatex ? "latex" : "easy")} />
            <span className="text-sm font-medium text-zinc-600">LaTeX</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">Storage</h2>
          </div>

          {isLoadingFiles ? <p className="text-sm text-zinc-500">Loading files...</p> : null}
          {!isLoadingFiles && files.length === 0 ? <p className="text-sm text-zinc-500">No .tex files found.</p> : null}

          <div className="space-y-2">
            {files.map((file) => {
              const isActive = file.id === activeFileId;

              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setActiveFileId(file.id)}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                    isActive
                      ? "border-zinc-800 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span className="truncate">{file.name}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-h-[70vh] rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Selected file</p>
              <h2 className="text-lg font-semibold text-zinc-900">{activeFile?.name || "No file selected"}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={handleSaveSync}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>

              <Button type="button" onClick={handleRender} disabled={isRendering || isLoadingContent || !activeFile}>
                {isRendering ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                Render
              </Button>

              {showPreview ? (
                <Button type="button" variant="outline" onClick={() => setShowPreview(false)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to Editor
                </Button>
              ) : null}

              {downloadUrl ? (
                <a href={downloadUrl} download={downloadName} className="inline-flex">
                  <Button type="button" variant="secondary">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </a>
              ) : null}
            </div>
          </div>

          {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {renderError ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{renderError}</p> : null}

          {isLoadingContent ? <p className="text-sm text-zinc-500">Loading editor content...</p> : null}

          {!isLoadingContent && showPreview && downloadUrl ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-600">Rendered PDF preview. You can return to editor and continue editing anytime.</p>
              <div className="h-[75vh] overflow-hidden rounded-xl border border-zinc-300">
                <iframe title="Rendered resume PDF" src={downloadUrl} className="h-full w-full" />
              </div>
            </div>
          ) : null}

          {!isLoadingContent && !showPreview && editorMode === "latex" ? (
            <textarea
              value={latexText}
              onChange={(event) => {
                setLatexText(event.target.value);
                clearRenderedOutput();
              }}
              className="min-h-[60vh] w-full rounded-xl border border-zinc-300 bg-zinc-50 p-4 font-mono text-xs leading-relaxed text-zinc-800 focus:border-zinc-500 focus:outline-none"
            />
          ) : null}

          {!isLoadingContent && !showPreview && editorMode === "easy" ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-zinc-200 p-4">
                <SectionHeader title="Heading" />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input value={formState.heading.name} onChange={(event) => updateHeading("name", event.target.value)} placeholder="Full name" />
                  <Input value={formState.heading.phone} onChange={(event) => updateHeading("phone", event.target.value)} placeholder="Phone number" />
                  <Input value={formState.heading.email} onChange={(event) => updateHeading("email", event.target.value)} placeholder="Email" />
                  <Input value={formState.heading.location} onChange={(event) => updateHeading("location", event.target.value)} placeholder="Location" />
                  <Input value={formState.heading.linkedin} onChange={(event) => updateHeading("linkedin", event.target.value)} placeholder="LinkedIn" />
                  <Input value={formState.heading.github} onChange={(event) => updateHeading("github", event.target.value)} placeholder="GitHub" />
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4">
                <SectionHeader
                  title="Education"
                  onAdd={() => addRow("education", { school: "", location: "", degree: "", gradDate: "" })}
                />
                <div className="space-y-3">
                  {formState.education.map((row, index) => (
                    <div key={`education-${index}`} className="rounded-lg border border-zinc-200 p-3">
                      <div className="mb-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Input value={row.school} onChange={(event) => updateListRow("education", index, "school", event.target.value)} placeholder="School" />
                        <Input value={row.gradDate} onChange={(event) => updateListRow("education", index, "gradDate", event.target.value)} placeholder="Graduation date" />
                        <Input value={row.location} onChange={(event) => updateListRow("education", index, "location", event.target.value)} placeholder="Location" />
                        <Input value={row.degree} onChange={(event) => updateListRow("education", index, "degree", event.target.value)} placeholder="Degree" />
                      </div>
                      <div className="flex justify-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => removeRow("education", index)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4">
                <SectionHeader
                  title="Experience"
                  onAdd={() => addRow("experience", { role: "", company: "", location: "", date: "", bullets: [""] })}
                />
                <div className="space-y-3">
                  {formState.experience.map((row, index) => (
                    <div key={`experience-${index}`} className="rounded-lg border border-zinc-200 p-3">
                      <div className="mb-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Input value={row.role} onChange={(event) => updateListRow("experience", index, "role", event.target.value)} placeholder="Role" />
                        <Input value={row.company} onChange={(event) => updateListRow("experience", index, "company", event.target.value)} placeholder="Company" />
                        <Input value={row.location} onChange={(event) => updateListRow("experience", index, "location", event.target.value)} placeholder="Location" />
                        <Input value={row.date} onChange={(event) => updateListRow("experience", index, "date", event.target.value)} placeholder="Date range" />
                      </div>

                      <textarea
                        value={(row.bullets || []).filter(Boolean).join("\n")}
                        onChange={(event) => updateBulletField("experience", index, event.target.value)}
                        placeholder="One bullet per line"
                        className="min-h-24 w-full rounded-lg border border-zinc-300 bg-zinc-50 p-3 text-sm focus:border-zinc-500 focus:outline-none"
                      />

                      <div className="mt-2 flex justify-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => removeRow("experience", index)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4">
                <SectionHeader
                  title="Projects"
                  onAdd={() => addRow("projects", { title: "", technologies: "", date: "", bullets: [""] })}
                />
                <div className="space-y-3">
                  {formState.projects.map((row, index) => (
                    <div key={`projects-${index}`} className="rounded-lg border border-zinc-200 p-3">
                      <div className="mb-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Input value={row.title} onChange={(event) => updateListRow("projects", index, "title", event.target.value)} placeholder="Project title" />
                        <Input value={row.technologies} onChange={(event) => updateListRow("projects", index, "technologies", event.target.value)} placeholder="Technologies" />
                        <Input value={row.date} onChange={(event) => updateListRow("projects", index, "date", event.target.value)} placeholder="Date range" />
                      </div>

                      <textarea
                        value={(row.bullets || []).filter(Boolean).join("\n")}
                        onChange={(event) => updateBulletField("projects", index, event.target.value)}
                        placeholder="One bullet per line"
                        className="min-h-24 w-full rounded-lg border border-zinc-300 bg-zinc-50 p-3 text-sm focus:border-zinc-500 focus:outline-none"
                      />

                      <div className="mt-2 flex justify-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => removeRow("projects", index)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4">
                <SectionHeader title="Technical Skills" />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input value={formState.technicalSkills.languages} onChange={(event) => updateSkills("languages", event.target.value)} placeholder="Languages" />
                  <Input value={formState.technicalSkills.frameworks} onChange={(event) => updateSkills("frameworks", event.target.value)} placeholder="Frameworks" />
                  <Input value={formState.technicalSkills.tools} onChange={(event) => updateSkills("tools", event.target.value)} placeholder="Developer Tools" />
                  <Input value={formState.technicalSkills.libraries} onChange={(event) => updateSkills("libraries", event.target.value)} placeholder="Libraries" />
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default Editor;
