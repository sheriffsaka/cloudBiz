
import React, { useState } from 'react';
import Icon from './common/Icon';
import { User } from '../types';

interface AuthPageProps {
  onLogin: (email: string, pass: string, rememberMe: boolean) => Promise<string | true> | string | true;
  onSignup: (name: string, email: string, pass: string, companyName: string, phone: string) => Promise<string | true>;
  onOpenForgotPassword: () => void;
  users: User[];
  onOpenEmailVerification: (email?: string) => boolean;
  pendingVerificationEmail: string | null;
  onDemoAccess?: () => void; 
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onSignup, onOpenForgotPassword, users, onOpenEmailVerification, pendingVerificationEmail, onDemoAccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupCompanyName, setSignupCompanyName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [showVerifyEmailInput, setShowVerifyEmailInput] = useState(false);
  const [verifyEmailAddress, setVerifyEmailAddress] = useState(pendingVerificationEmail || '');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
        const result = await onLogin(loginEmail, loginPassword, rememberMe);
        if (result === 'invalid_credentials') {
          setError('Invalid email or password.');
        } else if (result === 'pending_verification') {
          setError('Account pending verification. Click "Verify My Account" below.');
          setVerifyEmailAddress(loginEmail);
          setShowVerifyEmailInput(true);
        } else if (typeof result === 'string') {
          setError(result);
        }
    } catch (err: any) {
        setError("Network error. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!signupName || !signupEmail || !signupPassword || !signupCompanyName) {
        setError("All fields are required.");
        return;
    }

    setIsLoading(true);
    try {
        const result = await onSignup(signupName, signupEmail, signupPassword, signupCompanyName, signupPhone);
        
        if (result === true) {
            setSuccess("Account created successfully! A verification code has been sent to your email.");
            setSignupName('');
            setSignupEmail('');
            setSignupPassword('');
            setSignupCompanyName('');
            setSignupPhone('');
        } else if (result === 'user_exists') {
            setError("This email is already registered. Please sign in instead.");
        } else if (typeof result === 'string') {
            setError(result);
        }
    } catch (err: any) {
        setError("Network error. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleManualVerifyEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyEmailAddress.trim()) return;
    onOpenEmailVerification(verifyEmailAddress);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="flex items-baseline mb-8">
            <h1 className="text-4xl font-bold text-primary-700">CraveBiZ</h1>
            <span className="text-4xl font-thin text-gray-500 ml-1">AI</span>
        </div>
        
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
            <div className="flex border-b mb-6">
                <button 
                    onClick={() => { setActiveTab('login'); setError(null); setSuccess(null); }}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'login' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Sign In
                </button>
                 <button 
                    onClick={() => { setActiveTab('signup'); setError(null); setSuccess(null); }}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'signup' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    Register
                </button>
            </div>
            
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-start">
                <svg className="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {error}
            </div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 text-sm">{success}</div>}

            {activeTab === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
                        <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 bg-gray-50 text-gray-900" />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Password</label>
                        <div className="relative">
                            <input 
                                type={showLoginPassword ? 'text' : 'password'} 
                                value={loginPassword} 
                                onChange={e => setLoginPassword(e.target.value)} 
                                required 
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 bg-gray-50 text-gray-900"
                            />
                            <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                                <Icon name={showLoginPassword ? 'eye-off' : 'eye'} className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex justify-between mt-3 text-xs">
                            <label className="flex items-center text-gray-500 cursor-pointer">
                                <input type="checkbox" className="mr-2 rounded border-gray-300 text-primary-600" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}/>
                                Remember Me
                            </label>
                            <button type="button" onClick={onOpenForgotPassword} className="font-bold text-primary-600 hover:text-primary-800">Forgot Password?</button>
                        </div>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full py-4 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-lg hover:shadow-primary-200 transition-all transform hover:-translate-y-0.5 disabled:bg-gray-400 disabled:transform-none">
                        {isLoading ? (
                            <div className="flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5 mr-3 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Signing in...
                            </div>
                        ) : 'Log In'}
                    </button>
                    
                    <div className="text-center pt-4">
                        {!showVerifyEmailInput ? (
                            <button type="button" onClick={() => setShowVerifyEmailInput(true)} className="text-xs font-bold text-gray-400 hover:text-primary-600 underline">Verify an existing account</button>
                        ) : (
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <input type="email" value={verifyEmailAddress} onChange={(e) => setVerifyEmailAddress(e.target.value)} placeholder="Email to verify" className="w-full px-3 py-2 text-sm border rounded-lg mb-2" />
                                <div className="flex space-x-2">
                                    <button type="button" onClick={handleManualVerifyEmail} className="flex-1 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg">Continue</button>
                                    <button type="button" onClick={() => setShowVerifyEmailInput(false)} className="px-3 py-2 text-gray-400 text-xs font-bold">Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            ) : (
                 <form onSubmit={handleSignupSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                        <input type="text" value={signupName} onChange={e => setSignupName(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                        <input type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900" />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Company Name</label>
                        <input type="text" value={signupCompanyName} onChange={e => setSignupCompanyName(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Business Phone</label>
                        <input type="tel" value={signupPhone} onChange={e => setSignupPhone(e.target.value)} placeholder="e.g. +234..." className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900" />
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Password</label>
                        <div className="relative">
                            <input type={showSignupPassword ? 'text' : 'password'} value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900" />
                            <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400">
                                <Icon name={showSignupPassword ? 'eye-off' : 'eye'} className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full py-4 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 shadow-lg transition-all mt-4 disabled:bg-gray-400">
                        {isLoading ? "Creating Account..." : "Create Account"}
                    </button>
                </form>
            )}

            {onDemoAccess && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-center space-x-2 mb-4 text-xs text-gray-400 uppercase tracking-widest font-bold">
                      <div className="h-px w-8 bg-gray-200"></div>
                      <span>Or Try This</span>
                      <div className="h-px w-8 bg-gray-200"></div>
                  </div>
                  <button 
                    onClick={onDemoAccess}
                    className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-100 transition-all flex items-center justify-center space-x-2"
                  >
                    <span>Instant Demo Login</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </button>
              </div>
            )}
        </div>
        <p className="mt-8 text-gray-400 text-sm">CraveBiZ AI © 2024 • Professional Invoice Management</p>
    </div>
  );
};

export default AuthPage;
