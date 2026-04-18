import { useState, useEffect } from 'react';
import { useOutletContext, Navigate, useNavigate } from 'react-router-dom';
import { supabase, Learner, FinanceRecord, Profile } from '../lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { CreditCard, Trash2, ArrowLeftCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Departures() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const navigate = useNavigate();
  const [departures, setDepartures] = useState<Learner[]>([]);
  const [records, setRecords] = useState<Record<string, FinanceRecord>>({});
  const [loading, setLoading] = useState(true);

  // Protect route
  if (profile && profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    fetchDepartures();
  }, []);

  const fetchDepartures = async () => {
    setLoading(true);
    
    // Fetch learners who are departed
    const { data: learnersData, error: learnersError } = await supabase
      .from('learners')
      .select('*')
      .ilike('current_grade', 'DEPARTED-%')
      .order('name');
      
    if (learnersError) {
      toast.error('Failed to fetch departed learners');
      setLoading(false);
      return;
    }
    
    setDepartures(learnersData || []);

    if (learnersData && learnersData.length > 0) {
      const learnerIds = learnersData.map(l => l.id);
      // Fetch latest finance records
      const { data: recordsData } = await supabase
        .from('finance_records')
        .select('*')
        .in('learner_id', learnerIds);

      const newRecords: Record<string, FinanceRecord> = {};
      recordsData?.forEach(record => {
        // We want the most recent record if there are multiple per learner
        if (!newRecords[record.learner_id] || (record.year > newRecords[record.learner_id].year) || (record.year === newRecords[record.learner_id].year && record.term > newRecords[record.learner_id].term)) {
           newRecords[record.learner_id] = record;
        }
      });
      setRecords(newRecords);
    }
    
    setLoading(false);
  };

  const handleDelete = async (learner: Learner) => {
    if (!profile || profile.role !== 'admin') {
      toast.error('Only administrators can delete learners');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently remove ${learner.name} from the system? This will clear all records.`)) {
      return;
    }

    setLoading(true);
    try {
      await supabase.from('finance_records').delete().eq('learner_id', learner.id);
      await supabase.from('academic_records').delete().eq('learner_id', learner.id);
      
      const { error } = await supabase.from('learners').delete().eq('id', learner.id);
      if (error) throw error;
      
      toast.success(`${learner.name} removed permanently from the system`);
      fetchDepartures();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete learner');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (learner: Learner) => {
    const originalGrade = learner.current_grade.replace(/^DEPARTED-/i, '');
    if (window.confirm(`Re-admit ${learner.name} to ${originalGrade}?`)) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('learners')
          .update({ current_grade: originalGrade })
          .eq('id', learner.id);
        
        if (error) throw error;
        toast.success(`${learner.name} has been re-admitted`);
        fetchDepartures();
      } catch (error: any) {
        toast.error(error.message || 'Failed to re-admit learner');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Departures</h1>
          <p className="text-muted-foreground font-medium mt-1">Learners with pending balances who have left the school</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/learners')} className="rounded-xl font-bold">
          <ArrowLeftCircle className="w-4 h-4 mr-2" />
          Back to Learners
        </Button>
      </div>

      <div className="border border-border/50 rounded-3xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="font-bold text-foreground py-4 px-6">Name</TableHead>
              <TableHead className="font-bold text-foreground py-4 text-center">Former Grade</TableHead>
              <TableHead className="font-bold text-foreground py-4">Assessment No</TableHead>
              <TableHead className="font-bold text-foreground py-4 text-right">Fee Balance</TableHead>
              <TableHead className="font-bold text-foreground py-4 text-center px-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  Loading departures...
                </TableCell>
              </TableRow>
            ) : departures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No departed learners found</TableCell>
              </TableRow>
            ) : (
              departures.map((learner) => {
                const record = records[learner.id];
                const balance = record ? record.balance : 0;
                
                return (
                  <TableRow key={learner.id} className="hover:bg-secondary/20 transition-colors border-border/50">
                    <TableCell className="font-bold text-foreground px-6">{learner.name}</TableCell>
                    <TableCell className="text-center">
                      <span className="px-2 py-1 bg-red-100/50 text-red-700 text-[10px] font-bold rounded-lg border border-red-200">
                        {learner.current_grade.replace(/^DEPARTED-/i, '')}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-muted-foreground">{learner.assessment_no}</TableCell>
                    <TableCell className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${balance <= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {balance <= 0 ? 'CLEARED' : `KES ${balance.toLocaleString()}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-center px-6">
                      <div className="flex justify-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-3 rounded-lg text-primary hover:bg-primary/10 font-bold"
                          title="View/Pay Fees"
                          onClick={() => navigate(`/finance?learnerId=${learner.id}`)}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Fee
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-3 rounded-lg text-green-600 hover:bg-green-50 font-bold"
                          title="Re-admit learner"
                          onClick={() => handleReturn(learner)}
                        >
                          Re-admit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                          title="Permanently remove"
                          onClick={() => handleDelete(learner)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
