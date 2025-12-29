
import React, { useEffect, useState, useRef } from 'react';
import { Invoice, Client, Service, Company, BankAccount } from '../types';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import Icon from './common/Icon';

interface PlainInvoiceDetailProps {
  invoice: Invoice;
  client: Client;
  services: Service[];
  company: Company | null;
  onBackToInvoiceDetail: () => void; 
  action?: 'print' | 'word'; 
}

const PlainInvoiceDetail: React.FC<PlainInvoiceDetailProps> = ({ invoice, client, services, company, onBackToInvoiceDetail, action }) => {
    const [isReady, setIsReady] = useState(false);
    const actionProcessedRef = useRef(false);

    const getServiceName = (serviceId: string) => {
        return services.find(s => s.id === serviceId)?.name || 'Service Item';
    };

    const subtotal = invoice.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.075; 
    
    const selectedBankAccount: BankAccount | undefined = company?.bankAccounts?.find(
        (account) => account.id === invoice.selectedBankAccountId
    );

    const downloadAsWord = () => {
        const container = document.getElementById('plain-invoice-container');
        if (!container) return;
        
        const content = container.innerHTML;
        const styles = `
            <style>
                @page { size: A4; margin: 0.5in; }
                body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 11pt; color: #111827; line-height: 1.4; }
                .text-right { text-align: right; }
                .text-primary { color: #2563eb; }
                .font-black { font-weight: 900; }
                .uppercase { text-transform: uppercase; }
                .tracking-tighter { letter-spacing: -0.05em; }
                .header-section { border-bottom: 4pt solid #111827; padding-bottom: 20pt; margin-bottom: 20pt; }
                table { width: 100%; border-collapse: collapse; margin: 20pt 0; }
                th { background-color: #f9fafb; border-bottom: 2pt solid #111827; padding: 10pt; text-align: left; font-weight: 900; font-size: 9pt; color: #6b7280; }
                td { border-bottom: 1pt solid #f3f4f6; padding: 12pt 10pt; vertical-align: top; }
                .total-box { float: right; width: 220pt; background-color: #f9fafb; border: 1pt solid #e5e7eb; padding: 15pt; margin-top: 10pt; border-radius: 12pt; }
                .bank-box { background-color: #eff6ff; border: 1pt solid #dbeafe; padding: 15pt; border-radius: 12pt; }
                .label-small { font-size: 8pt; color: #9ca3af; font-weight: 900; letter-spacing: 0.1em; }
            </style>
        `;

        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>Invoice-${invoice.invoiceNumber}</title>${styles}</head>
            <body>${content}</body>
            </html>
        `;

        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CraveBiZ-Invoice-${invoice.invoiceNumber}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        const timer = setTimeout(() => setIsReady(true), 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isReady && action && !actionProcessedRef.current) {
            actionProcessedRef.current = true;
            if (action === 'print') {
                window.print();
            } else if (action === 'word') {
                downloadAsWord();
            }
        }
    }, [isReady, action]);

  return (
    <div className="min-h-screen pb-24 bg-gray-100">
      <div className="flex justify-center space-x-4 py-8 print-hidden sticky top-0 bg-gray-100/90 backdrop-blur-sm z-10">
        <button onClick={onBackToInvoiceDetail} className="flex items-center px-8 py-3 bg-white text-gray-800 rounded-xl hover:bg-gray-50 font-black uppercase tracking-widest text-xs shadow-xl border border-gray-200 transition-all active:scale-95">
            <Icon name="logout" className="w-4 h-4 mr-3 rotate-180" /> 
            Exit Detail
        </button>
        <button onClick={() => window.print()} className="flex items-center px-8 py-3 bg-gray-900 text-white rounded-xl hover:bg-black font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95">
            Export PDF
        </button>
        <button onClick={downloadAsWord} className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95">
            Export Word
        </button>
      </div>

      <div id="plain-invoice-container" className="bg-white p-12 md:p-20 shadow-2xl max-w-4xl mx-auto border border-gray-100 print:shadow-none print:p-0 print:border-0 print:max-w-full">
        <header className="flex justify-between items-start pb-10 border-b-4 border-gray-900 header-section">
          <div className="flex items-center">
            {company?.logoUrl && <img src={company.logoUrl} alt="Logo" className="h-20 w-auto mr-8 rounded-lg" />}
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">{company?.name || 'Authorized SME'}</h2>
              <p className="text-sm text-gray-500 max-w-xs mt-2 font-medium">{company?.address}</p>
              <p className="text-sm text-primary-600 font-black mt-1 uppercase tracking-widest">{company?.email}</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-5xl font-black text-gray-900 uppercase tracking-tighter">Invoice</h1>
            <p className="text-lg font-black text-gray-400 mt-2 tracking-widest"># {invoice.invoiceNumber}</p>
            <div className="mt-4"><InvoiceStatusBadge status={invoice.status} /></div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-12 my-12">
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Client</h3>
            <p className="font-black text-2xl text-gray-900 tracking-tighter mb-1 uppercase">{client.companyName}</p>
            <p className="text-gray-600 font-bold">{client.name}</p>
            <p className="text-gray-500 font-medium">{client.email}</p>
          </div>
          <div className="text-right flex flex-col justify-end space-y-4">
             <div><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Issue Date</h3><p className="text-gray-900 font-black text-xl">{invoice.issueDate}</p></div>
             <div><h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Due Date</h3><p className="text-primary-600 font-black text-xl">{invoice.dueDate}</p></div>
          </div>
        </section>

        <section className="mb-12">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] text-gray-400 uppercase font-black bg-gray-50 border-y-2 border-gray-900">
                <th className="py-5 px-6">Provision Scope</th>
                <th className="py-5 px-6 text-center">Qty</th>
                <th className="py-5 px-6 text-right">Rate</th>
                <th className="py-5 px-6 text-right">Valuation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items.map((item, index) => (
                <tr key={index}>
                  <td className="py-8 px-6">
                    <p className="font-black text-gray-900 text-lg mb-2">{getServiceName(item.serviceId)}</p>
                    <p className="text-sm text-gray-500 font-medium whitespace-pre-wrap leading-relaxed">{item.description}</p>
                  </td>
                  <td className="py-8 px-6 text-center text-gray-900 font-black text-lg">{item.quantity}</td>
                  <td className="py-8 px-6 text-right text-gray-600 font-bold">₦{item.price.toLocaleString()}</td>
                  <td className="py-8 px-6 text-right font-black text-gray-900 text-xl">₦{(item.price * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="flex justify-end mb-12">
          <div className="w-full max-w-sm space-y-4 p-10 bg-gray-50 rounded-[2.5rem] border-2 border-gray-100 total-box shadow-sm">
            <div className="flex justify-between text-gray-500 font-black text-[10px] uppercase tracking-widest"><span>Gross Subtotal</span><span className="text-gray-900">₦{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-gray-500 font-black text-[10px] uppercase tracking-widest"><span>VAT (7.5%)</span><span className="text-gray-900">₦{tax.toLocaleString()}</span></div>
            <div className="flex justify-between border-t-2 border-gray-900 pt-8 font-black text-gray-900 text-5xl tracking-tighter"><span>Total</span><span className="text-primary-600">₦{invoice.total.toLocaleString()}</span></div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-10 border-t-2 border-gray-100 pt-10">
            <div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Contractual Terms</h3>
                <p className="text-xs text-gray-600 font-medium whitespace-pre-wrap leading-loose p-8 bg-gray-50 rounded-3xl border border-gray-100">{invoice.paymentTerms || 'Standard commercial settlement terms apply.'}</p>
            </div>
            <div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Banking Instructions</h3>
                {selectedBankAccount ? (
                    <div className="p-8 bg-primary-50 rounded-3xl border-2 border-primary-100 shadow-sm bank-box">
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-1 label-small">Account Holder</p>
                        <p className="font-black text-gray-900 text-xl mb-6">{selectedBankAccount.accountName}</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-[10px] font-black text-gray-400 uppercase mb-1 label-small">Bank Name</p><p className="font-black text-gray-900">{selectedBankAccount.bankName}</p></div>
                            <div><p className="text-[10px] font-black text-gray-400 uppercase mb-1 label-small">Account No.</p><p className="font-black text-gray-900 tracking-widest text-lg">{selectedBankAccount.accountNumber}</p></div>
                        </div>
                    </div>
                ) : invoice.manualBankName ? (
                    <div className="p-8 bg-primary-50 rounded-3xl border-2 border-primary-100 shadow-sm bank-box">
                        <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-1 label-small">Transfer Beneficiary</p>
                        <p className="font-black text-gray-900 text-xl mb-6">{invoice.manualAccountName || company?.name}</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-[10px] font-black text-gray-400 uppercase mb-1 label-small">Bank Name</p><p className="font-black text-gray-900">{invoice.manualBankName}</p></div>
                            <div><p className="text-[10px] font-black text-gray-400 uppercase mb-1 label-small">Account No.</p><p className="font-black text-gray-900 tracking-widest text-lg">{invoice.manualAccountNumber}</p></div>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 bg-amber-50 rounded-3xl border-2 border-amber-100 text-center italic text-sm text-amber-700 font-bold">Contact finance for manual settlement instructions.</div>
                )}
            </div>
        </div>

        <footer className="mt-24 text-center border-t-2 border-gray-50 pt-12">
            <p className="font-black text-gray-900 text-sm uppercase tracking-[0.4em] mb-6">Valued Patronage Appreciation</p>
            <div className="flex items-center justify-center opacity-30">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500">Secured via CraveBiZ AI Vault</span>
            </div>
        </footer>
      </div>
    </div>
  );
};

export default PlainInvoiceDetail;
