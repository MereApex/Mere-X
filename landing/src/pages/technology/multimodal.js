/* ============================================================
   MULTIMODAL — vision, documents, audio
   ============================================================ */

import { SAMPLES } from "../../data/docs.js";
import { icon } from "../../lib/icons.js";
import { pageHead, sectionHead, textLink, button, codeBlock, ctaBand, calloutBox, dataTable } from "../../components/ui.js";

const MODALITIES = [
  {
    icon: "file", title: "Documents", model: "Iris · Apex · Orion",
    body: "Send a PDF directly — no OCR step, no chunking strategy. The encoder preserves layout, so tables stay tables, footnotes stay attached to their anchors, and page numbers survive into citations.",
    specs: [["Max pages", "3,000"], ["Max size", "512 MB via Files"], ["Formats", "PDF, DOCX, PPTX, XLSX"], ["Layout", "Preserved with coordinates"]]
  },
  {
    icon: "image", title: "Images", model: "Iris · Apex · Orion · Nyx",
    body: "Screenshots, photographs of whiteboards, engineering drawings, medical charts, and hand annotation. The model reads what is written on a diagram, not just what the diagram depicts.",
    specs: [["Max resolution", "8000 × 8000"], ["Images per request", "100"], ["Formats", "PNG, JPEG, WebP, GIF, HEIC"], ["Token cost", "~1,600 per megapixel"]]
  },
  {
    icon: "wand", title: "Image generation", model: "Iris",
    body: "Generation and targeted editing with instruction-level control. Masked edits change only what you asked for, and the model can read its own output back to check it did.",
    specs: [["Sizes", "Up to 1536 × 1536"], ["Editing", "Masked and instruction-based"], ["Output", "Production-ready images"], ["Typical latency", "2.4 s"]]
  },
  {
    icon: "wave", title: "Audio", model: "Lyra",
    body: "Transcription with word-level timestamps, speech synthesis in eight voices, and a duplex realtime mode that handles interruption the way a person does.",
    specs: [["Transcription", "99 languages"], ["Realtime latency", "290 ms"], ["Max audio", "500 MB"], ["Voices", "8, plus custom on request"]]
  }
];

const USE_CASES = [
  { icon: "briefcase", t: "Contract and filing review", d: "A 400-page agreement, read whole, with every clause traceable to a page and coordinate." },
  { icon: "chart", t: "Chart and table extraction", d: "Structured records out of screenshots, scans, and figures — including ones with no underlying data file." },
  { icon: "code", t: "Screenshot debugging", d: "Paste a broken UI and get back the CSS that is causing it, read from the pixels." },
  { icon: "microscope", t: "Scientific figures", d: "Reads axis labels, error bars, and captions, and refuses to guess when the resolution will not support it." },
  { icon: "translate", t: "Live translation", d: "Duplex speech in and out, with the tool surface available mid-conversation." },
  { icon: "package", t: "Field and inspection work", d: "Photographs of equipment matched against manuals held in the same context window." }
];

