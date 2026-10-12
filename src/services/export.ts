import jsPDF from 'jspdf';
import type { Note, CanvasPage } from '../types';
import { renderPageToCanvas } from '../utils/canvasRenderer';

// Download a blob or dataUrl as a file
function downloadFile(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Clean filename helper
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'note';
}

export const exportService = {
  // Export active canvas page as PNG
  exportPageAsPNG(page: CanvasPage, noteTitle: string, pageNumber: number) {
    const canvas = renderPageToCanvas(page.background, page.strokes, 1200, 1600);
    const dataUrl = canvas.toDataURL('image/png');
    const safeTitle = sanitizeFilename(noteTitle);
    downloadFile(dataUrl, `${safeTitle}_page_${pageNumber}.png`);
  },

  // Export entire note (text notes + all drawing pages) to PDF
  async exportNoteAsPDF(note: Note) {
    // A4 dimensions in mm: 210 x 297
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    let isFirstPage = true;

    // 1. If note has typed content, create a clean typed notes page first
    if (note.content && note.content.trim().length > 0) {
      isFirstPage = false;

      // Header Banner
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, 0, pageWidth, 40, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(15, 23, 42); // slate-900
      pdf.text(note.title || 'Untitled Note', 20, 24);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139); // slate-500
      const dateStr = new Date(note.updatedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      pdf.text(`Created on NoteCraft • Last updated: ${dateStr}`, 20, 32);

      // Horizontal separator line
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(20, 40, pageWidth - 20, 40);

      // Body text with word wrap
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(51, 65, 85);

      const splitText = pdf.splitTextToSize(note.content, pageWidth - 40);
      let currentY = 52;
      const lineHeight = 6.5;

      for (const line of splitText) {
        if (currentY > pageHeight - 20) {
          pdf.addPage();
          currentY = 25;
        }
        pdf.text(line, 20, currentY);
        currentY += lineHeight;
      }
    }

    // 2. Add each drawing page
    for (let i = 0; i < note.pages.length; i++) {
      const page = note.pages[i];

      // If page is empty and there's already text, skip unless it's the only page
      if (page.strokes.length === 0 && !isFirstPage && note.pages.length > 1) {
        continue;
      }

      if (!isFirstPage) {
        pdf.addPage();
      }
      isFirstPage = false;

      // Render page canvas to high-res image
      const canvas = renderPageToCanvas(page.background, page.strokes, 1200, 1600);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Draw image filling A4 page cleanly
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

      // Subtle footer
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        `${note.title} — Drawing Page ${i + 1} of ${note.pages.length}`,
        20,
        pageHeight - 6
      );
    }

    // Save PDF
    const safeTitle = sanitizeFilename(note.title);
    pdf.save(`${safeTitle}.pdf`);
  },

  // Export raw text note as Markdown / Text file
  exportNoteAsMarkdown(note: Note) {
    const header = `# ${note.title}\n\n*Last Updated: ${new Date(note.updatedAt).toLocaleString()}*\n\n---\n\n`;
    const fullContent = header + note.content;
    const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const safeTitle = sanitizeFilename(note.title);
    downloadFile(url, `${safeTitle}.md`);
    URL.revokeObjectURL(url);
  },
};
