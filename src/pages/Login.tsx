import {useState, type FormEvent} from 'react';
import {useAuth} from '../contexts/AuthContext';

export function Login() {
  const {signIn, signUp} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isRegister) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败';
      if (msg.includes('invalid-credential') || msg.includes('wrong-password')) {
        setError('邮箱或密码错误');
      } else if (msg.includes('email-already-in-use')) {
        setError('该邮箱已注册，请直接登录');
      } else if (msg.includes('weak-password')) {
        setError('密码至少需要 6 位');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.25rem] p-8 w-full max-w-sm shadow-lg border border-cream-200/40">
        <h1 className="font-serif text-2xl font-bold text-charcoal-800 text-center mb-2">
          千里共婵娟
        </h1>
        <p className="text-xs text-charcoal-600 text-center mb-6">
          登录后，与 TA 共享同一份心动空间
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-charcoal-600 font-semibold block mb-1">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full text-sm bg-cream-50 border border-cream-200 rounded-xl py-2.5 px-3 outline-none focus:border-love-300"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="text-xs text-charcoal-600 font-semibold block mb-1">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full text-sm bg-cream-50 border border-cream-200 rounded-xl py-2.5 px-3 outline-none focus:border-love-300"
              placeholder="至少 6 位"
            />
          </div>

          {error && (
            <p className="text-xs text-love-600 bg-love-50 rounded-lg p-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-love-500 hover:bg-love-600 disabled:opacity-50 text-white font-semibold text-sm rounded-full transition"
          >
            {submitting ? '处理中...' : isRegister ? '注册并进入' : '登录'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          className="w-full mt-4 text-xs text-charcoal-600 hover:text-love-500 transition"
        >
          {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
        </button>
      </div>
    </div>
  );
}
