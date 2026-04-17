import { useState, useEffect } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
import { supabase, Profile } from '../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Printer } from 'lucide-react';

export default function Settings() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const [loading, setLoading] = useState(false);

  // Term Dates State
  const [term1Start, setTerm1Start] = useState('');
  const [term1End, setTerm1End] = useState('');
  const [term2Start, setTerm2Start] = useState('');
  const [term2End, setTerm2End] = useState('');
  const [term3Start, setTerm3Start] = useState('');
  const [term3End, setTerm3End] = useState('');

  // Finance State (Table Based)
  const [dayFees, setDayFees] = useState<Record<string, { t1: string; t2: string; t3: string }>>({
    'PP1 & PP2': { t1: '', t2: '', t3: '' },
    'Grade 1 - 3': { t1: '', t2: '', t3: '' },
    'Grade 4 - 6': { t1: '', t2: '', t3: '' },
    'Grade 7 - 9': { t1: '', t2: '', t3: '' },
  });

  const [boarderFees, setBoarderFees] = useState<Record<string, { t1: string; t2: string; t3: string }>>({
    'Grade 4 - 6': { t1: '', t2: '', t3: '' },
    'Grade 7 - 9': { t1: '', t2: '', t3: '' },
  });

  const handleDayFeeChange = (group: string, term: 't1' | 't2' | 't3', value: string) => {
    setDayFees(prev => ({
      ...prev,
      [group]: { ...prev[group], [term]: value }
    }));
  };

  const handleBoarderFeeChange = (group: string, term: 't1' | 't2' | 't3', value: string) => {
    setBoarderFees(prev => ({
      ...prev,
      [group]: { ...prev[group], [term]: value }
    }));
  };

  // Fee Structure Notes
  const [feeNotes, setFeeNotes] = useState(
    '1. All fees must be paid within the first two weeks of the term.\n2. Boarding fees include accommodation and meals.\n3. Arrears from previous terms must be cleared before registration.'
  );

  // Academics State (Scoring Scales)
  const [eeMin, setEeMin] = useState('80');
  const [meMin, setMeMin] = useState('60');
  const [aeMin, setAeMin] = useState('40');
  const [beMax, setBeMax] = useState('39');

  // Protect route
  if (profile && profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const handleSaveTermDates = async () => {
    setLoading(true);
    // In a real app, you would save this to a 'school_settings' table in Supabase
    // For now, we'll simulate saving
    setTimeout(() => {
      toast.success('Term dates updated successfully');
      setLoading(false);
    }, 500);
  };

  const handleSaveFinance = async () => {
    setLoading(true);
    setTimeout(() => {
      toast.success('Default tuition fees updated successfully');
      setLoading(false);
    }, 500);
  };

  const handleSaveAcademics = async () => {
    setLoading(true);
    setTimeout(() => {
      toast.success('Academic scoring scales updated successfully');
      setLoading(false);
    }, 500);
  };

  const printFeeStructure = () => {
    const doc = new jsPDF();
    
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
    doc.text('OFFICIAL FEE STRUCTURE', 105, 50, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Academic Year: ${new Date().getFullYear()}`, 20, 65);

    const formatCurrency = (val: string | number) => `KES ${Number(val || 0).toLocaleString()}`;
    
    // Day Scholars Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. DAY SCHOLARS FEE STRUCTURE', 20, 75);
    
    const dayTableBody = Object.entries(dayFees).map(([group, terms]) => {
      const t = terms as { t1: string; t2: string; t3: string };
      return [
        group,
        formatCurrency(t.t1),
        formatCurrency(t.t2),
        formatCurrency(t.t3)
      ];
    });

    autoTable(doc, {
      startY: 80,
      head: [['Grade Group', 'Term 1', 'Term 2', 'Term 3']],
      body: dayTableBody,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 15;

    // Boarders Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. BOARDERS FEE STRUCTURE', 20, currentY);
    
    const boarderTableBody = Object.entries(boarderFees).map(([group, terms]) => {
      const t = terms as { t1: string; t2: string; t3: string };
      return [
        group,
        formatCurrency(t.t1),
        formatCurrency(t.t2),
        formatCurrency(t.t3)
      ];
    });

    autoTable(doc, {
      startY: currentY + 5,
      head: [['Grade Group', 'Term 1', 'Term 2', 'Term 3']],
      body: boarderTableBody,
      theme: 'grid',
      headStyles: { fillColor: [39, 174, 96], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || currentY;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Important Notes:', 20, finalY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Split notes by newline and print
    const notesLines = feeNotes.split('\n');
    notesLines.forEach((line, index) => {
      doc.text(line, 20, finalY + 18 + (index * 5));
    });
    
    const notesHeight = notesLines.length * 5;
    doc.text(`Date Printed: ${new Date().toLocaleDateString()}`, 20, finalY + 25 + notesHeight);
    doc.text('School Stamp & Signature: _______________________', 110, finalY + 25 + notesHeight);

    // Open printer settings instead of direct download
    doc.autoPrint();
    const blobUrl = URL.createObjectURL(doc.output('blob'));
    window.open(blobUrl, '_blank');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">School Settings</h1>
        <p className="text-muted-foreground font-medium mt-1">Manage school-wide configurations and defaults.</p>
      </div>

      <Tabs defaultValue="terms" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl p-1 bg-secondary/50 rounded-2xl mb-8">
          <TabsTrigger value="terms" className="rounded-xl font-bold py-2.5">Term Dates</TabsTrigger>
          <TabsTrigger value="finance" className="rounded-xl font-bold py-2.5">Finance (Fees)</TabsTrigger>
          <TabsTrigger value="academics" className="rounded-xl font-bold py-2.5">Academic Scales</TabsTrigger>
        </TabsList>
        
        <TabsContent value="terms" className="mt-0">
          <Card className="border-none shadow-xl shadow-primary/5 rounded-3xl overflow-hidden">
            <CardHeader className="bg-secondary/30 border-b border-border/50 p-8">
              <CardTitle className="text-2xl font-bold">Term Dates Configuration</CardTitle>
              <CardDescription className="text-base">Set the start and end dates for each academic term.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Term 1 Start Date</Label>
                  <Input type="date" value={term1Start} onChange={(e) => setTerm1Start(e.target.value)} className="h-12 rounded-xl bg-secondary/30 border-none font-bold" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Term 1 End Date</Label>
                  <Input type="date" value={term1End} onChange={(e) => setTerm1End(e.target.value)} className="h-12 rounded-xl bg-secondary/30 border-none font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Term 2 Start Date</Label>
                  <Input type="date" value={term2Start} onChange={(e) => setTerm2Start(e.target.value)} className="h-12 rounded-xl bg-secondary/30 border-none font-bold" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Term 2 End Date</Label>
                  <Input type="date" value={term2End} onChange={(e) => setTerm2End(e.target.value)} className="h-12 rounded-xl bg-secondary/30 border-none font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Term 3 Start Date</Label>
                  <Input type="date" value={term3Start} onChange={(e) => setTerm3Start(e.target.value)} className="h-12 rounded-xl bg-secondary/30 border-none font-bold" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Term 3 End Date</Label>
                  <Input type="date" value={term3End} onChange={(e) => setTerm3End(e.target.value)} className="h-12 rounded-xl bg-secondary/30 border-none font-bold" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-8 bg-secondary/10 border-t border-border/50">
              <Button onClick={handleSaveTermDates} disabled={loading} className="h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20">Save Term Dates</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="mt-0">
          <Card className="border-none shadow-xl shadow-primary/5 rounded-3xl overflow-hidden">
            <CardHeader className="bg-secondary/30 border-b border-border/50 p-8">
              <CardTitle className="text-2xl font-bold">Fee Configuration Table</CardTitle>
              <CardDescription className="text-base">Enter the per-term fees for Day Scholars and Boarders.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-12">
              <div className="space-y-6">
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <div className="w-2 h-6 bg-primary rounded-full" />
                  1. Day Scholar Fees
                </h3>
                <div className="border border-border/50 rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-secondary/30">
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="w-[200px] font-bold text-foreground py-4 px-6">Grade Group</TableHead>
                        <TableHead className="font-bold text-foreground py-4">Term 1 (KES)</TableHead>
                        <TableHead className="font-bold text-foreground py-4">Term 2 (KES)</TableHead>
                        <TableHead className="font-bold text-foreground py-4">Term 3 (KES)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(dayFees).map(([group, terms]) => {
                        const t = terms as { t1: string; t2: string; t3: string };
                        return (
                          <TableRow key={group} className="hover:bg-secondary/10 border-border/50">
                            <TableCell className="font-bold text-foreground px-6">{group}</TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                value={t.t1} 
                                onChange={(e) => handleDayFeeChange(group, 't1', e.target.value)}
                                placeholder="0"
                                className="h-10 bg-secondary/30 border-none rounded-lg"
                              />
                            </TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                value={t.t2} 
                                onChange={(e) => handleDayFeeChange(group, 't2', e.target.value)}
                                placeholder="0"
                                className="h-10 bg-secondary/30 border-none rounded-lg"
                              />
                            </TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                value={t.t3} 
                                onChange={(e) => handleDayFeeChange(group, 't3', e.target.value)}
                                placeholder="0"
                                className="h-10 bg-secondary/30 border-none rounded-lg"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="font-bold text-xl flex items-center gap-2">
                  <div className="w-2 h-6 bg-green-500 rounded-full" />
                  2. Boarder Fees (Total)
                </h3>
                <div className="border border-border/50 rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-secondary/30">
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="w-[200px] font-bold text-foreground py-4 px-6">Grade Group</TableHead>
                        <TableHead className="font-bold text-foreground py-4">Term 1 (KES)</TableHead>
                        <TableHead className="font-bold text-foreground py-4">Term 2 (KES)</TableHead>
                        <TableHead className="font-bold text-foreground py-4">Term 3 (KES)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(boarderFees).map(([group, terms]) => {
                        const t = terms as { t1: string; t2: string; t3: string };
                        return (
                          <TableRow key={group} className="hover:bg-secondary/10 border-border/50">
                            <TableCell className="font-bold text-foreground px-6">{group}</TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                value={t.t1} 
                                onChange={(e) => handleBoarderFeeChange(group, 't1', e.target.value)}
                                placeholder="0"
                                className="h-10 bg-secondary/30 border-none rounded-lg"
                              />
                            </TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                value={t.t2} 
                                onChange={(e) => handleBoarderFeeChange(group, 't2', e.target.value)}
                                placeholder="0"
                                className="h-10 bg-secondary/30 border-none rounded-lg"
                              />
                            </TableCell>
                            <TableCell>
                              <Input 
                                type="number" 
                                value={t.t3} 
                                onChange={(e) => handleBoarderFeeChange(group, 't3', e.target.value)}
                                placeholder="0"
                                className="h-10 bg-secondary/30 border-none rounded-lg"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground italic font-medium">* PP1-PP2 and Grade 1-3 are day scholars only.</p>
              </div>

              <div className="pt-8 border-t border-border/50 space-y-4">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Fee Structure Notes (Customizable)</Label>
                <Textarea 
                  placeholder="Enter notes to appear on the PDF..." 
                  value={feeNotes} 
                  onChange={(e) => setFeeNotes(e.target.value)}
                  className="h-32 rounded-2xl bg-secondary/30 border-none p-4 font-bold"
                />
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">These notes will appear at the bottom of the printed fee structure PDF.</p>
              </div>
            </CardContent>
            <CardFooter className="p-8 bg-secondary/10 border-t border-border/50 flex justify-between">
              <Button onClick={handleSaveFinance} disabled={loading} className="h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20">Save Default Fees</Button>
              <Button variant="outline" onClick={printFeeStructure} className="h-12 px-8 rounded-xl font-bold border-border/50 bg-card shadow-sm">
                <Printer className="w-4 h-4 mr-2 text-primary" />
                Print Fee Structure
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="academics" className="mt-0">
          <Card className="border-none shadow-xl shadow-primary/5 rounded-3xl overflow-hidden">
            <CardHeader className="bg-secondary/30 border-b border-border/50 p-8">
              <CardTitle className="text-2xl font-bold">Academic Scoring Scales</CardTitle>
              <CardDescription className="text-base">Configure the percentage thresholds for CBC grading.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Exceeding Expectation (EE) Min %</Label>
                <Input type="number" value={eeMin} onChange={(e) => setEeMin(e.target.value)} className="h-12 rounded-xl bg-secondary/30 border-none font-bold" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Meeting Expectation (ME) Min %</Label>
                <Input type="number" value={meMin} onChange={(e) => setMeMin(e.target.value)} className="h-12 rounded-xl bg-secondary/30 border-none font-bold" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Approaching Expectation (AE) Min %</Label>
                <Input type="number" value={aeMin} onChange={(e) => setAeMin(e.target.value)} className="h-12 rounded-xl bg-secondary/30 border-none font-bold" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Below Expectation (BE) Max %</Label>
                <Input type="number" value={beMax} onChange={(e) => setBeMax(e.target.value)} className="h-12 rounded-xl bg-secondary/30 border-none font-bold" />
              </div>
            </CardContent>
            <CardFooter className="p-8 bg-secondary/10 border-t border-border/50">
              <Button onClick={handleSaveAcademics} disabled={loading} className="h-12 px-8 rounded-xl font-bold shadow-lg shadow-primary/20">Save Scoring Scales</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
