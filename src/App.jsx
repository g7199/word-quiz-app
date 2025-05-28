import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, BookOpen, Star, Calendar, Globe, FileText } from 'lucide-react';
import Papa from 'papaparse';

const WordQuizApp = () => {
  const [words, setWords] = useState([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState('ko-to-en'); // 'ko-to-en' or 'en-to-ko'
  const [confusingWords, setConfusingWords] = useState([]);
  const [showConfusing, setShowConfusing] = useState(false);
  const [totalDays, setTotalDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // CSV 파일 로드
  useEffect(() => {
    const loadCSV = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/word.csv');
        const data = await response.text();
        
        Papa.parse(data, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          delimitersToGuess: [',', '\t', '|', ';'],
          complete: (results) => {
            if (results.errors.length > 0) {
              console.warn('CSV parsing warnings:', results.errors);
            }
            
            // 헤더 정리 및 데이터 처리
            const cleanedData = results.data
              .filter(row => row && Object.values(row).some(val => val !== null && val !== ''))
              .map(row => {
                const cleanedRow = {};
                Object.keys(row).forEach(key => {
                  const cleanKey = key.trim();
                  cleanedRow[cleanKey] = typeof row[key] === 'string' ? row[key].trim() : row[key];
                });
                return cleanedRow;
              });

            console.log('Loaded words:', cleanedData.slice(0, 5)); // 처음 5개 확인
            setWords(cleanedData);
            setTotalDays(Math.ceil(cleanedData.length / 100));
            setIsLoading(false);
          },
          error: (error) => {
            console.error('CSV parsing error:', error);
            setError('CSV 파일을 읽는 중 오류가 발생했습니다.');
            setIsLoading(false);
          }
        });
      } catch (err) {
        console.error('File reading error:', err);
        setError('word.csv 파일을 찾을 수 없습니다. 파일을 업로드해주세요.');
        setIsLoading(false);
      }
    };

    loadCSV();
  }, []);

  // 헷갈리는 단어 로드 (메모리에서)
  useEffect(() => {
    const saved = localStorage.getItem('confusingWords');
    if (saved) {
      try {
        setConfusingWords(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading confusing words:', e);
      }
    }
  }, []);

  // 현재 일차의 단어들 가져오기
  const getCurrentWords = () => {
    if (showConfusing) return confusingWords;
    
    const startIndex = (currentDay - 1) * 100;
    const endIndex = startIndex + 100;
    return words.slice(startIndex, endIndex);
  };

  const currentWords = getCurrentWords();
  const currentWord = currentWords[currentIndex];

  // 단어 키 추출 (첫 번째와 두 번째 컬럼 사용)
  const getWordKeys = () => {
    if (!currentWord) return { korean: '', english: '' };
    
    const keys = Object.keys(currentWord);
    const korean = currentWord[keys[0]] || '';
    const english = currentWord[keys[1]] || '';
    
    return { korean, english };
  };

  const { korean, english } = getWordKeys();

  // 카드 뒤집기
  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  // 다음 단어
  const nextWord = () => {
    if (currentIndex < currentWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  // 이전 단어
  const prevWord = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  // 헷갈리는 단어에 추가
  const addToConfusing = () => {
    if (!currentWord) return;
    
    const isAlreadyAdded = confusingWords.some(word => 
      JSON.stringify(word) === JSON.stringify(currentWord)
    );
    
    if (!isAlreadyAdded) {
      const newConfusingWords = [...confusingWords, currentWord];
      setConfusingWords(newConfusingWords);
      localStorage.setItem('confusingWords', JSON.stringify(newConfusingWords));
    }
  };

  // 헷갈리는 단어에서 제거
  const removeFromConfusing = () => {
    const newConfusingWords = confusingWords.filter((_, index) => index !== currentIndex);
    setConfusingWords(newConfusingWords);
    localStorage.setItem('confusingWords', JSON.stringify(newConfusingWords));
    
    if (currentIndex >= newConfusingWords.length && newConfusingWords.length > 0) {
      setCurrentIndex(newConfusingWords.length - 1);
    }
    setIsFlipped(false);
  };

  // 일차 변경
  const changeDay = (day) => {
    setCurrentDay(day);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowConfusing(false);
  };

  // 헷갈리는 단어 모드 토글
  const toggleConfusingMode = () => {
    setShowConfusing(!showConfusing);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">단어를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <FileText className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">파일 로드 오류</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">word.csv 파일을 업로드하고 페이지를 새로고침해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-3">
            <BookOpen className="h-10 w-10 text-indigo-600" />
            단어 퀴즈
          </h1>
          <p className="text-gray-600">매일 100개씩 단어를 학습해보세요</p>
        </div>

        {/* 컨트롤 패널 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* 일차 선택 */}
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <span className="font-medium text-gray-700">일차:</span>
              <select 
                value={currentDay} 
                onChange={(e) => changeDay(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={showConfusing}
              >
                {Array.from({length: totalDays}, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}일차</option>
                ))}
              </select>
            </div>

            {/* 모드 선택 */}
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-indigo-600" />
              <button
                onClick={() => setMode(mode === 'ko-to-en' ? 'en-to-ko' : 'ko-to-en')}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {mode === 'ko-to-en' ? '한→영' : '영→한'}
              </button>
            </div>

            {/* 헷갈리는 단어 모드 */}
            <button
              onClick={toggleConfusingMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showConfusing 
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Star className="h-4 w-4" />
              헷갈리는 단어 ({confusingWords.length})
            </button>
          </div>
        </div>

        {/* 진행률 */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              {showConfusing ? '헷갈리는 단어' : `${currentDay}일차`} 진행률
            </span>
            <span className="text-sm text-gray-500">
              {currentIndex + 1} / {currentWords.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{width: `${((currentIndex + 1) / currentWords.length) * 100}%`}}
            ></div>
          </div>
        </div>

        {/* 메인 카드 */}
        {currentWords.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div 
              className="relative h-64 cursor-pointer group"
              onClick={flipCard}
            >
              <div className={`absolute inset-0 transition-transform duration-500 transform-style-preserve-3d ${
                isFlipped ? 'rotate-y-180' : ''
              }`}>
                {/* 앞면 */}
                <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                  <div className="text-center">
                    <p className="text-3xl font-bold mb-2">
                      {mode === 'ko-to-en' ? korean : english}
                    </p>
                    <p className="text-indigo-200 text-sm">클릭해서 뒤집기</p>
                  </div>
                </div>
                
                {/* 뒷면 */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white">
                  <div className="text-center">
                    <p className="text-3xl font-bold mb-2">
                      {mode === 'ko-to-en' ? english : korean}
                    </p>
                    <p className="text-emerald-200 text-sm">다시 클릭해서 뒤집기</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 text-center">
            <p className="text-gray-500">단어가 없습니다.</p>
          </div>
        )}

        {/* 컨트롤 버튼 */}
        <div className="flex justify-center items-center gap-4 mb-6">
          <button
            onClick={prevWord}
            disabled={currentIndex === 0}
            className="p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>

          <button
            onClick={flipCard}
            className="p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl hover:bg-indigo-700 transition-all"
          >
            <RotateCcw className="h-6 w-6" />
          </button>

          <button
            onClick={nextWord}
            disabled={currentIndex === currentWords.length - 1}
            className="p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-center gap-4">
          {showConfusing ? (
            <button
              onClick={removeFromConfusing}
              className="bg-red-500 text-white px-6 py-3 rounded-xl hover:bg-red-600 transition-colors shadow-lg"
            >
              이 단어 제거하기
            </button>
          ) : (
            <button
              onClick={addToConfusing}
              className="bg-yellow-500 text-white px-6 py-3 rounded-xl hover:bg-yellow-600 transition-colors shadow-lg"
            >
              헷갈리는 단어에 추가
            </button>
          )}
        </div>
      </div>

      {/* 커스텀 CSS */}
      <style jsx>{`
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

export default WordQuizApp;