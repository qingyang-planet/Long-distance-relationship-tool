import {useEffect, useState, useCallback, useRef, type ReactNode, type MouseEvent} from 'react';
import {useAuth} from '../contexts/AuthContext';
import {
  subscribeCoupleData,
  subscribeThinkEvents,
  subscribeThinkLetters,
  sendLetter,
  updateMemberProfile,
  saveMeeting,
  addWish,
  toggleWish,
  deleteWish,
  incrementThinkCount,
} from '../lib/coupleService';
import type {CoupleMember, Meeting, ThinkLetter, Wish} from '../lib/types';
import {QUOTE_TEXTS, EMOJI_OPTIONS, TIMEZONE_OPTIONS} from '../lib/constants';
import {MoonGraphic} from '../components/MoonGraphic';
import {Toolbox} from '../components/Toolbox';
import {useHeartParticles} from '../components/HeartOverlay';

function formatTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getTimeInTimezone(tz: number): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + tz * 3600000);
}

function calcCountdown(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return {days: 0, hours: 0, mins: 0, secs: 0, expired: true};
  let s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86400);
  s %= 86400;
  const hours = Math.floor(s / 3600);
  s %= 3600;
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return {days, hours, mins, secs, expired: false};
}

export function Home() {
  const {user, coupleId, logout} = useAuth();
  const [members, setMembers] = useState<CoupleMember[]>([]);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [thinkCounts, setThinkCounts] = useState<Record<string, number>>({});
  const [letters, setLetters] = useState<ThinkLetter[]>([]);
  const [expandedLetters, setExpandedLetters] = useState(false);
  const [letterInput, setLetterInput] = useState('');
  const [countdown, setCountdown] = useState(calcCountdown(''));
  const [, setTick] = useState(0);

  const [showProfile, setShowProfile] = useState(false);
  const [showNaming, setShowNaming] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiTarget, setEmojiTarget] = useState<'self' | 'partner'>('self');

  const [profileForm, setProfileForm] = useState({city: '', timezone: 8});
  const [namingForm, setNamingForm] = useState({nickname: '', partnerNameHint: ''});
  const [meetingForm, setMeetingForm] = useState({time: '', place: ''});
  const [wishInput, setWishInput] = useState('');
  const [currentQuote, setCurrentQuote] = useState(-1);
  const [incomingModal, setIncomingModal] = useState<{
    senderId: string;
    count: number;
    quote: string;
  } | null>(null);
  const seenEventsRef = useRef<Set<string>>(new Set());
  const {spawnHeart, celebrate, overlay: heartOverlay} = useHeartParticles();

  const me = members.find((m) => m.userId === user?.uid);
  const partner = members.find((m) => m.userId !== user?.uid);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeCoupleData(coupleId, (data) => {
      setMembers(data.members);
      setMeeting(data.meeting);
      setWishes(data.wishes);
      setThinkCounts(data.thinkCounts);
    });
  }, [coupleId]);

  useEffect(() => {
    if (!coupleId) return;
    return subscribeThinkLetters(coupleId, (nextLetters) => {
      setLetters(nextLetters);
    });
  }, [coupleId]);

  useEffect(() => {
    if (!coupleId || !user) return;
    return subscribeThinkEvents(coupleId, user.uid, (event) => {
      if (seenEventsRef.current.has(event.id)) return;
      seenEventsRef.current.add(event.id);
      const quote = QUOTE_TEXTS[event.quoteIndex] ?? QUOTE_TEXTS[0];
      setIncomingModal((prev) => {
        const count = thinkCounts[event.senderId] ?? 1;
        if (prev) return prev;
        return {senderId: event.senderId, count, quote};
      });
    });
  }, [coupleId, user, thinkCounts]);

  useEffect(() => {
    if (!meeting) return;
    const timer = setInterval(() => {
      setCountdown(calcCountdown(meeting.meetingAt));
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [meeting]);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleThink = useCallback(
    async (e?: MouseEvent) => {
      if (!coupleId || !user) return;
      if (e) {
        spawnHeart(e.clientX, e.clientY);
      } else {
        celebrate();
      }
      let idx: number;
      do {
        idx = Math.floor(Math.random() * QUOTE_TEXTS.length);
      } while (idx === currentQuote);
      setCurrentQuote(idx);
      await incrementThinkCount(coupleId, user.uid, idx);
    },
    [coupleId, user, currentQuote, spawnHeart, celebrate],
  );

  const handleSaveProfile = async () => {
    if (!coupleId || !user) return;
    await updateMemberProfile(coupleId, user.uid, {
      city: profileForm.city,
      timezone: profileForm.timezone,
    });
    setShowProfile(false);
  };

  const handleSaveNaming = async () => {
    if (!coupleId || !user) return;
    await updateMemberProfile(coupleId, user.uid, {
      nickname: namingForm.nickname,
      partnerNameHint: namingForm.partnerNameHint,
    });
    setShowNaming(false);
  };

  const handleSaveMeeting = async () => {
    if (!coupleId || !user) return;
    await saveMeeting(coupleId, user.uid, meetingForm.time, meetingForm.place);
    setShowMeeting(false);
  };

  const handleSendLetter = async () => {
    if (!coupleId || !user || !letterInput.trim()) return;
    await sendLetter(coupleId, user.uid, letterInput);
    setLetterInput('');
  };

  const handleEmojiSelect = async (emoji: string) => {
    if (!coupleId || !user) return;
    const targetId = emojiTarget === 'self' ? user.uid : partner?.userId;
    if (!targetId) return;
    if (emojiTarget === 'self') {
      await updateMemberProfile(coupleId, user.uid, {emoji});
    }
    setShowEmoji(false);
  };

  const openProfile = () => {
    setProfileForm({city: me?.city ?? '', timezone: me?.timezone ?? 8});
    setShowProfile(true);
  };

  const openNaming = () => {
    setNamingForm({
      nickname: me?.nickname ?? '',
      partnerNameHint: me?.partnerNameHint ?? '',
    });
    setShowNaming(true);
  };

  const cityDatabase: Record<string, [number, number]> = {
    北京: [39.9, 116.4], 上海: [31.2, 121.5], 广州: [23.1, 113.3], 深圳: [22.5, 114.1],
    杭州: [30.3, 120.2], 成都: [30.6, 104.1], 重庆: [29.6, 106.6], 西安: [34.3, 108.9],
    伦敦: [51.5, -0.1], london: [51.5, -0.1], 纽约: [40.7, -74.0], 'new york': [40.7, -74.0],
    巴黎: [48.9, 2.3], paris: [48.9, 2.3], 东京: [35.7, 139.7], tokyo: [35.7, 139.7],
    悉尼: [-33.9, 151.2], sydney: [-33.9, 151.2], 新加坡: [1.3, 103.8], singapore: [1.3, 103.8],
    洛杉矶: [34.1, -118.2], 'los angeles': [34.1, -118.2], 旧金山: [37.8, -122.4], 'san francisco': [37.8, -122.4],
    温哥华: [49.3, -123.1], vancouver: [49.3, -123.1], 多伦多: [43.7, -79.4], toronto: [43.7, -79.4],
    墨尔本: [-37.8, 145.0], melbourne: [-37.8, 145.0], 波士顿: [42.4, -71.1], boston: [42.4, -71.1],
    香港: [22.3, 114.2], 台北: [25.0, 121.6], 首尔: [37.6, 127.0], seoul: [37.6, 127.0],
  };

  const calculateHaversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const resolveCityCoord = (city: string): [number, number] | null => {
    const input = city.trim().toLowerCase();
    if (!input) return null;
    for (const key in cityDatabase) {
      if (input.includes(key.toLowerCase()) || key.toLowerCase().includes(input)) {
        return cityDatabase[key];
      }
    }
    return null;
  };

  const distanceText = (() => {
    const c1 = resolveCityCoord(me?.city ?? '');
    const c2 = resolveCityCoord(partner?.city ?? '');
    if (!c1 || !c2) return '-- km';
    return `${calculateHaversine(c1[0], c1[1], c2[0], c2[1])} km`;
  })();

  const openMeeting = () => {
    setMeetingForm({
      time: meeting?.meetingAt?.slice(0, 16) ?? '',
      place: meeting?.place ?? '',
    });
    setShowMeeting(true);
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  if (!user || !coupleId) return null;

  return (
    <div className="min-h-screen bg-cream-100 font-sans text-charcoal-800 pb-10">
      {heartOverlay}
      <main className="w-full max-w-md mx-auto px-4 pt-6 flex flex-col gap-6">

        {/* Header */}
        <header className="bg-white rounded-[2.25rem] p-6 text-center shadow-lg border border-cream-200/40 relative fade-in">
          <button
            onClick={logout}
            className="absolute top-4 right-4 text-xs text-charcoal-600/60 hover:text-love-500"
          >
            退出
          </button>
          <MoonGraphic />
          <h1 className="font-serif text-2xl font-bold tracking-wider mb-1">千里共婵娟</h1>
          <p className="text-xs text-charcoal-600/80 font-serif mb-5 px-4 leading-relaxed">
            即使不在同一个时区，也要认真分享生活，认真等待见面。
          </p>

          {me && partner ? (
            <div className="flex items-center justify-between px-2">
              <MemberCard
                member={me}
                label={me.nickname || '我'}
                color="love"
                time={formatTime(getTimeInTimezone(me.timezone))}
                onEmojiClick={() => { setEmojiTarget('self'); setShowEmoji(true); }}
              />
              <div className="flex-grow flex flex-col items-center px-1">
                <div className="text-love-500 text-lg">💕</div>
                <span className="text-[0.65rem] text-charcoal-600 font-mono mt-1">已连接</span>
                <span className="text-[0.65rem] text-charcoal-600 font-mono mt-1">{distanceText}</span>
              </div>
              <MemberCard
                member={partner}
                label={partner.nickname || me.partnerNameHint || 'TA'}
                color="cyanic"
                time={formatTime(getTimeInTimezone(partner.timezone))}
                onEmojiClick={() => { setEmojiTarget('self'); setShowEmoji(true); }}
              />
            </div>
          ) : (
            <p className="text-sm text-charcoal-600">等待 TA 加入空间...</p>
          )}

          <button
            onClick={openProfile}
            className="mt-4 text-xs text-charcoal-600/70 hover:text-love-500 border border-cream-200 rounded-full px-3 py-1.5 transition"
          >
            修改我的坐标
          </button>
          <button
            onClick={openNaming}
            className="mt-2 text-xs text-charcoal-600/70 hover:text-love-500 border border-cream-200 rounded-full px-3 py-1.5 transition"
          >
            修改彼此称呼
          </button>
        </header>

        {/* Countdown */}
        <section className="bg-white rounded-[2.25rem] p-6 shadow-lg border border-cream-200/40">
          <h2 className="text-xs font-bold tracking-widest text-charcoal-600 uppercase mb-4">
            ⏰ 下次相聚倒计时
          </h2>
          {meeting ? (
            <>
              <div className="grid grid-cols-4 gap-1 mb-4 text-center">
                {[
                  {val: countdown.days, label: '天', color: 'text-love-600'},
                  {val: countdown.hours, label: '时', color: 'text-charcoal-800'},
                  {val: countdown.mins, label: '分', color: 'text-charcoal-800'},
                  {val: countdown.secs, label: '秒', color: 'text-cyanic-600'},
                ].map(({val, label, color}) => (
                  <div key={label} className="bg-cream-100/40 border border-cream-200/50 rounded-2xl py-3">
                    <span className={`block font-mono text-2xl font-bold ${color}`}>
                      {pad(val)}
                    </span>
                    <span className="text-[0.62rem] text-charcoal-600">{label}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-charcoal-600 border-t border-cream-100 pt-3">
                <span>📍 {meeting.place}</span>
                <button onClick={openMeeting} className="text-love-500">修改</button>
              </div>
              {countdown.expired && (
                <p className="mt-3 text-center text-sm font-bold text-love-600">
                  今天就是见面的日子！✨
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-charcoal-600 mb-3">记录下一次拥抱的时间</p>
              <button
                onClick={openMeeting}
                className="text-xs bg-cream-100 hover:bg-cream-200 rounded-full px-5 py-2.5 transition"
              >
                + 记录见面计划
              </button>
            </div>
          )}
        </section>

        {/* Think of you */}
        <section className="bg-white rounded-[2.25rem] p-6 shadow-lg border border-cream-200/40 text-center">
          <h2 className="text-xs font-bold tracking-widest text-charcoal-600 uppercase mb-4">
            💖 今日想你
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-love-50/30 rounded-2xl p-3 border border-love-100/20">
              <span className="text-[0.58rem] font-bold text-love-500 block">我 累计</span>
              <span className="text-xl font-mono font-bold text-love-600">
                {thinkCounts[user.uid] ?? 0}
              </span>
              <span className="text-[0.55rem] text-love-500"> 次</span>
            </div>
            <div className="bg-cyanic-50/20 rounded-2xl p-3 border border-cyanic-100/10">
              <span className="text-[0.58rem] font-bold text-cyanic-500 block">TA 累计</span>
              <span className="text-xl font-mono font-bold text-cyanic-500">
                {partner ? (thinkCounts[partner.userId] ?? 0) : 0}
              </span>
              <span className="text-[0.55rem] text-cyanic-500"> 次</span>
            </div>
          </div>
          <button
            onClick={(e) => handleThink(e)}
            className="w-14 h-14 rounded-full bg-love-50 hover:bg-love-100 border border-love-100 flex items-center justify-center mx-auto transition hover:scale-105 active:scale-95 shadow-sm hover:shadow shadow-love-200/40"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-love-500 fill-love-100/50 hover:fill-love-500 transition">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </button>
          <p className="text-[0.68rem] text-charcoal-600 mt-2">点击发射心动思念 · 对方实时收到</p>
          {currentQuote >= 0 && (
            <div className="mt-4 p-4 bg-cream-50 rounded-2xl border border-cream-200/50 text-left">
              <p className="text-sm font-serif text-charcoal-800">
                「 {QUOTE_TEXTS[currentQuote]} 」
              </p>
            </div>
          )}
        </section>

        <Toolbox />

        <section className="bg-white rounded-[2.25rem] p-6 shadow-lg border border-cream-200/40">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold tracking-widest text-charcoal-600 uppercase">
              飞鸽传信
            </h2>
            {letters.length > 3 && (
              <button
                type="button"
                onClick={() => setExpandedLetters((v) => !v)}
                className="text-[0.68rem] text-charcoal-600 hover:text-love-500"
              >
                {expandedLetters ? '收起' : '展开全部'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mb-3">
            <input
              value={letterInput}
              onChange={(e) => setLetterInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleSendLetter();
                }
              }}
              placeholder="写下想对 TA 说的话..."
              className="flex-1 text-xs bg-cream-50 border border-cream-200 rounded-full py-2.5 px-4 outline-none focus:border-love-300"
            />
            <button
              type="button"
              onClick={() => void handleSendLetter()}
              disabled={!letterInput.trim()}
              className="text-xs px-3 py-2 rounded-full border border-charcoal-800 text-charcoal-800 disabled:border-cream-200 disabled:text-charcoal-600/40"
            >
              发送
            </button>
          </div>
          <div className="space-y-2">
            {letters.length === 0 && (
              <p className="text-center text-xs text-charcoal-600/70 py-3">
                还没有留言，写第一封飞鸽传信吧
              </p>
            )}
            {(expandedLetters ? letters : letters.slice(0, 3)).map((letter) => (
              <div key={letter.id} className="bg-cream-50/70 border border-cream-200 rounded-xl p-3">
                <p className="text-[0.72rem] text-charcoal-600 mb-1">
                  {letter.senderId === user.uid ? '我 发给 TA' : 'TA 发给我'} · {new Date(letter.createdAt).toLocaleString('zh-CN')}
                </p>
                <p className="text-sm font-serif text-charcoal-800">
                  {letter.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Wishes */}
        <section className="bg-white rounded-[2.25rem] p-6 shadow-lg border border-cream-200/40">
          <h2 className="text-xs font-bold tracking-widest text-charcoal-600 uppercase mb-4">
            📍 给未来的我们 · 见面清单
          </h2>
          <div className="relative flex items-center mb-4">
            <input
              value={wishInput}
              onChange={(e) => setWishInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && wishInput.trim()) {
                  addWish(coupleId, wishInput.trim());
                  setWishInput('');
                }
              }}
              placeholder="下次见面我们要一起..."
              className="w-full text-xs bg-cream-100/40 border border-cream-200 rounded-full py-2.5 pl-4 pr-10 outline-none focus:border-love-200"
            />
            <button
              onClick={() => {
                if (!wishInput.trim()) return;
                addWish(coupleId, wishInput.trim());
                setWishInput('');
              }}
              className="absolute right-1.5 w-7 h-7 bg-love-500 hover:bg-love-600 text-white rounded-full flex items-center justify-center text-sm"
            >
              +
            </button>
          </div>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {wishes.length === 0 && (
              <p className="text-center text-xs text-charcoal-600/70 py-4 font-serif italic">
                还没有甜蜜心愿呢 ✨
              </p>
            )}
            {wishes.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-3 p-3 bg-cream-50/60 rounded-xl border border-cream-200/30"
              >
                <button
                  onClick={() => toggleWish(coupleId, w.id, !w.completed)}
                  className="flex items-center gap-2 truncate text-left"
                >
                  <span>{w.completed ? '💖' : '⚪'}</span>
                  <span
                    className={`text-xs truncate font-serif ${
                      w.completed ? 'line-through text-charcoal-600/40' : 'text-charcoal-800'
                    }`}
                  >
                    {w.text}
                  </span>
                </button>
                <button
                  onClick={() => deleteWish(coupleId, w.id)}
                  className="text-charcoal-600/50 hover:text-love-500 text-xs shrink-0"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>

        <footer className="bg-white/40 border border-white/60 rounded-[2.25rem] p-6 text-center shadow-sm fade-in">
          <p className="font-serif text-[0.82rem] leading-relaxed text-charcoal-600/95 italic">
            即使不在同一个时区，也要认真分享生活，认真等待见面。
          </p>
          <p className="text-[0.68rem] tracking-wider text-charcoal-600/65 font-mono mt-4">
            miss u, love u. — 始终相连
          </p>
        </footer>
      </main>

      {/* Profile Modal */}
      {showProfile && (
        <Modal onClose={() => setShowProfile(false)} title="修改我的坐标">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-charcoal-600 font-semibold block mb-1">我的城市</label>
              <input
                value={profileForm.city}
                onChange={(e) => setProfileForm((f) => ({...f, city: e.target.value}))}
                className="w-full text-sm bg-cream-50 border border-cream-200 rounded-xl py-2.5 px-3 outline-none focus:border-love-300"
                placeholder="北京"
              />
            </div>
            <div>
              <label className="text-xs text-charcoal-600 font-semibold block mb-1">我的时区</label>
              <select
                value={profileForm.timezone}
                onChange={(e) =>
                  setProfileForm((f) => ({...f, timezone: parseFloat(e.target.value)}))
                }
                className="w-full text-sm bg-cream-50 border border-cream-200 rounded-xl py-2.5 px-3 outline-none"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSaveProfile}
              className="w-full py-3 bg-love-500 hover:bg-love-600 text-white font-semibold text-sm rounded-full"
            >
              保存
            </button>
          </div>
        </Modal>
      )}

      {showNaming && (
        <Modal onClose={() => setShowNaming(false)} title="修改彼此称呼">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-charcoal-600 font-semibold block mb-1">我的称呼</label>
              <input
                value={namingForm.nickname}
                onChange={(e) => setNamingForm((f) => ({...f, nickname: e.target.value}))}
                className="w-full text-sm bg-cream-50 border border-cream-200 rounded-xl py-2.5 px-3 outline-none focus:border-love-300"
                placeholder="例如：瑞士 💫"
              />
            </div>
            <div>
              <label className="text-xs text-charcoal-600 font-semibold block mb-1">对方称呼</label>
              <input
                value={namingForm.partnerNameHint}
                onChange={(e) => setNamingForm((f) => ({...f, partnerNameHint: e.target.value}))}
                className="w-full text-sm bg-cream-50 border border-cream-200 rounded-xl py-2.5 px-3 outline-none focus:border-love-300"
                placeholder="例如：深圳 🐶"
              />
            </div>
            <button
              onClick={handleSaveNaming}
              className="w-full py-3 bg-love-500 hover:bg-love-600 text-white font-semibold text-sm rounded-full"
            >
              保存称呼
            </button>
          </div>
        </Modal>
      )}

      {/* Meeting Modal */}
      {showMeeting && (
        <Modal onClose={() => setShowMeeting(false)} title="规划下一次见面">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-charcoal-600 font-semibold block mb-1">日期时间</label>
              <input
                type="datetime-local"
                value={meetingForm.time}
                onChange={(e) => setMeetingForm((f) => ({...f, time: e.target.value}))}
                className="w-full text-sm bg-cream-50 border border-cream-200 rounded-xl py-2.5 px-3 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-charcoal-600 font-semibold block mb-1">见面地点</label>
              <input
                value={meetingForm.place}
                onChange={(e) => setMeetingForm((f) => ({...f, place: e.target.value}))}
                className="w-full text-sm bg-cream-50 border border-cream-200 rounded-xl py-2.5 px-3 outline-none"
                placeholder="北京首都机场"
              />
            </div>
            <button
              onClick={handleSaveMeeting}
              className="w-full py-3 bg-love-500 hover:bg-love-600 text-white font-semibold text-sm rounded-full"
            >
              锁定聚会计划 ✨
            </button>
          </div>
        </Modal>
      )}

      {/* Emoji Modal */}
      {showEmoji && (
        <Modal onClose={() => setShowEmoji(false)} title="选择我的状态">
          <div className="grid grid-cols-4 gap-3">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiSelect(emoji)}
                className="text-2xl p-2 rounded-xl border border-cream-200 hover:bg-love-50 transition"
              >
                {emoji}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Incoming love modal */}
      {incomingModal && (
        <div className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-xs rounded-[2.25rem] p-6 text-center border border-love-100">
            <div className="text-4xl mb-3 animate-bounce">📬</div>
            <h3 className="font-serif font-bold text-charcoal-800 mb-2">收到跨空爱意电波！</h3>
            <p className="text-xs text-charcoal-600 mb-3">
              TA 今天已累计对你发射了{' '}
              <strong className="text-love-600">{incomingModal.count}</strong> 次心动！
            </p>
            <div className="bg-love-50/50 rounded-xl p-3 mb-4 text-sm font-serif text-charcoal-800">
              「 {incomingModal.quote} 」
            </div>
            <button
              onClick={() => { setIncomingModal(null); handleThink(); }}
              className="w-full py-2.5 bg-love-500 hover:bg-love-600 text-white text-sm font-semibold rounded-full"
            >
              暖心收下，我也发射一个 💖
            </button>
            <button
              onClick={() => setIncomingModal(null)}
              className="w-full mt-2 py-2 text-xs text-charcoal-600"
            >
              稍后
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberCard({
  member,
  label,
  color,
  time,
  onEmojiClick,
}: {
  member: CoupleMember;
  label: string;
  color: 'love' | 'cyanic';
  time: string;
  onEmojiClick: () => void;
}) {
  const bg = color === 'love' ? 'bg-love-50 border-love-100' : 'bg-cyanic-50 border-cyanic-100';
  const timeColor = color === 'love' ? 'text-love-600 bg-love-100/55' : 'text-cyanic-600 bg-cyanic-100/55';
  return (
    <div className="flex flex-col items-center w-5/12">
      <button
        onClick={onEmojiClick}
        className={`w-14 h-14 rounded-2xl ${bg} border flex items-center justify-center text-3xl transition hover:scale-110`}
      >
        {member.emoji}
      </button>
      <span className="text-xs font-bold text-charcoal-600 mt-2">{label}</span>
      <span className="text-sm font-bold font-serif truncate w-full text-center">
        {member.city || '-'}
      </span>
      <div className={`text-[0.62rem] font-mono font-medium px-2 py-0.5 rounded-full mt-1.5 ${timeColor}`}>
        {time}
      </div>
    </div>
  );
}

function Modal({
  children,
  title,
  onClose,
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-charcoal-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl border border-cream-100">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-cream-200">
          <h3 className="font-serif font-bold text-charcoal-800">{title}</h3>
          <button onClick={onClose} className="text-charcoal-600/60 hover:text-charcoal-800 text-xl">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
