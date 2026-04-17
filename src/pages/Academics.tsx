import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase, Learner, AcademicRecord, Profile } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText } from 'lucide-react';

const SUBJECTS_BY_GRADE: Record<string, string[]> = {
  'PP1': ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor & Creative Activities', 'Religious Education Activities'],
  'PP2': ['Language Activities', 'Mathematical Activities', 'Environmental Activities', 'Psychomotor & Creative Activities', 'Religious Education Activities'],
  'Grade 1': ['English Language', 'Kiswahili Language', 'Mathematical Activities', 'Environmental Activities', 'Indigenous Language', 'Creative Arts', 'Religious Education'],
  'Grade 2': ['English Language', 'Kiswahili Language', 'Mathematical Activities', 'Environmental Activities', 'Indigenous Language', 'Creative Arts', 'Religious Education'],
  'Grade 3': ['English Language', 'Kiswahili Language', 'Mathematical Activities', 'Environmental Activities', 'Indigenous Language', 'Creative Arts', 'Religious Education'],
  'Grade 4': ['English', 'Kiswahili', 'Mathematics', 'Agriculture & Nutrition', 'Science & Technology', 'Social Studies', 'Creative Arts', 'Religious Education'],
  'Grade 5': ['English', 'Kiswahili', 'Mathematics', 'Agriculture & Nutrition', 'Science & Technology', 'Social Studies', 'Creative Arts', 'Religious Education'],
  'Grade 6': ['English', 'Kiswahili', 'Mathematics', 'Agriculture & Nutrition', 'Science & Technology', 'Social Studies', 'Creative Arts', 'Religious Education'],
  'Grade 7': ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Social Studies', 'Pre-Technical Studies', 'Agriculture & Nutrition', 'Religious Education', 'Creative Arts & Sports'],
  'Grade 8': ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Social Studies', 'Pre-Technical Studies', 'Agriculture & Nutrition', 'Religious Education', 'Creative Arts & Sports'],
  'Grade 9': ['English', 'Kiswahili', 'Mathematics', 'Integrated Science', 'Social Studies', 'Pre-Technical Studies', 'Agriculture & Nutrition', 'Religious Education', 'Creative Arts & Sports'],
};

