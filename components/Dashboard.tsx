
import React, { useMemo } from 'react';
import { revenueData } from '../lib/data';
import { InvoiceStatus, Invoice, Client } from '../types';
import StatCard from './StatCard';
import InvoiceList from './InvoiceList';
import { Page } from '../App';

const DashboardIcon = ({ d }: { d: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

interface DashboardProps {
    invoices: Invoice[];
    clients: Client[];
    setActivePage: (page: Page) => void;
    onViewInvoice: (invoiceId: string) => void;
    isRechartsLoaded: boolean; // New prop
}

const Dashboard: React.FC<DashboardProps> = ({invoices, clients, setActivePage, onViewInvoice, isRechartsLoaded}) => {
    // Conditionally load Recharts components only when the flag is true
    const RechartsComponents = useMemo(() => {
        if (isRechartsLoaded && (window as any).Recharts) {
            const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = (window as any).Recharts;
            return { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer };
        }
        return {}; // Return empty object if not loaded
    }, [isRechartsLoaded]);

    const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = RechartsComponents;

    const totalRevenue = invoices
        .filter(inv => inv.status === InvoiceStatus.Paid)
        .reduce((sum, inv) => sum + inv.total, 0);

    const outstanding = invoices
        .filter(inv => inv.status === InvoiceStatus.Sent || inv.status === InvoiceStatus.Overdue)
        .reduce((sum, inv) => sum + inv.total, 0);
    
    const overdue = invoices
        .filter(inv => inv.status === InvoiceStatus.Overdue)
        .reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Welcome back!</h1>
        <p className="text-gray-500 mt-1">Here's a summary of your business performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`₦${(totalRevenue / 1000000).toFixed(2)}M`} 
          change="12.5%" 
          changeType="increase"
          icon={<DashboardIcon d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />}
        />
        <StatCard 
          title="Outstanding" 
          value={`₦${outstanding.toLocaleString()}`} 
          change="3.2%" 
          changeType="decrease"
          icon={<DashboardIcon d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>}
        />
        <StatCard 
          title="Overdue" 
          value={`₦${overdue.toLocaleString()}`}
          icon={<DashboardIcon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z M12 8v4 M12 16h.01" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Trend</h3>
          <div style={{ width: '100%', height: 300 }}>
             {isRechartsLoaded && BarChart ? (
                <ResponsiveContainer>
                  <BarChart data={revenueData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 12}}/>
                    <YAxis tickFormatter={(value) => `₦${value/1000}k`} tick={{fill: '#6b7280', fontSize: 12}} />
                    <Tooltip 
                        formatter={(value: number) => [`₦${value.toLocaleString()}`, "Revenue"]}
                        cursor={{fill: 'rgba(59, 130, 246, 0.1)'}}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="flex items-center justify-center h-full text-gray-500">Loading chart...</div>
             )}
          </div>
        </div>
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
             <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Clients</h3>
             <ul className="space-y-4">
                {clients.slice(0, 4).map((client, index) => (
                    <li key={client.id} className="flex items-center space-x-3">
                         <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                            <img src={`https://picsum.photos/100/100?random=${index}`} alt={client.companyName} className="w-full h-full object-cover"/>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-700 text-sm">{client.companyName}</p>
                            <p className="text-gray-500 text-xs">{client.email}</p>
                        </div>
                    </li>
                ))}
             </ul>
        </div>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-800">Recent Invoices</h3>
            <button onClick={() => setActivePage('invoices')} className="font-semibold text-primary-600 hover:text-primary-800 text-sm">
                View All
            </button>
        </div>
        <InvoiceList invoices={invoices} clients={clients} limit={5} onViewInvoice={onViewInvoice} />
      </div>

    </div>
  );
};

export default Dashboard;