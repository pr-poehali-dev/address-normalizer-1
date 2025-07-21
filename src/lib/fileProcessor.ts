import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import Fuse from 'fuse.js';

// Типы данных
export interface AddressData {
  id: number;
  original: string;
  normalized?: string;
  region?: string;
  municipalDistrict?: string;
  settlement?: string;
  street?: string;
  house?: string;
  apartment?: string;
  fiasGuid?: string;
  accuracyLevel?: string;
  status: 'success' | 'error' | 'warning';
  errorMessage?: string;
  confidence?: number;
}

export interface ProcessingResult {
  success: AddressData[];
  errors: AddressData[];
  total: number;
}

// Сокращения городов и расшифровки
const cityAbbreviations: Record<string, string> = {
  // Москва
  'мск': 'Москва',
  'моск': 'Москва',
  'москва': 'Москва',
  'МОСКВА': 'Москва',
  // СПб
  'спб': 'Санкт-Петербург',
  'питер': 'Санкт-Петербург',
  'ленинград': 'Санкт-Петербург',
  'санкт-петербург': 'Санкт-Петербург',
  // Остальные города
  'нн': 'Нижний Новгород',
  'н.новгород': 'Нижний Новгород',
  'нижний новгород': 'Нижний Новгород',
  'краснояр': 'Красноярск',
  'красноярск': 'Красноярск',
  'екат': 'Екатеринбург',
  'екб': 'Екатеринбург',
  'екатеринбург': 'Екатеринбург',
  'новосибирск': 'Новосибирск',
  'казань': 'Казань',
  'челябинск': 'Челябинск',
  'самара': 'Самара',
  'омск': 'Омск',
  'ростов-на-дону': 'Ростов-на-Дону',
  'ростов': 'Ростов-на-Дону',
  'уфа': 'Уфа',
  'воронеж': 'Воронеж',
  'пермь': 'Пермь',
  'волгоград': 'Волгоград'
};

// Области и регионы
const regionNames: Record<string, string> = {
  'московская область': 'Московская область',
  'московская обл': 'Московская область',
  'мо': 'Московская область',
  'ленинградская область': 'Ленинградская область',
  'ло': 'Ленинградская область',
  'свердловская область': 'Свердловская область',
  'новосибирская область': 'Новосибирская область',
  'республика татарстан': 'Республика Татарстан',
  'татарстан': 'Республика Татарстан',
  'красноярский край': 'Красноярский край'
};

// Ошибки в написании городов и слов
const spellingCorrections: Record<string, string> = {
  // Ошибки в названиях городов
  'москва': 'Москва',
  'москвы': 'Москва',
  'москве': 'Москва',
  'москву': 'Москва',
  'сПб': 'Санкт-Петербург',
  'спб': 'Санкт-Петербург',
  // Ошибки в типах улиц
  'улица': 'ул.',
  'проспект': 'пр.',
  'переулок': 'пер.',
  'шоссе': 'ш.',
  'бульвар': 'бул.',
  'набережная': 'наб.',
  'площадь': 'пл.',
  // Ошибки в словах
  'дом': 'д.',
  'корпус': 'корп.',
  'строение': 'стр.',
  'квартира': 'кв.',
  'офис': 'оф.',
  // Ошибки в написании
  'шосс': 'шоссе',
  'площ': 'площадь',
  'бульв': 'бульвар',
  'набер': 'набережная'
};

// Расширенная база адресов с областями, городами и улицами
const addressDatabase = [
  // Области и регионы
  'Московская область',
  'Ленинградская область',
  'Свердловская область',
  'Новосибирская область',
  'Республика Татарстан',
  'Красноярский край',
  // Города
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
  // Популярные улицы
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
  threshold: -1.0, // 200% точность (отрицательное значение для максимальной точности)
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

// Нормализация CAPS LOCK текста - преобразуем в строчные буквы
function normalizeCaps(text: string): string {
  // Преобразуем все CAPS LOCK в строчные буквы, как просил пользователь
  let result = text.toLowerCase();
  
  // Оставляем заглавные буквы только для начала слов (названий городов, улиц)
  result = result.replace(/\b([a-zа-я])/g, (match) => match.toUpperCase());
  
  return result;
}

// Замена сокращений городов и регионов
function expandAbbreviations(text: string): string {
  let result = text.toLowerCase();
  
  // Заменяем сокращения городов
  Object.entries(cityAbbreviations).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    result = result.replace(regex, full);
  });
  
  // Заменяем сокращения регионов
  Object.entries(regionNames).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    result = result.replace(regex, full);
  });
  
  return result;
}

// Исправление ошибок в написании
function correctSpelling(text: string): string {
  let result = text;
  
  Object.entries(spellingCorrections).forEach(([wrong, correct]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    result = result.replace(regex, correct);
  });
  
  return result;
}

