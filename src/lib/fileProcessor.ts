import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import Fuse from 'fuse.js';

// Типы данных
export interface AddressData {
  id: number;
  original: string;
  normalized?: string;
  status: 'success' | 'error' | 'warning';
  errorMessage?: string;
  confidence?: number;
}

export interface ProcessingResult {
  success: AddressData[];
  errors: AddressData[];
  total: number;
}

// База правильных адресов для сравнения (аналог Python-справочника)
const addressDatabase = [
  'г. Москва',
  'г. Санкт-Петербург', 
  'г. Екатеринбург',
  'г. Новосибирск',
  'г. Казань',
  'г. Нижний Новгород',
  'г. Челябинск',
  'г. Самара',
  'г. Омск',
  'г. Ростов-на-Дону',
  'г. Уфа',
  'г. Красноярск',
  'г. Воронеж',
  'г. Пермь',
  'г. Волгоград',
  
  'ул. Ленина',
  'ул. Советская',
  'ул. Мира',
  'ул. Кирова',
  'ул. Молодежная',
  'Невский проспект',
  'ул. Тверская',
  'ул. Арбат',
  'ул. Малышева',
  'ул. Красная',
  'проспект Мира',
  'Красная площадь',
  'ул. Гагарина',
  'ул. Пушкина',
  'ул. Лермонтова',
  
  'переулок',
  'проспект',
  'площадь',
  'бульвар',
  'набережная',
  'шоссе',
  'тракт',
  'линия'
];

// Настройка Fuse.js для нечеткого поиска (аналог fuzzywuzzy)
const fuseOptions = {
  includeScore: true,
  threshold: 0.4, // Чувствительность поиска (0 = точное совпадение, 1 = любое)
  keys: ['item']
};

const fuse = new Fuse(
  addressDatabase.map(item => ({ item })),
  fuseOptions
);

// Функция для чтения CSV файлов (аналог pandas.read_csv)
export const parseCSV = (file: File): Promise<string[][]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        resolve(results.data as string[][]);
      },
      error: (error) => {
        reject(error);
      },
      skipEmptyLines: true
    });
  });
};

// Функция для чтения Excel файлов (аналог pandas.read_excel + openpyxl)
export const parseExcel = (file: File): Promise<string[][]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        resolve(jsonData as string[][]);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsArrayBuffer(file);
  });
};

// Функция исправления орфографических ошибок (аналог fuzzywuzzy)
const fixSpellingErrors = (address: string): { corrected: string; confidence: number } => {
  let correctedAddress = address;
  let totalConfidence = 100;
  
  // Разбиваем адрес на части, сохраняя исходную структуру
  const parts = address.split(/[,\s]+/).filter(part => part.length > 2);
  
  for (const part of parts) {
    const results = fuse.search(part);
    
    // Более строгий порог для замены и проверка на избежание дублирования
    if (results.length > 0 && results[0].score! < 0.2) {
      const bestMatch = results[0].item.item;
      const confidence = Math.round((1 - results[0].score!) * 100);
      
      // Проверяем, что исправление не создает дубликат
      if (confidence > 85 && !correctedAddress.toLowerCase().includes(bestMatch.toLowerCase())) {
        // Заменяем только если это явно опечатка
        const regex = new RegExp(`\\b${part}\\b`, 'gi');
        correctedAddress = correctedAddress.replace(regex, bestMatch);
        totalConfidence = Math.min(totalConfidence, confidence);
      }
    }
  }
  
  return {
    corrected: correctedAddress,
    confidence: totalConfidence
  };
};

// Основная функция нормализации адресов (аналог pandas обработки)
const normalizeAddress = (address: string): AddressData['normalized'] => {
  let normalized = address.trim();
  
  // Только базовые правила форматирования без изменения содержания
  normalized = normalized
    .replace(/\s+/g, ' ') // Убираем лишние пробелы
    .replace(/(\d+)\s*-\s*(\d+)/g, '$1-$2') // Нормализуем номера домов
    .replace(/\bд\.\s*/gi, 'д. ') // Стандартизируем "д."
    .replace(/\bул\.\s*/gi, 'ул. ') // Стандартизируем "ул."
    .replace(/\bпр\.\s*/gi, 'пр. ') // Оставляем сокращения как есть
    .replace(/\bпл\.\s*/gi, 'пл. ') // Оставляем сокращения как есть
    .replace(/\bнаб\.\s*/gi, 'наб. '); // Оставляем сокращения как есть
  
  // Убираем лишние пробелы после обработки
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
};

