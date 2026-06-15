import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { Loader2, User, UserPlus, Mail, Phone, Lock, ArrowRight, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CustomerAuthPage() {
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCountry, setRegCountry] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(loginIdentifier, loginPassword);
      if (result.success) {
        toast({
          title: "تم تسجيل الدخول",
          description: "مرحباً بك مجدداً في طمطوم",
        });
        setLocation('/');
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await register({
        name: regName,
        phone: regPhone,
        country: regCountry,
        password: regPassword,
        username: regPhone, // Use phone as username for simplicity as requested
      });

      if (result.success) {
        toast({
          title: "تم إنشاء الحساب",
          description: "مرحباً بك في طمطوم، تم إنشاء حسابك بنجاح",
        });
        setLocation('/');
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('خطأ في إنشاء الحساب. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 py-12" dir="rtl">
      <div className="mb-8 text-center">
        <div className="text-5xl md:text-6xl mb-4 flex justify-center font-black">
          <span className="text-[#388e3c]">طم</span>
          <span className="text-[#d32f2f]">طوم</span>
        </div>
        <p className="text-muted-foreground font-bold">خضروات وفواكه طازجة تصلك لباب بيتك</p>
      </div>

      <Card className="w-full max-w-md border-none shadow-2xl rounded-[2rem] overflow-hidden">
        <CardHeader className="space-y-1 bg-white pb-8">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/')} className="h-10 w-10 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowRight className="h-6 w-6" />
            </Button>
            <CardTitle className="text-3xl font-black">حسابي</CardTitle>
          </div>
          <CardDescription className="text-base font-medium">
            سجل دخولك أو أنشئ حساباً جديداً لتجربة تسوق رائعة
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-white px-8 pb-10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-10 bg-gray-100 p-1.5 rounded-2xl h-14">
              <TabsTrigger 
                value="login" 
                className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md font-black text-base transition-all"
              >
                <User className="w-5 h-5 ml-2" />
                دخول
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md font-black text-base transition-all"
              >
                <UserPlus className="w-5 h-5 ml-2" />
                تسجيل
              </TabsTrigger>
            </TabsList>

            {error && (
              <Alert variant="destructive" className="mb-6 rounded-none border-2">
                <AlertDescription className="font-bold">{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-id" className="font-bold">اسم المستخدم أو رقم الهاتف</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-id"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="أدخل اسم المستخدم أو الهاتف"
                      required
                      className="pr-10 h-14 rounded-xl border-gray-200 focus-visible:ring-primary focus-visible:border-primary transition-all text-lg"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-pass" className="font-bold">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-4 h-5 w-5 text-gray-400" />
                    <Input
                      id="login-pass"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور"
                      required
                      className="pr-10 h-14 rounded-xl border-gray-200 focus-visible:ring-primary focus-visible:border-primary transition-all text-lg"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-14 rounded-xl font-black text-xl mt-6 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-95" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري تسجيل الدخول...
                    </>
                  ) : (
                    'تسجيل الدخول'
                  )}
                </Button>
                
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-4 text-gray-500 font-bold">أو</span>
                  </div>
                </div>

                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => {
                    localStorage.setItem('is_guest', 'true');
                    window.location.reload();
                  }}
                  className="w-full h-14 rounded-xl font-black text-xl border-2 hover:bg-gray-50 transition-all active:scale-95"
                >
                  الدخول كزائر
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name" className="font-bold">الاسم بالكامل</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="reg-name"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="مثال: محمد علي"
                      required
                      className="pr-10 h-12 rounded-none border-2 focus-visible:ring-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-phone" className="font-bold">رقم الهاتف</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="reg-phone"
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="77XXXXXXX"
                      required
                      className="pr-10 h-12 rounded-none border-2 focus-visible:ring-primary text-left"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-country" className="font-bold">الدولة</Label>
                  <div className="relative">
                    <Globe className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="reg-country"
                      value={regCountry}
                      onChange={(e) => setRegCountry(e.target.value)}
                      placeholder="اختر الدولة (مثال: اليمن)"
                      required
                      className="pr-10 h-12 rounded-none border-2 focus-visible:ring-primary"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-pass" className="font-bold">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="reg-pass"
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="اختر كلمة مرور"
                      required
                      className="pr-10 h-12 rounded-none border-2 focus-visible:ring-primary"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-14 rounded-xl font-black text-xl mt-6 bg-secondary hover:bg-secondary/90 text-white shadow-lg shadow-secondary/20 transition-all active:scale-95" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      جاري إنشاء الحساب...
                    </>
                  ) : (
                    'إنشاء حساب جديد'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-sm text-muted-foreground max-w-xs text-center">
        بتسجيلك في طمطوم، أنت توافق على شروط الخدمة وسياسة الخصوصية الخاصة بنا.
      </p>
    </div>
  );
}
