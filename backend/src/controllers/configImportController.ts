import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import multer from 'multer';
import pool from '../config/database';
import { ExcelExporter } from '../utils/excelExporter';

// Configurar multer para archivos temporales
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no válido. Solo se permiten archivos Excel (.xlsx, .xls) o CSV (.csv)'));
    }
  }
});

export const uploadMiddleware = upload.single('file');

interface ImportResult {
  message: string;
  imported_count: number;
  error_count: number;
  imported_items: Array<{ cod: string; name: string }>;
  errors: string[];
}

// PLANTILLAS DE DESCARGA

export const downloadCountriesTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const templateData = [
      {
        'Código': 'GT',
        'Nombre': 'Guatemala'
      }
    ];

    const sheets = [{ name: 'Países', data: templateData }];
    await ExcelExporter.exportMultiSheetExcel(res, sheets, 'plantilla_paises');
  } catch (error) {
    console.error('Error downloading template:', error);
    res.status(500).json({ message: 'Error al generar la plantilla' });
  }
};

export const downloadCategoriesTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const templateData = [
      {
        'Código': 'MIN',
        'Nombre': 'Minerales'
      }
    ];

    const sheets = [{ name: 'Categorías', data: templateData }];
    await ExcelExporter.exportMultiSheetExcel(res, sheets, 'plantilla_categorias');
  } catch (error) {
    console.error('Error downloading template:', error);
    res.status(500).json({ message: 'Error al generar la plantilla' });
  }
};

export const downloadSuppliersTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const templateData = [
      {
        'Código': 'PROV001',
        'Nombre': 'Proveedor Ejemplo S.A.'
      }
    ];

    const sheets = [{ name: 'Proveedores', data: templateData }];
    await ExcelExporter.exportMultiSheetExcel(res, sheets, 'plantilla_proveedores');
  } catch (error) {
    console.error('Error downloading template:', error);
    res.status(500).json({ message: 'Error al generar la plantilla' });
  }
};

export const downloadWarehousesTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const templateData = [
      {
        'Código': 'BOD001',
        'Nombre': 'Bodega Principal'
      }
    ];

    const sheets = [{ name: 'Bodegas', data: templateData }];
    await ExcelExporter.exportMultiSheetExcel(res, sheets, 'plantilla_bodegas');
  } catch (error) {
    console.error('Error downloading template:', error);
    res.status(500).json({ message: 'Error al generar la plantilla' });
  }
};

export const downloadLocationsTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    // Obtener bodegas para referencia
    const warehousesResult = await pool.query('SELECT cod, name FROM warehouses ORDER BY name');

    const templateData = [
      {
        'Código': 'UBI-GT-001',
        'Nombre': 'Estante A1',
        'Código Bodega': warehousesResult.rows.length > 0 ? warehousesResult.rows[0].cod : 'BOD001'
      }
    ];

    const sheets = [
      { name: 'Ubicaciones', data: templateData },
      {
        name: 'Bodegas',
        data: warehousesResult.rows.map(row => ({ Código: row.cod, Nombre: row.name }))
      }
    ];

    await ExcelExporter.exportMultiSheetExcel(res, sheets, 'plantilla_ubicaciones');
  } catch (error) {
    console.error('Error downloading template:', error);
    res.status(500).json({ message: 'Error al generar la plantilla' });
  }
};

export const downloadResponsiblesTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const templateData = [
      {
        'Código': 'RESP001',
        'Nombre': 'Juan Pérez'
      }
    ];

    const sheets = [{ name: 'Responsables', data: templateData }];
    await ExcelExporter.exportMultiSheetExcel(res, sheets, 'plantilla_responsables');
  } catch (error) {
    console.error('Error downloading template:', error);
    res.status(500).json({ message: 'Error al generar la plantilla' });
  }
};

// FUNCIONES DE IMPORTACIÓN

