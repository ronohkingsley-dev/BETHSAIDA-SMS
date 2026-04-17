import { useState } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
import { supabase, Profile, Learner } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

const GRADE_PROGRESSION: Record<string, string> = {
  'PP1': 'PP2',
  'PP2': 'Grade 1',
  'Grade 1': 'Grade 2',
  'Grade 2': 'Grade 3',
  'Grade 3': 'Grade 4',
  'Grade 4': 'Grade 5',
  'Grade 5': 'Grade 6',
  'Grade 6': 'Grade 7',
  'Grade 7': 'Grade 8',
  'Grade 8': 'Grade 9',
  'Grade 9': 'Alumni',
};

export default function PromotionHub() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const [fromTerm, setFromTerm] = useState('3');
  const [fromYear, setFromYear] = useState(new Date().getFullYear().toString());
  const [toTerm, setToTerm] = useState('1');
  const [toYear, setToYear] = useState((new Date().getFullYear() + 1).toString());
  const [loading, setLoading] = useState(false);
  const [previewLearners, setPreviewLearners] = useState<Learner[]>([]);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');

  // Fetch learners for preview
  useState(() => {
    const fetchPreview = async () => {
      const { data } = await supabase.from('learners').select('*').order('name');
      setPreviewLearners(data || []);
    };
    fetchPreview();
  });

  // Protect route
  if (profile && profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const handlePromote = async () => {
    if (loading) return;
    
    if (!confirm('Are you sure you want to run the promotion engine? This will update all learners grades and carry forward their financial balances.')) {
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch all learners
      const { data: learners, error: learnersError } = await supabase
        .from('learners')
        .select('*');
      
      if (learnersError) throw learnersError;
      if (!learners || learners.length === 0) {
        toast.info('No learners found to promote');
        setLoading(false);
        return;
      }

      // 2. Fetch finance records for the "from" term
      const { data: financeRecords, error: financeError } = await supabase
        .from('finance_records')
        .select('*')
        .eq('term', parseInt(fromTerm))
        .eq('year', parseInt(fromYear));

      if (financeError) throw financeError;

      // 3. Prepare batch updates
      const newFinanceRecords = [];
      const learnersToUpdate = [];

      for (const learner of learners) {
        // Financial carry forward
        const oldRecord = financeRecords?.find(r => r.learner_id === learner.id);
        const balanceToCarryForward = oldRecord ? oldRecord.balance : 0;

        newFinanceRecords.push({
          learner_id: learner.id,
          term: parseInt(toTerm),
          year: parseInt(toYear),
          tuition_fee: 0, // Admin will set this later
          boarding_fee: 0,
          arrears_carried_forward: balanceToCarryForward,
          total_paid: 0
        });

        // Grade promotion (only if moving from term 3 to term 1)
        if (fromTerm === '3' && toTerm === '1') {
          let nextGrade = GRADE_PROGRESSION[learner.current_grade];
          
          // Special handling for Grade 9 -> Alumni
          if (learner.current_grade === 'Grade 9') {
            nextGrade = `Alumni (Class of ${fromYear})`;
          }

          if (nextGrade) {
            learnersToUpdate.push({
              id: learner.id,
              current_grade: nextGrade
            });
          }
        }
      }

      // 4. Execute updates
      if (newFinanceRecords.length > 0) {
        const { error: insertFinanceError } = await supabase
          .from('finance_records')
          .upsert(newFinanceRecords, { onConflict: 'learner_id,term,year' });
        if (insertFinanceError) throw insertFinanceError;
      }

      if (learnersToUpdate.length > 0) {
        // Supabase doesn't have a bulk update by ID easily without RPC, so we do it one by one or via upsert if we have all fields
        // For simplicity, we'll use a loop here, but in production an RPC is better
        for (const update of learnersToUpdate) {
          await supabase
            .from('learners')
            .update({ current_grade: update.current_grade })
            .eq('id', update.id);
        }
      }

      toast.success('Promotion engine completed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to run promotion engine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Promotion Hub</h1>
        <p className="text-muted-foreground font-medium mt-1">Batch update grades and carry forward financial balances</p>
      </div>

      <Card className="border-none shadow-xl shadow-orange-500/10 bg-orange-500/5 rounded-3xl overflow-hidden">
        <CardHeader className="p-8">
          <CardTitle className="flex items-center gap-3 text-orange-600 text-xl font-bold">
            <AlertTriangle className="w-6 h-6" />
            Important Notice
          </CardTitle>
          <CardDescription className="text-orange-700/80 text-base font-medium leading-relaxed mt-2">
            Running the promotion engine will modify records for ALL learners. 
            Financial balances from the selected source term will be carried forward to the target term.
            If moving from Term 3 to Term 1, learners will also be promoted to the next grade.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-none shadow-xl shadow-primary/5 rounded-3xl overflow-hidden">
        <CardContent className="p-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="font-bold text-xl flex items-center gap-2">
                <div className="w-2 h-6 bg-primary rounded-full" />
                From (Current Term)
              </h3>
              <div className="space-y-3">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Term</Label>
                <Select value={fromTerm} onValueChange={setFromTerm}>
                  <SelectTrigger className="h-12 rounded-xl bg-secondary/30 border-none font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="1">Term 1</SelectItem>
                    <SelectItem value="2">Term 2</SelectItem>
                    <SelectItem value="3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Year</Label>
                <Input type="number" value={fromYear} onChange={e => setFromYear(e.target.value)} className="h-12 rounded-xl bg-secondary/30 border-none font-bold" />
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="font-bold text-xl flex items-center gap-2">
                <div className="w-2 h-6 bg-green-500 rounded-full" />
                To (Next Term)
              </h3>
              <div className="space-y-3">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Term</Label>
                <Select value={toTerm} onValueChange={setToTerm}>
                  <SelectTrigger className="h-12 rounded-xl bg-secondary/30 border-none font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="1">Term 1</SelectItem>
                    <SelectItem value="2">Term 2</SelectItem>
                    <SelectItem value="3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Year</Label>
                <Input type="number" value={toYear} onChange={e => setToYear(e.target.value)} className="h-12 rounded-xl bg-secondary/30 border-none font-bold" />
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-border/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="font-bold text-xl">Promotion Preview</h3>
              <div className="flex items-center gap-3 bg-secondary/30 px-4 py-2 rounded-xl">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filter Grade:</Label>
                <Select value={selectedGradeFilter} onValueChange={setSelectedGradeFilter}>
                  <SelectTrigger className="w-[140px] h-8 bg-transparent border-none font-bold p-0 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Grades</SelectItem>
                    {Object.keys(GRADE_PROGRESSION).map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border border-border/50 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto shadow-inner bg-secondary/5">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="font-bold text-foreground py-4 px-6">Learner Name</TableHead>
                    <TableHead className="font-bold text-foreground py-4">Current Grade</TableHead>
                    <TableHead className="font-bold text-foreground py-4">Next Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewLearners
                    .filter(l => selectedGradeFilter === 'all' || l.current_grade === selectedGradeFilter)
                    .map(learner => {
                      let next = GRADE_PROGRESSION[learner.current_grade] || 'N/A';
                      if (learner.current_grade === 'Grade 9') {
                        next = `Alumni (Class of ${fromYear})`;
                      }
                      return (
                        <TableRow key={learner.id} className="hover:bg-secondary/20 transition-colors border-border/50">
                          <TableCell className="font-bold text-foreground px-6">{learner.name}</TableCell>
                          <TableCell className="font-medium text-muted-foreground">{learner.current_grade}</TableCell>
                          <TableCell className={learner.current_grade === 'Grade 9' ? "text-primary font-bold" : "font-bold text-foreground"}>
                            {next}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {previewLearners.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">No learners found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <Button size="lg" onClick={handlePromote} disabled={loading} className="h-14 px-10 rounded-xl font-bold shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90">
              {loading ? 'Processing...' : 'Run Promotion Engine'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
