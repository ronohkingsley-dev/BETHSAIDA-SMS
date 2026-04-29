import React, { useState, useEffect } from 'react';
import { useOutletContext, Navigate } from 'react-router-dom';
import { supabase, Profile } from '../lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Check, X, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export default function Teachers() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeacher, setEditingTeacher] = useState<Profile | null>(null);

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
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    console.log('Fetching staff members...');
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('status', 'rejected');
    
    if (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to fetch staff');
    } else {
      console.log('Staff fetched successfully:', data?.length);
      setTeachers(data || []);
    }
    setLoading(false);
  };

  const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
    console.log(`[DEBUG] Attempting to change status for ID: "${id}" to "${status}"`);
    
    // Optimistic Update
    const originalTeachers = [...teachers];
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, status } : t));

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', id)
        .select();
      
      if (error || !data || data.length === 0) {
        console.error('[DEBUG] Update failed:', error || 'No data returned');
        setTeachers(originalTeachers); // Rollback
        toast.error('Permission Denied: Please ensure Admins have UPDATE access in Supabase RLS policies');
      } else {
        console.log('[DEBUG] Update successful:', data[0]);
        toast.success(`Teacher ${status} successfully`);
        // We don't strictly need to fetchTeachers() here because of optimistic update,
        // but it's good practice to ensure sync.
        await fetchTeachers();
      }
    } catch (err) {
      console.error('[DEBUG] Unexpected error:', err);
      setTeachers(originalTeachers); // Rollback
      toast.error('An unexpected error occurred');
    }
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    
    const { error } = await supabase.from('profiles').update({
      full_name: editingTeacher.full_name,
      phone_number: editingTeacher.phone_number,
      tsc_no: editingTeacher.tsc_no,
      assigned_grade: editingTeacher.assigned_grade,
      role: editingTeacher.role
    }).eq('id', editingTeacher.id);

    if (error) {
      toast.error('Failed to update staff member');
    } else {
      toast.success('Staff member updated successfully');
      setEditingTeacher(null);
      fetchTeachers();
    }
  };

  const pendingTeachers = teachers.filter(t => t.status === 'pending');
  const activeTeachers = teachers.filter(t => t.status === 'approved' || !t.status);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Staff Management</h1>
        <p className="text-muted-foreground font-medium mt-1">Manage teacher accounts, assignments, and administrator roles</p>
      </div>

      {pendingTeachers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <h2 className="text-xl font-bold text-yellow-600">Pending Approvals</h2>
          </div>
          <div className="border border-yellow-200 dark:border-yellow-900/50 rounded-3xl bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-yellow-50/50 dark:bg-yellow-900/10">
                <TableRow className="hover:bg-transparent border-yellow-100 dark:border-yellow-900/30">
                  <TableHead className="font-bold text-yellow-900 dark:text-yellow-100 py-4 px-6">Name</TableHead>
                  <TableHead className="font-bold text-yellow-900 dark:text-yellow-100 py-4">Phone Number</TableHead>
                  <TableHead className="font-bold text-yellow-900 dark:text-yellow-100 py-4">TSC Number</TableHead>
                  <TableHead className="font-bold text-yellow-900 dark:text-yellow-100 py-4">Expected Grade</TableHead>
                  <TableHead className="text-right font-bold text-yellow-900 dark:text-yellow-100 py-4 px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingTeachers.map((teacher) => (
                  <TableRow key={teacher.id} className="hover:bg-yellow-50/30 dark:hover:bg-yellow-900/5 transition-colors border-yellow-100 dark:border-yellow-900/30">
                    <TableCell className="font-bold text-foreground px-6">{teacher.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{teacher.phone_number || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{teacher.tsc_no || '-'}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-[10px] font-bold rounded-lg border border-yellow-200 dark:border-yellow-800">
                        {teacher.assigned_grade || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button"
                          size="sm" 
                          variant="outline" 
                          className="h-9 px-4 rounded-xl border-green-200 text-green-600 hover:text-green-700 hover:bg-green-50 font-bold" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleStatusChange(teacher.id, 'approved');
                          }}
                        >
                          <Check className="w-4 h-4 mr-1.5" /> Approve
                        </Button>
                        <Button 
                          type="button"
                          size="sm" 
                          variant="outline" 
                          className="h-9 px-4 rounded-xl border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50 font-bold" 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleStatusChange(teacher.id, 'rejected');
                          }}
                        >
                          <X className="w-4 h-4 mr-1.5" /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Active Staff</h2>
        <div className="hidden md:block border border-border/50 rounded-3xl bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="font-bold text-foreground py-4 px-6">Name</TableHead>
                <TableHead className="font-bold text-foreground py-4">Role</TableHead>
                <TableHead className="font-bold text-foreground py-4">Phone Number</TableHead>
                <TableHead className="font-bold text-foreground py-4">TSC Number</TableHead>
                <TableHead className="font-bold text-foreground py-4">Assigned Grade</TableHead>
                <TableHead className="text-right font-bold text-foreground py-4 px-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    Loading staff...
                  </TableCell>
                </TableRow>
              ) : activeTeachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No active staff found</TableCell>
                </TableRow>
              ) : (
                activeTeachers.map((teacher) => (
                  <TableRow key={teacher.id} className="hover:bg-secondary/20 transition-colors border-border/50">
                    <TableCell className="font-bold text-foreground px-6">{teacher.full_name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-lg border ${
                        teacher.role === 'admin' 
                          ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' 
                          : 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                      }`}>
                        {teacher.role?.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{teacher.phone_number || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{teacher.tsc_no || '-'}</TableCell>
                    <TableCell>
                      {teacher.role === 'admin' ? (
                        <span className="text-muted-foreground text-xs italic">N/A</span>
                      ) : (
                        <span className="px-2 py-1 bg-primary/5 text-primary text-[10px] font-bold rounded-lg border border-primary/10">
                          {teacher.assigned_grade || 'Not Assigned'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                          onClick={() => setEditingTeacher(teacher)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {teacher.id !== profile?.id && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50" 
                            onClick={() => {
                              if (window.confirm('Are you sure you want to remove this staff member?')) {
                                handleStatusChange(teacher.id, 'rejected');
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Staff Cards */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-3xl border border-border/50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              Loading...
            </div>
          ) : activeTeachers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-3xl border border-border/50">
              No staff found
            </div>
          ) : (
            activeTeachers.map((teacher) => (
              <div key={teacher.id} className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-foreground text-lg">{teacher.full_name}</h3>
                    <div className="flex gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-lg border ${
                        teacher.role === 'admin' 
                          ? 'bg-purple-50 text-purple-700 border-purple-100' 
                          : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {teacher.role?.toUpperCase()}
                      </span>
                      {teacher.role !== 'admin' && (
                        <span className="px-2 py-0.5 bg-primary/5 text-primary text-[9px] font-bold rounded-lg border border-primary/10">
                          {teacher.assigned_grade || 'None'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-9 w-9 rounded-xl bg-secondary/50"
                      onClick={() => setEditingTeacher(teacher)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {teacher.id !== profile?.id && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-9 w-9 rounded-xl text-red-500 bg-red-50" 
                        onClick={() => {
                          if (window.confirm('Are you sure you want to remove this staff member?')) {
                            handleStatusChange(teacher.id, 'rejected');
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 py-2 border-t border-border/50">
                  <div className="text-xs">
                    <p className="text-muted-foreground mb-1">Phone:</p>
                    <p className="font-medium">{teacher.phone_number || '-'}</p>
                  </div>
                  <div className="text-xs text-right">
                    <p className="text-muted-foreground mb-1">TSC No:</p>
                    <p className="font-medium">{teacher.tsc_no || '-'}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={!!editingTeacher} onOpenChange={(open) => !open && setEditingTeacher(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Edit Staff Details</DialogTitle>
          </DialogHeader>
          {editingTeacher && (
            <form onSubmit={handleUpdateTeacher} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Full Name</Label>
                <Input 
                  value={editingTeacher.full_name} 
                  onChange={e => setEditingTeacher({...editingTeacher, full_name: e.target.value})} 
                  className="h-11 rounded-xl bg-secondary/30 border-none font-bold"
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Role</Label>
                  <Select 
                    value={editingTeacher.role} 
                    onValueChange={v => setEditingTeacher({...editingTeacher, role: v as 'admin' | 'teacher'})}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-secondary/30 border-none font-bold">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Assigned Grade</Label>
                  <Select 
                    value={editingTeacher.assigned_grade || ''} 
                    onValueChange={v => setEditingTeacher({...editingTeacher, assigned_grade: v})}
                    disabled={editingTeacher.role === 'admin'}
                  >
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Phone Number</Label>
                  <Input 
                    value={editingTeacher.phone_number || ''} 
                    onChange={e => setEditingTeacher({...editingTeacher, phone_number: e.target.value})} 
                    className="h-11 rounded-xl bg-secondary/30 border-none font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">TSC Number</Label>
                  <Input 
                    value={editingTeacher.tsc_no || ''} 
                    onChange={e => setEditingTeacher({...editingTeacher, tsc_no: e.target.value})} 
                    className="h-11 rounded-xl bg-secondary/30 border-none font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setEditingTeacher(null)} className="h-11 px-6 rounded-xl font-bold">Cancel</Button>
                <Button type="submit" className="h-11 px-8 rounded-xl font-bold shadow-lg shadow-primary/20">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
