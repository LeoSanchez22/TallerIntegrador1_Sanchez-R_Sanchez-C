import { Link, useNavigate } from "react-router";
import { useState } from "react";
import { Mail, Lock, Github } from "lucide-react";
import logo from "../../imports/ChatGPT_Image_26_abr_2026,_13_26_09.png";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/app");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Panel - Brand Mission */}
      <div className="bg-gradient-to-br from-[#1A365D] via-[#2D4A73] to-[#1A365D] p-12 flex flex-col justify-center items-center text-white">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <img src={logo} alt="Sophia AI" className="w-14 h-14" />
            <span className="text-3xl font-bold">Sophia AI</span>
          </div>
          <h2 className="text-4xl font-bold mb-6">Transforming Ophthalmic Sales with Deep Learning</h2>
          <p className="text-xl text-white/80 leading-relaxed">
            Join pharmaceutical laboratories worldwide leveraging AI-driven demand forecasting and intelligent recommendation systems.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="bg-[#F8FAFC] p-12 flex flex-col justify-center">
        <div className="max-w-md w-full mx-auto">
          <h1 className="text-3xl font-bold text-[#1A365D] mb-2">Welcome Back</h1>
          <p className="text-[#64748B] mb-8">Sign in to access your dashboard</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[#1A365D] mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-12 pr-4 py-3 bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B4D8] text-[#1A365D]"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B4D8] text-[#1A365D]"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-[#00B4D8] border-[#CBD5E1] rounded focus:ring-[#00B4D8]" />
                <span className="text-sm text-[#64748B]">Remember me</span>
              </label>
              <Link to="/recovery" className="text-sm text-[#00B4D8] hover:text-[#0096C7]">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#1A365D] text-white rounded-lg hover:bg-[#2D4A73] transition-colors"
            >
              Sign In
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#CBD5E1]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[#F8FAFC] text-[#64748B]">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 py-3 px-4 bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F1F5F9] transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-[#1A365D]">Google</span>
              </button>
              <button className="flex items-center justify-center gap-2 py-3 px-4 bg-white border border-[#CBD5E1] rounded-lg hover:bg-[#F1F5F9] transition-colors">
                <Github className="w-5 h-5" />
                <span className="text-[#1A365D]">GitHub</span>
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-[#64748B]">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#00B4D8] hover:text-[#0096C7]">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
