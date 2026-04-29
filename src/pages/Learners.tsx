import React, { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase, Learner, Profile, FinanceRecord } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CreditCard, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Learners() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialGrade = searchParams.get('grade') || '';
  const initialSearch = searchParams.get('search') || '';
  
  const [learners, setLearners] = useState<Learner[]>([]);
  const [records, setRecords] = useState<Record<string, FinanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingLearner, setEditingLearner] = useState<Learner | null>(null);
  const [isQuickAdd, setIsQuickAdd] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [assessmentNo, setAssessmentNo] = useState('');
  const [currentGrade, setCurrentGrade] = useState(profile?.role === 'teacher' && profile?.assigned_grade ? profile.assigned_grade : '');
  const [parentName, setParentName] = useState('');
  const [parentContact, setParentContact] = useState('');
  const [boardingStatus, setBoardingStatus] = useState<'day' | 'boarding'>('day');
  const [gender, setGender] = useState<'boy' | 'girl'>('boy');

  // Sync search state with URL parameter if it changes
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam !== null) {
      setSearch(searchParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchLearners();
  }, [profile]);

  const openAddDialog = () => {
    setEditingLearner(null);
    setName('');
    setAssessmentNo('');
    setCurrentGrade(profile?.role === 'teacher' && profile?.assigned_grade ? profile.assigned_grade : '');
    setParentName('');
    setParentContact('');
    setBoardingStatus('day');
    setGender('boy');
    setIsDialogOpen(true);
  };

  const openEditDialog = (learner: Learner) => {
    setEditingLearner(learner);
    setName(learner.name);
    setAssessmentNo(learner.assessment_no);
    setCurrentGrade(learner.current_grade);
    setParentName(learner.parent_name || '');
    setParentContact(learner.parent_contact || '');
    setBoardingStatus(learner.boarding_status);
    setGender(learner.gender || 'boy');
    setIsDialogOpen(true);
  };

  const handleDelete = async (learner: Learner) => {
    if (!profile || profile.role !== 'admin') {
      toast.error('Only administrators can delete learners');
      return;
    }

    const { id, name, current_grade } = learner;
    
    // Auto-cleanup for system ghost records accidentally added as "learners"
    if (learner.assessment_no === 'SYSTEM-ANNOUNCEMENT' || learner.current_grade === 'SYSTEM-ANNOUNCEMENT') {
      try {
        await supabase.from('learners').delete().eq('id', id);
        toast.success('System record removed');
        fetchLearners();
      } catch (err) {
        console.error(err);
      }
      return;
    }

    const record = records[id];
    const balance = record ? record.balance : 0;
    const hasOutstandingFees = balance > 0;

    if (hasOutstandingFees) {
      // Logic: If they owe money, they MUST go to Departures instead of permanent deletion
      const confirmMove = window.confirm(
        `${name} has an outstanding balance of KES ${balance.toLocaleString()}.\n\nStudents with pending fees cannot be permanently deleted. Would you like to move them to the 'Departures' list instead?`
      );

      if (confirmMove) {
        setLoading(true);
        try {
          const { error } = await supabase
            .from('learners')
            .update({ current_grade: `DEPARTED-${current_grade}` })
            .eq('id', id);
          
          if (error) throw error;
          toast.success(`${name} moved to Departures due to pending fees`);
          fetchLearners();
        } catch (error: any) {
          toast.error(error.message || 'Failed to transfer learner');
        } finally {
          setLoading(false);
        }
      }
    } else {
      // Logic: If balance is zero, they can be permanently removed
      const confirmDelete = window.confirm(
        `Are you sure you want to permanently delete ${name}?\n\nThis student has cleared all fees. This action cannot be undone.`
      );

      if (confirmDelete) {
        setLoading(true);
        try {
          // The database handles cascade delete if you ran the latest SQL script
          const { error } = await supabase.from('learners').delete().eq('id', id);
          if (error) throw error;
          
          toast.success(`${name} permanently removed from system`);
          fetchLearners();
        } catch (error: any) {
          toast.error(error.message || 'Failed to delete learner');
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const fetchLearners = async () => {
    let query = supabase.from('learners').select('*').not('current_grade', 'ilike', 'DEPARTED-%').not('current_grade', 'eq', 'SYSTEM-ANNOUNCEMENT').order('name');
    
    if (profile?.role === 'teacher' && profile?.assigned_grade) {
      query = query.eq('current_grade', profile.assigned_grade);
    } else if (initialGrade) {
      query = query.eq('current_grade', initialGrade);
    }

    const { data, error } = await query;
    
    if (error) {
      toast.error('Failed to fetch learners');
    } else {
      setLearners(data || []);
      
      if (data && data.length > 0) {
        const learnerIds = data.map(l => l.id);
        const { data: recordsData } = await supabase
          .from('finance_records')
          .select('*')
          .in('learner_id', learnerIds)
          .eq('term', 1) // Default to term 1 for status
          .eq('year', new Date().getFullYear());

        const newRecords: Record<string, FinanceRecord> = {};
        recordsData?.forEach(record => {
          newRecords[record.learner_id] = record;
        });
        setRecords(newRecords);
      }
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return; // Double-click prevention
    
    if (!name.trim()) {
      toast.error('Please enter the learner\'s name');
      return;
    }

    if (!assessmentNo.trim()) {
      toast.error('Please enter the assessment number');
      return;
    }

    if (!currentGrade) {
      toast.error('Please select a current grade');
      return;
    }

    // Parent details are now optional for initial setup
    if (parentName.trim() && parentName.trim().length < 2) {
      toast.error('Parent name is too short');
      return;
    }

    const phoneRegex = /^\+?[0-9\s\-()]{10,15}$/;
    if (parentContact.trim() && !phoneRegex.test(parentContact.trim())) {
      toast.error('Please enter a valid phone number or leave it blank');
      return;
    }

    setSaving(true);

    try {
      if (!editingLearner) {
        // Check for unique assessment number only on new records
        const { data: existingLearner, error: checkError } = await supabase
          .from('learners')
          .select('id')
          .eq('assessment_no', assessmentNo.trim())
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingLearner) {
          toast.error('A learner with this assessment number already exists');
          setSaving(false);
          return;
        }

        const { error } = await supabase.from('learners').insert([{
          name: name.trim(),
          assessment_no: assessmentNo.trim(),
          current_grade: currentGrade,
          gender: gender,
          parent_name: parentName.trim(),
          parent_contact: parentContact.trim(),
          boarding_status: boardingStatus
        }]);

        if (error) throw error;
        toast.success('Learner added successfully');
      } else {
        const { error } = await supabase
          .from('learners')
          .update({
            name: name.trim(),
            assessment_no: assessmentNo.trim(),
            current_grade: currentGrade,
            gender: gender,
            parent_name: parentName.trim(),
            parent_contact: parentContact.trim(),
            boarding_status: boardingStatus
          })
          .eq('id', editingLearner.id);

        if (error) throw error;
        toast.success('Learner updated successfully');
      }

      if (isQuickAdd && !editingLearner) {
        // Keep dialog open and reset only name/assessment for next entry
        setName('');
        setAssessmentNo('');
        // Keep grade and boarding status for faster entry
      } else {
        setIsDialogOpen(false);
      }
      
      fetchLearners();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save learner');
    } finally {
      setSaving(false);
    }
  };

  const filteredLearners = learners.filter(l => 
    l.name.toLowerCase().includes(search.toLowerCase()) || 
    l.assessment_no.toLowerCase().includes(search.toLowerCase()) ||
    l.current_grade.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: learners.length,
    boarding: learners.filter(l => l.boarding_status === 'boarding').length,
    day: learners.filter(l => l.boarding_status === 'day').length,
    alumni: learners.filter(l => l.current_grade.startsWith('Alumni')).length
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Learners</h1>
          <p className="text-muted-foreground font-medium mt-1">Manage student records and information</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="hidden lg:flex items-center gap-6 px-6 py-3 bg-card rounded-2xl border border-border/50 shadow-sm">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Total</span>
              <span className="text-xl font-bold">{stats.total}</span>
            </div>
            <div className="w-px h-8 bg-border/50" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Boarders</span>
              <span className="text-xl font-bold text-blue-600">{stats.boarding}</span>
            </div>
            <div className="w-px h-8 bg-border/50" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Day</span>
              <span className="text-xl font-bold text-green-600">{stats.day}</span>
            </div>
            {stats.alumni > 0 && (
              <>
                <div className="w-px h-8 bg-border/50" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Alumni</span>
                  <span className="text-xl font-bold text-purple-600">{stats.alumni}</span>
                </div>
              </>
            )}
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} className="h-12 px-6 rounded-xl font-bold shadow-lg shadow-primary/20">
                Add New Learner
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{editingLearner ? 'Edit Learner' : 'Add New Learner'}</DialogTitle>
              </DialogHeader>
            <form onSubmit={handleSave} className="space-y-6 pt-4">
              {!editingLearner && (
                <div className="flex items-center space-x-3 p-4 bg-secondary/30 rounded-2xl border border-border/50">
                  <input 
                    type="checkbox" 
                    id="quick-add" 
                    checked={isQuickAdd} 
                    onChange={(e) => setIsQuickAdd(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-border bg-background text-primary focus:ring-primary/20"
                  />
                  <Label htmlFor="quick-add" className="text-sm font-bold cursor-pointer text-foreground">
                    Quick Add Mode <span className="text-[10px] text-muted-foreground font-medium block">Keep dialog open after saving</span>
                  </Label>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Full Name</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="h-11 rounded-xl bg-secondary/30 border-none font-bold"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Assessment Number</Label>
                  <Input 
                    id="assessmentNo" 
                    value={assessmentNo} 
                    onChange={e => setAssessmentNo(e.target.value)} 
                    className="h-11 rounded-xl bg-secondary/30 border-none font-bold uppercase"
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Current Grade</Label>
                  <Select value={currentGrade} onValueChange={setCurrentGrade} required disabled={profile?.role === 'teacher'}>
                    <SelectTrigger className="h-11 rounded-xl bg-secondary/30 border-none font-bold">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="PP1">PP1</SelectItem>
                      <SelectItem value="PP2">PP2</SelectItem>
                      <SelectItem value="Grade 1">Grade 1</SelectItem>
                      <SelectItem value="Grade 2">Grade 2</SelectItem>
                      <SelectItem value="Grade 3">Grade 3</SelectItem>
                      <SelectItem value="Grade 4">Grade 4</SelectItem>
                      <SelectItem value="Grade 5">Grade 5</SelectItem>
                      <SelectItem value="Grade 6">Grade 6</SelectItem>
                      <SelectItem value="Grade 7">Grade 7</SelectItem>
                      <SelectItem value="Grade 8">Grade 8</SelectItem>
                      <SelectItem value="Grade 9">Grade 9</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Boarding Status</Label>
                  <Select value={boardingStatus} onValueChange={(v: 'day'|'boarding') => setBoardingStatus(v)} required>
                    <SelectTrigger className="h-11 rounded-xl bg-secondary/30 border-none font-bold">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="day">Day Scholar</SelectItem>
                      <SelectItem value="boarding">Boarder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Gender</Label>
                <Select value={gender} onValueChange={(v: 'boy'|'girl') => setGender(v)} required>
                  <SelectTrigger className="h-11 rounded-xl bg-secondary/30 border-none font-bold text-foreground">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="boy">Boy</SelectItem>
                    <SelectItem value="girl">Girl</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Parent Name (Optional)</Label>
                  <Input 
                    id="parentName" 
                    value={parentName} 
                    onChange={e => setParentName(e.target.value)} 
                    className="h-11 rounded-xl bg-secondary/30 border-none font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Parent Contact (Optional)</Label>
                  <Input 
                    id="contact" 
                    value={parentContact} 
                    onChange={e => setParentContact(e.target.value)} 
                    placeholder="e.g. 0712345678" 
                    className="h-11 rounded-xl bg-secondary/30 border-none font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-11 px-6 rounded-xl font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="h-11 px-8 rounded-xl font-bold shadow-lg shadow-primary/20">
                  {saving ? 'Saving...' : editingLearner ? 'Update Learner' : 'Save Learner'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      <div className="flex items-center space-x-2">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, assessment no, or grade..." 
            className="pl-10 h-12 bg-card border-border/50 rounded-xl shadow-sm" 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="hidden md:block border border-border/50 rounded-3xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="font-bold text-foreground py-4 px-6">Assessment No</TableHead>
              <TableHead className="font-bold text-foreground py-4">Name</TableHead>
              <TableHead className="font-bold text-foreground py-4">Grade</TableHead>
              <TableHead className="font-bold text-foreground py-4">Status</TableHead>
              <TableHead className="font-bold text-foreground py-4">Fee Status</TableHead>
              <TableHead className="font-bold text-foreground py-4">Parent Name</TableHead>
              <TableHead className="font-bold text-foreground py-4 text-right px-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  Loading learners...
                </TableCell>
              </TableRow>
            ) : filteredLearners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No learners found matching your search</TableCell>
              </TableRow>
            ) : (
              filteredLearners.map((learner) => {
                const record = records[learner.id];
                const balance = record ? record.balance : null;
                
                return (
                  <TableRow key={learner.id} className="hover:bg-secondary/20 transition-colors border-border/50">
                    <TableCell className="font-bold text-foreground px-6">{learner.assessment_no}</TableCell>
                    <TableCell className="font-medium">{learner.name}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-primary/5 text-primary text-[10px] font-bold rounded-lg border border-primary/10">
                        {learner.current_grade}
                      </span>
                    </TableCell>
                    <TableCell className="capitalize">
                      <span className={`text-[10px] font-bold ${learner.boarding_status === 'boarding' ? 'text-purple-600' : 'text-blue-600'}`}>
                        {learner.boarding_status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {balance !== null ? (
                        balance <= 0 ? (
                          <span className="text-green-600 text-[10px] font-bold bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-800">PAID</span>
                        ) : (
                          <span className="text-red-600 text-[10px] font-bold bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800">BAL: {balance.toLocaleString()}</span>
                        )
                      ) : (
                        <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider">No Record</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{learner.parent_name || '-'}</TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                          onClick={() => openEditDialog(learner)}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 rounded-lg text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => navigate(`/finance?learnerId=${learner.id}`)}
                        >
                          <CreditCard className="w-4 h-4 mr-1.5" />
                          Fee
                        </Button>
                        {profile?.role === 'admin' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-100 transition-all active:scale-95 duration-200 pointer-events-auto"
                            title="Delete Learner"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(learner);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-3xl border border-border/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            Loading learners...
          </div>
        ) : filteredLearners.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-3xl border border-border/50">
            No learners found
          </div>
        ) : (
          filteredLearners.map((learner) => {
            const record = records[learner.id];
            const balance = record ? record.balance : null;
            return (
              <div key={learner.id} className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{learner.name}</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">{learner.assessment_no}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold rounded-lg border border-primary/10">
                      {learner.current_grade}
                    </span>
                    <span className={`text-[10px] font-bold uppercase ${learner.boarding_status === 'boarding' ? 'text-purple-600' : 'text-blue-600'}`}>
                      {learner.boarding_status}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 border-y border-border/50">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Fee Status:</span>
                    <div className="mt-1">
                      {balance !== null ? (
                        balance <= 0 ? (
                          <span className="text-green-600 text-[10px] font-bold bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-800 uppercase">Paid</span>
                        ) : (
                          <span className="text-red-600 text-[10px] font-bold bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800 uppercase text-xs">Bal: {balance.toLocaleString()}</span>
                        )
                      ) : (
                        <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider">No Record</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-right">
                    <span className="text-muted-foreground block mb-1">Parent:</span>
                    <span className="font-medium text-foreground">{learner.parent_name || '-'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-10 rounded-xl font-bold"
                    onClick={() => openEditDialog(learner)}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1 h-10 rounded-xl font-bold"
                    onClick={() => navigate(`/finance?learnerId=${learner.id}`)}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Fees
                  </Button>
                  {profile?.role === 'admin' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-10 w-10 rounded-xl text-red-500 bg-red-50 dark:bg-red-900/20 active:scale-95 transition-transform"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(learner);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
