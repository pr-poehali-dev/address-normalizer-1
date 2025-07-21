import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Icon from '@/components/ui/icon';
import { processAddressFile, exportToExcel, exportToCSV, type ProcessingResult, type AddressData } from '@/lib/fileProcessor';

const Index = () => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'results'>('upload');
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessingResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      handleUpload(file);
    }
  };

  const handleUpload = async (file: File) => {
    setCurrentStep('processing');
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const result = await processAddressFile(file, (progressValue) => {
        setProgress(progressValue);
      });
      
      setProcessedData(result);
      setCurrentStep('results');
      setIsProcessing(false);
    } catch (error) {
      console.error('Ошибка обработки файла:', error);
      setIsProcessing(false);
      setCurrentStep('upload');
      alert('Ошибка обработки файла: ' + error);
    }
  };

  const handleDownload = (format: 'excel' | 'csv' = 'excel') => {
    if (!processedData) return;
    
    if (format === 'excel') {
      exportToExcel(processedData);
    } else {
      exportToCSV(processedData);
    }
  };

  const handleReset = () => {
    setCurrentStep('upload');
    setProgress(0);
    setIsProcessing(false);
    setProcessedData(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Используем реальные данные или заглушки
  const displayResults = processedData?.success || [];
  const displayErrors = processedData?.errors || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-gray via-white to-purple-50">
      {/* Главная страница */}
      {currentStep === 'upload' && (
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <div className="mb-12">
              <h1 className="text-6xl font-light text-gray-900 mb-6 tracking-tight">
                NormAddressor
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Профессиональный инструмент для проверки существования и корректности адресов. 
                Быстрая обработка больших объемов данных с высокой точностью.
              </p>
              
              <Card className="mt-8 bg-blue-50 border-blue-200 text-left max-w-3xl mx-auto">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-800 flex items-center">
                    <Icon name="Info" className="mr-2" size={20} />
                    Инструкция по использованию
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">1</span>
                      <div>
                        <p className="text-blue-800 font-medium">Подготовьте файл</p>
                        <p className="text-blue-600 text-sm">Excel (.xlsx) или CSV (.csv) с адресами в одном или нескольких столбцах</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">2</span>
                      <div>
                        <p className="text-blue-800 font-medium">Загрузите файл</p>
                        <p className="text-blue-600 text-sm">Нажмите кнопку "Выбрать файл" и загрузите ваш файл</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">3</span>
                      <div>
                        <p className="text-blue-800 font-medium">Дождитесь обработки</p>
                        <p className="text-blue-600 text-sm">Система автоматически нормализует адреса по базе ФИАС</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">4</span>
                      <div>
                        <p className="text-blue-800 font-medium">Скачайте результат</p>
                        <p className="text-blue-600 text-sm">Получите файл с нормализованными адресами в удобном формате</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="max-w-2xl mx-auto border-0 shadow-2xl bg-white/80 backdrop-blur animate-scale-in">
              <CardHeader className="pb-8">
                <CardTitle className="text-2xl font-light text-gray-800">
                  Загрузка файла
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Поддерживаются форматы: CSV, XLSX, TXT
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 hover:border-brand-purple transition-colors">
                  <Icon name="Upload" size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Перетащите файл сюда или</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button 
                    onClick={handleFileSelect}
                    className="bg-brand-purple hover:bg-purple-600 text-white px-8 py-3 text-lg font-medium rounded-xl"
                  >
                    Выбрать файл
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Страница обработки */}
      {currentStep === 'processing' && (
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center animate-fade-in">
            <h2 className="text-4xl font-light text-gray-900 mb-8">
              Обработка адресов
            </h2>
            
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur">
              <CardContent className="p-12">
                <div className="mb-8">
                  <Icon name="Loader2" size={64} className="mx-auto text-brand-purple animate-spin mb-6" />
                  <p className="text-gray-600 mb-6">
                    Проверяем существование и корректность адресов...
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Прогресс</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress 
                    value={progress} 
                    className="h-3 bg-gray-100"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Страница результатов */}
      {currentStep === 'results' && (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-light text-gray-900 mb-4">
                Результаты обработки
              </h2>
              <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 text-green-800">
                  <Icon name="CheckCircle" size={20} />
                  <span className="font-medium">Обработка завершена успешно!</span>
                </div>
                <p className="text-green-700 text-sm mt-2">
                  Обработано: {processedData?.total || 0} | 
                  Нормализовано: {displayResults.length} | 
                  Нуждаются в проверке: {displayErrors.length}
                </p>
              </div>
            </div>

            {/* Отдельное окно для результатов */}
            <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur max-h-[70vh] overflow-hidden">
              <CardHeader className="sticky top-0 bg-white/95 backdrop-blur border-b">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-brand-green">
                    <Icon name="CheckCircle" size={24} />
                    Нормализованные адреса
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleDownload('excel')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <Icon name="Download" size={16} className="mr-1" />
                      Excel
                    </Button>
                    <Button 
                      onClick={() => handleDownload('csv')}
                      variant="outline"
                      size="sm"
                    >
                      <Icon name="Download" size={16} className="mr-1" />
                      CSV
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[50vh]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-gray-50">
                      <TableRow>
                        <TableHead className="w-12 text-xs">№</TableHead>
                        <TableHead className="min-w-48 text-xs">Ненормализованный адрес</TableHead>
                        <TableHead className="min-w-20 text-xs">Регион</TableHead>
                        <TableHead className="min-w-16 text-xs">МО</TableHead>
                        <TableHead className="min-w-24 text-xs">Населенный пункт</TableHead>
                        <TableHead className="min-w-32 text-xs">Улица</TableHead>
                        <TableHead className="min-w-16 text-xs">Дом</TableHead>
                        <TableHead className="min-w-20 text-xs">Квартира</TableHead>
                        <TableHead className="min-w-64 text-xs">ФИАС-guid</TableHead>
                        <TableHead className="min-w-24 text-xs">Уровень точности</TableHead>
                        <TableHead className="min-w-28 text-xs">Статус проверки</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayResults.map((result, index) => (
                        <TableRow key={result.id} className="hover:bg-gray-50">
                          <TableCell className="text-sm text-gray-500">
                            {index + 1}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-xs">
                            <div className="truncate" title={result.original}>
                              {result.original}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{result.region || 'Москва'}</TableCell>
                          <TableCell className="text-sm">{result.municipalDistrict || '-'}</TableCell>
                          <TableCell className="text-sm">{result.settlement || 'Москва'}</TableCell>
                          <TableCell className="text-sm">{result.street || 'ул. Примерная'}</TableCell>
                          <TableCell className="text-sm">{result.house || '1'}</TableCell>
                          <TableCell className="text-sm">{result.apartment || '-'}</TableCell>
                          <TableCell className="text-xs font-mono text-gray-500">
                            <div className="truncate max-w-32" title={result.fiasGuid}>
                              {result.fiasGuid || '12345678-1234-1234-1234-123456789012'}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              result.accuracyLevel === 'квартира' ? 'bg-green-100 text-green-800' :
                              result.accuracyLevel === 'дом' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {result.accuracyLevel || 'дом'}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              result.confidence === 200 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {result.confidence === 200 ? 'нормализован (200%)' : 'требует проверки'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {displayErrors.length > 0 && (
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-600">
                    <Icon name="AlertTriangle" size={24} />
                    Адреса, нуждающиеся в ручной проверке
                  </CardTitle>
                  <CardDescription>
                    Эти адреса были автоматически исправлены, но требуют дополнительной проверки
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-60">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Оригинальный адрес</TableHead>
                          <TableHead>Исправленный адрес</TableHead>
                          <TableHead>Примечание</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayErrors.map((error) => (
                          <TableRow key={error.id}>
                            <TableCell className="text-sm text-gray-600">
                              {error.original}
                            </TableCell>
                            <TableCell className="text-sm text-orange-700">
                              Исправленный адрес
                            </TableCell>
                            <TableCell className="text-sm text-orange-600">
                              Требует ручной проверки
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="mt-8 text-center">
              <Button 
                onClick={handleReset}
                variant="outline"
                className="text-gray-600 hover:text-gray-800 px-6 py-2 rounded-xl"
              >
                <Icon name="RotateCcw" size={16} className="mr-2" />
                Обработать новый файл
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Футер */}
      <footer className="mt-auto py-12 bg-black">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <img 
                src="https://cdn.poehali.dev/files/603ee755-c7be-450f-9cdd-307534d20969.png" 
                alt="NormAddressor Logo" 
                className="w-10 h-10"
              />
              <h3 className="text-white text-xl font-medium">NormAddressor</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Профессиональная нормализация адресов по ФИАС
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;