import {useState} from 'react';
import {useAuth} from '../contexts/AuthContext';
import {
  createCoupleSpace,
  getUserCoupleId,
  joinCoupleSpace,
  updateMemberProfile,
} from '../lib/coupleService';

type Mode = 'choose' | 'create' | 'join' | 'invite' | 'setup';
type Choice = 'create' | 'join';

export function Pairing() {
  const {user, refreshCoupleId} = useAuth();
  const [mode, setMode] = useState<Mode>('choose');
  const [choice, setChoice] = useState<Choice | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [myCode, setMyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupForm, setSetupForm] = useState({
    myName: '',
    partnerName: '',
  });

  const handleCreate = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const {inviteCode: code} = await createCoupleSpace(user.uid, 'cat');
      setMyCode(code);
      setMode('invite');
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      await joinCoupleSpace(user.uid, inviteCode, 'dog');
      setMode('setup');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加入失败';
      if (msg.includes('permission') || msg.includes('Permission')) {
        setError('权限不足，请在 Firebase 控制台更新 firestore.rules 后重试');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSubmit = async () => {
    if (!user) return;
    if (!setupForm.myName.trim() || !setupForm.partnerName.trim()) {
      setError('请填写你和对方的名字');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const coupleId = await getUserCoupleId(user.uid);
      if (!coupleId) throw new Error('未找到情侣空间');
      await updateMemberProfile(coupleId, user.uid, {
        nickname: setupForm.myName.trim(),
        partnerNameHint: setupForm.partnerName.trim(),
      });
      await refreshCoupleId();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'invite' && myCode) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2.25rem] p-8 w-full max-w-sm shadow-lg border border-cream-200/40 text-center">
          <div className="text-4xl mb-4">💌</div>
          <h2 className="font-serif text-xl font-bold text-charcoal-800 mb-2">
            空间已创建！
          </h2>
          <p className="text-sm text-charcoal-600 mb-4">
            把下面的邀请码发给 TA，等 TA 加入后就能同步了
          </p>
          <div className="bg-love-50 border border-love-100 rounded-2xl py-4 px-6 mb-6">
            <p className="text-xs text-love-500 font-bold uppercase tracking-widest mb-1">
              邀请码
            </p>
            <p className="text-3xl font-mono font-bold text-love-600 tracking-widest">
              {myCode}
            </p>
          </div>
          <button
            onClick={() => setMode('setup')}
            className="w-full py-3 border border-charcoal-800 text-charcoal-800 font-semibold text-sm rounded-full transition hover:bg-charcoal-800 hover:text-white"
          >
            继续
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'choose') {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2.25rem] p-8 w-full max-w-sm shadow-lg border border-cream-200/40">
          <h2 className="font-serif text-xl font-bold text-charcoal-800 text-center mb-2">
            建立心动空间
          </h2>
          <p className="text-xs text-charcoal-600 text-center mb-6">
            你们是情侣中的哪一位？
          </p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setChoice('create')}
              className={`pairing-option ${choice === 'create' ? 'pairing-option-selected' : ''}`}
            >
              我是第一个，创建空间
            </button>
            <button
              type="button"
              onClick={() => setChoice('join')}
              className={`pairing-option ${choice === 'join' ? 'pairing-option-selected' : ''}`}
            >
              我有邀请码，加入空间
            </button>
          </div>
          <button
            type="button"
            disabled={!choice}
            onClick={() => choice && setMode(choice)}
            className="w-full mt-6 py-3 border border-charcoal-800 disabled:border-cream-200 disabled:text-charcoal-600/40 text-charcoal-800 font-semibold text-sm rounded-full transition disabled:cursor-not-allowed hover:enabled:bg-charcoal-800 hover:enabled:text-white"
          >
            继续
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2.25rem] p-8 w-full max-w-sm shadow-lg border border-cream-200/40">
          <button
            onClick={() => { setMode('choose'); setChoice(null); }}
            className="text-xs text-charcoal-600 mb-4 hover:text-charcoal-800"
          >
            ← 返回
          </button>
          <h2 className="font-serif text-xl font-bold text-charcoal-800 mb-2">
            创建情侣空间
          </h2>
          <p className="text-xs text-charcoal-600 mb-6">
            创建后你会得到一个 6 位邀请码
          </p>
          {error && (
            <p className="text-xs text-charcoal-600 bg-cream-100 rounded-lg p-2 mb-4">{error}</p>
          )}
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-3 border border-charcoal-800 disabled:opacity-50 text-charcoal-800 font-semibold text-sm rounded-full transition hover:enabled:bg-charcoal-800 hover:enabled:text-white"
          >
            {loading ? '创建中...' : '创建空间'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'setup') {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2.25rem] p-8 w-full max-w-sm shadow-lg border border-cream-200/40">
          <h2 className="font-serif text-xl font-bold text-charcoal-800 mb-2">写下对彼此的称呼</h2>
          <p className="text-xs text-charcoal-600 mb-5">
            称呼可包含文字、表情，进入后可修改
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-charcoal-600 block mb-1 font-semibold">我的名字</label>
              <input
                value={setupForm.myName}
                onChange={(e) => setSetupForm((v) => ({...v, myName: e.target.value}))}
                className="w-full text-sm bg-white border border-cream-200 rounded-xl py-2.5 px-3 outline-none focus:border-love-300"
                placeholder="例如：瑞士"
              />
            </div>
            <div>
              <label className="text-xs text-charcoal-600 block mb-1 font-semibold">对方名字</label>
              <input
                value={setupForm.partnerName}
                onChange={(e) => setSetupForm((v) => ({...v, partnerName: e.target.value}))}
                className="w-full text-sm bg-white border border-cream-200 rounded-xl py-2.5 px-3 outline-none focus:border-love-300"
                placeholder="例如：深圳"
              />
            </div>
          </div>
          {error && (
            <p className="text-xs text-charcoal-600 bg-cream-100 rounded-lg p-2 mt-4">{error}</p>
          )}
          <button
            onClick={handleSetupSubmit}
            disabled={loading}
            className="w-full mt-5 py-3 border border-charcoal-800 disabled:opacity-50 text-charcoal-800 font-semibold text-sm rounded-full transition hover:enabled:bg-charcoal-800 hover:enabled:text-white"
          >
            {loading ? '保存中...' : '进入空间'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.25rem] p-8 w-full max-w-sm shadow-lg border border-cream-200/40">
        <button
          onClick={() => { setMode('choose'); setChoice(null); }}
          className="text-xs text-charcoal-600 mb-4 hover:text-charcoal-800"
        >
          ← 返回
        </button>
        <h2 className="font-serif text-xl font-bold text-charcoal-800 mb-2">
          加入情侣空间
        </h2>
        <p className="text-xs text-charcoal-600 mb-4">输入 TA 发给你的 6 位邀请码</p>
        <input
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="例如 AB3K7N"
          className="w-full text-center text-2xl font-mono font-bold tracking-widest bg-white border border-cream-200 rounded-xl py-3 px-3 outline-none focus:border-charcoal-800 mb-4 uppercase"
        />
        {error && (
          <p className="text-xs text-charcoal-600 bg-cream-100 rounded-lg p-2 mb-4">{error}</p>
        )}
        <button
          onClick={handleJoin}
          disabled={loading || inviteCode.length < 6}
          className="w-full py-3 border border-charcoal-800 disabled:opacity-50 text-charcoal-800 font-semibold text-sm rounded-full transition hover:enabled:bg-charcoal-800 hover:enabled:text-white"
        >
          {loading ? '加入中...' : '加入空间'}
        </button>
      </div>
    </div>
  );
}
