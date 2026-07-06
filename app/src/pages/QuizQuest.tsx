import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { addRelationshipXP } from '@/lib/db';

const STORAGE_KEY = 'lovestory-quiz-quest';

interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number; // 0-3
  createdBy: 'preset' | 'custom';
}

interface QuizData {
  questions: QuizQuestion[];
  scores: { correct: number; total: number };
  answeredIds: string[];
}

const PRESET_QUESTIONS: QuizQuestion[] = [
  {
    id: 'preset-1',
    question: 'Apa warna favorit pasanganmu?',
    options: ['Merah', 'Biru', 'Hijau', 'Pink'],
    correctIndex: 3,
    createdBy: 'preset',
  },
  {
    id: 'preset-2',
    question: 'Makanan apa yang paling sering dipesan pasanganmu?',
    options: ['Nasi Goreng', 'Mie Ayam', 'Sate', 'Bakso'],
    correctIndex: 0,
    createdBy: 'preset',
  },
  {
    id: 'preset-3',
    question: 'Film genre apa yang paling disukai pasanganmu?',
    options: ['Horror', 'Romantis', 'Action', 'Komedi'],
    correctIndex: 1,
    createdBy: 'preset',
  },
  {
    id: 'preset-4',
    question: 'Kapan pertama kali kalian bertemu?',
    options: ['Di sekolah', 'Di kampus', 'Online', 'Lewat teman'],
    correctIndex: 2,
    createdBy: 'preset',
  },
  {
    id: 'preset-5',
    question: 'Apa hobi yang paling disukai pasanganmu?',
    options: ['Membaca', 'Gaming', 'Olahraga', 'Masak'],
    correctIndex: 1,
    createdBy: 'preset',
  },
  {
    id: 'preset-6',
    question: 'Lagu apa yang mengingatkanmu pada pasanganmu?',
    options: ['Lagu pop', 'Lagu indie', 'Lagu K-pop', 'Lagu lawas'],
    correctIndex: 0,
    createdBy: 'preset',
  },
  {
    id: 'preset-7',
    question: 'Minuman favorit pasanganmu adalah?',
    options: ['Kopi', 'Teh', 'Boba', 'Jus buah'],
    correctIndex: 2,
    createdBy: 'preset',
  },
  {
    id: 'preset-8',
    question: 'Pasanganmu lebih suka liburan ke mana?',
    options: ['Pantai', 'Gunung', 'Kota besar', 'Di rumah saja'],
    correctIndex: 0,
    createdBy: 'preset',
  },
  {
    id: 'preset-9',
    question: 'Apa hadiah yang paling berkesan untuk pasanganmu?',
    options: ['Bunga', 'Surat cinta', 'Barang handmade', 'Surprise date'],
    correctIndex: 3,
    createdBy: 'preset',
  },
  {
    id: 'preset-10',
    question: 'Kebiasaan unik pasanganmu saat tidur?',
    options: ['Mendengkur', 'Bicara sendiri', 'Peluk guling', 'Tidur tengkurap'],
    correctIndex: 2,
    createdBy: 'preset',
  },
];

const DEFAULT_DATA: QuizData = {
  questions: PRESET_QUESTIONS,
  scores: { correct: 0, total: 0 },
  answeredIds: [],
};

const loadData = (): QuizData => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_DATA;
  const parsed = JSON.parse(raw);
  // Ensure preset questions are always present
  const existingIds = new Set(parsed.questions?.map((q: QuizQuestion) => q.id) || []);
  const missingPresets = PRESET_QUESTIONS.filter(pq => !existingIds.has(pq.id));
  return {
    ...DEFAULT_DATA,
    ...parsed,
    questions: [...(parsed.questions || []), ...missingPresets],
  };
};

const saveData = (data: QuizData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const playCorrectSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08);
    osc.frequency.setValueAtTime(784, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (_e) { /* ignored */ }
};

const playWrongSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (_e) { /* ignored */ }
};

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

