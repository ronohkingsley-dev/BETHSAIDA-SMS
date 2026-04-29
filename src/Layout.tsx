import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase, Profile } from './lib/supabase';
import { useTheme } from './lib/ThemeContext';
import { Button } from './components/ui/button';
import { GraduationCap, Users, BookOpen, DollarSign, LogOut, ArrowUpRight, UserCog, Settings as SettingsIcon, Sun, Moon, UserMinus, Menu, X, Download } from 'lucide-react';
import { Toaster } from './components/ui/sonner';

export default function Layout() {
  const { theme, toggleTheme } = useTheme();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(session);
        if (!session) {
          setLoadingProfile(false);
          if (location.pathname !== '/login') {
            navigate('/login');
          }
        } else {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        if (mounted) setLoadingProfile(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      if (!session) {
        setLoadingProfile(false);
        setProfile(null);
        if (location.pathname !== '/login') {
          navigate('/login');
        }
      } else {
        fetchProfile(session.user.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const fetchProfile = async (userId: string) => {
    setLoadingProfile(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) setProfile(data);
    setLoadingProfile(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (!session || loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <Toaster />
      </div>
    );
  }

  if (profile?.role === 'teacher' && profile?.status === 'pending') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card p-8 rounded-lg shadow-md max-w-md w-full text-center border">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/0000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-foreground">Account Pending Approval</h2>
          <p className="text-muted-foreground mb-6">
            Your teacher account has been created and is waiting for administrator approval. You will be able to access the dashboard once approved.
          </p>
          <Button onClick={handleLogout} variant="outline" className="w-full">
            Logout
          </Button>
        </div>
        <Toaster />
      </div>
    );
  }

  if (profile?.role === 'teacher' && profile?.status === 'rejected') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card p-8 rounded-lg shadow-md max-w-md w-full text-center border">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/0000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-foreground">Account Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            Your teacher account access has been revoked or rejected by the administrator.
          </p>
          <Button onClick={handleLogout} variant="outline" className="w-full">
            Logout
          </Button>
        </div>
        <Toaster />
      </div>
    );
  }

  const adminNavItems = [
    { name: 'Dashboard', path: '/', icon: GraduationCap },
    { name: 'Learners', path: '/learners', icon: Users },
    { name: 'Finance', path: '/finance', icon: DollarSign },
    { name: 'Departures', path: '/departures', icon: UserMinus },
    { name: 'Academics', path: '/academics', icon: BookOpen },
    { name: 'Boarders', path: '/boarders', icon: UserCog },
    { name: 'Promotion Hub', path: '/promotion', icon: ArrowUpRight },
    { name: 'Teachers', path: '/teachers', icon: UserCog },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const teacherNavItems = [
    { name: 'Dashboard', path: '/', icon: GraduationCap },
    { name: 'Register', path: '/learners', icon: Users },
    { name: 'Academics', path: '/academics', icon: BookOpen },
  ];

  const navItems = profile?.role === 'admin' ? adminNavItems : teacherNavItems;

  return (
    <div className="min-h-screen bg-background flex text-foreground overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border flex flex-col 
        transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="tracking-tight">Bethsaida</span>
          </h1>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMenuOpen(false)}>
            <X className="w-6 h-6 text-sidebar-foreground" />
          </Button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/30' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:text-primary'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto">
          {deferredPrompt && (
            <Button 
              onClick={handleInstall}
              className="w-full mb-4 rounded-xl gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20"
            >
              <Download className="w-4 h-4" />
              Install App
            </Button>
          )}

          <div className="bg-sidebar-accent/50 rounded-2xl p-4 border border-sidebar-border/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-inner shrink-0">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-sidebar-foreground truncate">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-[10px] text-sidebar-foreground/70 uppercase tracking-widest font-bold">
                  {profile?.role === 'admin' ? 'Administrator' : 'Teacher'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-lg bg-sidebar/50 hover:bg-sidebar shadow-sm flex-1 h-9 text-sidebar-foreground">
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="rounded-lg bg-sidebar/50 hover:bg-sidebar shadow-sm flex-1 h-9 text-red-500 hover:text-red-600" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col h-screen">
        <header className="h-16 lg:h-24 border-b border-border/50 glass sticky top-0 z-30 px-4 lg:px-10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </Button>
            <h2 className="text-lg lg:text-2xl font-bold text-foreground capitalize tracking-tight truncate">
              {location.pathname === '/' ? 'Overview' : location.pathname.substring(1).replace('-', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-secondary/50 rounded-full text-[10px] font-bold text-muted-foreground uppercase tracking-widest border border-border/50 shadow-inner">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse" />
              Online
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-10">
          <div className="max-w-7xl mx-auto pb-10">
            <Outlet context={{ profile }} />
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}
