import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { GraduationCap, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role] = useState<'admin' | 'teacher'>('teacher');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [tscNo, setTscNo] = useState('');
  const [assignedGrade, setAssignedGrade] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      
      if (data.user) {
        const profileData = {
          id: data.user.id,
          full_name: fullName,
          role,
          status: role === 'admin' ? 'approved' : 'pending',
          ...(role === 'teacher' ? {
            phone_number: phoneNumber,
            tsc_no: tscNo,
            assigned_grade: assignedGrade
          } : {})
        };

        const { error: profileError } = await supabase.from('profiles').insert([profileData]);
        
        if (profileError) throw profileError;
      }
      
      if (role === 'teacher') {
        toast.success('Account created successfully! Waiting for admin approval.');
      } else {
        toast.success('Account created successfully! You are now logged in.');
      }
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      {/* Left Side: Visual/Marketing */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
        </div>
        
        <div className="relative z-10 max-w-lg text-primary-foreground space-y-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">EduManage</h1>
          </div>
          
          <h2 className="text-5xl font-bold leading-tight">
            Streamline your school management with precision.
          </h2>
          
          <div className="space-y-6 pt-8">
            <div className="flex items-start gap-4">
              <div className="mt-1 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xl">Real-time Analytics</h3>
                <p className="text-primary-foreground/70">Monitor learner progress and financial health instantly.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="mt-1 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xl">Secure Data</h3>
                <p className="text-primary-foreground/70">Enterprise-grade security for all your school records.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="mt-1 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xl">Fast Promotion</h3>
                <p className="text-primary-foreground/70">Automated end-of-year promotion engine.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-secondary/30">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 justify-center mb-8">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">EduManage</h1>
          </div>

          <Card className="border-none shadow-2xl shadow-primary/5 bg-card/80 backdrop-blur-sm">
            <CardHeader className="space-y-2 pb-8">
              <CardTitle className="text-3xl font-bold tracking-tight">Welcome back</CardTitle>
              <CardDescription className="text-base">
                Enter your credentials to access your dashboard
              </CardDescription>
            </CardHeader>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 p-1 bg-secondary rounded-xl mx-6 w-[calc(100%-3rem)]">
                <TabsTrigger value="login" className="rounded-lg font-bold">Login</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg font-bold">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-bold">Email Address</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="admin@school.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                        className="h-12 bg-background border-border/50 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="password" className="text-sm font-bold">Password</Label>
                        <button type="button" className="text-xs text-primary font-bold hover:underline">Forgot password?</button>
                      </div>
                      <Input 
                        id="password" 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                        className="h-12 bg-background border-border/50 focus:ring-primary/20"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4">
                    <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20" disabled={loading}>
                      {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp}>
                  <CardContent className="space-y-4 max-h-[500px] overflow-y-auto px-6 custom-scrollbar">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-bold">Full Name</Label>
                      <Input 
                        id="signup-name" 
                        placeholder="John Doe" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required 
                        className="h-11 bg-background border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-bold">Email Address</Label>
                      <Input 
                        id="signup-email" 
                        type="email" 
                        placeholder="admin@school.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                        className="h-11 bg-background border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-bold">Password</Label>
                      <Input 
                        id="signup-password" 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                        minLength={6}
                        className="h-11 bg-background border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-phone" className="text-sm font-bold">Phone Number</Label>
                      <Input 
                        id="signup-phone" 
                        placeholder="0700 000 000" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required 
                        className="h-11 bg-background border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-tsc" className="text-sm font-bold">TSC Number (Optional)</Label>
                      <Input 
                        id="signup-tsc" 
                        placeholder="TSC Number" 
                        value={tscNo}
                        onChange={(e) => setTscNo(e.target.value)}
                        className="h-11 bg-background border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-grade" className="text-sm font-bold">Assigned Class/Grade</Label>
                      <Select value={assignedGrade} onValueChange={setAssignedGrade} required>
                        <SelectTrigger className="h-11 bg-background border-border/50">
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
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
                  </CardContent>
                  <CardFooter className="pt-6">
                    <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20" disabled={loading}>
                      {loading ? 'Creating account...' : 'Create Teacher Account'}
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
          
          <p className="text-center text-sm text-muted-foreground">
            By continuing, you agree to our <button className="text-primary font-bold hover:underline">Terms of Service</button> and <button className="text-primary font-bold hover:underline">Privacy Policy</button>.
          </p>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