const QuizQuest: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<QuizData>(loadData);
  const [mode, setMode] = useState<'menu' | 'create' | 'answer'>('menu');

  // Create mode state
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);

  // Answer mode state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerResult, setAnswerResult] = useState<'correct' | 'wrong' | null>(null);
  const [sessionScore, setSessionScore] = useState({ correct: 0, total: 0 });
  const [unansweredQuestions, setUnansweredQuestions] = useState<QuizQuestion[]>([]);
  const [showReward, setShowReward] = useState<string | null>(null);
  const [quizComplete, setQuizComplete] = useState(false);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const startAnswerMode = useCallback(() => {
    // Filter out already-answered questions for this session
    const unanswered = data.questions.filter(q => !data.answeredIds.includes(q.id));
    if (unanswered.length === 0) {
      // Reset answered IDs to allow replay
      setData(prev => ({ ...prev, answeredIds: [] }));
      setUnansweredQuestions(data.questions);
    } else {
      setUnansweredQuestions(unanswered);
    }
    setCurrentQuestionIndex(0);
    setSessionScore({ correct: 0, total: 0 });
    setQuizComplete(false);
    setAnswerResult(null);
    setMode('answer');
  }, [data]);

  const handleAnswer = async (selectedIndex: number) => {
    if (answerResult !== null) return; // Prevent double-click

    const currentQ = unansweredQuestions[currentQuestionIndex];
    const isCorrect = selectedIndex === currentQ.correctIndex;

    setAnswerResult(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      playCorrectSound();
      await addRelationshipXP(10, 'trust');
      setShowReward('+10 Trust XP! 🎯');
      setTimeout(() => setShowReward(null), 2000);
    } else {
      playWrongSound();
    }

    setSessionScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setData(prev => ({
      ...prev,
      scores: {
        correct: prev.scores.correct + (isCorrect ? 1 : 0),
        total: prev.scores.total + 1,
      },
      answeredIds: [...prev.answeredIds, currentQ.id],
    }));

    // Move to next question after delay
    setTimeout(() => {
      setAnswerResult(null);
      if (currentQuestionIndex + 1 >= unansweredQuestions.length) {
        setQuizComplete(true);
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }, 1500);
  };

  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || newOptions.some(o => !o.trim())) return;

    const question: QuizQuestion = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      question: newQuestion.trim(),
      options: newOptions.map(o => o.trim()) as [string, string, string, string],
      correctIndex: newCorrectIndex,
      createdBy: 'custom',
    };

    setData(prev => ({
      ...prev,
      questions: [...prev.questions, question],
    }));

    setNewQuestion('');
    setNewOptions(['', '', '', '']);
    setNewCorrectIndex(0);
  };

  const handleDeleteQuestion = (id: string) => {
    setData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id),
      answeredIds: prev.answeredIds.filter(aid => aid !== id),
    }));
  };

  const resetScores = () => {
    setData(prev => ({
      ...prev,
      scores: { correct: 0, total: 0 },
      answeredIds: [],
    }));
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#0c0a18] relative flex flex-col overflow-hidden text-[#ffffff]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b-4 border-[#000000] bg-[#121224] px-4 py-3 w-full shrink-0">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
          <PixelButton
            onClick={() => {
              if (mode !== 'menu') { setMode('menu'); }
              else navigate('/home');
            }}
            variant="secondary"
            size="sm"
            className="text-[9px] shrink-0"
          >
            ← {mode === 'menu' ? 'MENU' : 'BACK'}
          </PixelButton>
          <div className="text-center select-none">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#ffffff] leading-none">
              QUIZ QUEST
            </h1>
            <p className="font-['VT323'] text-xs text-[#ff69b4] mt-1 tracking-wider hidden sm:block font-bold">
              Seberapa kenal kamu dengan pasanganmu?
            </p>
          </div>
          <div className="w-16 sm:w-20" />
        </div>
      </header>

      {/* Reward Notification */}
      {showReward && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#121224] border-4 border-[#000000] p-4 text-center shadow-[4px_4px_0_#000000] animate-bounce w-[90%] max-w-sm">
          <div className="font-['Press_Start_2P'] text-[#ffb300] text-[9px] font-bold">
            🌟 {showReward}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-5 overflow-y-auto z-10 space-y-6">

        {/* MENU MODE */}
        {mode === 'menu' && (
          <>
            {/* Arcade Header */}
            <div className="bg-[#121224] border-4 border-[#000000] p-6 shadow-[4px_4px_0_#000000] text-center">
              <div className="text-4xl select-none mb-3">🎮🧠</div>
              <h2 className="font-['Press_Start_2P'] text-[10px] text-[#ff69b4] font-bold mb-2">
                CO-OP QUIZ QUEST
              </h2>
              <p className="font-['VT323'] text-base text-[#a0a0b0]">
                Uji seberapa kenal kamu dengan pasanganmu!
              </p>
            </div>

            {/* Score Display */}
            <div className="bg-[#121224] border-4 border-[#000000] p-4 shadow-[4px_4px_0_#000000]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl select-none">🏆</span>
                  <div>
                    <h3 className="font-['Press_Start_2P'] text-[8px] text-[#ffb300] font-bold">
                      ALL-TIME SCORE
                    </h3>
                    <p className="font-['VT323'] text-xl text-[#ffffff] font-bold">
                      {data.scores.correct} / {data.scores.total}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-['Press_Start_2P'] text-[8px] text-[#a0a0b0]">
                    {data.scores.total > 0
                      ? `${Math.round((data.scores.correct / data.scores.total) * 100)}%`
                      : '0%'
                    }
                  </p>
                  <p className="font-['VT323'] text-sm text-[#a0a0b0]">
                    {data.questions.length} pertanyaan
                  </p>
                </div>
              </div>
              {data.scores.total > 0 && (
                <div className="mt-3 h-3 w-full bg-[#1a1a2a] border-2 border-[#000000]">
                  <div
                    className="h-full bg-[#ffb300]"
                    style={{ width: `${Math.round((data.scores.correct / data.scores.total) * 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Mode Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={startAnswerMode}
                className="bg-[#121224] border-4 border-[#000000] p-6 shadow-[4px_4px_0_#000000] hover:bg-[#1a1a2a] transition-colors text-center group"
              >
                <span className="text-3xl select-none block mb-3 group-hover:scale-110 transition-transform">🎯</span>
                <h3 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] font-bold mb-1">
                  JAWAB PERTANYAAN
                </h3>
                <p className="font-['VT323'] text-sm text-[#a0a0b0]">
                  Jawab quiz dan dapatkan XP!
                </p>
              </button>

              <button
                onClick={() => setMode('create')}
                className="bg-[#121224] border-4 border-[#000000] p-6 shadow-[4px_4px_0_#000000] hover:bg-[#1a1a2a] transition-colors text-center group"
              >
                <span className="text-3xl select-none block mb-3 group-hover:scale-110 transition-transform">✏️</span>
                <h3 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] font-bold mb-1">
                  BUAT PERTANYAAN
                </h3>
                <p className="font-['VT323'] text-sm text-[#a0a0b0]">
                  Buat quiz untuk pasanganmu!
                </p>
              </button>
            </div>

            {/* Reset button */}
            {data.scores.total > 0 && (
              <div className="text-center">
                <PixelButton onClick={resetScores} variant="secondary" size="sm" className="text-[8px]">
                  🔄 RESET SKOR
                </PixelButton>
              </div>
            )}
          </>
        )}

        {/* CREATE MODE */}
        {mode === 'create' && (
          <>
            <form onSubmit={handleCreateQuestion} className="bg-[#121224] border-4 border-[#000000] p-4 sm:p-5 shadow-[4px_4px_0_#000000] space-y-4">
              <h2 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] font-bold uppercase tracking-wider border-b-2 border-[#000000] pb-2 select-none">
                ✏️ BUAT PERTANYAAN BARU
              </h2>

              <div>
                <label className="font-['Press_Start_2P'] text-[7px] text-[#a0a0b0] mb-2 block select-none">
                  PERTANYAAN
                </label>
                <textarea
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="Tulis pertanyaan tentang pasanganmu..."
                  required
                  rows={2}
                  className="w-full px-3 py-2 bg-[#1a1a2a] border-2 border-[#000000] text-white focus:outline-none focus:border-[#ff69b4] font-['VT323'] text-lg placeholder-[#a0a0b0]/40 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="font-['Press_Start_2P'] text-[7px] text-[#a0a0b0] block select-none">
                  PILIHAN JAWABAN (tap untuk menandai jawaban benar)
                </label>
                {newOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNewCorrectIndex(i)}
                      className={`w-8 h-8 shrink-0 font-['Press_Start_2P'] text-[9px] border-2 border-[#000000] flex items-center justify-center transition-all ${
                        newCorrectIndex === i
                          ? 'bg-[#ff69b4] text-white shadow-[2px_2px_0_#000000]'
                          : 'bg-[#1a1a2a] text-[#a0a0b0] hover:bg-[#222235]'
                      }`}
                    >
                      {OPTION_LABELS[i]}
                    </button>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const updated = [...newOptions];
                        updated[i] = e.target.value;
                        setNewOptions(updated);
                      }}
                      placeholder={`Jawaban ${OPTION_LABELS[i]}`}
                      required
                      className="flex-1 px-3 py-2 bg-[#1a1a2a] border-2 border-[#000000] text-white focus:outline-none focus:border-[#ff69b4] font-['VT323'] text-lg placeholder-[#a0a0b0]/40"
                    />
                    {newCorrectIndex === i && (
                      <span className="text-sm select-none">✅</span>
                    )}
                  </div>
                ))}
              </div>

              <PixelButton type="submit" className="w-full py-3 text-[9px]">
                💾 SIMPAN PERTANYAAN
              </PixelButton>
            </form>

            {/* Custom Questions List */}
            <div className="space-y-3">
              <h3 className="font-['Press_Start_2P'] text-[9px] text-[#ff69b4] font-bold select-none">
                📋 PERTANYAAN CUSTOM ({data.questions.filter(q => q.createdBy === 'custom').length})
              </h3>
              {data.questions.filter(q => q.createdBy === 'custom').map(q => (
                <div key={q.id} className="bg-[#121224] border-4 border-[#000000] p-3 shadow-[4px_4px_0_#000000]">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-['VT323'] text-lg text-[#ffffff] flex-1">
                      {q.question}
                    </p>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="text-[#a0a0b0] hover:text-[#ff69b4] font-['VT323'] text-sm shrink-0"
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {q.options.map((opt, i) => (
                      <span
                        key={i}
                        className={`font-['VT323'] text-sm px-2 py-1 border border-[#000000] ${
                          i === q.correctIndex ? 'bg-[#ff69b4] text-white' : 'bg-[#1a1a2a] text-[#a0a0b0]'
                        }`}
                      >
                        {OPTION_LABELS[i]}: {opt}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ANSWER MODE */}
        {mode === 'answer' && !quizComplete && unansweredQuestions.length > 0 && (
          <>
            {/* Progress Bar */}
            <div className="bg-[#121224] border-4 border-[#000000] p-3 shadow-[4px_4px_0_#000000]">
              <div className="flex justify-between items-center mb-2">
                <span className="font-['Press_Start_2P'] text-[7px] text-[#a0a0b0]">
                  PERTANYAAN {currentQuestionIndex + 1}/{unansweredQuestions.length}
                </span>
                <span className="font-['Press_Start_2P'] text-[7px] text-[#ffb300]">
                  SKOR: {sessionScore.correct}/{sessionScore.total}
                </span>
              </div>
              <div className="h-2 w-full bg-[#1a1a2a] border border-[#000000]">
                <div
                  className="h-full bg-[#ff69b4] transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / unansweredQuestions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className={`bg-[#121224] border-4 shadow-[4px_4px_0_#000000] p-6 transition-colors duration-300 ${
              answerResult === 'correct' ? 'border-[#4caf50] bg-[#1a2a1a]' :
              answerResult === 'wrong' ? 'border-[#f44336] bg-[#2a1a1a]' :
              'border-[#000000]'
            }`}>
              <div className="text-center mb-6">
                <span className="text-3xl select-none">❓</span>
                <p className="font-['VT323'] text-xl text-[#ffffff] mt-3 leading-relaxed">
                  {unansweredQuestions[currentQuestionIndex].question}
                </p>
              </div>

              {/* Answer feedback */}
              {answerResult && (
                <div className={`text-center mb-4 font-['Press_Start_2P'] text-[10px] ${
                  answerResult === 'correct' ? 'text-[#4caf50]' : 'text-[#f44336]'
                }`}>
                  {answerResult === 'correct' ? '✅ BENAR!' : `❌ SALAH! Jawaban: ${OPTION_LABELS[unansweredQuestions[currentQuestionIndex].correctIndex]}`}
                </div>
              )}

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {unansweredQuestions[currentQuestionIndex].options.map((opt, i) => {
                  const isCorrectAnswer = i === unansweredQuestions[currentQuestionIndex].correctIndex;
                  let optionStyle = 'bg-[#1a1a2a] border-[#000000] hover:bg-[#222235] text-[#ffffff]';

                  if (answerResult) {
                    if (isCorrectAnswer) {
                      optionStyle = 'bg-[#2a4a2a] border-[#4caf50] text-[#4caf50]';
                    } else if (!isCorrectAnswer && answerResult === 'wrong') {
                      optionStyle = 'bg-[#1a1a2a] border-[#000000]/40 text-[#a0a0b0]/50';
                    }
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      disabled={answerResult !== null}
                      className={`p-4 border-4 shadow-[3px_3px_0_#000000] text-left transition-all flex items-center gap-3 disabled:cursor-not-allowed w-full min-h-[52px] ${optionStyle}`}
                    >
                      <span className={`font-['Press_Start_2P'] text-[10px] w-7 h-7 flex items-center justify-center border-2 border-[#000000] shrink-0 ${
                        answerResult && isCorrectAnswer ? 'bg-[#4caf50] text-white' : 'bg-[#0c0a18]'
                      }`}>
                        {OPTION_LABELS[i]}
                      </span>
                      <span className="font-['VT323'] text-lg break-words flex-1">
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* QUIZ COMPLETE */}
        {mode === 'answer' && quizComplete && (
          <div className="bg-[#121224] border-4 border-[#000000] p-6 shadow-[4px_4px_0_#000000] text-center space-y-4">
            <span className="text-5xl select-none block">🏆</span>
            <h2 className="font-['Press_Start_2P'] text-[10px] text-[#ffb300] font-bold">
              QUEST COMPLETE!
            </h2>
            <div className="bg-[#1a1a2a] border-2 border-[#000000] p-4 inline-block">
              <p className="font-['Press_Start_2P'] text-[12px] text-[#ffffff]">
                {sessionScore.correct} / {sessionScore.total}
              </p>
              <p className="font-['VT323'] text-base text-[#a0a0b0] mt-1">
                {sessionScore.total > 0
                  ? `${Math.round((sessionScore.correct / sessionScore.total) * 100)}% benar`
                  : '0%'
                }
              </p>
            </div>
            <p className="font-['VT323'] text-lg text-[#ff69b4]">
              {sessionScore.correct > 0 && `Total +${sessionScore.correct * 10} Trust XP didapat!`}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <PixelButton onClick={startAnswerMode} size="sm" className="text-[9px]">
                🔄 MAIN LAGI
              </PixelButton>
              <PixelButton onClick={() => setMode('menu')} variant="secondary" size="sm" className="text-[9px]">
                ← MENU
              </PixelButton>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default QuizQuest;
