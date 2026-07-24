export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "application/pdf") {
    const { default: pdfToText } = await import("react-pdftotext");
    return pdfToText(file);
  }

  const mammoth = await import("mammoth");
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}
