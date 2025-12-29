
import React, { useMemo, useState } from 'react';
import { Company, User, AllTenantsData, InvoiceStatus, TenantData } from '../types';
import StatCard from './StatCard';
import Icon from './common/Icon';
import { generateTextResponse } from '../services/aiGenerationService';

interface AdminDashboardProps {
  allTenantData: AllTenantsData;
  companies: Company[];
  users: User[];
  onViewCompanyDetails: (company: Company) => void;
  onEditUser: (user: User) => void;
}

const AdminDashboardIcon = ({ d }: { d: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const CompaniesTable: React.FC<{
  companies: Company[];
  onViewDetails: (company: Company) => void;
  sortKey: 'name' | 'email' | 'users' | 'invoices' | 'revenue';
  sortDirection: 'asc' | 'desc';
  onSort: (key: 'name' | 'email' | 'users' | 'invoices' | 'revenue') => void;
  allTenantData: AllTenantsData;
  users: User[];
}> = ({ companies, onViewDetails, sortKey, sortDirection, onSort, allTenantData, users }) => {
  const getSortIcon = (key: string) => (sortKey === key ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : null);

  const getCompanyStats = (companyId: string) => {
    const tenantUsers = users.filter(u => u.tenantIds.includes(companyId));
    const tenantInvoices = allTenantData[companyId]?.invoices || [];
    const tenantRevenue = tenantInvoices.filter(inv => inv.status === InvoiceStatus.Paid).reduce((sum, inv) => sum + inv.total, 0);
    return {
      userCount: tenantUsers.length,
      invoiceCount: tenantInvoices.length,
      revenue: tenantRevenue,
    };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => onSort('name')}>Company Name{getSortIcon('name')}</th>
            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => onSort('email')}>Email{getSortIcon('email')}</th>
            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => onSort('users')}>Users{getSortIcon('users')}</th>
            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => onSort('invoices')}>Invoices{getSortIcon('invoices')}</th>
            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => onSort('revenue')}>Revenue{getSortIcon('revenue')}</th>
            <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => {
            const stats = getCompanyStats(company.id);
            return (
              <tr key={company.id} className="bg-white border-b hover:bg-gray-50">
                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{company.name}</th>
                <td className="px-6 py-4">{company.email}</td>
                <td className="px-6 py-4">{stats.userCount}</td>
                <td className="px-6 py-4">{stats.invoiceCount}</td>
                <td className="px-6 py-4">₦{stats.revenue.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => onViewDetails(company)} className="font-medium text-primary-600 hover:underline">View Details</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const UsersTable: React.FC<{
  users: User[];
  onEditUser: (user: User) => void;
  sortKey: 'name' | 'email' | 'tenantCount' | 'isAdmin' | 'status';
  sortDirection: 'asc' | 'desc';
  onSort: (key: 'name' | 'email' | 'tenantCount' | 'isAdmin' | 'status') => void;
}> = ({ users, onEditUser, sortKey, sortDirection, onSort }) => {
  const getSortIcon = (key: string) => (sortKey === key ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => onSort('name')}>Name{getSortIcon('name')}</th>
            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => onSort('email')}>Email{getSortIcon('email')}</th>
            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => onSort('tenantCount')}>Tenants{getSortIcon('tenantCount')}</th>
            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => onSort('isAdmin')}>Type{getSortIcon('isAdmin')}</th>
            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => onSort('status')}>Status{getSortIcon('status')}</th>
            <th scope="col" className="px-6 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
              <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{user.name}</th>
              <td className="px-6 py-4">{user.email}</td>
              <td className="px-6 py-4">{user.tenantIds.length}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'}`}>
                  {user.isAdmin ? 'Admin' : 'User'}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {user.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button onClick={() => onEditUser(user)} className="font-medium text-primary-600 hover:underline">Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ allTenantData, companies, users, onViewCompanyDetails, onEditUser }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    // Explicitly casting Object.values to TenantData[] to fix type inference errors for 't' in reduce
    const tenantValues = Object.values(allTenantData) as TenantData[];
    const totalInvoices = tenantValues.reduce((sum, t) => sum + t.invoices.length, 0);
    const totalRevenue = tenantValues.reduce((sum, t) => 
      sum + t.invoices.filter(i => i.status === InvoiceStatus.Paid).reduce((s, i) => s + i.total, 0), 0);
    return { totalInvoices, totalRevenue };
  }, [allTenantData]);

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const insight = await generateTextResponse(`Admin Query: ${query}. Context: ${companies.length} companies, ${users.length} users, ${stats.totalInvoices} invoices.`, 'gemini-3-pro-preview', "You are a Platform Admin Analyst.");
      setResponse(insight);
    } catch (err) {
      setResponse("Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Companies" value={companies.length.toString()} icon={<AdminDashboardIcon d="M3 21h18M3 7v14M21 7v14M6 21V3h12v18M9 7h1m-1 4h1m-1 4h1m4-12h1m-1 4h1m-1 4h1" />} />
        <StatCard title="Total Users" value={users.length.toString()} icon={<AdminDashboardIcon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />} />
        <StatCard title="Total Invoices" value={stats.totalInvoices.toString()} icon={<AdminDashboardIcon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />} />
        <StatCard title="Platform Revenue" value={`₦${stats.totalRevenue.toLocaleString()}`} icon={<AdminDashboardIcon d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />} />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold mb-4">Platform Intelligence</h3>
        <form onSubmit={handleAskAI} className="flex gap-2">
          <input value={query} onChange={e => setQuery(e.target.value)} className="flex-1 border rounded-lg px-4 py-2" placeholder="Ask about platform growth..." />
          <button className="bg-primary-600 text-white px-6 py-2 rounded-lg" disabled={loading}>{loading ? 'Analyzing...' : 'Analyze'}</button>
        </form>
        {response && <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm">{response}</div>}
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-4 border-b font-bold">Manage Companies</div>
        {/* Fixed: Pass onViewCompanyDetails instead of undefined onViewDetails */}
        <CompaniesTable companies={companies} onViewDetails={onViewCompanyDetails} sortKey="name" sortDirection="asc" onSort={() => {}} allTenantData={allTenantData} users={users} />
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-4 border-b font-bold">Manage Users</div>
        <UsersTable users={users} onEditUser={onEditUser} sortKey="name" sortDirection="asc" onSort={() => {}} />
      </div>
    </div>
  );
};

export default AdminDashboard;
