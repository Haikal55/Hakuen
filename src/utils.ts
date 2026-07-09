import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const extractFileContent = async (file: File): Promise<{ text: string, base64?: string }> => {
  const fileType = file.type;
  
  if (fileType === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer as any).promise;
    let text = '';
    // Limit to first 10 pages for speed/token limits
    const numPages = Math.min(pdf.numPages, 10);
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return { text: `[PDF Content of ${file.name}]:\n${text}` };
  } 
  
  if (fileType.startsWith('image/')) {
    let base64 = '';
    try {
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject('Failed to read');
        reader.readAsDataURL(file);
      });
    } catch(e) {}

    let textResult = `[Image attached: ${file.name}]`;
    try {
      const result = await Tesseract.recognize(file, 'eng+ind');
      if (result.data.text.trim()) {
         textResult = `[Text extracted from image ${file.name}]:\n${result.data.text}`;
      }
    } catch (e) {}

    return { text: textResult, base64 };
  }

  // Fallback for text and other types
  const text = await file.text();
  return { text: `[Content of ${file.name}]:\n${text}` };
};
