const DOCUMENT_TYPES = Object.freeze({
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf"
});

const CREATION_WORDS = /\b(?:build|convert|create|draft|export|generate|give|make|prepare|produce|send|write)\b|(?:შექმენ|გამიკეთ|მომიმზად|დამიმზად|გააკეთ|დაწერ|გადაიყვან|ექსპორტ|გამომიგზავნ|ჩამოსატვირთ|ფაილად|ფორმატში)/iu;

const FORMAT_PATTERNS = Object.freeze({
  docx: /(?:\.docx?\b|\b(?:docx?|word)\b|ვორდ|დოკუმენტ)/iu,
  xlsx: /(?:\.xlsx?\b|\b(?:excel|spreadsheet|workbook|xlsx?)\b|ექსელ|ცხრილ)/iu,
  pdf: /(?:\.pdf\b|\bpdf\b|პდფ)/iu
});

export function requestedDocumentFormats(value) {
  const text = String(value || "").trim();
  if (!text) return [];

  const formats = Object.entries(FORMAT_PATTERNS)
    .filter(([, pattern]) => pattern.test(text))
    .map(([format]) => format);
  if (!formats.length) return [];

  const explicitExtension = /\.(?:docx?|xlsx?|pdf)\b/iu.test(text);
  return explicitExtension || CREATION_WORDS.test(text) ? formats : [];
}

export function documentMimeType(filename) {
  const match = String(filename || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? DOCUMENT_TYPES[match[1]] || "" : "";
}

export function documentExtension(filename) {
  const match = String(filename || "").toLowerCase().match(/\.(docx|xlsx|pdf)$/);
  return match?.[1] || "";
}

export function documentGenerationInstructions(formats) {
  const requested = [...new Set(formats)].filter((format) => DOCUMENT_TYPES[format]);
  if (!requested.length) return "";

  return [
    `The user explicitly requested downloadable ${requested.map((format) => format.toUpperCase()).join(", ")} file output.`,
    "You must use the code interpreter to create one polished, complete, valid file for every requested format; a prose-only answer does not satisfy the request.",
    "Save final files in /mnt/data with short descriptive filenames and cite each generated file in the final response so Mere X can attach it.",
    "For DOCX use a proper Word document structure, for XLSX use a real workbook with useful formatting and formulas where appropriate, and for PDF use a properly laid-out PDF. Never create a text file with a renamed extension.",
    "Preserve the user's language and supplied data, avoid macros or executable content, validate that each file can be opened, and keep the accompanying chat message concise."
  ].join(" ");
}

export function generatedDocumentReferences(response) {
  const containers = new Set();
  const files = new Map();

  for (const item of Array.isArray(response?.output) ? response.output : []) {
    if (item?.type === "code_interpreter_call" && item.container_id) containers.add(item.container_id);
    if (item?.type !== "message") continue;
    for (const part of Array.isArray(item.content) ? item.content : []) {
      for (const annotation of Array.isArray(part?.annotations) ? part.annotations : []) {
        if (annotation?.type !== "container_file_citation" || !annotation.container_id || !annotation.file_id) continue;
        containers.add(annotation.container_id);
        files.set(`${annotation.container_id}:${annotation.file_id}`, {
          containerId: annotation.container_id,
          fileId: annotation.file_id,
          filename: annotation.filename || ""
        });
      }
    }
  }

  return { containers: [...containers], files: [...files.values()] };
}
