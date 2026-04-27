import path from "node:path";
// @ts-ignore — pdfkit CJS export doesn't play nice with Bun ESM
const PDFDocument = require("pdfkit");
import type { TailoredResume } from "./aiAnalyzer";

const PAGE_MARGIN = 40;
const PAGE_WIDTH = 595.28; // A4 width in points

const FONT_DIR = path.join(import.meta.dir, "../assets/fonts");

const FONT = {
  regular: path.join(FONT_DIR, "NotoSans-Regular.ttf"),
  bold: path.join(FONT_DIR, "NotoSans-Bold.ttf"),
  italic: path.join(FONT_DIR, "NotoSans-Italic.ttf"),
  boldItalic: path.join(FONT_DIR, "NotoSans-BoldItalic.ttf"),
};

/**
 * Remove invisible control characters that can break text layout
 * (soft hyphens, zero-width spaces, bidirectional marks, BOM).
 * With Noto Sans embedded, everything else renders correctly.
 */
function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/[\u00AD\u200B-\u200F\u2060\uFEFF]/g, "")
    .trim();
}

function registerFonts(doc: any) {
  doc.registerFont("NotoSans", FONT.regular);
  doc.registerFont("NotoSans-Bold", FONT.bold);
  doc.registerFont("NotoSans-Italic", FONT.italic);
  doc.registerFont("NotoSans-BoldItalic", FONT.boldItalic);
}

function sectionHeader(doc: any, title: string) {
  doc.moveDown(0.8);
  doc.x = PAGE_MARGIN;
  doc.font("NotoSans-Bold").fontSize(12).fillColor("#1a1a1a").text(sanitizeText(title), { underline: true });
  doc.moveDown(0.3);
}

function renderHeader(doc: any, resume: TailoredResume) {
  doc.font("NotoSans-Bold").fontSize(22).fillColor("#1a1a1a").text(sanitizeText(resume.fullName) || "Resume");

  const contactParts = [resume.email, resume.phone, resume.location, resume.linkedin]
    .map(sanitizeText)
    .filter(Boolean);
  if (contactParts.length > 0) {
    doc.moveDown(0.2);
    doc.font("NotoSans").fontSize(9).fillColor("#555555").text(contactParts.join("  |  "));
  }

  doc.moveDown(0.5);
  const ruleY = doc.y;
  doc.moveTo(PAGE_MARGIN, ruleY)
    .lineTo(PAGE_WIDTH - PAGE_MARGIN, ruleY)
    .lineWidth(0.5)
    .strokeColor("#cccccc")
    .stroke();
}

function renderExperience(doc: any, experience: TailoredResume["experience"]) {
  sectionHeader(doc, "Experience");
  for (const exp of experience) {
    doc.x = PAGE_MARGIN;
    doc.font("NotoSans-Bold").fontSize(11).fillColor("#1a1a1a").text(sanitizeText(exp.title));
    doc.moveDown(0.1);
    doc.x = PAGE_MARGIN;
    doc.font("NotoSans-Italic").fontSize(10).fillColor("#444444").text(sanitizeText(exp.company));
    if (exp.duration) {
      doc.moveDown(0.1);
      doc.x = PAGE_MARGIN;
      doc.font("NotoSans").fontSize(9).fillColor("#777777").text(sanitizeText(exp.duration));
    }
    for (const bullet of exp.bullets) {
      doc.moveDown(0.1);
      doc.x = PAGE_MARGIN;
      const bulletText = sanitizeText(bullet);
      const x = PAGE_MARGIN;
      const y = doc.y;
      const indent = 12;
      const maxWidth = PAGE_WIDTH - PAGE_MARGIN - x - indent;

      doc.text("-", x, y);
      doc.text(bulletText, x + indent, y, { width: maxWidth, lineGap: 1 });
    }
    doc.moveDown(0.4);
  }
}

function renderEducation(doc: any, education: TailoredResume["education"]) {
  sectionHeader(doc, "Education");
  for (const edu of education) {
    const parts = [edu.degree, edu.institution, edu.year].map(sanitizeText).filter(Boolean);
    doc.moveDown(0.1);
    doc.x = PAGE_MARGIN;
    doc.font("NotoSans").fontSize(9).fillColor("#333333").text(parts.join(" — "));
  }
}

export async function renderResumePdf(resume: TailoredResume): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, autoFirstPage: true });
  const chunks: Buffer[] = [];

  registerFonts(doc);

  return new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    renderHeader(doc, resume);

    if (resume.summary) {
      sectionHeader(doc, "Professional Summary");
      doc.font("NotoSans").fontSize(9).fillColor("#333333").text(sanitizeText(resume.summary), { lineGap: 2 });
    }

    if (resume.experience.length > 0) renderExperience(doc, resume.experience);

    if (resume.skills.length > 0) {
      sectionHeader(doc, "Skills");
      doc.x = PAGE_MARGIN;
      doc.font("NotoSans").fontSize(9).fillColor("#333333").text(resume.skills.map(sanitizeText).join("  |  "));
    }

    if (resume.education.length > 0) renderEducation(doc, resume.education);

    doc.end();
  });
}
