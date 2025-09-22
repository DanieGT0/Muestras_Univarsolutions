import { Response } from 'express';
import * as XLSX from 'xlsx';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelData {
  [key: string]: any;
}

// Excel exporter using the official xlsx library
export class ExcelExporter {
  public static async exportToExcel(
    res: Response,
    data: ExcelData[],
    columns: ExcelColumn[],
    filename: string
  ): Promise<void> {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Prepare data for the worksheet
      const worksheetData: any[][] = [];

      // Add headers
      const headers = columns.map(col => col.header);
      worksheetData.push(headers);

      // Add data rows
      data.forEach(row => {
        const rowData = columns.map(col => {
          const value = row[col.key];

          // Handle different data types
          if (value === null || value === undefined) {
            return '';
          }

          // If it's a date string, try to convert it to a proper date
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              return date;
            }
          }

          return value;
        });
        worksheetData.push(rowData);
      });

      // Create worksheet from array of arrays
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Set column widths if specified
      const colWidths = columns.map(col => ({
        wch: col.width || 15 // Default width of 15 characters
      }));
      worksheet['!cols'] = colWidths;

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

      // Generate the Excel file buffer
      const excelBuffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
        compression: true
      });

      // Set proper headers for Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.setHeader('Content-Length', excelBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');

      // Send the file
      res.end(excelBuffer);

    } catch (error) {
      console.error('Error creating Excel file:', error);
      res.status(500).json({ error: 'Error generating Excel file' });
    }
  }

  // Alternative method for creating Excel from JSON objects directly
  public static async exportJsonToExcel(
    res: Response,
    data: ExcelData[],
    filename: string,
    sheetName: string = 'Sheet1'
  ): Promise<void> {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Create worksheet from JSON
      const worksheet = XLSX.utils.json_to_sheet(data);

      // Auto-size columns
      const cols = Object.keys(data[0] || {}).map(() => ({ wch: 20 }));
      worksheet['!cols'] = cols;

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Generate the Excel file buffer
      const excelBuffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
        compression: true
      });

      // Set proper headers for Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.setHeader('Content-Length', excelBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');

      // Send the file
      res.end(excelBuffer);

    } catch (error) {
      console.error('Error creating Excel file:', error);
      res.status(500).json({ error: 'Error generating Excel file' });
    }
  }

  // Method for creating multi-sheet Excel files
  public static async exportMultiSheetExcel(
    res: Response,
    sheets: { name: string; data: ExcelData[]; columns?: ExcelColumn[] }[],
    filename: string
  ): Promise<void> {
    try {
      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      sheets.forEach(sheet => {
        let worksheet: XLSX.WorkSheet;

        if (sheet.columns) {
          // Use columns configuration
          const worksheetData: any[][] = [];

          // Add headers
          const headers = sheet.columns.map(col => col.header);
          worksheetData.push(headers);

          // Add data rows
          sheet.data.forEach(row => {
            const rowData = sheet.columns!.map(col => {
              const value = row[col.key];
              return value === null || value === undefined ? '' : value;
            });
            worksheetData.push(rowData);
          });

          worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

          // Set column widths
          const colWidths = sheet.columns.map(col => ({
            wch: col.width || 15
          }));
          worksheet['!cols'] = colWidths;
        } else {
          // Create directly from JSON
          worksheet = XLSX.utils.json_to_sheet(sheet.data);

          // Auto-size columns
          const cols = Object.keys(sheet.data[0] || {}).map(() => ({ wch: 20 }));
          worksheet['!cols'] = cols;
        }

        // Add the worksheet to the workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
      });

      // Generate the Excel file buffer
      const excelBuffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx',
        compression: true
      });

      // Set proper headers for Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      res.setHeader('Content-Length', excelBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');

      // Send the file
      res.end(excelBuffer);

    } catch (error) {
      console.error('Error creating Excel file:', error);
      res.status(500).json({ error: 'Error generating Excel file' });
    }
  }
}