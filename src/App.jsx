import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ChevronRight, RotateCcw, BookOpen, Star, Calendar, 
  Globe, FileText, List, CreditCard, Eye, EyeOff 
} from 'lucide-react';
import Papa from 'papaparse';

/**
 * 카드가 완전히 뒤집힌 뒤에야 단어가 변경되도록 수정한 버전
 * 1. FLIP_DURATION 상수와 pendingIndex 상태 추가
 * 2. next/prevWord -> goToWord 로 교체 (transitionend 사용)
 * 3. 잘못된 template literal, JSX 문법 오류 모두 수정
 */

const FLIP_DURATION = 500; // Tailwind duration-500 과 동일해야 함 (ms)

const WordQuizApp = () => {
  const [words, setWords] = useState([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState('ko-to-en');
  const [confusingWords, setConfusingWords] = useState([]);
  const [showConfusing, setShowConfusing] = useState(false);
  const [totalDays, setTotalDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('card');
  const [hiddenAnswers, setHiddenAnswers] = useState(new Set());
  const [pendingIndex, setPendingIndex] = useState(null);

  const cardRef = useRef(null);

  /* -------------------------- CSV 파일 로드 -------------------------- */
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

            setWords(cleanedData);
            setTotalDays(Math.ceil(cleanedData.length / 100));
            setIsLoading(false);
          },
          error: (parseErr) => {
            console.error('CSV parsing error:', parseErr);
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

  /* -------------------- 로컬 스토리지에서 헷갈리는 단어 -------------------- */
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

  /* ---------------- 카드 회전 완료 후 단어 교체 ---------------- */
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const handleTransitionEnd = () => {
      if (pendingIndex !== null) {
        setCurrentIndex(pendingIndex);
        setIsFlipped(false);
        setPendingIndex(null);
      }
    };

    el.addEventListener('transitionend', handleTransitionEnd);
    return () => el.removeEventListener('transitionend', handleTransitionEnd);
  }, [pendingIndex]);

  /* ----------------------- 유틸리티 ----------------------- */
  const getCurrentWords = () => {
    if (showConfusing) return confusingWords;
    const startIndex = (currentDay - 1) * 100;
    const endIndex = startIndex + 100;
    return words.slice(startIndex, endIndex);
  };

  const currentWords = getCurrentWords();
  const currentWord = currentWords[currentIndex];

  const getWordKeys = () => {
    if (!currentWord) return { korean: '', english: '' };
    const keys = Object.keys(currentWord);
    return {
      korean: currentWord[keys[0]] || '',
      english: currentWord[keys[1]] || ''
    };
  };

  const { korean, english } = getWordKeys();

  /* ----------------------- 카드/단어 이동 ----------------------- */
  const goToWord = (newIdx) => {
    if (pendingIndex !== null) return; // 회전 중이면 무시
    setIsFlipped(true);               // 1단계: 뒤집기 시작
    setPendingIndex(newIdx);          // 2단계: 끝나면 교체 (transitionend)
  };

  const nextWord = () => {
    if (currentIndex < currentWords.length - 1) {
      goToWord(currentIndex + 1);
    }
  };

  const prevWord = () => {
    if (currentIndex > 0) {
      goToWord(currentIndex - 1);
    }
  };

  /* ----------------------- 기타 액션 ----------------------- */
  const flipCard = () => setIsFlipped(!isFlipped);

  const addToConfusing = () => {
    if (!currentWord) return;
    const isAlreadyAdded = confusingWords.some(w => JSON.stringify(w) === JSON.stringify(currentWord));
    if (!isAlreadyAdded) {
      const newList = [...confusingWords, currentWord];
      setConfusingWords(newList);
      localStorage.setItem('confusingWords', JSON.stringify(newList));
    }
  };

  const removeFromConfusing = () => {
    const newList = confusingWords.filter((_, idx) => idx !== currentIndex);
    setConfusingWords(newList);
    localStorage.setItem('confusingWords', JSON.stringify(newList));
    if (currentIndex >= newList.length && newList.length > 0) setCurrentIndex(newList.length - 1);
    setIsFlipped(false);
  };

  const changeDay = (day) => {
    setCurrentDay(day);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowConfusing(false);
    setHiddenAnswers(new Set());
  };

  const toggleConfusingMode = () => {
    setShowConfusing(!showConfusing);
    setCurrentIndex(0);
    setIsFlipped(false);
    setHiddenAnswers(new Set());
  };

  const toggleAnswer = (idx) => {
    const newHidden = new Set(hiddenAnswers);
    newHidden.has(idx) ? newHidden.delete(idx) : newHidden.add(idx);
    setHiddenAnswers(newHidden);
  };

  const toggleAllAnswers = () => {
    if (hiddenAnswers.size === currentWords.length) {
      setHiddenAnswers(new Set());
    } else {
      setHiddenAnswers(new Set(Array.from({ length: currentWords.length }, (_, i) => i)));
    }
  };

  /* ----------------------- 로딩/에러 화면 ----------------------- */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
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

  /* ----------------------- JSX ----------------------- */
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
                {Array.from({ length: totalDays }, (_, i) => (
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

            {/* 보기 모드 선택 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {viewMode === 'card' ? <List className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                {viewMode === 'card' ? '외우기 모드' : '카드 모드'}
              </button>
            </div>

            {/* 헷갈리는 단어 모드 */}
            <button
              onClick={toggleConfusingMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showConfusing ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Star className="h-4 w-4" />
              헷갈리는 단어 ({confusingWords.length})
            </button>
          </div>
        </div>

        {/* 진행률 (카드 모드) */}
        {viewMode === 'card' && (
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
                style={{ width: `${((currentIndex + 1) / currentWords.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* 외우기 모드 컨트롤 */}
        {viewMode === 'list' && currentWords.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                {showConfusing ? '헷갈리는 단어' : `${currentDay}일차`} - 총 {currentWords.length}개
              </span>
              <button
                onClick={toggleAllAnswers}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-sm"
              >
                {hiddenAnswers.size === currentWords.length ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {hiddenAnswers.size === currentWords.length ? '모두 보기' : '모두 가리기'}
              </button>
            </div>
          </div>
        )}

        {/* 메인 컨텐츠 */}
        {viewMode === 'card' ? (
          /* ---------------- 카드 모드 ---------------- */
          <>
            {currentWords.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
                <div
                  ref={cardRef}
                  className={`relative h-64 cursor-pointer group duration-500 ease-in-out flip-card ${isFlipped ? 'rotate-y-180' : ''}`}
                  onClick={flipCard}
                >
                  <div className="absolute inset-0">
                    {/* 앞면 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white flip-face">
                      <div className="text-center">
                        <p className="text-3xl font-bold mb-2">
                          {mode === 'ko-to-en' ? korean : english}
                        </p>
                        <p className="text-indigo-200 text-sm">클릭해서 뒤집기</p>
                      </div>
                    </div>

                    {/* 뒷면 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white flip-face rotate-y-180">
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

            {/* 카드 모드 컨트롤 */}
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
          </>
        ) : (
          /* ---------------- 외우기 모드 (리스트) ---------------- */
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            {currentWords.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {currentWords.map((word, idx) => {
                  const keys = Object.keys(word);
                  const ko = word[keys[0]] || '';
                  const en = word[keys[1]] || '';
                  const hidden = hiddenAnswers.has(idx);

                  return (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => toggleAnswer(idx)}
                    >
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-800 mb-2">
                          {mode === 'ko-to-en' ? ko : en}
                        </div>
                        <div className="text-gray-600">
                          {hidden ? (
                            <div className="bg-gray-200 text-gray-400 py-2 px-4 rounded flex items-center justify-center gap-2">
                              <EyeOff className="h-4 w-4" />
                              클릭해서 보기
                            </div>
                          ) : (
                            <div className="font-medium text-indigo-600">
                              {mode === 'ko-to-en' ? en : ko}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">단어가 없습니다.</p>
              </div>
            )}
          </div>
        )}

        {/* 액션 버튼 (카드 모드) */}
        {viewMode === 'card' && (
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
        )}
      </div>

      {/* 커스텀 CSS */}
      <style jsx>{`
        .flip-card {
          transform-style: preserve-3d;
        }
        .flip-face {
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