export const importCountries = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No se ha subido ningún archivo' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (jsonData.length === 0) {
      res.status(400).json({ message: 'El archivo está vacío' });
      return;
    }

    const result: ImportResult = {
      message: 'Importación completada',
      imported_count: 0,
      error_count: 0,
      imported_items: [],
      errors: []
    };

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNumber = i + 2;

        try {
          if (!row['Código'] || !row['Nombre']) {
            throw new Error('Código y Nombre son requeridos');
          }

          // Verificar si ya existe
          const existingResult = await client.query(
            'SELECT id FROM countries WHERE cod = $1',
            [row['Código']]
          );

          if (existingResult.rows.length > 0) {
            throw new Error(`El código '${row['Código']}' ya existe`);
          }

          await client.query(
            'INSERT INTO countries (cod, name) VALUES ($1, $2)',
            [row['Código'], row['Nombre']]
          );

          result.imported_items.push({ cod: row['Código'], name: row['Nombre'] });
          result.imported_count++;
        } catch (error) {
          result.errors.push(`Fila ${rowNumber}: ${(error as Error).message}`);
          result.error_count++;
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json(result);
  } catch (error) {
    console.error('Error importing countries:', error);
    res.status(500).json({ message: 'Error al importar países' });
  }
};

export const importCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No se ha subido ningún archivo' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (jsonData.length === 0) {
      res.status(400).json({ message: 'El archivo está vacío' });
      return;
    }

    const result: ImportResult = {
      message: 'Importación completada',
      imported_count: 0,
      error_count: 0,
      imported_items: [],
      errors: []
    };

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNumber = i + 2;

        try {
          if (!row['Código'] || !row['Nombre']) {
            throw new Error('Código y Nombre son requeridos');
          }

          const existingResult = await client.query(
            'SELECT id FROM categories WHERE cod = $1',
            [row['Código']]
          );

          if (existingResult.rows.length > 0) {
            throw new Error(`El código '${row['Código']}' ya existe`);
          }

          await client.query(
            'INSERT INTO categories (cod, name) VALUES ($1, $2)',
            [row['Código'], row['Nombre']]
          );

          result.imported_items.push({ cod: row['Código'], name: row['Nombre'] });
          result.imported_count++;
        } catch (error) {
          result.errors.push(`Fila ${rowNumber}: ${(error as Error).message}`);
          result.error_count++;
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json(result);
  } catch (error) {
    console.error('Error importing categories:', error);
    res.status(500).json({ message: 'Error al importar categorías' });
  }
};

export const importSuppliers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No se ha subido ningún archivo' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (jsonData.length === 0) {
      res.status(400).json({ message: 'El archivo está vacío' });
      return;
    }

    const result: ImportResult = {
      message: 'Importación completada',
      imported_count: 0,
      error_count: 0,
      imported_items: [],
      errors: []
    };

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNumber = i + 2;

        try {
          if (!row['Código'] || !row['Nombre']) {
            throw new Error('Código y Nombre son requeridos');
          }

          const existingResult = await client.query(
            'SELECT id FROM suppliers WHERE cod = $1',
            [row['Código']]
          );

          if (existingResult.rows.length > 0) {
            throw new Error(`El código '${row['Código']}' ya existe`);
          }

          await client.query(
            'INSERT INTO suppliers (cod, name) VALUES ($1, $2)',
            [row['Código'], row['Nombre']]
          );

          result.imported_items.push({ cod: row['Código'], name: row['Nombre'] });
          result.imported_count++;
        } catch (error) {
          result.errors.push(`Fila ${rowNumber}: ${(error as Error).message}`);
          result.error_count++;
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json(result);
  } catch (error) {
    console.error('Error importing suppliers:', error);
    res.status(500).json({ message: 'Error al importar proveedores' });
  }
};

