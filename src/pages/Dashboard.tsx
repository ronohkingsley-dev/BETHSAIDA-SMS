import { useState, useEffect } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { supabase, Profile } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Users, BookOpen, DollarSign, Search, PlusCircle, Calendar } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

export default function Dashboard() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const navigate = useNavigate();
  const [totalLearners, setTotalLearners] = useState<number | null>(null);
  const [totalRevenue, setTotalRevenue] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (profile?.role === 'admin') {
        const { count } = await supabase
          .from('learners')
          .select('*', { count: 'exact', head: true });
        
        setTotalLearners(count);

        const { data } = await supabase
          .from('finance_records')
          .select('total_paid')
          .eq('term', 1) // Assuming term 1 for current
          .eq('year', new Date().getFullYear());
        
        const revenue = data?.reduce((sum, record) => sum + (record.total_paid || 0), 0) || 0;
        setTotalRevenue(revenue);
      } else if (profile?.role === 'teacher' && profile.assigned_grade) {
        // Teacher stats for their specific grade
        const { count } = await supabase
          .from('learners')
          .select('*', { count: 'exact', head: true })
          .eq('current_grade', profile.assigned_grade);
          
        setTotalLearners(count);
      }
    };

    fetchStats();
  }, [profile]);

  useEffect(() => {
    const searchLearners = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      const { data } = await supabase
        .from('learners')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,assessment_no.ilike.%${searchQuery}%`)
        .limit(5);
      
      setSearchResults(data || []);
      setIsSearching(false);
    };

    const debounce = setTimeout(searchLearners, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  if (profile?.role === 'admin') {
    return (
      <div className="space-y-8">
        {/* School Header */}
        <div className="relative overflow-hidden bg-primary rounded-3xl p-8 text-primary-foreground shadow-2xl shadow-primary/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -translate-x-1/2 translate-y-1/2 blur-2xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight uppercase">Bethsaida Junior Academy</h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-primary-foreground/80 font-medium">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> PO BOX 45 MOGOGOSIEK</span>
                <span className="w-1.5 h-1.5 rounded-full bg-white/30 self-center hidden md:block" />
                <span className="italic">"Hardwork is the key to success"</span>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center min-w-[160px]">
              <p className="text-[10px] uppercase tracking-widest font-bold opacity-70 mb-1">Current Term</p>
              <p className="text-xl font-bold">Term 1, {new Date().getFullYear()}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="card-hover border-none shadow-xl shadow-primary/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Learners</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{totalLearners !== null ? totalLearners : '--'}</div>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">Active students enrolled</p>
            </CardContent>
          </Card>
          
          <Card className="card-hover border-none shadow-xl shadow-primary/5 cursor-pointer group" onClick={() => navigate('/boarders')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Boarding</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">Manage Boarders</div>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">View boarding status</p>
            </CardContent>
          </Card>

          <Card className="card-hover border-none shadow-xl shadow-primary/5 cursor-pointer group" onClick={() => navigate('/settings')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Configuration</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <PlusCircle className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">System Settings</div>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium">Fees & Term dates</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-3xl p-8 border border-border/50 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Quick Search</h2>
                  <p className="text-sm text-muted-foreground">Find any learner across the entire school</p>
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="Name or Assessment No..." 
                    className="pl-10 h-12 bg-secondary/50 border-none rounded-xl focus:ring-primary/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {/* Search Results Dropdown */}
                  {searchQuery.trim().length >= 2 && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-card border rounded-2xl shadow-2xl z-50 max-h-96 overflow-hidden border-border/50">
                      {isSearching ? (
                        <div className="p-8 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-xs text-muted-foreground">Searching database...</p>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="divide-y divide-border/50">
                          {searchResults.map(learner => (
                            <div 
                              key={learner.id} 
                              className="px-6 py-4 hover:bg-secondary/50 transition-colors cursor-pointer flex justify-between items-center group"
                              onClick={() => navigate(`/finance?learnerId=${learner.id}`)}
                            >
                              <div>
                                <p className="font-bold text-foreground group-hover:text-primary transition-colors">{learner.name}</p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{learner.assessment_no} • {learner.current_grade}</p>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <PlusCircle className="w-4 h-4 text-primary" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-sm text-muted-foreground">No learners found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'].map((grade) => (
                  <Link 
                    key={grade} 
                    to={`/learners?grade=${encodeURIComponent(grade)}`}
                    className="h-14 flex items-center justify-center rounded-xl border border-border/50 bg-secondary/30 text-sm font-bold hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-200"
                  >
                    {grade}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20">
              <h3 className="text-xl font-bold mb-2">New Registration</h3>
              <p className="text-indigo-100 text-sm mb-6">Quickly add a new student to the system and assign them to a class.</p>
              <Button 
                onClick={() => navigate('/learners')}
                className="w-full h-12 bg-white text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl shadow-lg"
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                Register Learner
              </Button>
            </div>

            <Card className="border-none shadow-sm bg-secondary/30">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                  <div>
                    <p className="text-xs font-bold">Fee Payment Recorded</p>
                    <p className="text-[10px] text-muted-foreground">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                  <div>
                    <p className="text-xs font-bold">New Learner Added</p>
                    <p className="text-[10px] text-muted-foreground">1 hour ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Teacher Dashboard
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Welcome, {profile?.full_name?.split(' ')[0]}</h1>
          <p className="text-muted-foreground font-medium mt-1">Managing Grade {profile?.assigned_grade || '[Not Assigned]'}</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-2xl border border-primary/20">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">Term 1, {new Date().getFullYear()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-none shadow-xl shadow-primary/5 bg-card overflow-hidden">
          <div className="h-2 bg-primary w-full" />
          <CardHeader className="flex flex-row items-center justify-between p-8 pb-4">
            <CardTitle className="text-2xl font-bold">Class Overview</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Find Learner..." 
                className="pl-10 h-10 bg-secondary/50 border-none rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-secondary/30 rounded-2xl p-6 text-center border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Boys</p>
                <p className="text-3xl font-bold text-foreground">--</p>
              </div>
              <div className="bg-secondary/30 rounded-2xl p-6 text-center border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Girls</p>
                <p className="text-3xl font-bold text-foreground">--</p>
              </div>
              <div className="bg-primary/5 rounded-2xl p-6 text-center border border-primary/20">
                <p className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">Total Students</p>
                <p className="text-3xl font-bold text-primary">{totalLearners !== null ? totalLearners : '--'}</p>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-border/50 flex justify-between items-center">
              <p className="text-sm text-muted-foreground font-medium">Need to update marks or attendance?</p>
              <Button onClick={() => navigate('/academics')} className="rounded-xl font-bold">
                Go to Academics
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="bg-card rounded-3xl p-8 border border-border/50 shadow-sm">
            <h3 className="text-lg font-bold mb-4">Quick Links</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-12 rounded-xl border-border/50 hover:bg-secondary" onClick={() => navigate('/learners')}>
                <Users className="w-4 h-4 mr-3 text-blue-500" />
                Class Register
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 rounded-xl border-border/50 hover:bg-secondary" onClick={() => navigate('/academics')}>
                <BookOpen className="w-4 h-4 mr-3 text-green-500" />
                Enter Scores
              </Button>
            </div>
          </div>
          
          <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10">
            <h3 className="text-lg font-bold text-primary mb-2">Announcement</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Term 1 exams start on the 15th of next month. Please ensure all marks are entered by then.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
