import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {auth} from '../lib/firebase';
import {getUserCoupleId} from '../lib/coupleService';

interface AuthContextValue {
  user: User | null;
  coupleId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshCoupleId: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshCoupleId = async () => {
    if (!user) {
      setCoupleId(null);
      return;
    }
    const id = await getUserCoupleId(user.uid);
    setCoupleId(id);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const id = await getUserCoupleId(firebaseUser.uid);
        setCoupleId(id);
      } else {
        setCoupleId(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{user, coupleId, loading, signIn, signUp, logout, refreshCoupleId}}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
