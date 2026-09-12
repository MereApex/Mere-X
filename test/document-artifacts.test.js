import test from "node:test";
import assert from "node:assert/strict";

import {
  documentExtension,
  documentGenerationInstructions,
  documentMimeType,
  generatedDocumentReferences,
  requestedDocumentFormats
} from "../server/document-artifacts.js";

test("downloadable document requests detect Word, Excel, and PDF formats", () => {
  assert.deepEqual(requestedDocumentFormats("Create a Word document and an Excel spreadsheet"), ["docx", "xlsx"]);
  assert.deepEqual(requestedDocumentFormats("გამიკეთე PDF ფაილი"), ["pdf"]);
  assert.deepEqual(requestedDocumentFormats("Export this as report.docx"), ["docx"]);
});

test("ordinary questions about files do not force document generation", () => {
  assert.deepEqual(requestedDocumentFormats("Can you explain what PDF means?"), []);
  assert.deepEqual(requestedDocumentFormats("Analyze the attached document"), []);
});

test("only supported generated document extensions receive a MIME type", () => {
  assert.equal(documentExtension("Quarterly plan.XLSX"), "xlsx");
  assert.equal(documentMimeType("Quarterly plan.xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.equal(documentExtension("installer.exe"), "");
  assert.equal(documentMimeType("installer.exe"), "");
});

test("generation instructions require real files in the shared container", () => {
  const instructions = documentGenerationInstructions(["docx", "pdf"]);
  assert.match(instructions, /\/mnt\/data/);
  assert.match(instructions, /prose-only answer does not satisfy/i);
  assert.match(instructions, /DOCX/);
});

test("container references are collected without leaking unrelated annotations", () => {
  const result = generatedDocumentReferences({ output: [
    { type: "code_interpreter_call", container_id: "container-1" },
    { type: "message", content: [{ annotations: [
      { type: "url_citation", url: "https://example.com" },
      { type: "container_file_citation", container_id: "container-1", file_id: "cfile-1", filename: "report.pdf" }
    ] }] }
  ] });
  assert.deepEqual(result.containers, ["container-1"]);
  assert.deepEqual(result.files, [{ containerId: "container-1", fileId: "cfile-1", filename: "report.pdf" }]);
});
