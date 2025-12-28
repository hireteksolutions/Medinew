import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

// PDF export utility functions

interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  title: string;
  filename?: string;
}

export const exportToPDF = ({ headers, rows, title, filename }: ExportData) => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated on: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, 14, 30);
  
  // Add table using autoTable extension
  (doc as any).autoTable({
    head: [headers],
    body: rows,
    startY: 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 102, 204] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  
  // Save the PDF
  doc.save(filename || `${title.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const exportToExcel = (data: ExportData) => {
  // This will be implemented using xlsx library
  // For now, export as CSV
  const csv = [
    data.headers.join(','),
    ...data.rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.filename || data.title.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};

