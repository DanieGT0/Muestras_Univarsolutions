import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import multer from 'multer';
import pool from '../config/database';
import { UserRole } from '../types';
import { ExcelExporter } from '../utils/excelExporter';

interface ImportedSample {
  material: string;
  lote: string;
  cantidad: number;
  peso_unitario: number;
  unidad_medida: string;
  peso_total: number;
  fecha_vencimiento?: string;
  comentarios?: string;
  cod_pais: string;
  cod_categoria: string;
  cod_proveedor: string;
  cod_bodega: string;
  cod_ubicacion: string;
  cod_responsable: string;
}

interface ImportResult {
  message: string;
  imported_count: number;
  error_count: number;
  imported_samples: Array<{
    id: number;
    cod: string;
    material: string;
    lote: string;
  }>;
  errors: string[];
}

interface ValidationResult {
  message: string;
  valid_count: number;
  error_count: number;
  valid_rows: Array<ImportedSample & { row_number: number; generated_cod: string }>;
  errors: Array<{ row: number; message: string }>;
}

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

// Función para transformar fecha de dd/mm/yyyy o número serial de Excel a formato ISO
const transformDateFormat = (dateInput: string | number): Date | null => {
  // Si es null, undefined o string vacío, retornar null
  if (dateInput === null || dateInput === undefined) {
    return null;
  }

  // Convertir a string para validación inicial
  const dateString = dateInput.toString().trim();

  if (dateString === '') {
    return null;
  }

  // CASO 1: Número serial de Excel (números entre 1 y 60000 aproximadamente)
  // Excel almacena fechas como números seriales desde 1900-01-01
  if (typeof dateInput === 'number' || /^\d+(\.\d+)?$/.test(dateString)) {
    const serialNumber = typeof dateInput === 'number' ? dateInput : parseFloat(dateString);

    // Validar rango razonable para fechas Excel (entre 1900 y 2100)
    // 1 = 01/01/1900, 73050 = 31/12/2099
    if (serialNumber >= 1 && serialNumber <= 73050) {
      // Excel epoch: 1900-01-01 es día 1 (pero Excel tiene bug con 1900 como año bisiesto)
      // Por eso usamos 1899-12-30 como base
      const excelEpoch = new Date(1899, 11, 30); // 30 de diciembre de 1899
      const days = serialNumber;
      const msPerDay = 24 * 60 * 60 * 1000;
      const date = new Date(excelEpoch.getTime() + days * msPerDay);

      // Validar que la fecha creada sea válida
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  // CASO 2: Fecha en formato ISO (yyyy-mm-dd)
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (isoDateRegex.test(dateString)) {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // CASO 3: Fecha en formato dd/mm/yyyy
  const ddmmyyyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = dateString.match(ddmmyyyyRegex);

  if (match) {
    const [, day, month, year] = match;
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    // Validar que los valores sean válidos
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900) {
      throw new Error(`Fecha inválida: ${dateString}. Use formato dd/mm/yyyy`);
    }

    // Crear fecha en formato ISO (nota: month es 0-indexado en JavaScript)
    const date = new Date(yearNum, monthNum - 1, dayNum);

    // Verificar que la fecha creada sea válida
    if (date.getFullYear() !== yearNum || date.getMonth() !== monthNum - 1 || date.getDate() !== dayNum) {
      throw new Error(`Fecha inválida: ${dateString}. Verifique que el día y mes sean correctos`);
    }

    return date;
  }

  // Si no coincide con ningún formato
  throw new Error(`Formato de fecha inválido: ${dateString}. Use formato dd/mm/yyyy (ejemplo: 31/12/2025) o asegúrese de que las celdas en Excel estén formateadas como fecha`);
};

// Función auxiliar para validar una fila
const validateRow = async (row: any, rowNumber: number, client: any, userRole: UserRole, userId: number) => {
  // Validar campos requeridos
  const requiredFields = [
    'Código País', 'Código Categoría', 'Código Proveedor', 'Código Bodega',
    'Código Ubicación', 'Código Responsable', 'Material', 'Lote',
    'Cantidad', 'Peso Unitario', 'Unidad Medida', 'Peso Total'
  ];

  for (const field of requiredFields) {
    if (!row[field] || row[field].toString().trim() === '') {
      throw new Error(`El campo '${field}' es requerido`);
    }
  }

  // Validar que los códigos de referencia existan
  const [countryResult, categoryResult, supplierResult, warehouseResult, locationResult, responsibleResult] = await Promise.all([
    client.query('SELECT id FROM countries WHERE cod = $1', [row['Código País']]),
    client.query('SELECT id FROM categories WHERE cod = $1', [row['Código Categoría']]),
    client.query('SELECT id FROM suppliers WHERE cod = $1', [row['Código Proveedor']]),
    client.query('SELECT id FROM warehouses WHERE cod = $1', [row['Código Bodega']]),
    client.query('SELECT id FROM locations WHERE cod = $1', [row['Código Ubicación']]),
    client.query('SELECT id FROM responsibles WHERE cod = $1', [row['Código Responsable']])
  ]);

  if (countryResult.rows.length === 0) {
    throw new Error(`El código de país '${row['Código País']}' no existe`);
  }
  if (categoryResult.rows.length === 0) {
    throw new Error(`El código de categoría '${row['Código Categoría']}' no existe`);
  }
  if (supplierResult.rows.length === 0) {
    throw new Error(`El código de proveedor '${row['Código Proveedor']}' no existe`);
  }
  if (warehouseResult.rows.length === 0) {
    throw new Error(`El código de bodega '${row['Código Bodega']}' no existe`);
  }
  if (locationResult.rows.length === 0) {
    throw new Error(`El código de ubicación '${row['Código Ubicación']}' no existe`);
  }
  if (responsibleResult.rows.length === 0) {
    throw new Error(`El código de responsable '${row['Código Responsable']}' no existe`);
  }

  // Verificar permisos de país si es usuario normal
  const countryId = countryResult.rows[0].id;
  if (userRole === UserRole.USER) {
    const permissionResult = await client.query(
      'SELECT 1 FROM user_countries WHERE user_id = $1 AND country_id = $2',
      [userId, countryId]
    );
    if (permissionResult.rows.length === 0) {
      throw new Error(`No tiene permisos para crear muestras en el país '${row['Código País']}'`);
    }
  }

  // Validar tipos de datos
  const cantidad = parseFloat(row['Cantidad']);
  const pesoUnitario = parseFloat(row['Peso Unitario']);
  const pesoTotal = parseFloat(row['Peso Total']);

  if (isNaN(cantidad) || cantidad <= 0) {
    throw new Error('La cantidad debe ser un número mayor a 0');
  }
  if (isNaN(pesoUnitario) || pesoUnitario <= 0) {
    throw new Error('El peso unitario debe ser un número mayor a 0');
  }
  if (isNaN(pesoTotal) || pesoTotal <= 0) {
    throw new Error('El peso total debe ser un número mayor a 0');
  }

  // Validar unidad de medida
  const validUnits = ['kg', 'g', 'mg'];
  if (!validUnits.includes(row['Unidad Medida'])) {
    throw new Error(`La unidad de medida debe ser: ${validUnits.join(', ')}`);
  }

  // Generar código automático de muestra
  const countryCod = row['Código País'];
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear().toString().slice(-2);
  const datePrefix = `${day}${month}${year}`;
  const dailyPrefix = `${countryCod}${datePrefix}`;

  const codeQuery = 'SELECT COUNT(*) as count FROM muestras WHERE cod LIKE $1';
  const codeResult = await client.query(codeQuery, [`${dailyPrefix}%`]);
  const correlative = parseInt(codeResult.rows[0].count) + 1;
  const cod = `${dailyPrefix}${correlative.toString().padStart(3, '0')}`;

  // Validar fecha de vencimiento si existe
  const fechaVencimiento = row['Fecha Vencimiento'] ? transformDateFormat(row['Fecha Vencimiento'].toString()) : null;

  return {
    material: row['Material'],
    lote: row['Lote'],
    cantidad,
    peso_unitario: pesoUnitario,
    unidad_medida: row['Unidad Medida'],
    peso_total: pesoTotal,
    fecha_vencimiento: fechaVencimiento ? fechaVencimiento.toISOString().split('T')[0] : undefined,
    comentarios: row['Comentarios'] || undefined,
    cod_pais: row['Código País'],
    cod_categoria: row['Código Categoría'],
    cod_proveedor: row['Código Proveedor'],
    cod_bodega: row['Código Bodega'],
    cod_ubicacion: row['Código Ubicación'],
    cod_responsable: row['Código Responsable'],
    row_number: rowNumber,
    generated_cod: cod
  };
};

export const validateImport = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No se ha subido ningún archivo' });
      return;
    }

    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;

    // Leer el archivo Excel/CSV
    let workbook: XLSX.WorkBook;

    if (req.file.mimetype === 'text/csv') {
      const csvContent = req.file.buffer.toString('utf8');
      workbook = XLSX.read(csvContent, { type: 'string' });
    } else {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (jsonData.length === 0) {
      res.status(400).json({ message: 'El archivo está vacío o no tiene datos válidos' });
      return;
    }

    const result: ValidationResult = {
      message: 'Validación completada',
      valid_count: 0,
      error_count: 0,
      valid_rows: [],
      errors: []
    };

    const client = await pool.connect();

    try {
      // Procesar cada fila (solo validación, sin inserción)
      for (let i = 0; i < jsonData.length; i++) {
        const rowNumber = i + 2; // +2 porque las filas empiezan en 1 y hay encabezado
        const row = jsonData[i];

        try {
          const validatedRow = await validateRow(row, rowNumber, client, userRole, userId);
          result.valid_rows.push(validatedRow);
          result.valid_count++;
        } catch (error) {
          result.errors.push({
            row: rowNumber,
            message: (error as Error).message
          });
          result.error_count++;
        }
      }
    } finally {
      client.release();
    }

    res.json(result);

  } catch (error) {
    console.error('Error validating import:', error);
    res.status(500).json({
      message: 'Error al validar la importación',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

export const downloadTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;

    // Obtener datos de referencia para la plantilla
    let countryFilter = '';
    let queryParams: any[] = [];

    if (userRole === UserRole.USER) {
      countryFilter = 'WHERE c.id IN (SELECT country_id FROM user_countries WHERE user_id = $1)';
      queryParams = [userId];
    }

    // Consultar datos de referencia
    const [countriesResult, categoriesResult, suppliersResult, warehousesResult, locationsResult, responsiblesResult] = await Promise.all([
      pool.query(`SELECT cod, name FROM countries ${countryFilter} ORDER BY name`, queryParams),
      pool.query('SELECT cod, name FROM categories ORDER BY name'),
      pool.query('SELECT cod, name FROM suppliers ORDER BY name'),
      pool.query('SELECT cod, name FROM warehouses ORDER BY name'),
      pool.query('SELECT cod, name FROM locations ORDER BY name'),
      pool.query('SELECT cod, name FROM responsibles ORDER BY name')
    ]);

    // Crear la plantilla con datos de ejemplo
    const templateData = [
      {
        'Código País': countriesResult.rows.length > 0 ? countriesResult.rows[0].cod : 'AR',
        'Código Categoría': categoriesResult.rows.length > 0 ? categoriesResult.rows[0].cod : 'MET',
        'Código Proveedor': suppliersResult.rows.length > 0 ? suppliersResult.rows[0].cod : 'PROV001',
        'Código Bodega': warehousesResult.rows.length > 0 ? warehousesResult.rows[0].cod : 'BOD001',
        'Código Ubicación': locationsResult.rows.length > 0 ? locationsResult.rows[0].cod : 'UBI001',
        'Código Responsable': responsiblesResult.rows.length > 0 ? responsiblesResult.rows[0].cod : 'RESP001',
        'Material': 'Mineral de hierro',
        'Lote': 'LOTE001',
        'Cantidad': 100,
        'Peso Unitario': 1.5,
        'Unidad Medida': 'kg',
        'Peso Total': 150,
        'Fecha Vencimiento': '31/12/2025',
        'Comentarios': 'Muestra de ejemplo'
      }
    ];

    // Crear hoja adicional con códigos de referencia
    const referenceSheets = [
      {
        name: 'Plantilla',
        data: templateData
      },
      {
        name: 'Países',
        data: countriesResult.rows.map(row => ({ Código: row.cod, Nombre: row.name }))
      },
      {
        name: 'Categorías',
        data: categoriesResult.rows.map(row => ({ Código: row.cod, Nombre: row.name }))
      },
      {
        name: 'Proveedores',
        data: suppliersResult.rows.map(row => ({ Código: row.cod, Nombre: row.name }))
      },
      {
        name: 'Bodegas',
        data: warehousesResult.rows.map(row => ({ Código: row.cod, Nombre: row.name }))
      },
      {
        name: 'Ubicaciones',
        data: locationsResult.rows.map(row => ({ Código: row.cod, Nombre: row.name }))
      },
      {
        name: 'Responsables',
        data: responsiblesResult.rows.map(row => ({ Código: row.cod, Nombre: row.name }))
      }
    ];

    const filename = `plantilla_muestras_${new Date().toISOString().split('T')[0]}`;
    await ExcelExporter.exportMultiSheetExcel(res, referenceSheets, filename);

  } catch (error) {
    console.error('Error downloading template:', error);
    res.status(500).json({
      message: 'Error al generar la plantilla',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

export const confirmImport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { valid_rows } = req.body;

    if (!valid_rows || !Array.isArray(valid_rows) || valid_rows.length === 0) {
      res.status(400).json({ message: 'No hay filas válidas para importar' });
      return;
    }

    const userId = (req as any).user?.id;

    const result: ImportResult = {
      message: 'Importación completada',
      imported_count: 0,
      error_count: 0,
      imported_samples: [],
      errors: []
    };

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Procesar cada fila validada
      for (const row of valid_rows) {
        try {
          // Obtener IDs de las referencias
          const [countryResult, categoryResult, supplierResult, warehouseResult, locationResult, responsibleResult] = await Promise.all([
            client.query('SELECT id FROM countries WHERE cod = $1', [row.cod_pais]),
            client.query('SELECT id FROM categories WHERE cod = $1', [row.cod_categoria]),
            client.query('SELECT id FROM suppliers WHERE cod = $1', [row.cod_proveedor]),
            client.query('SELECT id FROM warehouses WHERE cod = $1', [row.cod_bodega]),
            client.query('SELECT id FROM locations WHERE cod = $1', [row.cod_ubicacion]),
            client.query('SELECT id FROM responsibles WHERE cod = $1', [row.cod_responsable])
          ]);

          // Insertar muestra
          const insertQuery = `
            INSERT INTO muestras (
              cod, material, lote, cantidad, peso_unitario, unidad_medida, peso_total,
              fecha_vencimiento, comentarios, pais_id, categoria_id, proveedor_id,
              bodega_id, ubicacion_id, responsable_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id, cod, material, lote
          `;

          const sampleResult = await client.query(insertQuery, [
            row.generated_cod,
            row.material,
            row.lote,
            row.cantidad,
            row.peso_unitario,
            row.unidad_medida,
            row.peso_total,
            row.fecha_vencimiento || null,
            row.comentarios || null,
            countryResult.rows[0].id,
            categoryResult.rows[0].id,
            supplierResult.rows[0].id,
            warehouseResult.rows[0].id,
            locationResult.rows[0].id,
            responsibleResult.rows[0].id
          ]);

          const newSample = sampleResult.rows[0];

          // Crear movimiento de entrada
          const movementQuery = `
            INSERT INTO movimientos (
              sample_id, tipo_movimiento, cantidad_movida, cantidad_anterior,
              cantidad_nueva, motivo, comentarios, usuario_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `;

          await client.query(movementQuery, [
            newSample.id,
            'ENTRADA',
            Math.round(row.cantidad),
            0,
            Math.round(row.cantidad),
            'Importación masiva desde Excel',
            `Muestra importada: ${row.material} - Lote: ${row.lote}`,
            userId
          ]);

          result.imported_samples.push({
            id: newSample.id,
            cod: newSample.cod,
            material: newSample.material,
            lote: newSample.lote
          });

          result.imported_count++;

        } catch (error) {
          const errorMessage = `Fila ${row.row_number}: ${(error as Error).message}`;
          result.errors.push(errorMessage);
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
    console.error('Error confirming import:', error);
    res.status(500).json({
      message: 'Error al confirmar la importación',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

export const importSamples = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No se ha subido ningún archivo' });
      return;
    }

    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;

    // Leer el archivo Excel/CSV
    let workbook: XLSX.WorkBook;

    if (req.file.mimetype === 'text/csv') {
      const csvContent = req.file.buffer.toString('utf8');
      workbook = XLSX.read(csvContent, { type: 'string' });
    } else {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (jsonData.length === 0) {
      res.status(400).json({ message: 'El archivo está vacío o no tiene datos válidos' });
      return;
    }

    const result: ImportResult = {
      message: 'Proceso de importación completado',
      imported_count: 0,
      error_count: 0,
      imported_samples: [],
      errors: []
    };

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Procesar cada fila
      for (let i = 0; i < jsonData.length; i++) {
        const rowNumber = i + 2; // +2 porque las filas empiezan en 1 y hay encabezado
        const row = jsonData[i];

        try {
          // Validar campos requeridos
          const requiredFields = [
            'Código País', 'Código Categoría', 'Código Proveedor', 'Código Bodega',
            'Código Ubicación', 'Código Responsable', 'Material', 'Lote',
            'Cantidad', 'Peso Unitario', 'Unidad Medida', 'Peso Total'
          ];

          for (const field of requiredFields) {
            if (!row[field] || row[field].toString().trim() === '') {
              throw new Error(`El campo '${field}' es requerido`);
            }
          }

          // Validar que los códigos de referencia existan
          const [countryResult, categoryResult, supplierResult, warehouseResult, locationResult, responsibleResult] = await Promise.all([
            client.query('SELECT id FROM countries WHERE cod = $1', [row['Código País']]),
            client.query('SELECT id FROM categories WHERE cod = $1', [row['Código Categoría']]),
            client.query('SELECT id FROM suppliers WHERE cod = $1', [row['Código Proveedor']]),
            client.query('SELECT id FROM warehouses WHERE cod = $1', [row['Código Bodega']]),
            client.query('SELECT id FROM locations WHERE cod = $1', [row['Código Ubicación']]),
            client.query('SELECT id FROM responsibles WHERE cod = $1', [row['Código Responsable']])
          ]);

          if (countryResult.rows.length === 0) {
            throw new Error(`El código de país '${row['Código País']}' no existe`);
          }
          if (categoryResult.rows.length === 0) {
            throw new Error(`El código de categoría '${row['Código Categoría']}' no existe`);
          }
          if (supplierResult.rows.length === 0) {
            throw new Error(`El código de proveedor '${row['Código Proveedor']}' no existe`);
          }
          if (warehouseResult.rows.length === 0) {
            throw new Error(`El código de bodega '${row['Código Bodega']}' no existe`);
          }
          if (locationResult.rows.length === 0) {
            throw new Error(`El código de ubicación '${row['Código Ubicación']}' no existe`);
          }
          if (responsibleResult.rows.length === 0) {
            throw new Error(`El código de responsable '${row['Código Responsable']}' no existe`);
          }

          // Verificar permisos de país si es usuario normal
          const countryId = countryResult.rows[0].id;
          if (userRole === UserRole.USER) {
            const permissionResult = await client.query(
              'SELECT 1 FROM user_countries WHERE user_id = $1 AND country_id = $2',
              [userId, countryId]
            );
            if (permissionResult.rows.length === 0) {
              throw new Error(`No tiene permisos para crear muestras en el país '${row['Código País']}'`);
            }
          }

          // Validar tipos de datos
          const cantidad = parseFloat(row['Cantidad']);
          const pesoUnitario = parseFloat(row['Peso Unitario']);
          const pesoTotal = parseFloat(row['Peso Total']);

          if (isNaN(cantidad) || cantidad <= 0) {
            throw new Error('La cantidad debe ser un número mayor a 0');
          }
          if (isNaN(pesoUnitario) || pesoUnitario <= 0) {
            throw new Error('El peso unitario debe ser un número mayor a 0');
          }
          if (isNaN(pesoTotal) || pesoTotal <= 0) {
            throw new Error('El peso total debe ser un número mayor a 0');
          }

          // Validar unidad de medida
          const validUnits = ['kg', 'g', 'mg'];
          if (!validUnits.includes(row['Unidad Medida'])) {
            throw new Error(`La unidad de medida debe ser: ${validUnits.join(', ')}`);
          }

          // Generar código automático de muestra
          const countryCod = row['Código País'];
          const now = new Date();
          const day = now.getDate().toString().padStart(2, '0');
          const month = (now.getMonth() + 1).toString().padStart(2, '0');
          const year = now.getFullYear().toString().slice(-2);
          const datePrefix = `${day}${month}${year}`;
          const dailyPrefix = `${countryCod}${datePrefix}`;

          const codeQuery = 'SELECT COUNT(*) as count FROM muestras WHERE cod LIKE $1';
          const codeResult = await client.query(codeQuery, [`${dailyPrefix}%`]);
          const correlative = parseInt(codeResult.rows[0].count) + 1;
          const cod = `${dailyPrefix}${correlative.toString().padStart(3, '0')}`;

          // Insertar muestra
          const insertQuery = `
            INSERT INTO muestras (
              cod, material, lote, cantidad, peso_unitario, unidad_medida, peso_total,
              fecha_vencimiento, comentarios, pais_id, categoria_id, proveedor_id,
              bodega_id, ubicacion_id, responsable_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id, cod, material, lote
          `;

          const fechaVencimiento = row['Fecha Vencimiento'] ? transformDateFormat(row['Fecha Vencimiento'].toString()) : null;

          const sampleResult = await client.query(insertQuery, [
            cod,
            row['Material'],
            row['Lote'],
            cantidad,
            pesoUnitario,
            row['Unidad Medida'],
            pesoTotal,
            fechaVencimiento,
            row['Comentarios'] || null,
            countryId,
            categoryResult.rows[0].id,
            supplierResult.rows[0].id,
            warehouseResult.rows[0].id,
            locationResult.rows[0].id,
            responsibleResult.rows[0].id
          ]);

          const newSample = sampleResult.rows[0];

          // Crear movimiento de entrada
          const movementQuery = `
            INSERT INTO movimientos (
              sample_id, tipo_movimiento, cantidad_movida, cantidad_anterior,
              cantidad_nueva, motivo, comentarios, usuario_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `;

          await client.query(movementQuery, [
            newSample.id,
            'ENTRADA',
            Math.round(cantidad),
            0,
            Math.round(cantidad),
            'Importación masiva desde Excel',
            `Muestra importada: ${row['Material']} - Lote: ${row['Lote']}`,
            userId
          ]);

          result.imported_samples.push({
            id: newSample.id,
            cod: newSample.cod,
            material: newSample.material,
            lote: newSample.lote
          });

          result.imported_count++;

        } catch (error) {
          const errorMessage = `Fila ${rowNumber}: ${(error as Error).message}`;
          result.errors.push(errorMessage);
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
    console.error('Error importing samples:', error);
    res.status(500).json({
      message: 'Error al procesar la importación',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};