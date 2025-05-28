import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Star,
  Calendar,
  Globe,
  FileText,
  List,
  CreditCard,
  Eye,
  EyeOff,
} from 'lucide-react';
import Papa from 'papaparse';

/**
 * WordQuizApp – React + Tailwind 기반 단어 학습 앱
 * 요구사항(2025-05-28)
 *   • 카드 모드(기본): 같은 일차 내 단어를 한 번만 셔플.
 *   • 리스트(외우기) 모드/헷갈리는 단어 모드: 원본 순서 유지.
 *   • 카드 ↔ 리스트 토글 시에도 셔플 결과가 유지돼야 함.
 */
const WordQuizApp = () => {
  /*──────────────────────────────── 상태 */
  const [words, setWords] = useState([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState('ko-to-en'); // 'ko-to-en' | 'en-to-ko'
  const [confusingWords, setConfusingWords] = useState([]);
  const [showConfusing, setShowConfusing] = useState(false);
  const [totalDays, setTotalDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'list'
  const [hiddenAnswers, setHiddenAnswers] = useState(new Set());

  /*─────────────────────────────── 유틸: Fisher‑Yates */
  const shuffleArray = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /*─────────────────────────────── CSV 로드 */
  useEffect(() => {
    const loadCSV = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/word.csv');
        const text = await res.text();

        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          delimitersToGuess: [',', '\t', '|', ';'],
          complete: ({ data, errors }) => {
            if (errors.length) console.warn('CSV parse warnings', errors);

            const cleaned = data
              .filter((row) => row && Object.values(row).some((v) => v !== null && v !== ''))
              .map((row) => {
                const obj = {};
                Object.keys(row).forEach((k) => {
                  obj[k.trim()] = typeof row[k] === 'string' ? row[k].trim() : row[k];
                });
                return obj;
              });

            setWords(cleaned);
            setTotalDays(Math.ceil(cleaned.length / 100));
            setIsLoading(false);
          },
          error: (err) => {
            console.error(err);
            setError('CSV 파일을 읽는 중 오류가 발생했습니다.');
            setIsLoading(false);
          },
        });
      } catch (e) {
        console.error(e);
        setError('word.csv 파일을 찾을 수 없습니다.');
        setIsLoading(false);
      }
    };

    loadCSV();
  }, []);

  /*─────────────────────────────── 로컬스토리지 – 헷갈리는 단어 */
  useEffect(() => {
    const saved = localStorage.getItem('confusingWords');
    if (saved) {
      try {
        setConfusingWords(JSON.parse(saved));
      } catch (e) {
        console.error('confusingWords JSON error', e);
      }
    }
  }, []);

  /*─────────────────────────────── 일차별 ordered/shuffled 캐싱 */
  const daySlices = useMemo(() => {
    const start = (currentDay - 1) * 100;
    const ordered = words.slice(start, start + 100);
    return {
      ordered,
      shuffled: shuffleArray(ordered),
    };
  }, [words, currentDay]); // viewMode 제외 → 카드✔리스트 토글해도 셔플 유지

  /*─────────────────────────────── currentWords 계산 */
  const currentWords = showConfusing
    ? confusingWords
    : viewMode === 'card'
    ? daySlices.shuffled
    : daySlices.ordered;

  /*─────────────────────────────── 현재 단어 & 키 */
  const currentWord = currentWords[currentIndex];
  const { korean = '', english = '' } = useMemo(() => {
    if (!currentWord) return {};
    const [kKey, eKey] = Object.keys(currentWord);
    return { korean: currentWord[kKey] || '', english: currentWord[eKey] || '' };
  }, [currentWord]);

  /*─────────────────────────────── 핸들러 */
  const flipCard = () => setIsFlipped((f) => !f);
  const prevWord = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex((i) => i - 1);
    }
  };
  const nextWord = () => {
    if (currentIndex < currentWords.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((i) => i + 1);
    }
  };
  const addToConfusing = () => {
    if (!currentWord) return;
    const exists = confusingWords.some((w) => JSON.stringify(w) === JSON.stringify(currentWord));
    if (!exists) {
      const updated = [...confusingWords, currentWord];
      setConfusingWords(updated);
      localStorage.setItem('confusingWords', JSON.stringify(updated));
    }
  };
  const removeFromConfusing = () => {
    const updated = confusingWords.filter((_, i) => i !== currentIndex);
    setConfusingWords(updated);
    localStorage.setItem('confusingWords', JSON.stringify(updated));
    if (currentIndex >= updated.length && updated.length) setCurrentIndex(updated.length - 1);
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
    setShowConfusing((p) => !p);
    setCurrentIndex(0);
    setIsFlipped(false);
    setHiddenAnswers(new Set());
  };
  const toggleAnswer = (idx) => {
    const setCopy = new Set(hiddenAnswers);
    setCopy.has(idx) ? setCopy.delete(idx) : setCopy.add(idx);
    setHiddenAnswers(setCopy);
  };
  const toggleAllAnswers = () => {
    hiddenAnswers.size === currentWords.length
      ? setHiddenAnswers(new Set())
      : setHiddenAnswers(new Set(currentWords.map((_, i) => i)));
  };

  /*─────────────────────────────── 로딩 & 에러 */
  if (isLoading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">단어를 불러오는 중...</p>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <FileText className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">파일 로드 오류</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">word.csv 파일을 업로드한 뒤 새로고침하세요.</p>
        </div>
      </div>
    );

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

        {/* 진행률 - 카드 모드일 때만 표시 */}
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
                style={{width: `${((currentIndex + 1) / currentWords.length) * 100}%`}}
              ></div>
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
          // 카드 모드
          <>
            {currentWords.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
                <div 
                  className="relative h-64 cursor-pointer group"
                  onClick={flipCard}
                  key={`${currentIndex}-${currentDay}-${showConfusing}`}
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

            {/* 카드 모드 컨트롤 버튼 */}
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
          // 외우기 모드 (리스트)
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            {currentWords.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {currentWords.map((word, index) => {
                  const keys = Object.keys(word);
                  const koreanWord = word[keys[0]] || '';
                  const englishWord = word[keys[1]] || '';
                  const isHidden = hiddenAnswers.has(index);
                  
                  return (
                    <div 
                      key={index} 
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => toggleAnswer(index)}
                    >
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-800 mb-2">
                          {mode === 'ko-to-en' ? koreanWord : englishWord}
                        </div>
                        <div className="text-gray-600">
                          {isHidden ? (
                            <div className="bg-gray-200 text-gray-400 py-2 px-4 rounded flex items-center justify-center gap-2">
                              <EyeOff className="h-4 w-4" />
                              클릭해서 보기
                            </div>
                          ) : (
                            <div className="font-medium text-indigo-600">
                              {mode === 'ko-to-en' ? englishWord : koreanWord}
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

        {/* 액션 버튼 */}
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