
import React, { useState, useMemo, useCallback } from 'react';
import StatCard from './StatCard';
import { Invoice, Client, Service, InvoiceStatus } from '../types';
import { revenueData, mockClientAcquisitionData } from '../lib/data'; // Import mockClientAcquisitionData
import { generateTextResponse } from '../services/aiGenerationService'; // Import AI service

// Helper to convert data to CSV string
const convertToCsv = (data: any[], headers: string[]): string => {
  const csvRows = [];
  csvRows.push(headers.join(',')); // Add header row

  for (const row of data) {
    const values = headers.map(header => {
      let value = row[header];
      if (typeof value === 'string' && value.includes(',')) {
        value = `"${value}"`; // Quote if contains comma
      }
      return value;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
};

// Helper to download CSV
const downloadCsv = (csvString: string, filename: string) => {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};


const ReportsIcon = ({ d }: { d: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

interface ReportsProps {
    invoices: Invoice[];
    clients: Client[];
    services: Service[];
    isRechartsLoaded: boolean; // New prop
}

type DateRange = 'all_time' | 'last_30_days' | 'this_quarter' | 'this_year';

const Reports: React.FC<ReportsProps> = ({invoices, clients, services, isRechartsLoaded}) => {
    // Conditionally load Recharts components only when the flag is true
    const RechartsComponents = useMemo(() => {
        if (isRechartsLoaded && (window as any).Recharts) {
            const { BarChart, PieChart, Pie, Cell, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } = (window as any).Recharts;
            return { BarChart, PieChart, Pie, Cell, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line };
        }
        return {}; // Return empty object if not loaded
    }, [isRechartsLoaded]);

    const { BarChart, PieChart, Pie, Cell, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } = RechartsComponents;

    const [reportQuery, setReportQuery] = useState('');
    const [aiReportResponse, setAiReportResponse] = useState<string | null>(null);
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange>('all_time');

    // Helper function to check if an invoice falls within the selected date range
    const isInvoiceInDateRange = useCallback((invoice: Invoice, startDate: Date | null, endDate: Date | null) => {
        const invoiceDate = new Date(invoice.issueDate);
        if (startDate && invoiceDate < startDate) return false;
        if (endDate && invoiceDate > endDate) return false;
        return true;
    }, []);

    const { startDate, endDate } = useMemo(() => {
        const now = new Date();
        let start: Date | null = null;
        let end: Date | null = now; // End date is always current date for simplicity

        switch (dateRange) {
            case 'last_30_days':
                start = new Date(now);
                start.setDate(now.getDate() - 30);
                break;
            case 'this_quarter':
                const currentMonth = now.getMonth();
                const quarterStartMonth = currentMonth - (currentMonth % 3);
                start = new Date(now.getFullYear(), quarterStartMonth, 1);
                break;
            case 'this_year':
                start = new Date(now.getFullYear(), 0, 1);
                break;
            case 'all_time':
            default:
                // No specific start date, or a very old date. For practical purposes, filter later.
                start = null; 
                end = null; // No end date restriction for all time
                break;
        }
        return { startDate: start, endDate: end };
    }, [dateRange]);

    const filteredInvoices = useMemo(() => {
      if (dateRange === 'all_time') return invoices;
      return invoices.filter(inv => isInvoiceInDateRange(inv, startDate, endDate));
    }, [invoices, dateRange, startDate, endDate, isInvoiceInDateRange]);

    const totalRevenue = filteredInvoices
        .filter(inv => inv.status === InvoiceStatus.Paid)
        .reduce((sum, inv) => sum + inv.total, 0);

    const paidInvoicesCount = filteredInvoices.filter(inv => inv.status === InvoiceStatus.Paid).length;
    const overdueInvoicesCount = filteredInvoices.filter(inv => inv.status === InvoiceStatus.Overdue).length;
    const sentInvoicesCount = filteredInvoices.filter(inv => inv.status === InvoiceStatus.Sent).length;
    const draftInvoicesCount = filteredInvoices.filter(inv => inv.status === InvoiceStatus.Draft).length;
    const totalInvoicesOverall = filteredInvoices.length;

    const invoiceStatusData = [
        { name: 'Paid', value: paidInvoicesCount },
        { name: 'Overdue', value: overdueInvoicesCount },
        { name: 'Sent', value: sentInvoicesCount },
        { name: 'Draft', value: draftInvoicesCount },
    ];
    
    const COLORS = {
        'Paid': '#22c55e', // green-500
        'Overdue': '#ef4444', // red-500
        'Sent': '#3b82f6', // blue-500
        'Draft': '#6b7280' // gray-500
    };

    // New: Revenue by Service/Product
    const revenueByService = useMemo(() => {
      const serviceRevenueMap = new Map<string, number>();
      filteredInvoices.filter(inv => inv.status === InvoiceStatus.Paid).forEach(invoice => {
        invoice.items.forEach(item => {
          const service = services.find(s => s.id === item.serviceId);
          if (service) {
            const currentRevenue = serviceRevenueMap.get(service.name) || 0;
            serviceRevenueMap.set(service.name, currentRevenue + (item.price * item.quantity));
          }
        });
      });
      return Array.from(serviceRevenueMap.entries())
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue);
    }, [filteredInvoices, services]);

    // New: Average Invoice Value Over Time (using monthly averages for paid invoices)
    const averageInvoiceValueOverTime = useMemo(() => {
      const monthlyDataMap = new Map<string, { total: number, count: number }>();
      filteredInvoices.filter(inv => inv.status === InvoiceStatus.Paid).forEach(invoice => {
        const monthYear = new Date(invoice.issueDate).toLocaleString('en-US', { year: 'numeric', month: 'short' });
        const currentData = monthlyDataMap.get(monthYear) || { total: 0, count: 0 };
        monthlyDataMap.set(monthYear, { total: currentData.total + invoice.total, count: currentData.count + 1 });
      });
      return Array.from(monthlyDataMap.entries())
        .map(([name, data]) => ({ name, avgValue: data.total / data.count }))
        .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime()); // Sort chronologically
    }, [filteredInvoices]);

    // New: Payment Speed Analysis (Average days from issueDate to dueDate for paid invoices)
    const averagePaymentTermDays = useMemo(() => {
        const paidInvoicesInDateRange = filteredInvoices.filter(inv => inv.status === InvoiceStatus.Paid);
        if (paidInvoicesInDateRange.length === 0) return 0;

        const totalDays = paidInvoicesInDateRange.reduce((sum, invoice) => {
            const issue = new Date(invoice.issueDate);
            const due = new Date(invoice.dueDate);
            const diffTime = Math.abs(due.getTime() - issue.getTime());
            return sum + Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // days
        }, 0);
        return Math.round(totalDays / paidInvoicesInDateRange.length);
    }, [filteredInvoices]);

    // New: Client Lifetime Value (CLTV)
    const clientLifetimeValue = useMemo(() => {
      const clientLTVMap = new Map<string, number>();
      filteredInvoices.filter(inv => inv.status === InvoiceStatus.Paid).forEach(invoice => {
        const client = clients.find(c => c.id === invoice.clientId);
        if (client) {
          const currentLTV = clientLTVMap.get(client.companyName) || 0;
          clientLTVMap.set(client.companyName, currentLTV + invoice.total);
        }
      });
      return Array.from(clientLTVMap.entries())
        .map(([companyName, totalRevenue]) => ({ companyName, totalRevenue }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);
    }, [filteredInvoices, clients]);

    // New: Invoice Conversion Rate
    const invoiceConversionRates = useMemo(() => {
        const total = filteredInvoices.length;
        const drafts = filteredInvoices.filter(inv => inv.status === InvoiceStatus.Draft).length;
        const sent = filteredInvoices.filter(inv => inv.status === InvoiceStatus.Sent).length;
        const paid = filteredInvoices.filter(inv => inv.status === InvoiceStatus.Paid).length;
        const overdue = filteredInvoices.filter(inv => inv.status === InvoiceStatus.Overdue).length;

        const sentOrPaid = sent + paid + overdue; // Invoices that left draft stage
        const draftToSent = total > 0 ? ((sentOrPaid) / total) * 100 : 0; 
        const sentToPaid = sentOrPaid > 0 ? (paid / sentOrPaid) * 100 : 0;
        const totalPaidRate = total > 0 ? (paid / total) * 100 : 0;

        return { drafts, sent, paid, overdue, total, draftToSent, sentToPaid, totalPaidRate };
    }, [filteredInvoices]);

    // New: Overdue Invoice Aging Report
    const overdueAgingData = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const ageGroups = {
            '1-30 Days': { count: 0, amount: 0 },
            '31-60 Days': { count: 0, amount: 0 },
            '61-90 Days': { count: 0, amount: 0 },
            '90+ Days': { count: 0, amount: 0 },
        };

        filteredInvoices.filter(inv => inv.status === InvoiceStatus.Overdue).forEach(invoice => {
            const dueDate = new Date(invoice.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const diffTime = now.getTime() - dueDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days overdue

            if (diffDays >= 1 && diffDays <= 30) {
                ageGroups['1-30 Days'].count++;
                ageGroups['1-30 Days'].amount += invoice.total;
            } else if (diffDays >= 31 && diffDays <= 60) {
                ageGroups['31-60 Days'].count++;
                ageGroups['31-60 Days'].amount += invoice.total;
            } else if (diffDays >= 61 && diffDays <= 90) {
                ageGroups['61-90 Days'].count++;
                ageGroups['61-90 Days'].amount += invoice.total;
            } else if (diffDays > 90) {
                ageGroups['90+ Days'].count++;
                ageGroups['90+ Days'].amount += invoice.total;
            }
        });

        return Object.entries(ageGroups).map(([label, data]) => ({ label, ...data }));
    }, [filteredInvoices]);

    // New: Client Acquisition Trend (using mocked data)
    const clientAcquisitionTrend = useMemo(() => {
      // For simplicity, we'll filter the mock data based on selected year if 'this_year' is active.
      // In a real app, client objects would have a 'createdAt' field.
      if (dateRange === 'this_year' && startDate) {
        // Filter mock data to show only up to the current month
        const currentMonthIndex = new Date().getMonth(); // 0-11
        return mockClientAcquisitionData.slice(0, currentMonthIndex + 1);
      }
      // For other ranges or 'all_time', return all mock data
      return mockClientAcquisitionData;
    }, [dateRange, startDate]);


    // New: Forecasting (Projected revenue from Sent & Draft with future due dates)
    const forecastedRevenue = useMemo(() => {
        const now = new Date();
        now.setHours(0,0,0,0);
        const futureRevenue = filteredInvoices.filter(inv => 
            (inv.status === InvoiceStatus.Sent || inv.status === InvoiceStatus.Draft) &&
            new Date(inv.dueDate) >= now
        ).reduce((sum, inv) => sum + inv.total, 0);
        return futureRevenue;
    }, [filteredInvoices]);

    const aggregateReportData = useMemo(() => {
        const totalClients = clients.length;
        const totalServices = services.length;

        const summary = `
Current Business Snapshot (Filtered by ${dateRange}):
- Total Clients: ${totalClients}
- Total Services Offered: ${totalServices}
- Total Invoices Generated: ${totalInvoicesOverall}
- Total Revenue Collected: ₦${totalRevenue.toLocaleString()}
- Paid Invoices: ${paidInvoicesCount}
- Overdue Invoices: ${overdueInvoicesCount}
- Sent Invoices (Awaiting Payment): ${sentInvoicesCount}
- Draft Invoices: ${draftInvoicesCount}
- Average Payment Term for Paid Invoices: ${averagePaymentTermDays} days
- Projected Revenue from Pending Invoices: ₦${forecastedRevenue.toLocaleString()}

Revenue by Service (Top 5):
${revenueByService.slice(0, 5).map(c => `- ${c.name}: ₦${c.revenue.toLocaleString()}`).join('\n')}

Revenue by Client (Top 5):
${clientLifetimeValue.slice(0, 5).map(c => `- ${c.companyName}: ₦${c.totalRevenue.toLocaleString()}`).join('\n')}

Monthly Revenue Trend (Last 6 Months):
${revenueData.map(d => `- ${d.name}: ₦${d.revenue.toLocaleString()}`).join('\n')}

Overdue Invoice Aging:
${overdueAgingData.map(d => `- ${d.label}: Count ${d.count}, Amount ₦${d.amount.toLocaleString()}`).join('\n')}

Invoice Conversion Rates:
- Draft to Sent/Paid: ${invoiceConversionRates.draftToSent.toFixed(1)}%
- Sent to Paid: ${invoiceConversionRates.sentToPaid.toFixed(1)}%
- Total Paid Rate: ${invoiceConversionRates.totalPaidRate.toFixed(1)}%
`;
        return summary;
    }, [clients.length, services.length, totalInvoicesOverall, totalRevenue, paidInvoicesCount, overdueInvoicesCount, sentInvoicesCount, draftInvoicesCount, averagePaymentTermDays, forecastedRevenue, revenueByService, clientLifetimeValue, revenueData, overdueAgingData, invoiceConversionRates, dateRange]);


    const handleGenerateReportAI = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportQuery.trim() || isLoadingReport) return;

        setIsLoadingReport(true);
        setAiReportResponse(null); // Clear previous response
        try {
            const prompt = `Based on the following business data, answer the user's query:\n\n${aggregateReportData}\n\nUser Query: ${reportQuery}\n\nProvide a concise answer, and if possible, offer additional relevant insights.`;
            const systemInstruction = "You are a financial analyst AI for an invoice management platform. Your task is to accurately answer questions about business performance using the provided data. Be insightful and professional. Keep your responses focused on the data and the user's query.";

            // Updated model to gemini-3-pro-preview for advanced financial reasoning
            const response = await generateTextResponse(prompt, 'gemini-3-pro-preview', systemInstruction);
            setAiReportResponse(response);
        } catch (error) {
            console.error("Error generating AI report:", error);
            setAiReportResponse("Sorry, I couldn't generate a report. Please try again.");
        } finally {
            setIsLoadingReport(false);
        }
    };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
        <p className="text-gray-500 mt-1">Deep dive into your business performance.</p>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center space-x-4 mb-6 print-hidden">
        <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700">View Data For:</label>
        <select
          id="dateRange"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRange)}
          className="pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md border bg-white text-gray-900"
          aria-label="Select date range for reports"
        >
          <option value="all_time">All Time</option>
          <option value="last_30_days">Last 30 Days</option>
          <option value="this_quarter">This Quarter</option>
          <option value="this_year">This Year</option>
        </select>
      </div>

      {/* AI Report Query Section */}
      <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4.293 17.707l-.707.707M1 12H0m16.591-11.364l.707-.707M7.05 4.95l-.707-.707M8 12h8m-8 6l.247 1.05M14 12l-.247 1.05M12 4.05L11.753 3M12 20l-.247-1.05"></path></svg>
              AI-Powered Report Query
          </h3>
          <form onSubmit={handleGenerateReportAI} className="space-y-4">
              <div>
                  <label htmlFor="reportQuery" className="block text-sm font-medium text-gray-700 mb-1">Ask a question about your reports:</label>
                  <textarea
                      id="reportQuery"
                      value={reportQuery}
                      onChange={e => setReportQuery(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white text-gray-900"
                      placeholder="e.g., What was my total revenue last quarter? Which client brought in the most revenue?"
                      disabled={isLoadingReport}
                  ></textarea>
              </div>
              <div className="flex justify-end">
                  <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold shadow disabled:bg-gray-400" disabled={isLoadingReport || !reportQuery.trim()}>
                      {isLoadingReport ? (
                            <div className="flex items-center">
                                <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating...
                            </div>
                        ) : "Generate Report"}
                  </button>
              </div>
          </form>
          {aiReportResponse && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-2">AI Response:</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{aiReportResponse}</p>
              </div>
          )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Revenue" value={`₦${(totalRevenue / 1000000).toFixed(2)}M`} icon={<ReportsIcon d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />} />
        <StatCard title="Total Invoices" value={totalInvoicesOverall.toString()} icon={<ReportsIcon d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />} />
        <StatCard title="Paid Invoices" value={paidInvoicesCount.toString()} icon={<ReportsIcon d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />} />
        <StatCard title="Total Clients" value={clients.length.toString()} icon={<ReportsIcon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />} />
      </div>

      {/* New StatCards: Payment Speed and Forecasting */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard 
            title="Avg. Payment Term (Days)" 
            value={`${averagePaymentTermDays} days`} 
            icon={<ReportsIcon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z M12 8v4 M12 16h.01" />}
            changeType={averagePaymentTermDays > 30 ? 'decrease' : 'increase'} // Heuristic: faster than 30 days is good
            change={averagePaymentTermDays > 30 ? 'Slower' : 'Faster'}
        />
        <StatCard 
            title="Projected Revenue" 
            value={`₦${(forecastedRevenue / 1000000).toFixed(2)}M`} 
            icon={<ReportsIcon d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />}
            changeType="increase" // Always positive for projection
            change="Future"
        />
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Month</h3>
          <div style={{ width: '100%', height: 300 }}>
             {isRechartsLoaded && BarChart ? (
                <ResponsiveContainer>
                  <BarChart data={revenueData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 12}}/>
                    <YAxis tickFormatter={(value) => `₦${value/1000}k`} tick={{fill: '#6b7280', fontSize: 12}} />
                    <Tooltip formatter={(value: number) => [`₦${value.toLocaleString()}`, "Revenue"]} cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             ) : <div className="flex items-center justify-center h-full text-gray-500">Loading chart...</div>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Invoice Status Breakdown</h3>
           <div style={{ width: '100%', height: 300 }}>
            {isRechartsLoaded && PieChart ? (
                <ResponsiveContainer>
                    <PieChart>
                        <Pie data={invoiceStatusData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {invoiceStatusData.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-full text-gray-500">Loading chart...</div>}
           </div>
        </div>
      </div>

       <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Client</h3>
          <div style={{ width: '100%', height: 300 }}>
             {isRechartsLoaded && BarChart ? (
                <ResponsiveContainer>
                  <BarChart data={clientLifetimeValue} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(value) => `₦${value/1000}k`} tick={{fill: '#6b7280', fontSize: 12}}/>
                    <YAxis type="category" dataKey="companyName" width={120} tick={{fill: '#6b7280', fontSize: 12}} interval={0} />
                    <Tooltip formatter={(value: number) => [`₦${value.toLocaleString()}`, "Revenue"]} cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} />
                    <Bar dataKey="totalRevenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
             ) : <div className="flex items-center justify-center h-full text-gray-500">Loading chart...</div>}
          </div>
          <div className="flex justify-end mt-4">
            <button
                onClick={() => downloadCsv(convertToCsv(clientLifetimeValue, ['companyName', 'totalRevenue']), 'client_lifetime_value.csv')}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold text-sm"
            >
                Export to CSV
            </button>
          </div>
        </div>
        
        {/* New: Revenue by Service/Product Chart */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Service/Product</h3>
          <div style={{ width: '100%', height: 300 }}>
             {isRechartsLoaded && BarChart ? (
                <ResponsiveContainer>
                  <BarChart data={revenueByService} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(value) => `₦${value/1000}k`} tick={{fill: '#6b7280', fontSize: 12}}/>
                    <YAxis type="category" dataKey="name" width={120} tick={{fill: '#6b7280', fontSize: 12}} interval={0} />
                    <Tooltip formatter={(value: number) => [`₦${value.toLocaleString()}`, "Revenue"]} cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} />
                    <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} /> {/* Green color */}
                  </BarChart>
                </ResponsiveContainer>
             ) : <div className="flex items-center justify-center h-full text-gray-500">Loading chart...</div>}
          </div>
          <div className="flex justify-end mt-4">
            <button
                onClick={() => downloadCsv(convertToCsv(revenueByService, ['name', 'revenue']), 'revenue_by_service.csv')}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold text-sm"
            >
                Export to CSV
            </button>
          </div>
        </div>

        {/* New: Average Invoice Value Over Time Chart */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Average Invoice Value Over Time</h3>
          <div style={{ width: '100%', height: 300 }}>
            {isRechartsLoaded && LineChart ? (
                <ResponsiveContainer>
                  <LineChart data={averageInvoiceValueOverTime} margin={{ top: 5, right: 30, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 12}}/>
                    <YAxis tickFormatter={(value) => `₦${value/1000}k`} tick={{fill: '#6b7280', fontSize: 12}} />
                    <Tooltip formatter={(value: number) => [`₦${value.toLocaleString()}`, "Avg. Value"]} cursor={{stroke: '#3b82f6'}}/>
                    <Line type="monotone" dataKey="avgValue" stroke="#8884d8" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-full text-gray-500">Loading chart...</div>}
          </div>
          <div className="flex justify-end mt-4">
            <button
                onClick={() => downloadCsv(convertToCsv(averageInvoiceValueOverTime, ['name', 'avgValue']), 'average_invoice_value_over_time.csv')}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold text-sm"
            >
                Export to CSV
            </button>
          </div>
        </div>

        {/* New: Invoice Conversion Rate */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Invoice Conversion Rates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-primary-50 rounded-lg">
                    <p className="text-4xl font-bold text-primary-700">{invoiceConversionRates.draftToSent.toFixed(1)}%</p>
                    <p className="text-gray-600">Draft to Sent/Paid</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-4xl font-bold text-green-700">{invoiceConversionRates.sentToPaid.toFixed(1)}%</p>
                    <p className="text-gray-600">Sent to Paid</p>
                </div>
                <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg">
                    <p className="text-4xl font-bold text-blue-700">{invoiceConversionRates.totalPaidRate.toFixed(1)}%</p>
                    <p className="text-gray-600">Overall Paid Rate</p>
                </div>
            </div>
            <div className="mt-6 text-sm text-gray-700 space-y-1">
                <p><span className="font-semibold">{invoiceConversionRates.total}</span> total invoices considered.</p>
                <p><span className="font-semibold">{invoiceConversionRates.drafts}</span> currently in Draft.</p>
                <p><span className="font-semibold">{invoiceConversionRates.sent}</span> currently Sent.</p>
                <p><span className="font-semibold">{invoiceConversionRates.overdue}</span> currently Overdue.</p>
                <p><span className="font-semibold">{invoiceConversionRates.paid}</span> already Paid.</p>
            </div>
        </div>
        
        {/* New: Overdue Invoice Aging Report */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Overdue Invoice Aging</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Aging Group</th>
                            <th scope="col" className="px-6 py-3">Count</th>
                            <th scope="col" className="px-6 py-3 text-right">Amount Overdue</th>
                        </tr>
                    </thead>
                    <tbody>
                        {overdueAgingData.map((row, index) => (
                            <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{row.label}</td>
                                <td className="px-6 py-4">{row.count}</td>
                                <td className="px-6 py-4 text-right font-medium">₦{row.amount.toLocaleString()}</td>
                            </tr>
                        ))}
                         {overdueAgingData.every(data => data.count === 0) && (
                            <tr>
                                <td colSpan={3} className="text-center py-4 text-gray-500">No overdue invoices for this period.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end mt-4">
                <button
                    onClick={() => downloadCsv(convertToCsv(overdueAgingData, ['label', 'count', 'amount']), 'overdue_aging_report.csv')}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold text-sm"
                >
                    Export to CSV
                </button>
            </div>
        </div>

        {/* New: Client Acquisition Trend Chart (using mock data) */}
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Client Acquisition Trend</h3>
          <p className="text-xs text-gray-500 mb-4">
              *This report uses mocked data as client creation dates are not available in current data structure.
          </p>
          <div style={{ width: '100%', height: 300 }}>
            {isRechartsLoaded && LineChart ? (
                <ResponsiveContainer>
                  <LineChart data={clientAcquisitionTrend} margin={{ top: 5, right: 30, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 12}}/>
                    <YAxis allowDecimals={false} tick={{fill: '#6b7280', fontSize: 12}} />
                    <Tooltip formatter={(value: number) => [`${value} new clients`, "Clients"]} cursor={{stroke: '#3b82f6'}}/>
                    <Line type="monotone" dataKey="newClients" stroke="#f59e0b" activeDot={{ r: 8 }} /> {/* Amber color */}
                  </LineChart>
                </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-full text-gray-500">Loading chart...</div>}
          </div>
          <div className="flex justify-end mt-4">
            <button
                onClick={() => downloadCsv(convertToCsv(clientAcquisitionTrend, ['name', 'newClients']), 'client_acquisition_trend.csv')}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold text-sm"
            >
                Export to CSV
            </button>
          </div>
        </div>

    </div>
  );
};

export default Reports;
