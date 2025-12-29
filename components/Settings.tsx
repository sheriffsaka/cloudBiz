
import React, { useState, useEffect, useRef } from 'react';
import { Company, BankAccount, User } from '../types';
import ImageCropperModal from './ImageCropperModal';

interface SettingsProps {
  company: Company | null;
  onSaveChanges: (companyId: string, updatedDetails: Partial<Omit<Company, 'id'>>) => void;
  onInviteUser: () => void; 
  users: User[];
  activeTenantId: string;
  onUpdateUserStatus: (userId: string, status: 'Active' | 'Declined') => void;
  onResendInvite: (userId: string) => void;
}

interface BankAccountsManagerProps {
  companyId: string;
  bankAccounts: BankAccount[];
  onUpdateBankAccounts: (updatedAccounts: BankAccount[]) => void;
}

const BankAccountsManager: React.FC<BankAccountsManagerProps> = ({ companyId, bankAccounts, onUpdateBankAccounts }) => {
  const [newBankName, setNewBankName] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName || !newAccountName || !newAccountNumber) {
      alert('Please fill all bank account fields.');
      return;
    }
    const newAccount: BankAccount = {
      id: `bank-${Date.now()}`,
      companyId: companyId,
      bankName: newBankName,
      accountName: newAccountName,
      accountNumber: newAccountNumber,
    };
    onUpdateBankAccounts([...bankAccounts, newAccount]);
    setNewBankName('');
    setNewAccountName('');
    setNewAccountNumber('');
  };

  const handleRemoveAccount = (id: string) => {
    onUpdateBankAccounts(bankAccounts.filter(account => account.id !== id));
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">Bank Accounts</h3>
      {bankAccounts && bankAccounts.length > 0 ? (
        <ul className="space-y-3 mb-6">
          {bankAccounts.map(account => (
            <li key={account.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold text-gray-800">{account.bankName}</p>
                <p className="text-sm text-gray-600">{account.accountName} - {account.accountNumber}</p>
              </div>
              <button
                onClick={() => handleRemoveAccount(account.id)}
                className="text-red-500 hover:text-red-700 text-sm font-medium"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 mb-6">No bank accounts added yet.</p>
      )}

      <form onSubmit={handleAddAccount} className="space-y-4 border-t pt-4">
        <h4 className="text-md font-semibold text-gray-700">Add New Bank Account</h4>
        <div>
          <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">Bank Name</label>
          <input type="text" id="bankName" value={newBankName} onChange={e => setNewBankName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900" required />
        </div>
        <div>
          <label htmlFor="accountName" className="block text-sm font-medium text-gray-700">Account Name</label>
          <input type="text" id="accountName" value={newAccountName} onChange={e => setNewAccountName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900" required />
        </div>
        <div>
          <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">Account Number</label>
          <input type="text" id="accountNumber" value={newAccountNumber} onChange={e => setNewAccountNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900" required />
        </div>
        <div className="flex justify-end">
          <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold shadow">Add Account</button>
        </div>
      </form>
    </div>
  );
};

const Settings: React.FC<SettingsProps> = ({ company, onSaveChanges, onInviteUser, users, activeTenantId, onUpdateUserStatus, onResendInvite }) => {
  const [formData, setFormData] = useState<Company>(company || { id: '', name: '', address: '', email: '', bankAccounts: [] });
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCropperModalOpen, setIsCropperModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (company) setFormData(company);
  }, [company]);

  if (!company) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-gray-400 italic">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-600 mb-4"></div>
            Loading workspace settings...
        </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleUpdateBankAccounts = (updatedAccounts: BankAccount[]) => {
    setFormData(prev => ({ ...prev, bankAccounts: updatedAccounts }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageToCrop(event.target.result as string);
          setIsCropperModalOpen(true);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCroppedImage = (base64Image: string) => {
    setFormData(prev => ({ ...prev, logoUrl: base64Image }));
    setIsCropperModalOpen(false);
    setImageToCrop(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logoUrl: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveChanges(company.id, formData);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const tenantUsers = users.filter(user => user.tenantIds.includes(activeTenantId));
  const currentTeamMembers = tenantUsers.filter(user => user.status === 'Active');
  const pendingInvites = tenantUsers.filter(user => user.status === 'Pending');

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your company profile, billing, and team members.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">Company Profile</h3>
        <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Company Name</label>
                    <input type="text" id="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900" />
                </div>
                 <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Company Email</label>
                    <input type="email" id="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900" />
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input type="tel" id="phone" value={formData.phone || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900" />
                </div>
                 <div>
                    <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700">Logo (Preview)</label>
                    <input type="url" id="logoUrl" value={formData.logoUrl || ''} onChange={handleChange} placeholder="Uploaded logo will appear here" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900" disabled />
                </div>
            </div>
            <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                <textarea id="address" rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white text-gray-900" value={formData.address} onChange={handleChange}></textarea>
            </div>

            <div className="border-t pt-4 mt-4">
                <h4 className="text-md font-semibold text-gray-700 mb-2">Company Logo</h4>
                <div className="flex items-center space-x-4">
                    {formData.logoUrl ? (
                        <div className="relative w-24 h-24 border rounded-lg overflow-hidden flex-shrink-0">
                            <img src={formData.logoUrl} alt="Company Logo" className="w-full h-full object-contain" />
                            <button 
                                type="button" 
                                onClick={handleRemoveLogo} 
                                className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full text-xs"
                            >&times;</button>
                        </div>
                    ) : (
                        <div className="w-24 h-24 border border-gray-300 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
                            No Logo
                        </div>
                    )}
                    <div>
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                            ref={fileInputRef}
                        />
                        <p className="mt-1 text-xs text-gray-500">Upload a square image for best results.</p>
                    </div>
                </div>
            </div>

            <div className="pt-2 flex justify-end items-center space-x-4">
                {showSuccess && <span className="text-sm text-green-600 font-medium">Changes saved successfully!</span>}
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold shadow">Save Changes</button>
            </div>
        </form>
      </div>

      <BankAccountsManager
        companyId={company.id}
        bankAccounts={formData.bankAccounts || []}
        onUpdateBankAccounts={handleUpdateBankAccounts}
      />

      <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">Billing & Subscription</h3>
        <div className="text-gray-600">
            <p><span className="font-semibold text-gray-800">Current Plan:</span> Free Tier</p>
            <p className="mt-2">You are on the free plan with up to 10 clients and 30 invoices/month.</p>
            <button className="mt-4 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 font-semibold">Upgrade Plan</button>
        </div>
      </div>
      
       <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 border-b pb-3 mb-4">Team Members</h3>
        <div className="flex justify-end mb-4">
            <button onClick={onInviteUser} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold shadow text-sm">+ Invite Member</button>
        </div>
        
        {currentTeamMembers.length > 0 && (
            <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-700 mb-2">Current Team ({currentTeamMembers.length})</h4>
                <ul className="space-y-3">
                    {currentTeamMembers.map(user => (
                        <li key={user.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-semibold">{user.name} {user.isAdmin && '(Admin)'}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                            <span className="text-sm font-medium text-green-600">Active</span>
                        </li>
                    ))}
                </ul>
            </div>
        )}

        {pendingInvites.length > 0 && (
            <div>
                <h4 className="text-md font-semibold text-gray-700 mb-2">Pending Invites ({pendingInvites.length})</h4>
                <ul className="space-y-3">
                    {pendingInvites.map(user => (
                        <li key={user.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                            <div>
                                <p className="font-semibold">{user.name}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                            <div className="flex space-x-2">
                                <button 
                                    onClick={() => onUpdateUserStatus(user.id, 'Active')}
                                    className="px-3 py-1 bg-green-500 text-white rounded-md text-xs hover:bg-green-600"
                                >
                                    Activate Manually
                                </button>
                                <button 
                                    onClick={() => onResendInvite(user.id)}
                                    className="px-3 py-1 bg-blue-500 text-white rounded-md text-xs hover:bg-blue-600"
                                >
                                    Resend Invite
                                </button>
                                <button 
                                    onClick={() => onUpdateUserStatus(user.id, 'Declined')}
                                    className="px-3 py-1 bg-red-500 text-white rounded-md text-xs hover:bg-red-600"
                                >
                                    Mark Declined
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        )}

        {tenantUsers.length === 0 && (
            <p className="text-gray-500 mb-6">No team members found for this company.</p>
        )}
      </div>

      {isCropperModalOpen && imageToCrop && (
        <ImageCropperModal
          isOpen={isCropperModalOpen}
          onClose={() => setIsCropperModalOpen(false)}
          imageSrc={imageToCrop}
          onCrop={handleCroppedImage}
        />
      )}
    </div>
  );
};

export default Settings;
