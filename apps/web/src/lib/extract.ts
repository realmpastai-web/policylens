export interface ExtractedText {
  text: string;
  note?: string;
}

export async function extractFile(file: File): Promise<ExtractedText> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdf(file);
  }
  if (name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return extractDocx(file);
  }
  if (name.endsWith(".doc")) {
    throw new Error("Legacy .doc files are not supported. Save as .docx or paste the text.");
  }
  if (
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".markdown") ||
    file.type.startsWith("text/")
  ) {
    return { text: await file.text() };
  }
  throw new Error("Use a PDF, DOCX, TXT, or Markdown file, or paste the text.");
}

async function extractPdf(file: File): Promise<ExtractedText> {
  const [{ getDocument, GlobalWorkerOptions }, workerUrl] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  GlobalWorkerOptions.workerSrc = workerUrl.default;
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const parts: string[] = [];
    for (const item of content.items) {
      if (!("str" in item)) continue;
      parts.push(item.str);
      if ("hasEOL" in item && item.hasEOL) parts.push("\n");
      else parts.push(" ");
    }
    pages.push(parts.join("").replace(/[ \t]+\n/g, "\n").trim());
  }
  const text = pages.filter(Boolean).join("\n\n");
  return {
    text,
    note:
      text.trim().length < 40
        ? "This PDF had very little selectable text. A scan needs to be pasted as text."
        : undefined,
  };
}

async function extractDocx(file: File): Promise<ExtractedText> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return { text: result.value };
}