export default function Academics() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>(profile?.role === 'teacher' && profile?.assigned_grade ? profile.assigned_grade : 'Grade 1');
  const [term, setTerm] = useState<string>('1');
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({});

  // Ensure teacher stays on their assigned grade
  useEffect(() => {
    if (profile?.role === 'teacher' && profile?.assigned_grade) {
      setSelectedGrade(profile.assigned_grade);
    }
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [selectedGrade, term, year]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch learners for grade
    const { data: learnersData } = await supabase
      .from('learners')
      .select('*')
      .eq('current_grade', selectedGrade);
      
    setLearners(learnersData || []);

    // Fetch existing records
    if (learnersData && learnersData.length > 0) {
      const learnerIds = learnersData.map(l => l.id);
      const { data: recordsData } = await supabase
        .from('academic_records')
        .select('*')
        .in('learner_id', learnerIds)
        .eq('term', parseInt(term))
        .eq('year', parseInt(year));

      const newScores: Record<string, Record<string, number>> = {};
      recordsData?.forEach(record => {
        newScores[record.learner_id] = record.scores;
      });
      setScores(newScores);
    }
    
    setLoading(false);
  };

  const handleScoreChange = (learnerId: string, subject: string, value: string) => {
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 1 || numValue > 4) return;

    setScores(prev => ({
      ...prev,
      [learnerId]: {
        ...(prev[learnerId] || {}),
        [subject]: numValue
      }
    }));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const recordsToUpsert = learners.map(learner => ({
        learner_id: learner.id,
        grade: selectedGrade,
        term: parseInt(term),
        year: parseInt(year),
        scores: scores[learner.id] || {}
      }));

      const { error } = await supabase
        .from('academic_records')
        .upsert(recordsToUpsert, { onConflict: 'learner_id,term,year' });

      if (error) throw error;
      toast.success('Scores saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save scores');
    } finally {
      setSaving(false);
    }
  };

  const generateReport = (learner: Learner) => {
    const doc = new jsPDF();
    const learnerScores = scores[learner.id] || {};
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(41, 128, 185);
    doc.text('BETHSAIDA JUNIOR ACADEMY', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('PO BOX 45 MOGOGOSIEK', 105, 28, { align: 'center' });
    doc.text('MOTTO: HARDWORK IS THE KEY TO SUCCESS', 105, 34, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(41, 128, 185);
    doc.line(20, 40, 190, 40);

    // Title
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('OFFICIAL CBC REPORT BOOK', 105, 50, { align: 'center' });
    
    // Learner Details
    doc.setFontSize(12);
    doc.text(`Learner Name: ${learner.name}`, 20, 65);
    doc.text(`Assessment No: ${learner.assessment_no}`, 20, 75);
    doc.text(`Grade: ${selectedGrade}`, 120, 65);
    doc.text(`Term: ${term} | Year: ${year}`, 120, 75);

    const tableData = subjects.map(sub => {
      const score = learnerScores[sub];
      let level = 'Not Assessed';
      if (score === 4) level = 'Exceeding Expectation (EE)';
      if (score === 3) level = 'Meeting Expectation (ME)';
      if (score === 2) level = 'Approaching Expectation (AE)';
      if (score === 1) level = 'Below Expectation (BE)';
      return [sub, score || '-', level];
    });

    autoTable(doc, {
      startY: 85,
      head: [['Learning Area', 'Score (1-4)', 'Competency Level']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 11, cellPadding: 5 },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'center' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 85;
    
    // Remarks & Signatures
    doc.setFontSize(11);
    doc.text('Class Teacher\'s Remarks:', 20, finalY + 20);
    doc.line(20, finalY + 28, 190, finalY + 28);
    doc.line(20, finalY + 38, 190, finalY + 38);
    
    doc.text('Principal\'s Remarks:', 20, finalY + 55);
    doc.line(20, finalY + 63, 190, finalY + 63);
    
    doc.text('Teacher\'s Signature: __________________', 20, finalY + 80);
    doc.text('Principal\'s Signature: __________________', 110, finalY + 80);
    
    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Date Printed: ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

    doc.save(`${learner.name.replace(/\s+/g, '_')}_Report_Term${term}_${year}.pdf`);
  };

  const subjects = SUBJECTS_BY_GRADE[selectedGrade] || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Academics</h1>
          <p className="text-muted-foreground font-medium mt-1">Enter and manage CBC scores (4=EE, 3=ME, 2=AE, 1=BE)</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving || loading} 
          className="h-12 px-8 rounded-xl font-bold shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90"
        >
          {saving ? 'Saving...' : 'Save All Scores'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-6 items-end bg-card p-6 rounded-3xl border border-border/50 shadow-sm">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Grade</Label>
          <Select value={selectedGrade} onValueChange={setSelectedGrade} disabled={profile?.role === 'teacher'}>
            <SelectTrigger className="w-[180px] h-11 rounded-xl bg-secondary/30 border-none font-bold">
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {Object.keys(SUBJECTS_BY_GRADE).map(g => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Term</Label>
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger className="w-[180px] h-11 rounded-xl bg-secondary/30 border-none font-bold">
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="1">Term 1</SelectItem>
              <SelectItem value="2">Term 2</SelectItem>
              <SelectItem value="3">Term 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Year</Label>
          <Input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-[120px] h-11 rounded-xl bg-secondary/30 border-none font-bold" />
        </div>
      </div>

      <div className="border border-border/50 rounded-3xl bg-card overflow-hidden shadow-sm overflow-x-auto">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="min-w-[200px] font-bold text-foreground py-4 px-6">Learner</TableHead>
              {subjects.map(sub => (
                <TableHead key={sub} className="min-w-[120px] text-center font-bold text-foreground py-4 px-2">{sub}</TableHead>
              ))}
              <TableHead className="text-center font-bold text-foreground py-4 px-6">Report</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={subjects.length + 2} className="text-center py-12 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  Loading academic records...
                </TableCell>
              </TableRow>
            ) : learners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={subjects.length + 2} className="text-center py-12 text-muted-foreground">No learners found for this grade</TableCell>
              </TableRow>
            ) : (
              learners.map((learner) => (
                <TableRow key={learner.id} className="hover:bg-secondary/20 transition-colors border-border/50">
                  <TableCell className="font-bold text-foreground px-6">{learner.name}</TableCell>
                  {subjects.map(sub => (
                    <TableCell key={sub} className="text-center px-2">
                      <Input 
                        type="number" 
                        min="1" 
                        max="4"
                        className="w-14 h-10 mx-auto text-center font-bold rounded-lg bg-secondary/30 border-none focus:ring-2 focus:ring-primary/20"
                        value={scores[learner.id]?.[sub] || ''}
                        onChange={(e) => handleScoreChange(learner.id, sub, e.target.value)}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-center px-6">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 rounded-lg text-primary hover:bg-primary/10"
                      onClick={() => generateReport(learner)}
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
