
import { createClient } from '@supabase/supabase-js';
import { Invoice, Client, Service, Company, User, InvoiceStatus, BankAccount, InvoiceItem, InvoiceFrequency } from '../types';

const SUPABASE_URL = 'https://dfqvgezjhudmnlyeycju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmcXZnZXpqaHVkbW5seWV5Y2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNDAyOTMsImV4cCI6MjA4MTgxNjI5M30.8VsHsDpychdSMJmrfnmkxi5ed8CygwErX3-RkVPXkUI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const generateId = () => crypto.randomUUID();

class CraveBizApi {
  private static instance: CraveBizApi;
  private constructor() {}
  public static getInstance(): CraveBizApi {
    if (!CraveBizApi.instance) CraveBizApi.instance = new CraveBizApi();
    return CraveBizApi.instance;
  }

  async ensureProfile(userId: string, name?: string): Promise<boolean> {
    try {
      await supabase.from('profiles').upsert({ id: userId, full_name: name || 'User', status: 'Active' });
      return true;
    } catch { return false; }
  }

  async getProfile(userId: string): Promise<User | null> {
    try {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (!data) return null;
        return { id: data.id, name: data.full_name, email: '', tenantIds: [], isAdmin: data.is_admin || false, status: data.status || 'Active' };
    } catch { return null; }
  }

  async getMyCompanies(): Promise<Company[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data: members } = await supabase.from('company_members').select('company_id').eq('user_id', user.id);
    const companyIds = members?.map(m => m.company_id) || [];
    if (companyIds.length === 0) return [];
    
