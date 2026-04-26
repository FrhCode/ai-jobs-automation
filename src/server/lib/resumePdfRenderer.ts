// @ts-ignore — pdfmake CJS export doesn't play nice with Bun ESM
const _PdfPrinterMod = require("pdfmake/js/Printer.js");
const PdfPrinter = _PdfPrinterMod.default ?? _PdfPrinterMod;
import type { TDocumentDefinitions, Content, StyleDictionary } from "pdfmake/interfaces";
import type { TailoredResume } from "./aiAnalyzer";

// pdfmake requires font definitions — use standard PDF fonts (Helvetica)
const fonts = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

const printer = new PdfPrinter(fonts);

const styles: StyleDictionary = {
  name: {
    fontSize: 22,
    bold: true,
    color: "#1a1a1a",
    margin: [0, 0, 0, 4],
  },
  contact: {
    fontSize: 9,
    color: "#555555",
    margin: [0, 0, 0, 12],
  },
  sectionHeader: {
    fontSize: 12,
    bold: true,
    color: "#1a1a1a",
    margin: [0, 12, 0, 4],
    decoration: "underline",
    decorationColor: "#1a1a1a",
  },
  jobTitle: {
    fontSize: 11,
    bold: true,
    color: "#1a1a1a",
    margin: [0, 6, 0, 0],
  },
  jobCompany: {
    fontSize: 10,
    italics: true,
    color: "#444444",
    margin: [0, 0, 0, 2],
  },
  jobDuration: {
    fontSize: 9,
    color: "#777777",
    margin: [0, 0, 0, 2],
  },
  bullet: {
    fontSize: 9,
    color: "#333333",
    margin: [0, 1, 0, 1],
  },
  body: {
    fontSize: 9,
    color: "#333333",
    lineHeight: 1.3,
  },
  skill: {
    fontSize: 9,
    color: "#333333",
  },
  education: {
    fontSize: 9,
    color: "#333333",
    margin: [0, 1, 0, 1],
  },
};

export function renderResumePdf(resume: TailoredResume): Promise<Buffer> {
  const contactParts: string[] = [];
  if (resume.email) contactParts.push(resume.email);
  if (resume.phone) contactParts.push(resume.phone);
  if (resume.location) contactParts.push(resume.location);
  if (resume.linkedin) contactParts.push(resume.linkedin);

  const content: Content[] = [];

  // Header
  content.push({ text: resume.fullName || "Resume", style: "name" });
  if (contactParts.length > 0) {
    content.push({ text: contactParts.join("  |  "), style: "contact" });
  }

  // Horizontal line
  content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#cccccc" }] });

  // Summary
  if (resume.summary) {
    content.push({ text: "Professional Summary", style: "sectionHeader" });
    content.push({ text: resume.summary, style: "body" });
  }

  // Experience
  if (resume.experience.length > 0) {
    content.push({ text: "Experience", style: "sectionHeader" });
    for (const exp of resume.experience) {
      content.push({ text: exp.title, style: "jobTitle" });
      content.push({ text: exp.company, style: "jobCompany" });
      if (exp.duration) {
        content.push({ text: exp.duration, style: "jobDuration" });
      }
      for (const bullet of exp.bullets) {
        content.push({
          ul: [{ text: bullet, style: "bullet" }],
          margin: [12, 0, 0, 0],
        });
      }
    }
  }

  // Skills
  if (resume.skills.length > 0) {
    content.push({ text: "Skills", style: "sectionHeader" });
    content.push({ text: resume.skills.join("  •  "), style: "skill" });
  }

  // Education
  if (resume.education.length > 0) {
    content.push({ text: "Education", style: "sectionHeader" });
    for (const edu of resume.education) {
      const parts = [edu.degree, edu.institution, edu.year].filter(Boolean);
      content.push({ text: parts.join(" — "), style: "education" });
    }
  }

  const docDefinition: TDocumentDefinitions = {
    content,
    styles,
    defaultStyle: {
      font: "Helvetica",
    },
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  const chunks: Buffer[] = [];

  return new Promise<Buffer>((resolve, reject) => {
    pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}
