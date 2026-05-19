import { Link, useNavigate } from "react-router";
import { useState } from "react";
import { User, Mail, Briefcase, Building, Lock, Check } from "lucide-react";
import logo from "../../imports/ChatGPT_Image_26_abr_2026,_13_26_09.png";

export function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    company: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      navigate("/app");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={logo} alt="Sophia AI" className="w-12 h-12" />
            <span className="text-2xl font-bold text-[#1A365D]">Sophia AI</span>
          </div>
          <h1 className="text-3xl font-bold text-[#1A365D] mb-2">Create Your Account</h1>
          <p className="text-[#64748B]">Join the future of ophthalmic sales optimization</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step >= s ? "bg-[#00B4D8] text-white" : "bg-[#E2E8F0] text-[#64748B]"
              }`}>
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 3 && <div className={`w-16 h-1 ${step > s ? "bg-[#00B4D8]" : "bg-[#E2E8F0]"}`}></div>}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#E2E8F0] p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <>
                <div>
                  <label className="block text-[#1A365D] mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Dr. Jane Smith"
                      className="w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B4D8] text-[#1A365D]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#1A365D] mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jane@ophthalmic-lab.com"
                      className="w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B4D8] text-[#1A365D]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#1A365D] mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B4D8] text-[#1A365D]"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Corporate Role */}
            {step === 2 && (
              <>
                <div>
                  <label className="block text-[#1A365D] mb-2">Job Role</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B4D8] text-[#1A365D]"
                      required
                    >
                      <option value="">Select your role</option>
                      <option value="sales-manager">Sales Manager</option>
                      <option value="data-analyst">Data Analyst</option>
                      <option value="executive">Executive</option>
                      <option value="operations">Operations Director</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[#1A365D] mb-2">Company Name</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Ophthalmic Solutions Inc."
                      className="w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B4D8] text-[#1A365D]"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Verification */}
            {step === 3 && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-[#00B4D8]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-10 h-10 text-[#00B4D8]" />
                </div>
                <h3 className="text-2xl font-bold text-[#1A365D] mb-3">Check Your Email</h3>
                <p className="text-[#64748B] mb-6">
                  We've sent a verification link to <span className="font-semibold text-[#1A365D]">{formData.email}</span>
                </p>
                <p className="text-sm text-[#64748B]">
                  Click the link in your email to activate your account and get started.
                </p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#00B4D8] text-white rounded-lg hover:bg-[#0096C7] transition-colors"
            >
              {step === 3 ? "Go to Dashboard" : "Continue"}
            </button>
          </form>

          {step < 3 && (
            <p className="mt-6 text-center text-[#64748B]">
              Already have an account?{" "}
              <Link to="/login" className="text-[#00B4D8] hover:text-[#0096C7]">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
