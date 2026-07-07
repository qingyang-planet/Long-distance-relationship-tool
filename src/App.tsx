import {AuthProvider, useAuth} from './contexts/AuthContext';
import {Login} from './pages/Login';
import {Pairing} from './pages/Pairing';
import {Home} from './pages/Home';

function AppRoutes() {
  const {user, coupleId, loading} = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <p className="text-sm text-charcoal-600 font-serif">加载中…</p>
      </div>
    );
  }

  if (!user) return <Login />;
  if (!coupleId) return <Pairing />;
  return <Home />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
