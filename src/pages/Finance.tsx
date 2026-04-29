import { useState, useEffect } from 'react';
import { useOutletContext, Navigate, useSearchParams } from 'react-router-dom';
import { supabase, Learner, FinanceRecord, Profile } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Eye, EyeOff, FileText, Search, Plus, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Finance() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const [searchParams] = useSearchParams();
  const initialLearnerId = searchParams.get('learnerId');

  const [learners, setLearners] = useState<Learner[]>([]);
  const [records, setRecords] = useState<Record<string, FinanceRecord>>({});
  const [selectedGrade, setSelectedGrade] = useState<string>('Grade 1');
  const [term, setTerm] = useState<string>('1');
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showTotals, setShowTotals] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState<number | null>(null);
  const [showRevenue, setShowRevenue] = useState(false);
  
  // Record Payment Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Learner[]>([]);
  const [selectedLearner, setSelectedLearner] = useState<Learner | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'M-Pesa' | 'Cash' | 'Bank'>('Cash');
  const [refNumber, setRefNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Protect route
  if (profile && profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (initialLearnerId) {
      handleDirectSelect(initialLearnerId);
    }
  }, [initialLearnerId]);

  const handleDirectSelect = async (id: string) => {
    const { data } = await supabase.from('learners').select('*').eq('id', id).single();
    if (data) {
      setSelectedLearner(data);
      setIsRecordModalOpen(true);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedGrade, term, year]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch total revenue for all time
    const { data: revenueData } = await supabase
      .from('finance_records')
      .select('total_paid');
    
    const rev = revenueData?.reduce((sum, record) => sum + (record.total_paid || 0), 0) || 0;
    setTotalRevenue(rev);

    const { data: learnersData } = await supabase
      .from('learners')
      .select('*')
      .eq('current_grade', selectedGrade);
      
    setLearners(learnersData || []);

    if (learnersData && learnersData.length > 0) {
      const learnerIds = learnersData.map(l => l.id);
      const { data: recordsData } = await supabase
        .from('finance_records')
        .select('*')
        .in('learner_id', learnerIds)
        .eq('term', parseInt(term))
        .eq('year', parseInt(year));

      const newRecords: Record<string, FinanceRecord> = {};
      recordsData?.forEach(record => {
        newRecords[record.learner_id] = record;
      });
      setRecords(newRecords);
    }
    
    setLoading(false);
  };

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

  const handlePaymentUpdate = async (learner: Learner, amount: string, printReceipt: boolean = false) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return;

    setSaving(learner.id);
    try {
      // Fetch existing record first to ensure we have the latest
      const { data: existingData } = await supabase
        .from('finance_records')
        .select('*')
        .eq('learner_id', learner.id)
        .eq('term', parseInt(term))
        .eq('year', parseInt(year))
        .single();

      const existingRecord = existingData || {
        tuition_fee: 0,
        boarding_fee: 0,
        arrears_carried_forward: 0,
        total_paid: 0
      };

      const newTotalPaid = existingRecord.total_paid + numAmount;

      const { data, error } = await supabase
        .from('finance_records')
        .upsert({
          learner_id: learner.id,
          term: parseInt(term),
          year: parseInt(year),
          tuition_fee: existingRecord.tuition_fee,
          boarding_fee: existingRecord.boarding_fee,
          arrears_carried_forward: existingRecord.arrears_carried_forward,
          total_paid: newTotalPaid
        }, { onConflict: 'learner_id,term,year' })
        .select()
        .single();

      if (error) throw error;

      setRecords(prev => ({
        ...prev,
        [learner.id]: data
      }));
      toast.success('Payment recorded successfully');

      // Check if departed learner has cleared fees
      if (learner.current_grade.startsWith('DEPARTED-') && data.balance <= 0) {
        setTimeout(async () => {
          if (window.confirm(`${learner.name} has cleared all outstanding fees. Would you like to permanently remove them from the system now?`)) {
            try {
              await supabase.from('finance_records').delete().eq('learner_id', learner.id);
              await supabase.from('academic_records').delete().eq('learner_id', learner.id);
              await supabase.from('learners').delete().eq('id', learner.id);
              toast.success(`${learner.name} removed from system.`);
              fetchData();
            } catch (err) {
              toast.error('Failed to remove learner after fee clearance');
            }
          }
        }, 500);
      }

      if (printReceipt) {
        generateReceipt(learner, data, numAmount, paymentType, refNumber);
      }
      
      // Close modal if open
      if (isRecordModalOpen) {
        setIsRecordModalOpen(false);
        setSelectedLearner(null);
        setPaymentAmount('');
        setPaymentType('Cash');
        setRefNumber('');
        setSearchQuery('');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setSaving(null);
    }
  };

  const generateReceipt = (learner: Learner, record: FinanceRecord, currentPayment?: number, pType?: string, ref?: string, docInstance?: jsPDF) => {
    if (!record) {
      return null;
    }

    const doc = docInstance || new jsPDF();
    
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
    doc.text('OFFICIAL FEE RECEIPT', 105, 50, { align: 'center' });

    // Learner Details
    doc.setFontSize(12);
    doc.text(`Learner Name: ${learner.name}`, 20, 65);
    doc.text(`Assessment No: ${learner.assessment_no}`, 20, 75);
    doc.text(`Grade: ${learner.current_grade}`, 120, 65);
    doc.text(`Term: ${term} | Year: ${year}`, 120, 75);

    const tableBody = [
      ['Tuition Fee', `KES ${record.tuition_fee.toLocaleString()}`],
    ];

    if (learner.boarding_status === 'boarding') {
      tableBody.push(['Boarding Fee', `KES ${(record.boarding_fee || 0).toLocaleString()}`]);
    }

    tableBody.push(
      ['Arrears Carried Forward', `KES ${record.arrears_carried_forward.toLocaleString()}`],
      ['Total Required', `KES ${(record.tuition_fee + (record.boarding_fee || 0) + record.arrears_carried_forward).toLocaleString()}`],
    );

    if (currentPayment !== undefined) {
      tableBody.push(['Current Payment', `KES ${currentPayment.toLocaleString()}`]);
      if (pType) tableBody.push(['Payment Method', pType]);
      if (ref) tableBody.push(['Reference No', ref]);
    }
    
    tableBody.push(['Total Paid to Date', `KES ${record.total_paid.toLocaleString()}`]);
    tableBody.push(['Balance Due', `KES ${record.balance.toLocaleString()}`]);

    autoTable(doc, {
      startY: 85,
      head: [['Description', 'Amount']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 11, cellPadding: 5 },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 85;
    
    doc.setFontSize(10);
    doc.text(`Date Printed: ${new Date().toLocaleString()}`, 20, finalY + 20);
    doc.text(`Served by: ${profile?.full_name || 'Admin'}`, 20, finalY + 30);
    doc.text('Authorized Signature: _______________________', 120, finalY + 30);
    
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Thank you for your payment.', 105, finalY + 50, { align: 'center' });

    if (!docInstance) {
      doc.save(`${learner.name.replace(/\s+/g, '_')}_Receipt_Term${term}_${year}.pdf`);
    }
    return doc;
  };

  const massPrintReceipts = () => {
    const learnersWithRecords = learners.filter(l => records[l.id]);
    if (learnersWithRecords.length === 0) {
      toast.error('No finance records found for the current selection');
      return;
    }

    const doc = new jsPDF();

    learnersWithRecords.forEach((learner, index) => {
      const record = records[learner.id];
      if (index > 0) doc.addPage();
      generateReceipt(learner, record, undefined, undefined, undefined, doc);
    });

    doc.save(`Mass_Receipts_${selectedGrade}_Term${term}_${year}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Finance</h1>
          <p className="text-muted-foreground font-medium mt-1">Manage fee payments and balances</p>
        </div>
        <div className="flex items-center gap-4">
          <div 
            onClick={() => setShowRevenue(!showRevenue)}
            className={`
              cursor-pointer transition-all duration-500 px-6 py-3 rounded-2xl border shadow-sm group w-full md:w-auto
              ${showRevenue 
                ? 'bg-primary/10 border-primary/20 ring-4 ring-primary/5' 
                : 'bg-secondary/5 border-border/10 opacity-40 hover:opacity-100 hover:bg-secondary/10'}
            `}
          >
            <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-1 group-hover:text-foreground transition-colors">Total School Revenue Collected</p>
            <p className={`text-xl font-bold transition-all duration-500 ${showRevenue ? 'text-primary scale-105' : 'text-muted-foreground/10 blur-[4px] select-none'}`}>
              {showRevenue ? `KES ${totalRevenue?.toLocaleString() || '0'}` : 'KES 00,000,000'}
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowTotals(!showTotals)}
              className="h-12 rounded-xl border-border/50 bg-card shadow-sm font-bold"
            >
              {showTotals ? <EyeOff className="w-4 h-4 mr-2 text-primary" /> : <Eye className="w-4 h-4 mr-2 text-primary" />}
              {showTotals ? 'Hide Totals' : 'Show Totals'}
            </Button>
            <Button 
              variant="outline" 
              onClick={massPrintReceipts} 
              disabled={learners.length === 0}
              className="h-12 rounded-xl border-border/50 bg-card shadow-sm font-bold"
            >
              <Printer className="w-4 h-4 mr-2 text-primary" />
              Mass Print
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 items-end bg-card p-6 rounded-3xl border border-border/50 shadow-sm">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Grade</Label>
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger className="w-[180px] h-11 rounded-xl bg-secondary/30 border-none font-bold">
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
        <div className="flex gap-2 ml-auto">
          <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
            <DialogTrigger render={
              <Button className="h-12 px-6 rounded-xl font-bold shadow-lg shadow-green-500/20 bg-green-600 hover:bg-green-700" />
            }>
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Record Fee Payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {!selectedLearner ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search learner by name or assessment no..." 
                        className="pl-10 h-12 bg-secondary/30 border-none rounded-xl font-bold"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    {searchQuery.trim().length >= 2 && (
                      <div className="border border-border/50 rounded-2xl max-h-60 overflow-y-auto bg-card shadow-xl">
                        {isSearching ? (
                          <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                            <p className="text-xs text-muted-foreground">Searching...</p>
                          </div>
                        ) : searchResults.length > 0 ? (
                          <div className="divide-y divide-border/50">
                            {searchResults.map(learner => (
                              <div 
                                key={learner.id} 
                                className="p-4 hover:bg-secondary/50 cursor-pointer flex justify-between items-center group transition-colors"
                                onClick={() => setSelectedLearner(learner)}
                              >
                                <div>
                                  <p className="font-bold text-foreground group-hover:text-primary transition-colors">{learner.name}</p>
                                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                    {learner.assessment_no} • {learner.current_grade}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground font-medium">
                                    Parent: {learner.parent_name || 'N/A'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {learner.current_grade.startsWith('Alumni') && (
                                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-lg font-bold border border-purple-200">ALUMNI</span>
                                  )}
                                  <Button variant="ghost" size="sm" className="rounded-lg font-bold text-xs">Select</Button>
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
                ) : (
                  <div className="space-y-6">
                    <div className="bg-secondary/30 p-5 rounded-2xl border border-border/50 flex justify-between items-start">
                      <div>
                        <p className="font-bold text-foreground">{selectedLearner.name}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{selectedLearner.assessment_no} • {selectedLearner.current_grade}</p>
                        <p className="text-[10px] text-muted-foreground font-medium">Parent: {selectedLearner.parent_name || 'N/A'}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLearner(null)} className="rounded-lg font-bold text-xs h-8">Change</Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                      <div>
                        <p className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">Current Balance</p>
                        <p className="text-xl font-bold text-primary">
                          KES {(records[selectedLearner.id]?.balance || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">New Balance</p>
                        <p className="text-xl font-bold text-primary">
                          KES {(Math.max(0, (records[selectedLearner.id]?.balance || 0) - (parseFloat(paymentAmount) || 0))).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Payment Amount (KES)</Label>
                      <Input 
                        type="number" 
                        placeholder="Enter amount..." 
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="h-11 rounded-xl bg-secondary/30 border-none font-bold"
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Payment Type</Label>
                        <Select value={paymentType} onValueChange={(v: any) => setPaymentType(v)}>
                          <SelectTrigger className="h-11 rounded-xl bg-secondary/30 border-none font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Bank">Bank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Ref Number</Label>
                        <Input 
                          placeholder="e.g. QWX123..." 
                          value={refNumber}
                          onChange={(e) => setRefNumber(e.target.value)}
                          className="h-11 rounded-xl bg-secondary/30 border-none font-bold uppercase"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4">
                      <Button 
                        variant="ghost" 
                        onClick={() => handlePaymentUpdate(selectedLearner, paymentAmount, false)}
                        disabled={!paymentAmount || saving === selectedLearner.id}
                        className="h-11 px-6 rounded-xl font-bold"
                      >
                        {saving === selectedLearner.id ? 'Saving...' : 'Save Only'}
                      </Button>
                      <Button 
                        onClick={() => handlePaymentUpdate(selectedLearner, paymentAmount, true)}
                        disabled={!paymentAmount || saving === selectedLearner.id}
                        className="h-11 px-8 rounded-xl font-bold shadow-lg shadow-primary/20"
                      >
                        {saving === selectedLearner.id ? 'Saving...' : 'Save & Print Receipt'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="hidden md:block border border-border/50 rounded-3xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-secondary/30">
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="font-bold text-foreground py-4 px-6">Learner</TableHead>
              <TableHead className="font-bold text-foreground py-4 text-right">Tuition Fee</TableHead>
              <TableHead className="font-bold text-foreground py-4 text-right">Arrears</TableHead>
              <TableHead className="font-bold text-foreground py-4 text-right">Total Paid</TableHead>
              <TableHead className="font-bold text-foreground py-4 text-right">Balance</TableHead>
              <TableHead className="font-bold text-foreground py-4 text-center px-6">Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  Loading finance records...
                </TableCell>
              </TableRow>
            ) : learners.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No learners found for this grade</TableCell>
              </TableRow>
            ) : (
              learners.map((learner) => {
                const record = records[learner.id];
                return (
                  <TableRow key={learner.id} className="hover:bg-secondary/20 transition-colors border-border/50">
                    <TableCell className="font-bold text-foreground px-6">{learner.name}</TableCell>
                    <TableCell className="text-right font-medium">
                      {showTotals ? `KES ${record?.tuition_fee?.toLocaleString() || 0}` : '***'}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      {showTotals ? `KES ${record?.arrears_carried_forward?.toLocaleString() || 0}` : '***'}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {showTotals ? `KES ${record?.total_paid?.toLocaleString() || 0}` : '***'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground">
                      {showTotals ? `KES ${record?.balance?.toLocaleString() || 0}` : '***'}
                    </TableCell>
                    <TableCell className="text-center px-6">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-lg text-primary hover:bg-primary/10"
                        onClick={() => generateReceipt(learner, record)}
                        disabled={!record}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Finance Cards */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-3xl border border-border/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            Loading...
          </div>
        ) : learners.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-3xl border border-border/50">
            No records found
          </div>
        ) : (
          learners.map((learner) => {
            const record = records[learner.id];
            return (
              <div key={learner.id} className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-foreground">{learner.name}</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 w-9 rounded-xl text-primary bg-primary/5"
                    onClick={() => generateReceipt(learner, record)}
                    disabled={!record}
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-secondary/30 rounded-xl border border-border/30">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Tuition</p>
                    <p className="text-sm font-bold">{showTotals ? `KES ${record?.tuition_fee?.toLocaleString() || 0}` : '***'}</p>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-xl border border-border/30">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Arrears</p>
                    <p className="text-sm font-bold text-red-600">{showTotals ? `KES ${record?.arrears_carried_forward?.toLocaleString() || 0}` : '***'}</p>
                  </div>
                  <div className="p-3 bg-secondary/30 rounded-xl border border-border/30">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Paid</p>
                    <p className="text-sm font-bold text-green-600">{showTotals ? `KES ${record?.total_paid?.toLocaleString() || 0}` : '***'}</p>
                  </div>
                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
                    <p className="text-[9px] uppercase tracking-widest font-bold text-primary mb-1">Balance</p>
                    <p className="text-sm font-bold text-primary">{showTotals ? `KES ${record?.balance?.toLocaleString() || 0}` : '***'}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