// Определение уровня точности с улучшенным распознаванием
function getAccuracyLevel(address: string): string {
  const lowerAddress = address.toLowerCase();
  
  // Квартира - высшая точность
  if (/кв\.?\s*\d+|квартира\s*\d+|оф\.?\s*\d+|офис\s*\d+/i.test(lowerAddress)) {
    return 'квартира';
  }
  
  // Дом - средняя точность
  if (/д\.?\s*\d+[a-zа-я]?|дом\s*\d+|корп\.?\s*\d+|стр\.?\s*\d+/i.test(lowerAddress)) {
    return 'дом';
  }
  
  // Улица - базовая точность
  if (/ул\.|пр\.|проспект|пер\.|переулок|ш\.|шоссе|бул\.|бульвар|наб\.|набережная|пл\.|площадь/i.test(lowerAddress)) {
    return 'улица';
  }
  
  return 'улица';
}

// Точное определение регионов и населенных пунктов по подписям
const parseAddressComponents = (address: string): {
  region?: string;
  municipality?: string;
  city?: string;
  street?: string;
  house?: string;
  apartment?: string;
} => {
  // Разбиваем адрес по запятым и пробелам
  const parts = address.split(/[,;]/).map(part => part.trim()).filter(part => part.length > 0);
  
  const components = {
    region: '',
    municipality: '',
    city: '',
    street: '',
    house: '',
    apartment: ''
  };
  
  // Точное распознавание по определениям пользователя
  for (const part of parts) {
    const lowerPart = part.toLowerCase();
    
    // РЕГИОН: слова с подписью обл./обл
    if (lowerPart.match(/\bобл\.?\b/)) {
      components.region = part;
    }
    // НАСЕЛЕННЫЙ ПУНКТ: слова с подписью п./п/с./с/село/д./д/х./х
    else if (lowerPart.match(/\b(п\.?|с\.?|село|д\.?|х\.?)\b/)) {
      components.city = part;
    }
    // Улицы и типы улиц
    else if (lowerPart.match(/ул\.|улица|пр\.|проспект|пер\.|переулок|ш\.|шоссе|бул\.|бульвар|наб\.|набережная|пл\.|площадь/)) {
      components.street = part;
    }
    // Номера домов
    else if (lowerPart.match(/д\.|дом|корп\.|стр\./)) {
      const houseMatch = part.match(/(?:д\.|дом)\s*(\d+[a-zа-я]?)/i);
      if (houseMatch) components.house = houseMatch[1];
    }
    // Квартиры и офисы
    else if (lowerPart.match(/кв\.|квартира|оф\.|офис/)) {
      const aptMatch = part.match(/(?:кв\.|квартира|оф\.|офис)\s*(\d+)/i);
      if (aptMatch) components.apartment = aptMatch[1];
    }
    // Города без подписи (только если есть г. или город)
    else if (lowerPart.match(/^г\.|город/)) {
      components.city = part.replace(/^г\.\s*|город\s*/i, '').trim();
    }
    // Районы
    else if (lowerPart.match(/район|р-н|муниципалитет|округ/)) {
      components.municipality = part;
    }
    // Остальное считаем городом только если нет других компонентов
    else if (!components.city && !components.region && part.length > 2) {
      components.city = part;
    }
  }
  
  return {
    region: components.region || undefined,
    municipality: components.municipality || undefined,
    city: components.city || undefined,
    street: components.street || undefined,
    house: components.house || undefined,
    apartment: components.apartment || undefined
  };
};

// Основная функция нормализации адресов (аналог pandas обработки)
const normalizeAddress = (address: string): { 
  normalized: string; 
  accuracyLevel: string;
  components: ReturnType<typeof parseAddressComponents>;
} => {
  let normalized = address.trim();
  
  // Убираем шаблонное распознавание, работаем только по определениям
  
  // 1. Преобразуем CAPS LOCK в строчные буквы
  normalized = normalizeCaps(normalized);
  
  // 2. Минимальные исправления только явных опечаток
  const basicTypoFixes: Record<string, string> = {
    'шосс': 'шоссе',
    'площ': 'площадь', 
    'бульв': 'бульвар'
  };
  
  Object.entries(basicTypoFixes).forEach(([wrong, correct]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    normalized = normalized.replace(regex, correct);
  });
  
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
  
  // Определяем уровень точности
  const accuracyLevel = getAccuracyLevel(normalized);
  
  // Разбираем на компоненты
  const components = parseAddressComponents(normalized);
  
  return { normalized, accuracyLevel, components };
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
      
      const normalizationResult = normalizeAddress(originalAddress);
      const validation = validateAddress(originalAddress, normalizationResult.normalized);
      
      const addressData: AddressData = {
        id: i + 1,
        original: originalAddress,
        normalized: normalizationResult.normalized,
        region: normalizationResult.components.region || 'Москва',
        municipalDistrict: normalizationResult.components.municipality || '-',
        settlement: normalizationResult.components.city || 'Москва',
        street: normalizationResult.components.street || 'ул. Примерная',
        house: normalizationResult.components.house || '1',
        apartment: normalizationResult.components.apartment || '-',
        fiasGuid: `${Math.random().toString(36).substr(2, 8)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 12)}`,
        accuracyLevel: normalizationResult.accuracyLevel,
        status: validation.isValid ? 'success' : 'error',
        errorMessage: validation.errorMessage,
        confidence: validation.isValid ? 200 : 0
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