    const { data: companies } = await supabase.from('companies').select('*, bank_accounts(*)').in('id', companyIds);
    return (companies || []).map(c => ({
      id: c.id, name: c.name, address: c.address, email: c.email, phone: c.phone, logoUrl: c.logo_url,
      bankAccounts: (c.bank_accounts || []).map((b: any) => ({ 
        id: b.id, companyId: b.company_id, bankName: b.bank_name, accountName: b.account_name, accountNumber: b.account_number 
      }))
    }));
  }

  async createCompany(details: Partial<Company>): Promise<Company> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    
    const { data: company, error } = await supabase.from('companies').insert({
        owner_id: user.id,
        name: details.name || 'My Workspace',
        email: details.email || user.email,
        address: details.address || 'Nigeria'
    }).select().single();
    
    if (error) throw error;
    await supabase.from('company_members').insert({ company_id: company.id, user_id: user.id, role: 'Owner' });
    return { ...company, bankAccounts: [] };
  }

  async fetchInvoices(companyId: string): Promise<Invoice[]> {
    const { data, error } = await supabase.from('invoices').select('*, invoice_items(*)').eq('company_id', companyId).order('created_at', { ascending: false });
    if (error) throw error;
    
    return (data || []).map(inv => ({
      id: inv.id, companyId: inv.company_id, invoiceNumber: inv.invoice_number, clientId: inv.client_id, 
      issueDate: inv.issue_date, dueDate: inv.due_date, total: Number(inv.total), status: inv.status as InvoiceStatus,
      paymentTerms: inv.payment_terms || '', selectedBankAccountId: inv.selected_bank_account_id,
      manualBankName: inv.manual_bank_name, manualAccountName: inv.manual_account_name, manualAccountNumber: inv.manual_account_number,
      frequency: inv.frequency || 'one-time', isRecurringTemplate: inv.is_recurring_template, isReceiptSent: inv.is_receipt_sent,
      items: (inv.invoice_items || []).map((item: any) => ({
        id: item.id, serviceId: item.service_id, description: item.description, quantity: item.quantity, price: Number(item.price)
      }))
    }));
  }

  async createInvoice(companyId: string, invoice: Omit<Invoice, 'id' | 'invoiceNumber'>): Promise<Invoice> {
    const invId = generateId();
    const invNum = `INV-${Date.now().toString().slice(-6)}`;
    
    let payload: any = {
        id: invId,
        company_id: companyId,
        invoice_number: invNum,
        client_id: invoice.clientId,
        issue_date: invoice.issueDate,
        due_date: invoice.dueDate,
        total: invoice.total,
        status: invoice.status,
        payment_terms: invoice.paymentTerms,
        frequency: invoice.frequency || 'one-time',
        is_recurring_template: !!invoice.isRecurringTemplate
    };

    // Attempt to add optional columns
    if (invoice.selectedBankAccountId) payload.selected_bank_account_id = invoice.selectedBankAccountId;
    if (invoice.manualBankName) payload.manual_bank_name = invoice.manualBankName;
    if (invoice.manualAccountName) payload.manual_account_name = invoice.manualAccountName;
    if (invoice.manualAccountNumber) payload.manual_account_number = invoice.manualAccountNumber;

    const performInsert = async (currentPayload: any): Promise<any> => {
        const { error } = await supabase.from('invoices').insert(currentPayload);
        if (error) {
            // Check for missing column error in schema
            const missingColumnMatch = error.message.match(/Could not find the '(.+)' column/);
            if (missingColumnMatch && missingColumnMatch[1]) {
                const problematicColumn = missingColumnMatch[1];
                console.warn(`Database Schema Mismatch: Column '${problematicColumn}' missing. Retrying...`);
                const { [problematicColumn]: _, ...newPayload } = currentPayload;
                return performInsert(newPayload);
            }
            throw error;
        }
        return true;
    };

    await performInsert(payload);

    if (invoice.items?.length) {
        const itemsToInsert = invoice.items.map(item => ({
            id: generateId(),
            invoice_id: invId,
            service_id: item.serviceId,
            description: item.description || '',
            quantity: item.quantity || 1,
            price: item.price || 0
        }));
        const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
    }

    return { ...invoice, id: invId, invoiceNumber: invNum, companyId };
  }

  async updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<void> {
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
    if (error) throw error;
  }

  async fetchClients(companyId: string): Promise<Client[]> {
    const { data } = await supabase.from('clients').select('*').eq('company_id', companyId);
    return (data || []).map(c => ({ id: c.id, companyId: c.company_id, name: c.name, email: c.email, companyName: c.company_name }));
  }

  async createClient(client: Omit<Client, 'id'>): Promise<Client> {
    const { data, error } = await supabase.from('clients').insert({
        id: generateId(),
        company_id: client.companyId,
        name: client.name,
        email: client.email,
        company_name: client.companyName
    }).select().maybeSingle();
    if (error) throw error;
    return data;
  }

  async fetchServices(companyId: string): Promise<Service[]> {
    const { data } = await supabase.from('services').select('*').eq('company_id', companyId);
    return (data || []).map(s => ({ id: s.id, companyId: s.company_id, name: s.name, category: s.category, description: s.description, price: Number(s.price) }));
  }

  async createService(service: Omit<Service, 'id'>): Promise<Service> {
    const { data, error } = await supabase.from('services').insert({
        id: generateId(),
        company_id: service.companyId,
        name: service.name,
        category: service.category,
        description: service.description,
        price: service.price
    }).select().maybeSingle();
    if (error) throw error;
    return data;
  }

  async updateCompany(id: string, details: Partial<Company>): Promise<void> {
    await supabase.from('companies').update({
        name: details.name,
        address: details.address,
        email: details.email,
        phone: details.phone,
        logo_url: details.logoUrl
    }).eq('id', id);

    if (details.bankAccounts) {
        await supabase.from('bank_accounts').delete().eq('company_id', id);
        if (details.bankAccounts.length > 0) {
            const accounts = details.bankAccounts.map(ba => ({
                id: generateId(),
                company_id: id,
                bank_name: ba.bankName,
                account_name: ba.accountName,
                account_number: ba.accountNumber
            }));
            await supabase.from('bank_accounts').insert(accounts);
        }
    }
  }
}
export const api = CraveBizApi.getInstance();
