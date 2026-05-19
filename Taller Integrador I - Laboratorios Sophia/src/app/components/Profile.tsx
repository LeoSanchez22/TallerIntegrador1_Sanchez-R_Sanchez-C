import { User, Mail, Briefcase, Building, Bell, Shield, Key } from "lucide-react";

export function Profile() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1A365D] mb-2">My Profile & Settings</h1>
        <p className="text-[#64748B]">Manage your account information and preferences</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl p-8 border border-[#E2E8F0] shadow-sm">
        <div className="flex items-start gap-6">
          <div className="w-24 h-24 bg-gradient-to-br from-[#1A365D] to-[#00B4D8] rounded-full flex items-center justify-center">
            <span className="text-3xl text-white font-bold">SM</span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[#1A365D] mb-1">Sarah Mitchell</h2>
            <p className="text-[#64748B] mb-4">Sales Manager • Member since January 2026</p>
            <button className="px-4 py-2 bg-[#00B4D8] text-white rounded-lg hover:bg-[#0096C7] transition-colors">
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <h3 className="font-semibold text-[#1A365D]">Account Details</h3>
        </div>
        <div className="divide-y divide-[#E2E8F0]">
          <div className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00B4D8]/10 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-[#00B4D8]" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-[#64748B]">Full Name</p>
              <p className="text-[#1A365D] font-semibold">Sarah Mitchell</p>
            </div>
          </div>
          <div className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00B4D8]/10 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-[#00B4D8]" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-[#64748B]">Email Address</p>
              <p className="text-[#1A365D] font-semibold">sarah.mitchell@ophthalmic-solutions.com</p>
            </div>
          </div>
          <div className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00B4D8]/10 rounded-lg flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-[#00B4D8]" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-[#64748B]">Job Role</p>
              <p className="text-[#1A365D] font-semibold">Sales Manager</p>
            </div>
          </div>
          <div className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-[#00B4D8]/10 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-[#00B4D8]" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-[#64748B]">Company</p>
              <p className="text-[#1A365D] font-semibold">Ophthalmic Solutions Inc.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#1A365D]" />
            <h3 className="font-semibold text-[#1A365D]">Notification Preferences</h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
            <div>
              <p className="font-semibold text-[#1A365D]">Model Retraining Alerts</p>
              <p className="text-sm text-[#64748B]">Get notified when AI models are retrained</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-[#CBD5E1] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#00B4D8] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00B4D8]"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
            <div>
              <p className="font-semibold text-[#1A365D]">Stockout Risk Warnings</p>
              <p className="text-sm text-[#64748B]">Receive alerts for potential inventory shortages</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-[#CBD5E1] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#00B4D8] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00B4D8]"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
            <div>
              <p className="font-semibold text-[#1A365D]">New Opportunities</p>
              <p className="text-sm text-[#64748B]">Notifications for high-confidence recommendations</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-[#CBD5E1] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#00B4D8] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00B4D8]"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
            <div>
              <p className="font-semibold text-[#1A365D]">Weekly Performance Reports</p>
              <p className="text-sm text-[#64748B]">Email summary of sales and model performance</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-[#CBD5E1] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#00B4D8] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00B4D8]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#1A365D]" />
            <h3 className="font-semibold text-[#1A365D]">Security Settings</h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg hover:bg-[#E2E8F0] transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-[#64748B]" />
              <div>
                <p className="font-semibold text-[#1A365D]">Change Password</p>
                <p className="text-sm text-[#64748B]">Last changed 3 months ago</p>
              </div>
            </div>
            <button className="px-4 py-2 text-[#00B4D8] hover:text-[#0096C7] font-semibold">
              Update
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
            <div>
              <p className="font-semibold text-[#1A365D]">Two-Factor Authentication</p>
              <p className="text-sm text-[#64748B]">Add an extra layer of security</p>
            </div>
            <button className="px-4 py-2 bg-[#1A365D] text-white rounded-lg hover:bg-[#2D4A73] transition-colors text-sm">
              Enable
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
