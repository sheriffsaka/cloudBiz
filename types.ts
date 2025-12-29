
export enum InvoiceStatus {
  Paid = 'Paid',
  Overdue = 'Overdue',
  Draft = 'Draft',
  Sent = 'Sent'
}

export type InvoiceFrequency = 'one-time' | 'weekly' | 'monthly' | 'quarterly' | 'biannually' | 'annually';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  verificationCode?: string;
  tenantIds: string[];
  isAdmin: boolean;
  status: 'Pending' | 'Active' | 'Declined';
  avatarUrl?: string;
}

export interface BankAccount {
  id: string;
  companyId: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export interface Company {
  id: string;
  ownerId?: string; 
  name: string;
  address: string;
  email: string;
  phone?: string;
  logoUrl?: string;
  bankAccounts?: BankAccount[];
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  email: string;
  companyName: string;
}

export interface Service {
  id: string;
  companyId: string;
  name: string;
  category: string;
  description: string;
  price: number;
}

export interface InvoiceItem {
  id?: string;
  invoiceId?: string;
  serviceId: string;
  description: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  companyId: string;
  invoiceNumber: string;
  clientId: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  total: number;
  status: InvoiceStatus;
  selectedBankAccountId?: string;
  // Manual bank details if no account is selected
  manualBankName?: string;
  manualAccountName?: string;
  manualAccountNumber?: string;
  paymentTerms: string;
  frequency: InvoiceFrequency;
  nextRecurrenceDate?: string;
  isRecurringTemplate?: boolean;
  parentInvoiceId?: string;
  lastSentDate?: string;
  isReceiptSent?: boolean;
}

export interface TenantData {
    clients: Client[];
    services: Service[];
    invoices: Invoice[];
}

export interface AllTenantsData {
    [tenantId: string]: TenantData;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}
