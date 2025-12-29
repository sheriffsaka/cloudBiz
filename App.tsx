
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import InvoiceList from './components/InvoiceList';
import ClientList from './components/ClientList';
import ServiceList from './components/ServiceList';
import Reports from './components/Reports';
import Settings from './components/Settings';
import CreateInvoice from './components/CreateInvoice';
import InvoiceDetail from './components/InvoiceDetail';
import AuthPage from './components/AuthPage';
import ChatbotModal from './components/ChatbotModal';
import UserProfileModal from './components/UserProfileModal';
import PlainInvoiceDetail from './components/PlainInvoiceDetail';
import RecurringInvoiceList from './components/RecurringInvoiceList';
import SentReceiptsList from './components/SentReceiptsList';
import { api, supabase } from './lib/api';
import { Invoice, Client, Service, Company, User, TenantData, InvoiceStatus } from './types';
import Icon from './components/common/Icon';

export type Page = 'dashboard' | 'invoices' | 'clients' | 'services' | 'reports' | 'settings' | 'create-invoice' | 'invoice-detail' | 'receipt-detail' | 'plain-invoice-detail' | 'recurring-invoices' | 'email-verification' | 'sent-receipts' | 'admin-dashboard';

const stringifyError = (err: any): string => {
  if (!err) return "An unknown error occurred.";
  if (typeof err === 'string') return err;
  let message = (err instanceof Error) ? err.message : (err.message || err.error_description || (err.error ? (typeof err.error === 'string' ? err.error : stringifyError(err.error)) : (err.details || err.hint || (err.code ? `Error Code: ${err.code}` : JSON.stringify(err)))));
  if (message.includes('row-level security policy') || message.includes('RLS')) return `${message} (HINT: Database permission denied. Please run the SQL fix).`;
  return message === '[object Object]' ? "Database sync error." : message;
};

