import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Icon from '@/components/ui/icon';

const Index = () => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'results'>('upload');
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpload = () => {
    setCurrentStep('processing');
    setIsProcessing(true);
    
    // Имитация прогресса
    let progressValue = 0;
    const interval = setInterval(() => {
      progressValue += Math.random() * 15;
      if (progressValue >= 100) {
        progressValue = 100;
        setProgress(100);
        clearInterval(interval);
        setTimeout(() => {
          setCurrentStep('results');
          setIsProcessing(false);
        }, 500);
      } else {
        setProgress(progressValue);
      }
    }, 200);
  };

  const handleDownload = () => {
    const blob = new Blob(['Результаты нормализации адресов'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'normalized_addresses.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setCurrentStep('upload');
    setProgress(0);
    setIsProcessing(false);
  };

  const mockResults = [
    { id: 1, original: 'Москва, ул. Ленина д. 10', normalized: 'г. Москва, ул. Ленина, д. 10', status: 'Нормализован' },
    { id: 2, original: 'СПб, Невский пр., 20', normalized: 'г. Санкт-Петербург, Невский проспект, д. 20', status: 'Нормализован' },
    { id: 3, original: 'Екатеринбург, ул. Малышева 15', normalized: 'г. Екатеринбург, ул. Малышева, д. 15', status: 'Нормализован' }
  ];

  const mockErrors = [
    { id: 1, address: 'Неизвестный город, ул. Фантазии 99', error: 'Город не найден в базе данных' },
    { id: 2, address: 'Москва, ул. Несуществующая 777', error: 'Улица не найдена' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-gray via-white to-purple-50">
      {/* Главная страница */}
      {currentStep === 'upload' && (
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <div className="mb-12">
              <h1 className="text-6xl font-light text-gray-900 mb-6 tracking-tight">
                Нормализатор адресов
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Профессиональный инструмент для проверки существования и корректности адресов. 
                Быстрая обработка больших объемов данных с высокой точностью.
              </p>
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
                  <Button 
                    onClick={handleUpload}
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
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-light text-gray-900 mb-4">
                Результаты обработки
              </h2>
              <p className="text-gray-600">
                Обработано адресов: {mockResults.length + mockErrors.length}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Таблица результатов */}
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-brand-green">
                    <Icon name="CheckCircle" size={24} />
                    Нормализованные адреса
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Исходный адрес</TableHead>
                        <TableHead>Нормализованный</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockResults.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell className="text-sm text-gray-600">
                            {result.original}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {result.normalized}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Таблица ошибок */}
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-500">
                    <Icon name="AlertCircle" size={24} />
                    Ошибки обработки
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Адрес</TableHead>
                        <TableHead>Ошибка</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockErrors.map((error) => (
                        <TableRow key={error.id}>
                          <TableCell className="text-sm text-gray-600">
                            {error.address}
                          </TableCell>
                          <TableCell className="text-sm text-red-600">
                            {error.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Кнопки действий */}
            <div className="flex justify-center gap-4 mt-12">
              <Button 
                onClick={handleDownload}
                className="bg-brand-green hover:bg-green-600 text-white px-8 py-3 text-lg font-medium rounded-xl"
              >
                <Icon name="Download" size={20} className="mr-2" />
                Скачать результаты
              </Button>
              <Button 
                onClick={handleReset}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 text-lg rounded-xl"
              >
                <Icon name="RotateCcw" size={20} className="mr-2" />
                Новая обработка
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Футер */}
      <footer className="mt-auto py-8 border-t border-gray-100">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-500 font-light">Нормализатор адресов</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;