export const importWarehouses = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No se ha subido ningún archivo' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (jsonData.length === 0) {
      res.status(400).json({ message: 'El archivo está vacío' });
      return;
    }

    const result: ImportResult = {
      message: 'Importación completada',
      imported_count: 0,
      error_count: 0,
      imported_items: [],
      errors: []
    };

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNumber = i + 2;

        try {
          if (!row['Código'] || !row['Nombre']) {
            throw new Error('Código y Nombre son requeridos');
          }

          const existingResult = await client.query(
            'SELECT id FROM warehouses WHERE cod = $1',
            [row['Código']]
          );

          if (existingResult.rows.length > 0) {
            throw new Error(`El código '${row['Código']}' ya existe`);
          }

          await client.query(
            'INSERT INTO warehouses (cod, name) VALUES ($1, $2)',
            [row['Código'], row['Nombre']]
          );

          result.imported_items.push({ cod: row['Código'], name: row['Nombre'] });
          result.imported_count++;
        } catch (error) {
          result.errors.push(`Fila ${rowNumber}: ${(error as Error).message}`);
          result.error_count++;
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json(result);
  } catch (error) {
    console.error('Error importing warehouses:', error);
    res.status(500).json({ message: 'Error al importar bodegas' });
  }
};

export const importLocations = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No se ha subido ningún archivo' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (jsonData.length === 0) {
      res.status(400).json({ message: 'El archivo está vacío' });
      return;
    }

    const result: ImportResult = {
      message: 'Importación completada',
      imported_count: 0,
      error_count: 0,
      imported_items: [],
      errors: []
    };

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNumber = i + 2;

        try {
          if (!row['Código'] || !row['Nombre'] || !row['Código Bodega']) {
            throw new Error('Código, Nombre y Código Bodega son requeridos');
          }

          // Verificar que la bodega existe
          const warehouseResult = await client.query(
            'SELECT id FROM warehouses WHERE cod = $1',
            [row['Código Bodega']]
          );

          if (warehouseResult.rows.length === 0) {
            throw new Error(`La bodega '${row['Código Bodega']}' no existe`);
          }

          const warehouseId = warehouseResult.rows[0].id;

          // Verificar si ya existe
          const existingResult = await client.query(
            'SELECT id FROM locations WHERE cod = $1',
            [row['Código']]
          );

          if (existingResult.rows.length > 0) {
            throw new Error(`El código '${row['Código']}' ya existe`);
          }

          await client.query(
            'INSERT INTO locations (cod, name, warehouse_id) VALUES ($1, $2, $3)',
            [row['Código'], row['Nombre'], warehouseId]
          );

          result.imported_items.push({ cod: row['Código'], name: row['Nombre'] });
          result.imported_count++;
        } catch (error) {
          result.errors.push(`Fila ${rowNumber}: ${(error as Error).message}`);
          result.error_count++;
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json(result);
  } catch (error) {
    console.error('Error importing locations:', error);
    res.status(500).json({ message: 'Error al importar ubicaciones' });
  }
};

export const importResponsibles = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No se ha subido ningún archivo' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (jsonData.length === 0) {
      res.status(400).json({ message: 'El archivo está vacío' });
      return;
    }

    const result: ImportResult = {
      message: 'Importación completada',
      imported_count: 0,
      error_count: 0,
      imported_items: [],
      errors: []
    };

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNumber = i + 2;

        try {
          if (!row['Código'] || !row['Nombre']) {
            throw new Error('Código y Nombre son requeridos');
          }

          const existingResult = await client.query(
            'SELECT id FROM responsibles WHERE cod = $1',
            [row['Código']]
          );

          if (existingResult.rows.length > 0) {
            throw new Error(`El código '${row['Código']}' ya existe`);
          }

          await client.query(
            'INSERT INTO responsibles (cod, name) VALUES ($1, $2)',
            [row['Código'], row['Nombre']]
          );

          result.imported_items.push({ cod: row['Código'], name: row['Nombre'] });
          result.imported_count++;
        } catch (error) {
          result.errors.push(`Fila ${rowNumber}: ${(error as Error).message}`);
          result.error_count++;
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json(result);
  } catch (error) {
    console.error('Error importing responsibles:', error);
    res.status(500).json({ message: 'Error al importar responsables' });
  }
};