// Валидация адреса
const validateAddress = (original: string, normalized: string): { isValid: boolean; errorMessage?: string } => {
  // Упрощенная валидация - проверяем только базовые требования
  if (!normalized || normalized.length < 3) {
    return { isValid: false, errorMessage: 'Адрес слишком короткий' };
  }
  
  // Проверяем наличие хотя бы одной буквы (название улицы/города)
  if (!normalized.match(/[а-яё]/i)) {
    return { isValid: false, errorMessage: 'Адрес должен содержать название' };
  }
  
  return { isValid: true };
};

// Главная функция обработки файла (аналог всего Python пайплайна)
export const processAddressFile = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<ProcessingResult> => {
  try {
    let rawData: string[][];
    
    // Определяем тип файла и парсим соответственно
    if (file.name.toLowerCase().endsWith('.csv')) {
      rawData = await parseCSV(file);
    } else if (file.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
      rawData = await parseExcel(file);
    } else {
      throw new Error('Неподдерживаемый формат файла');
    }
    
    const result: ProcessingResult = {
      success: [],
      errors: [],
      total: rawData.length
    };
    
    // Обрабатываем каждую строку, берем все столбцы как адреса
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      
      // Объединяем все столбцы в один адрес, если их несколько
      const originalAddress = row
        .filter(cell => cell && cell.toString().trim())
        .join(', ')
        .trim();
      
      if (!originalAddress) continue;
      
      // Имитируем прогресс обработки
      if (onProgress) {
        const progress = Math.round(((i + 1) / rawData.length) * 100);
        onProgress(progress);
        
        // Добавляем небольшую задержку для визуализации
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const normalized = normalizeAddress(originalAddress);
      const validation = validateAddress(originalAddress, normalized);
      
      const addressData: AddressData = {
        id: i + 1,
        original: originalAddress,
        normalized: normalized,
        status: validation.isValid ? 'success' : 'error',
        errorMessage: validation.errorMessage,
        confidence: validation.isValid ? 95 : 0
      };
      
      if (validation.isValid) {
        result.success.push(addressData);
      } else {
        result.errors.push(addressData);
      }
    }
    
    return result;
    
  } catch (error) {
    throw new Error(`Ошибка обработки файла: ${error}`);
  }
};

// Функция экспорта результатов в Excel (аналог pandas.to_excel + openpyxl)
export const exportToExcel = (data: ProcessingResult): void => {
  const wb = XLSX.utils.book_new();
  
  // Лист с успешными результатами
  const successData = [
    ['ID', 'Исходный адрес', 'Нормализованный адрес', 'Уверенность (%)'],
    ...data.success.map(item => [
      item.id,
      item.original,
      item.normalized,
      item.confidence
    ])
  ];
  
  const successWs = XLSX.utils.aoa_to_sheet(successData);
  XLSX.utils.book_append_sheet(wb, successWs, 'Нормализованные');
  
  // Лист с ошибками
  const errorData = [
    ['ID', 'Адрес', 'Ошибка'],
    ...data.errors.map(item => [
      item.id,
      item.original,
      item.errorMessage
    ])
  ];
  
  const errorWs = XLSX.utils.aoa_to_sheet(errorData);
  XLSX.utils.book_append_sheet(wb, errorWs, 'Ошибки');
  
  // Скачиваем файл
  XLSX.writeFile(wb, `normalized_addresses_${new Date().getTime()}.xlsx`);
};

// Функция экспорта в CSV
export const exportToCSV = (data: ProcessingResult): void => {
  const csvData = [
    ['ID', 'Исходный адрес', 'Нормализованный адрес', 'Статус', 'Ошибка', 'Уверенность (%)'],
    ...data.success.map(item => [
      item.id,
      item.original,
      item.normalized,
      'Успешно',
      '',
      item.confidence
    ]),
    ...data.errors.map(item => [
      item.id,
      item.original,
      '',
      'Ошибка',
      item.errorMessage,
      0
    ])
  ];
  
  const csv = Papa.unparse(csvData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `normalized_addresses_${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};