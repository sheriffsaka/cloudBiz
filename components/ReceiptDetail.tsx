
import React from 'react';
import { Invoice, Client, Service, Company, BankAccount, InvoiceStatus } from '../types';
import Icon from './common/Icon'; // Import Icon for the Word download

interface ReceiptDetailProps {
  invoice: Invoice;
  client: Client;
  services: Service[];
  company: Company;
}

const ReceiptDetail: React.FC<ReceiptDetailProps> = ({ invoice, client, services, company }) => {
    
    const getServiceName = (serviceId: string) => {
        return services.find(s => s.id === serviceId)?.name || 'Custom Item';
    };

    const subtotal = invoice.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    // Note: In a real app, tax should be stored, not calculated. This is for display mock.
    const tax = invoice.total - subtotal; 
    
    const selectedBankAccount: BankAccount | undefined = company.bankAccounts?.find(
        (account) => account.id === invoice.selectedBankAccountId
    );

    const downloadAsWord = () => {
        const container = document.getElementById('receipt-container');
        if (container) {
            // Temporarily hide elements marked for print-hidden and word-export-hidden
            const hiddenElements = container.querySelectorAll('.print-hidden, .word-export-hidden');
            hiddenElements.forEach(el => (el as HTMLElement).style.display = 'none');

            const content = container.outerHTML;

            // Restore hidden elements visibility
            hiddenElements.forEach(el => (el as HTMLElement).style.display = '');

            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>Receipt ${invoice.invoiceNumber}</title>
                    <style>
                        @page {
                          size: A4;
                          margin: 1cm; /* Set margins for A4 in Word */
                        }
                        body { font-family: sans-serif; margin: 40px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        th, td { border: 1px solid #eee; padding: 8px; text-align: left; }
                        th { background-color: #f8f8f8; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .font-bold { font-weight: bold; }
                        .text-lg { font-size: 1.125rem; }
                        .text-2xl { font-size: 1.5rem; }
                        .text-4xl { font-size: 2.25rem; }
                        .uppercase { text-transform: uppercase; }
                        .tracking-wider { letter-spacing: 0.05em; }
                        .text-primary-700 { color: #1d4ed8; } /* Tailwind primary-700 */
                        .text-gray-800 { color: #1f2937; }
                        .text-gray-500 { color: #6b7280; }
                        .text-gray-600 { color: #4b5563; }
                        .text-green-800 { color: #166534; }
                        .bg-green-100 { background-color: #dcfce7; }
                        .rounded-full { border-radius: 9999px; }
                        .inline-block { display: inline-block; }
                        .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
                        .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
                        .text-xs { font-size: 0.75rem; }
                        .h-16 { height: 4rem; }
                        .w-auto { width: auto; }
                        .mr-4 { margin-right: 1rem; }
                        .mb-2 { margin-bottom: 0.5rem; }
                        .mb-4 { margin-bottom: 1rem; }
                        .mb-6 { margin-bottom: 1.5rem; }
                        .mt-1 { margin-top: 0.25rem; }
                        .mt-2 { margin-top: 0.5rem; }
                        .pt-6 { padding-top: 1.5rem; }
                        .pb-6 { padding-bottom: 1.5rem; }
                        .border-b { border-bottom: 1px solid #e5e7eb; }
                        .border-t { border-top: 1px solid #e5e7eb; }
                        .border-t-2 { border-top-width: 2px; }
                        .border-gray-200 { border-color: #e5e7eb; }
                        .flex { display: flex; }
                        .justify-between { justify-content: space-between; }
                        .items-center { align-items: center; }
                        .items-start { align-items: flex-start; }
                        .space-x-4 > :not([hidden]) ~ :not([hidden]) { margin-left: 1rem; }
                        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                        .gap-8 { gap: 2rem; }
                        .my-8 { margin-top: 2rem; margin-bottom: 2rem; }
                        .whitespace-pre-wrap { white-space: pre-wrap; }
                        .leading-relaxed { line-height: 1.625; }
                        .max-w-xs { max-width: 20rem; }
                    </style>
                </head>
                <body>
                    ${content}
                </body>
                </html>
            `;
            const blob = new Blob([html], {
                type: 'application/msword;charset=utf-8',
            });

            // Use msSaveOrOpenBlob for IE/Edge, otherwise use a data URI
            if (window.navigator && (window.navigator as any).msSaveOrOpenBlob) {
                (window.navigator as any).msSaveOrOpenBlob(
                    blob,
                    `receipt-${invoice.invoiceNumber}.doc`,
                );
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `receipt-${invoice.invoiceNumber}.doc`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        }
    };


  return (
    <>
      {/* Action Buttons - Hidden on Print */}
      <div className="flex justify-center space-x-4 mb-6 print-hidden">
        <button 
          onClick={() => window.print()} 
          className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-semibold shadow"
          title="Opens browser print dialog to print or save as PDF."
          aria-label="Download or Print Receipt as PDF"
        >
          Download / Print PDF
        </button>
        <button 
          onClick={downloadAsWord} 
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow"
          title="Download Receipt as Word document"
          aria-label="Download Receipt as Word"
        >
          <Icon name="download-word" className="w-5 h-5 mr-2" /> Download Word
        </button>
      </div>

      {/* The actual receipt template */}
      <div id="receipt-container" className="bg-white p-10 rounded-xl shadow-lg max-w-4xl mx-auto border">
        {/* Header with Logo */}
        <header className="flex justify-between items-start pb-6 border-b">
          <div className="flex items-center">
            {company.logoUrl && <img src={company.logoUrl} alt={`${company.name} Logo`} className="h-16 w-auto mr-4" />}
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{company.name}</h2>
              <p className="text-sm text-gray-500 break-words max-w-xs">{company.address}</p>
              <p className="text-sm text-gray-500">{company.email}</p>
              {company.phone && <p className="text-sm text-gray-500">{company.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-4xl font-bold text-primary-700 uppercase tracking-wider">Receipt</h1>
            <p className="text-sm text-gray-500 mt-2">Ref: {invoice.invoiceNumber}</p>
            <div className="mt-1">
              {/* Receipt always implies paid status */}
              <span className="px-3 py-1 text-xs font-semibold rounded-full inline-block bg-green-100 text-green-800">
                Paid
              </span>
            </div>
          </div>
        </header>
        
        {/* Client Info and Dates */}
        <section className="grid grid-cols-2 gap-8 my-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Received From</h3>
            <p className="font-bold text-lg text-gray-800">{client.companyName}</p>
            <p className="text-gray-600">{client.name}</p>
            <p className="text-gray-600">{client.email}</p>
          </div>
          <div className="text-right">
             <div className="mb-4">
                 <h3 className="text-sm font-semibold text-gray-500 uppercase">Payment Date</h3>
                 <p className="text-gray-800 font-medium">{invoice.issueDate}</p> {/* Using issue date as payment date for simplicity */}
             </div>
             <div>
                 <h3 className="text-sm font-semibold text-gray-500 uppercase">Original Due Date</h3>
                 <p className="text-gray-800 font-medium">{invoice.dueDate}</p>
             </div>
          </div>
        </section>

        {/* Items Table */}
        <section className="mb-10">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr className="text-sm text-gray-600 uppercase">
                <th className="py-3 px-4 font-semibold">Item Description</th>
                <th className="py-3 px-4 font-semibold text-center">Qty</th>
                <th className="py-3 px-4 font-semibold text-right">Unit Price</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-gray-800">{getServiceName(item.serviceId)}</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.description}</p>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-900">{item.quantity}</td>
                  <td className="py-3 px-4 text-right text-gray-900">₦{item.price.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">₦{(item.price * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Totals Section */}
        <section className="flex justify-end mb-8">
          <div className="w-full max-w-sm space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-medium text-gray-800">₦{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>VAT (7.5%)</span>
              <span className="font-medium text-gray-800">₦{tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between border-t-2 border-gray-200 pt-3 mt-3">
              <span className="font-bold text-lg text-gray-800">Total Paid</span>
              <span className="font-bold text-2xl text-primary-600">₦{invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </section>
        
        {/* Payment Terms Section (recontextualized for receipt) */}
        <section className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Original Payment Terms</h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {invoice.paymentTerms || 'Original payment terms not specified.'}
            </p>
        </section>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 border-t pt-6">
            <p className="text-gray-800 font-semibold mb-2">Payment Received. Thank you!</p>
            {selectedBankAccount ? (
                <p>Payment processed to <span className="font-semibold">{selectedBankAccount.accountName}</span>, Account #<span className="font-semibold">{selectedBankAccount.accountNumber}</span>, <span className="font-semibold">{selectedBankAccount.bankName}</span>.</p>
            ) : (
                <p>Payment information not available.</p>
            )}
        </footer>
      </div>
    </>
  );
};

export default ReceiptDetail;