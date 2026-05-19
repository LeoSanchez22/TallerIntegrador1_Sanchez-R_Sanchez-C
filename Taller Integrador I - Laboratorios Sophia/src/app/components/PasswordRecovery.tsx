import { Link } from "react-router";
import { useState } from "react";
import { Mail, ArrowLeft, Check } from "lucide-react";
import logo from "../../imports/ChatGPT_Image_26_abr_2026,_13_26_09.png";

export function PasswordRecovery() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={logo} alt="Sophia AI" className="w-12 h-12" />
            <span className="text-2xl font-bold text-[#1A365D]">Sophia AI</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#E2E8F0] p-8">
          {!submitted ? (
            <>
              <h1 className="text-2xl font-bold text-[#1A365D] mb-2">Reset Password</h1>
              <p className="text-[#64748B] mb-8">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[#1A365D] mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B4D8] text-[#1A365D]"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#00B4D8] text-white rounded-lg hover:bg-[#0096C7] transition-colors"
                >
                  Send Reset Link
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-[#00B4D8]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-[#00B4D8]" />
              </div>
              <h2 className="text-2xl font-bold text-[#1A365D] mb-3">Check Your Inbox</h2>
              <p className="text-[#64748B] mb-6">
                We've sent a password reset link to <span className="font-semibold text-[#1A365D]">{email}</span>
              </p>
              <p className="text-sm text-[#64748B]">
                If you don't see the email, check your spam folder or try again.
              </p>
            </div>
          )}

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 mt-6 text-[#00B4D8] hover:text-[#0096C7] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
