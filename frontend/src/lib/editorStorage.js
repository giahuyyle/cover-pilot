const PUBLIC_DEV_INPUT_DIR = "/tests/input";
const DEV_INDEX_PATH = `${PUBLIC_DEV_INPUT_DIR}/index.json`;

function getAppMode() {
  return import.meta.env.VITE_APP_MODE || import.meta.env.MODE;
}

function buildFileMeta(filename) {
  return {
    id: filename,
    name: filename,
    path: `${PUBLIC_DEV_INPUT_DIR}/${filename}`,
  };
}

export function getStorageMode() {
  const mode = getAppMode();
  return mode === "production" ? "production" : "development";
}

export async function listStorageTexFiles() {
  const storageMode = getStorageMode();

  if (storageMode === "production") {
    return [];
  }

  try {
    const response = await fetch(DEV_INDEX_PATH);
    if (!response.ok) {
      throw new Error("Unable to read development file index.");
    }

    const json = await response.json();
    const files = Array.isArray(json.files) ? json.files : [];

    return files.filter((name) => name.endsWith(".tex")).map(buildFileMeta);
  } catch {
    return [buildFileMeta("jakes.tex")];
  }
}

export async function readStorageFile(filePath) {
  const response = await fetch(filePath);

  if (!response.ok) {
    throw new Error("Unable to load selected file.");
  }

  return response.text();
}
