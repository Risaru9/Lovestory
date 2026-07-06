import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelButton } from '@/components/custom/PixelButton';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { getChatMessages, saveChatMessage, updateRichStatus, getPartnerRichStatus, getRPGStats, type ChatMessage, type RPGStats } from '@/lib/db';
import { useAuth } from '@/contexts/AuthContext';

const playClickSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
};

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { profile, partner, coupleInfo } = useAuth();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [rpgStats, setRpgStats] = useState<RPGStats | null>(null);
  
  // My rich statuses
  const [myBattery, setMyBattery] = useState<number>(100);
  const [myIsCharging, setMyIsCharging] = useState(false);
  const [myActivity, setMyActivity] = useState('Sedang santai');
  const [myOnlineStatus, setMyOnlineStatus] = useState('online'); // 'online' | 'offline' | 'dnd'
  
  // Privacy preferences
  const [shareBattery, setShareBattery] = useState(true);
  const [shareActivity, setShareActivity] = useState(true);

  // Partner rich status
  const [partnerStatus, setPartnerStatus] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const partnerId = partner?.id;
  const coupleId = coupleInfo?.id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Load Messages & RPG Stats
  const loadInitialData = async () => {
    try {
      const chatList = await getChatMessages();
      setMessages(chatList);
      const stats = await getRPGStats();
      setRpgStats(stats);
      
      const pStatus = await getPartnerRichStatus();
      if (pStatus) setPartnerStatus(pStatus);
    } catch (err) {
      console.error('Gagal load data chat awal:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [coupleId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 2. Track Battery API
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBatteryDetails = () => {
          setMyBattery(Math.round(battery.level * 100));
          setMyIsCharging(battery.charging);
        };
        updateBatteryDetails();
        battery.addEventListener('levelchange', updateBatteryDetails);
        battery.addEventListener('chargingchange', updateBatteryDetails);
        
        return () => {
          battery.removeEventListener('levelchange', updateBatteryDetails);
          battery.removeEventListener('chargingchange', updateBatteryDetails);
        };
      });
    }
  }, []);

  // 3. Real-time updates to Supabase (debounced/throttled on status changes)
  useEffect(() => {
    const syncStatus = async () => {
      await updateRichStatus({
        battery_level: shareBattery ? myBattery : undefined,
        is_charging: shareBattery ? myIsCharging : undefined,
        current_activity: shareActivity ? myActivity : undefined,
        online_status: myOnlineStatus,
      });
    };
    syncStatus();
  }, [myBattery, myIsCharging, myActivity, myOnlineStatus, shareBattery, shareActivity]);

  // 4. Supabase Real-time Listener (100% Real-time sync)
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase || !coupleId || !partnerId) {
      // Offline local simulator: generate partner replies occasionally
      const interval = setInterval(() => {
        const responses = [
          'Kangen kamu nih... 💕',
          'Lagi ngapain? 🎮',
          'Udah check-in harian belum hari ini?',
          'Nanti sore jadi jalan kan? 🍜',
          'Semangat ya kerjanya! 🥰',
        ];
        const randomMsg = responses[Math.floor(Math.random() * responses.length)];
        
        setMessages((prev) => [
          ...prev,
          {
            id: `partner-mock-${Date.now()}`,
            sender_id: partnerId || 'partner',
            message: randomMsg,
            created_at: new Date().toISOString(),
          },
        ]);
        
        // Mock partner status update
        setPartnerStatus({
          name: partner?.name || 'Pasangan',
          battery_level: Math.floor(Math.random() * 40) + 60,
          is_charging: Math.random() > 0.7,
          current_activity: 'Menulis pesan...',
          online_status: 'online',
        });
      }, 25000);

      return () => clearInterval(interval);
    }

    // Subscribe to Profiles updates (Real-time partner status)
    const profileChannel = supabase
      .channel('realtime:partner_status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${partnerId}`,
        },
        (payload) => {
          if (payload.new) {
            setPartnerStatus(payload.new);
          }
        }
      )
      .subscribe();

    // Subscribe to Chat Messages updates (Real-time messages)
    const chatChannel = supabase
      .channel('realtime:chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          if (payload.new) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.new.id)) return prev;
              return [...prev, payload.new as ChatMessage];
            });
            // Play retro tap sound on message arrival
            playClickSound();
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(profileChannel);
        supabase.removeChannel(chatChannel);
      }
    };
  }, [coupleId, partnerId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    setInputText('');
    playClickSound();
    try {
      const saved = await saveChatMessage(inputText);
      setMessages((prev) => {
        if (prev.some((m) => m.id === saved.id)) return prev;
        return [...prev, saved];
      });
      // Fetch latest stats to show XP increase (+2 Trust XP)
      const stats = await getRPGStats();
      setRpgStats(stats);
    } catch (err) {
      console.error('Gagal mengirim pesan:', err);
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-[#0c0a18] relative flex flex-col overflow-hidden text-[#ffffff]">
      
      {/* Jukebox header style for consistent dark blue retro theme */}
      <header className="sticky top-0 z-40 border-b-4 border-[#000000] bg-[#121224] px-4 py-3 w-full shrink-0">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
          <PixelButton onClick={() => navigate('/home')} variant="secondary" size="sm" className="text-[9px] shrink-0">
            ← MENU
          </PixelButton>

          <div className="text-center select-none flex-1">
            <h1 className="font-['Press_Start_2P'] text-[10px] md:text-xs text-[#ffffff] leading-none uppercase">
              COUPLE CHAT
            </h1>
            <p className="font-['VT323'] text-xs text-[#ff69b4] mt-1 tracking-wider font-bold">
              Hubungan: {partner?.name || 'Pasangan'} • Level {rpgStats?.level ?? 1}
            </p>
          </div>

          <div className="w-16 sm:w-20" /> {/* Spacer */}
        </div>
      </header>

      {/* Partner Rich Status Banner - Realtime voluntary info */}
      <div className="bg-[#1a1a32] border-b-4 border-[#000000] px-4 py-2 text-white shrink-0 select-none">
        <div className="max-w-4xl mx-auto flex flex-row flex-wrap items-center justify-between gap-2 text-xs font-['VT323'] tracking-wide">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 ${
              partnerStatus?.online_status === 'dnd'
                ? 'bg-red-500 animate-pulse'
                : partnerStatus?.online_status === 'online' || !isSupabaseConfigured()
                ? 'bg-green-500 animate-ping'
                : 'bg-gray-500'
            }`} />
            <span className="font-['Press_Start_2P'] text-[6px] sm:text-[7px] text-white font-bold shrink-0">
              {partner?.name || 'Partner'}:
            </span>
            <span className="text-[#a0a0b0] font-semibold truncate text-[11px] sm:text-xs">
              {partnerStatus?.current_activity || 'Sedang memikirkanmu...'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {partnerStatus?.battery_level !== undefined && (
              <div className="flex items-center gap-1 bg-black/30 px-1.5 py-0.5 rounded border border-black/45 text-[10px] sm:text-xs">
                <span>🔋 {partnerStatus.battery_level}%</span>
                {partnerStatus.is_charging && <span className="text-[#ffb300]">⚡</span>}
              </div>
            )}
            {partnerStatus?.online_status === 'dnd' && (
              <span className="text-red-400 bg-red-950/20 px-1.5 py-0.5 rounded border border-red-500/30 text-[7px] sm:text-[8px] font-['Press_Start_2P']">
                DND
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-4 overflow-y-auto z-10 flex flex-col gap-3 custom-scrollbar">
        {messages.map((msg) => {
          const isMe = msg.sender_id === profile?.id || msg.sender_id === 'me';
          const timeString = new Date(msg.created_at).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] md:max-w-[70%] ${
                isMe ? 'self-end items-end' : 'self-start items-start'
              }`}
            >
              <div
                className={`px-3 py-2 border-2 rounded-xl text-sm leading-relaxed ${
                  isMe
                    ? 'bg-[#1a1a2e] border-black text-[#ffffff] shadow-[2px_2px_0_#000000]'
                    : 'bg-[#ff69b4] border-black text-black shadow-[2px_2px_0_#000000] font-semibold'
                }`}
              >
                <p className="font-['VT323'] text-base sm:text-lg break-words">{msg.message}</p>
              </div>
              <span className="text-[9px] text-[#a0a0b0] mt-1 font-['VT323'] select-none px-1">
                {timeString}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input controls & Voluntary sharing settings */}
      <div className="bg-[#121224] border-t-4 border-[#000000] p-3 w-full shrink-0 z-20">
        <div className="max-w-4xl mx-auto space-y-3">
          
          {/* Voluntary settings panel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-black/20 p-2.5 rounded-lg border border-black/40 text-xs font-['VT323'] select-none">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
              <span className="text-[#ffb300] font-bold shrink-0">STATUS KU:</span>
              <select
                value={myOnlineStatus}
                onChange={(e) => setMyOnlineStatus(e.target.value)}
                className="bg-[#1a1a2a] border border-[#000000] px-2 py-1 text-white rounded focus:outline-none text-xs min-h-[36px]"
              >
                <option value="online">🟢 ONLINE</option>
                <option value="dnd">🔴 FOKUS (DND)</option>
                <option value="offline">⚪ OFFLINE</option>
              </select>

              <input
                type="text"
                value={myActivity}
                onChange={(e) => setMyActivity(e.target.value)}
                maxLength={40}
                placeholder="Aktivitas saat ini..."
                className="bg-[#1a1a2a] border border-[#000000] px-2 py-1 text-white rounded focus:outline-none placeholder:text-white/20 text-xs flex-1 sm:flex-initial sm:w-48 min-h-[36px]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-black/20 pt-2 md:pt-0 md:border-t-0 w-full md:w-auto justify-start md:justify-end">
              <label className="flex items-center gap-2 cursor-pointer text-[#a0a0b0] py-1">
                <input
                  type="checkbox"
                  checked={shareBattery}
                  onChange={(e) => setShareBattery(e.target.checked)}
                  className="accent-[#ff69b4] cursor-pointer w-4 h-4"
                />
                Share Baterai
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-[#a0a0b0] py-1">
                <input
                  type="checkbox"
                  checked={shareActivity}
                  onChange={(e) => setShareActivity(e.target.checked)}
                  className="accent-[#ff69b4] cursor-pointer w-4 h-4"
                />
                Share Aktivitas
              </label>
            </div>
          </div>

          {/* Form message input */}
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik pesan manismu..."
              className="flex-1 px-3.5 py-2.5 bg-[#1a1a2a] border-2 border-[#000000] rounded-xl text-white focus:outline-none focus:border-[#ff69b4] font-['VT323'] text-base placeholder-[#a0a0b0]/40 min-h-[44px]"
            />
            <PixelButton
              type="submit"
              disabled={!inputText.trim()}
              className="px-6 text-[9px] min-h-[44px] shrink-0"
            >
              KIRIM
            </PixelButton>
          </form>
        </div>
      </div>

    </div>
  );
};

export default Chat;
