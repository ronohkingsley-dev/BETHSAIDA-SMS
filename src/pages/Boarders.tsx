import { useState, useEffect } from 'react';
import { useOutletContext, Navigate, useNavigate } from 'react-router-dom';
import { supabase, Learner, FinanceRecord, Profile } from '../lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { CreditCard, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Boarders() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const navigate = useNavigate();
  const [boarders, setBoarders] = useState<Learner[]>([]);
  const [records, setRecords] = useState<Record<string, FinanceRecord>>({});
  const [loading, setLoading] = useState(true);

  // Protect route
  if (profile && profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  useEffect(() => {
    fetchBoarders();
  }, []);

  const fetchBoarders = async () => {
    setLoading(true);
    
    // Fetch learners who are boarders and not departed
    const { data: learnersData, error: learnersError } = await supabase
      .from('learners')
      .select('*')
      .eq('boarding_status', 'boarding')
      .not('current_grade', 'ilike', 'DEPARTED-%')
      .order('name');
      
    if (learnersError) {
      toast.error('Failed to fetch boarders');
      setLoading(false);
      return;
    }
    
    setBoarders(learnersData || []);

    if (learnersData && learnersData.length > 0) {
      const learnerIds = learnersData.map(l => l.id);
      // Fetch current term finance records
      const { data: recordsData } = await supabase
        .from('finance_records')
        .select('*')
        .in('learner_id', learnerIds)
        .eq('term', 1) // Assuming term 1 for current
        .eq('year', new Date().getFullYear());

      const newRecords: Record<string, FinanceRecord> = {};
      recordsData?.forEach(record => {
        newRecords[record.learner_id] = record;
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

    const { id, name, current_grade } = learner;
    const record = records[id];
    const balance = record ? record.balance : 0;

    if (balance > 0) {
      if (window.confirm(`${name} has an outstanding balance of KES ${balance.toLocaleString()}. Transfer to the Departures list instead of permanent deletion?`)) {
        setLoading(true);
        try {
          const { error } = await supabase
            .from('learners')
            .update({ current_grade: `DEPARTED-${current_grade}` })
            .eq('id', id);
          
          if (error) throw error;
          toast.success(`${name} moved to Departures`);
          fetchBoarders();
        } catch (error: any) {
          toast.error(error.message || 'Failed to transfer learner');
        } finally {
          setLoading(false);
        }
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to permanently remove ${name}? This will remove all related financial and academic records.`)) {
        return;
      }

      setLoading(true);
      try {
        await supabase.from('finance_records').delete().eq('learner_id', id);
        await supabase.from('academic_records').delete().eq('learner_id', id);
        
        const { error } = await supabase.from('learners').delete().eq('id', id);
        if (error) throw error;
        
        toast.success(`${name} removed permanently from the system`);
        fetchBoarders();
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete learner');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Boarders Portal</h1>
        <p className="text-muted-foreground font-medium mt-1">Manage boarding students and their fee status</p>
      </div>

      <div className="border border-border/50 rounded-3xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="font-bold text-foreground py-4 px-6">Name</TableHead>
              <TableHead className="font-bold text-foreground py-4">Grade</TableHead>
              <TableHead className="font-bold text-foreground py-4">Assessment No</TableHead>
              <TableHead className="font-bold text-foreground py-4">Parent Name</TableHead>
              <TableHead className="font-bold text-foreground py-4">Parent Contact</TableHead>
              <TableHead className="font-bold text-foreground py-4 text-right">Fees (Term)</TableHead>
              <TableHead className="font-bold text-foreground py-4 text-right">Fee Status</TableHead>
              <TableHead className="font-bold text-foreground py-4 text-center px-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  Loading boarders...
                </TableCell>
              </TableRow>
            ) : boarders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No boarders found</TableCell>
              </TableRow>
            ) : (
              boarders.map((learner) => {
                const record = records[learner.id];
                const totalRequired = record ? record.tuition_fee + (record.boarding_fee || 0) + record.arrears_carried_forward : 0;
                const balance = record ? record.balance : 0;
                
                return (
                  <TableRow key={learner.id} className="hover:bg-secondary/20 transition-colors border-border/50">
                    <TableCell className="font-bold text-foreground px-6">{learner.name}</TableCell>
                    <TableCell className="font-medium text-muted-foreground">{learner.current_grade}</TableCell>
                    <TableCell className="font-medium text-muted-foreground">{learner.assessment_no}</TableCell>
                    <TableCell className="font-medium text-muted-foreground">{learner.parent_name || '-'}</TableCell>
                    <TableCell className="font-medium text-muted-foreground">{learner.parent_contact || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {record ? `KES ${totalRequired.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {record ? (
                        balance <= 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                            PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                            BAL: KES {balance.toLocaleString()}
                          </span>
                        )
                      ) : (
                        <span className="text-muted-foreground italic text-xs">No Record</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center px-6">
                      <div className="flex justify-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-3 rounded-lg text-primary hover:bg-primary/10 font-bold"
                          onClick={() => navigate(`/finance?learnerId=${learner.id}`)}
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Fee
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
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