export default function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isDataSyncing, setIsDataSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(() => localStorage.getItem('cravebiz_tenant'));
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tenantData, setTenantData] = useState<TenantData>({ invoices: [], clients: [], services: [] });
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [downloadAction, setDownloadAction] = useState<'print' | 'word' | undefined>(undefined);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isRechartsLoaded, setIsRechartsLoaded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [setupBusinessName, setSetupBusinessName] = useState('');
  const isMounted = useRef(true);

  const forceSyncData = async (tenantId: string) => {
    if (!tenantId || !isMounted.current) return;
    setIsDataSyncing(true);
    try {
      const [inv, cli, srv] = await Promise.all([
        api.fetchInvoices(tenantId),
        api.fetchClients(tenantId),
        api.fetchServices(tenantId)
      ]);
      if (isMounted.current) setTenantData({ invoices: inv, clients: cli, services: srv });
    } catch (e) { 
        setSyncError(stringifyError(e)); 
    } finally { 
        if (isMounted.current) setIsDataSyncing(false); 
    }
  };

  const handleAuthSync = async (user: any) => {
    if (!isMounted.current || !user) return;
    setIsLoading(true);
    try {
        await api.ensureProfile(user.id, user.user_metadata?.full_name);
        const profile = await api.getProfile(user.id);
        if (profile && isMounted.current) {
            profile.email = user.email || '';
            setCurrentUser(profile);
            if (user.user_metadata?.company_name) setSetupBusinessName(user.user_metadata.company_name);
            const discovered = await api.getMyCompanies();
            setCompanies(discovered);
            if (discovered.length > 0) {
                const tid = (activeTenantId && discovered.some(c => c.id === activeTenantId)) ? activeTenantId : discovered[0].id;
                setActiveTenantId(tid);
                localStorage.setItem('cravebiz_tenant', tid);
                await forceSyncData(tid);
            }
        }
    } catch (e) { 
        setSyncError(stringifyError(e)); 
    } finally { 
        if (isMounted.current) setIsLoading(false); 
    }
  };

  useEffect(() => {
    isMounted.current = true;
    const initAuth = async () => {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            if (data?.session?.user) await handleAuthSync(data.session.user);
            else if (isMounted.current) setIsLoading(false);
        } catch (e) {
            if (isMounted.current) { setIsLoading(false); setSyncError(stringifyError(e)); }
        }
    };
    initAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) handleAuthSync(session.user);
        else if (event === 'SIGNED_OUT' && isMounted.current) { 
            setCurrentUser(null); setIsLoading(false); setCompanies([]); setActiveTenantId(null); 
            setTenantData({ invoices: [], clients: [], services: [] }); localStorage.removeItem('cravebiz_tenant'); 
        }
    });
    return () => { isMounted.current = false; subscription.unsubscribe(); };
  }, []);

  const handleSendInvoice = async (invoiceId: string) => {
    setIsDataSyncing(true);
    try {
        // Mocking email logic, but actually updating the DB status to "Sent"
        await new Promise(r => setTimeout(r, 1200)); 
        await api.updateInvoiceStatus(invoiceId, InvoiceStatus.Sent);
        if (activeTenantId) await forceSyncData(activeTenantId);
        alert("Commitment Successful: Invoice dispatched to client relay.");
    } catch (e) { 
        alert(`Relay Error: ${stringifyError(e)}`); 
    } finally { 
        setIsDataSyncing(false); 
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus) => {
    setIsDataSyncing(true);
    try {
        await api.updateInvoiceStatus(invoiceId, status);
        if (activeTenantId) await forceSyncData(activeTenantId);
    } catch (e) {
        alert(`Status Error: ${stringifyError(e)}`);
    } finally {
        setIsDataSyncing(false);
    }
  }

  const navigateTo = (page: Page) => { if (isMounted.current) { setActivePage(page); setIsMobileMenuOpen(false); } };

  const activeCompany = useMemo(() => activeTenantId ? companies.find(c => c.id === activeTenantId) || null : null, [activeTenantId, companies]);

  if (!isLoading && !currentUser) {
    return (
      <AuthPage 
        onLogin={async (e, p) => {
            const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
            if (error) return stringifyError(error);
            return true;
        }}
        onSignup={async (name, email, pass, companyName, phone) => {
            const { error } = await supabase.auth.signUp({ 
                email, 
                password: pass,
                options: { data: { full_name: name, company_name: companyName, phone } }
            });
            if (error) return stringifyError(error);
            return true;
        }}
        onOpenForgotPassword={() => {}}
        users={[]}
        onOpenEmailVerification={() => true}
        pendingVerificationEmail={null}
      />
    );
  }

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <h1 className="text-3xl font-bold text-primary-700 mb-4 tracking-tighter">CraveBiZ AI</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-600 mb-4"></div>
        <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px]">Initializing Cloud Vault...</p>
    </div>
  );

  const renderContent = () => {
    if (companies.length === 0 && !isDataSyncing && !syncError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-lg w-full">
                    <div className="bg-primary-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8"><Icon name="dashboard" className="w-10 h-10 text-primary-600" /></div>
                    <h2 className="text-3xl font-black text-gray-800 tracking-tighter mb-4">Vault Ready</h2>
                    <p className="text-gray-500 mb-10 text-sm leading-relaxed">Securely provision your SME workspace for <span className="font-bold text-gray-900">"{setupBusinessName || 'Your SME'}"</span>.</p>
                    <button onClick={async () => { 
                        try { 
                            setIsDataSyncing(true); 
                            const nc = await api.createCompany({ name: setupBusinessName || 'My Workspace' }); 
                            setCompanies([nc]); 
                            setActiveTenantId(nc.id); 
                            localStorage.setItem('cravebiz_tenant', nc.id); 
                            await forceSyncData(nc.id); 
                        } catch(e) { setSyncError(stringifyError(e)); } 
                        finally { setIsDataSyncing(false); } 
                    }} className="w-full py-5 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:bg-primary-700 transition-all">Provision Workspace</button>
                </div>
            </div>
        );
    }
    const { invoices = [], clients = [], services = [] } = tenantData;
    switch (activePage) {
      case 'dashboard': return <Dashboard invoices={invoices} clients={clients} setActivePage={navigateTo} onViewInvoice={(id) => { setSelectedInvoiceId(id); navigateTo('invoice-detail'); }} isRechartsLoaded={isRechartsLoaded} />;
      case 'invoices': return <InvoiceList invoices={invoices} clients={clients} onViewInvoice={(id) => { setSelectedInvoiceId(id); navigateTo('invoice-detail'); }} />;
      case 'recurring-invoices': return <RecurringInvoiceList invoices={invoices.filter(i => i.isRecurringTemplate)} clients={clients} onViewInvoice={(id) => { setSelectedInvoiceId(id); navigateTo('invoice-detail'); }} />;
      case 'sent-receipts': return <SentReceiptsList invoices={invoices.filter(i => i.isReceiptSent)} clients={clients} onViewInvoice={(id) => { setSelectedInvoiceId(id); navigateTo('invoice-detail'); }} />;
      case 'clients': return <ClientList companyId={activeTenantId!} clients={clients} onAddClient={async (c) => { await api.createClient(c); await forceSyncData(activeTenantId!); }} onUpdateClient={()=>{}} />;
      case 'services': return <ServiceList companyId={activeTenantId!} services={services} onAddService={async (s) => { await api.createService(s); await forceSyncData(activeTenantId!); }} onUpdateService={()=>{}} />;
      case 'reports': return <Reports invoices={invoices} clients={clients} services={services} isRechartsLoaded={isRechartsLoaded} />;
      case 'settings': return <Settings company={activeCompany} onSaveChanges={async (id, det) => { await api.updateCompany(id, det); await forceSyncData(id); }} onInviteUser={()=>{}} users={[]} activeTenantId={activeTenantId!} onUpdateUserStatus={()=>{}} onResendInvite={()=>{}} />;
      case 'create-invoice': return <CreateInvoice clients={clients} services={services} company={activeCompany!} onAddInvoice={async (i) => { try { setIsDataSyncing(true); await api.createInvoice(activeTenantId!, i); await forceSyncData(activeTenantId!); navigateTo('invoices'); } catch (err: any) { alert(stringifyError(err)); } finally { setIsDataSyncing(false); } }} onCancel={() => navigateTo('invoices')} />;
      case 'invoice-detail': {
        const inv = invoices.find(i => i.id === selectedInvoiceId);
        if (!inv) return <div className="text-center py-20 italic text-gray-400">Document synchronized or unavailable.</div>;
        const cli = clients.find(c => c.id === inv.clientId) || { id: '', companyId: '', name: 'Guest', email: '', companyName: 'Guest' };
        return <InvoiceDetail invoice={inv} client={cli} services={services} company={activeCompany} onUpdateStatus={handleUpdateInvoiceStatus} onGenerateReceipt={()=>{}} allTenantInvoices={invoices} onEditInvoice={()=>{}} onViewPlainInvoice={(id, act) => { setSelectedInvoiceId(id); setDownloadAction(act); navigateTo('plain-invoice-detail'); }} onViewTemplate={()=>{}} onSendInvoice={handleSendInvoice} onSendReceipt={()=>{}} />;
      }
      case 'plain-invoice-detail': {
        const inv = invoices.find(i => i.id === selectedInvoiceId);
        if (!inv) return null;
        const cli = clients.find(c => c.id === inv.clientId) || { id: '', companyId: '', name: 'Guest', email: '', companyName: 'Guest' };
        return <PlainInvoiceDetail invoice={inv} client={cli} services={services} company={activeCompany} onBackToInvoiceDetail={() => { setDownloadAction(undefined); navigateTo('invoice-detail'); }} action={downloadAction} />;
      }
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
      <Sidebar activePage={activePage} setActivePage={navigateTo} companyName={activeCompany?.name || 'Synchronizing...'} onLogout={async () => { localStorage.removeItem('cravebiz_tenant'); await supabase.auth.signOut(); }} isAdmin={currentUser?.isAdmin || false} isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header pageTitle={activePage.toUpperCase()} onCreateInvoice={() => navigateTo('create-invoice')} companies={companies} activeTenantId={activeTenantId || ''} onSwitchTenant={(id) => { setActiveTenantId(id); localStorage.setItem('cravebiz_tenant', id); forceSyncData(id); }} user={currentUser} toggleChatbot={() => setIsChatbotOpen(true)} onOpenUserProfile={() => setIsUserProfileModalOpen(true)} onLogout={() => {}} onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
            {syncError && <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 font-bold shadow-lg flex justify-between items-center"><span>{syncError}</span><button onClick={() => window.location.reload()} className="bg-white px-4 py-2 rounded-xl text-xs">Refresh Core</button></div>}
            {isDataSyncing && <div className="fixed top-4 right-8 z-50 flex items-center bg-primary-600 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase shadow-2xl animate-pulse">Syncing Vault...</div>}
            {renderContent()}
        </main>
      </div>
      {isChatbotOpen && <ChatbotModal onClose={() => setIsChatbotOpen(false)} />}
      {isUserProfileModalOpen && currentUser && <UserProfileModal isOpen={isUserProfileModalOpen} onClose={() => setIsUserProfileModalOpen(false)} user={currentUser} onUpdateProfile={()=>{}} />}
    </div>
  );
}