export default {
  title: "Multimodality",
  description: "Documents, images, charts, audio, and image generation — through one API and one message array.",

  render() {
    return `
      ${pageHead({
        crumb: [{ label: "Technology", href: "/technology" }, { label: "Multimodality" }],
        eyebrow: "Vision, documents & audio",
        title: "Everything goes in the same message array.",
        lead: "A PDF, a photograph, an audio file, and a question — one request, one model, one billing line. No separate OCR service, no transcription step you have to orchestrate.",
        actions: `${button({ label: "Iris model card", href: "/technology/models/mere-iris", icon: "arrow-right" }).value}
                  ${button({ label: "Lyra model card", href: "/technology/models/mere-lyra", variant: "secondary", icon: "wave" }).value}`
      }).value}

      <section class="section">
        <div class="shell shell-wide">
          <div class="grid g-2" data-stagger="90">
            ${MODALITIES.map((mod) => `
              <article class="card card-pad-lg card-hover card-spot" data-reveal>
                <div class="between" style="align-items:flex-start">
                  <div class="card-icon" style="width:48px;height:48px">${icon(mod.icon).value}</div>
                  <span class="badge badge-plain">${mod.model}</span>
                </div>
                <h3 style="font-size:var(--t-h3)">${mod.title}</h3>
                <p class="ink-3" style="line-height:1.65">${mod.body}</p>
                <dl class="model-spec">
                  ${mod.specs.map(([k, v]) => `<div class="model-spec-row"><dt>${k}</dt><dd>${v}</dd></div>`).join("")}
                </dl>
              </article>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Code ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          <div class="split split-40" style="gap:clamp(24px,3vw,48px);align-items:center">
            <div data-reveal="left">
              ${sectionHead({ eyebrow: "In code", title: "Content blocks, not endpoints." }).value}
              <p class="lead measure">
                A message's <code class="inline">content</code> is an array. Mix <code class="inline">text</code>,
                <code class="inline">image</code>, and <code class="inline">document</code> blocks freely — the model
                reads them in the order you send them.
              </p>
              <div style="margin-top:24px">
                ${calloutBox("Large documents belong in the Files API. Upload once, reference by ID across many requests, and let prompt caching make the re-reads cheap.", { icon: "info" }).value}
              </div>
              <div class="row" style="margin-top:22px">${textLink("Vision documentation", "/docs/vision").value}</div>
            </div>
            <div data-reveal="right">${codeBlock({ Python: SAMPLES.vision.Python }).value}</div>
          </div>
        </div>
      </section>

      <!-- ---- Use cases ---- -->
      <section class="section">
        <div class="shell shell-wide">
          ${sectionHead({ eyebrow: "In practice", title: "What people actually do with it." }).value}
          <div class="grid g-3" data-stagger="70">
            ${USE_CASES.map((item) => `
              <div class="card card-hover card-spot" data-reveal>
                <div class="card-icon">${icon(item.icon).value}</div>
                <h3 style="font-size:var(--t-h4);font-weight:400">${item.t}</h3>
                <p class="small muted" style="line-height:1.6">${item.d}</p>
              </div>`).join("")}
          </div>
        </div>
      </section>

      <!-- ---- Limits ---- -->
      <section class="section section-line">
        <div class="shell shell-wide">
          ${sectionHead({
            eyebrow: "Honest limits",
            title: "Where it still falls down.",
            lead: "Published because knowing the failure mode is more useful than not knowing it."
          }).value}
          ${dataTable({
            columns: [
              { key: "case", label: "Case" },
              { key: "behaviour", label: "What happens" },
              { key: "workaround", label: "What to do" }
            ],
            rows: [
              { case: "Dense handwriting, cursive", behaviour: "Word error rate rises sharply below about 150 DPI.", workaround: "Increase resolution, or ask for a confidence field and route low-confidence pages to review." },
              { case: "Very small chart labels", behaviour: "Values under roughly 8 px tall are guessed rather than read.", workaround: "Crop and send the region at higher resolution as a second image." },
              { case: "Video", behaviour: "Not supported natively.", workaround: "Sample frames and send them as an image sequence with timestamps in the text blocks." },
              { case: "Overlapping speech", behaviour: "Diarisation degrades when more than three speakers overlap.", workaround: "Send per-channel audio where you have it; the API accepts multi-track uploads." },
              { case: "Generated text inside images", behaviour: "Long strings of generated text are still occasionally malformed.", workaround: "Compose text over generated imagery in your own renderer rather than in the model." }
            ]
          }).value}
        </div>
      </section>

      ${ctaBand({
        title: "Send it a document and see.",
        body: "The playground accepts file uploads and shows the exact content blocks it builds.",
        primary: { label: "Open the playground", href: "/console/playground", icon: "arrow-ne" },
        secondary: { label: "Vision docs", href: "/docs/vision" }
      }).value}
    `;
  }
};
