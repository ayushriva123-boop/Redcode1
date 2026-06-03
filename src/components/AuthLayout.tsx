import React, { useState } from "react";
import { User } from "../types";
import { MessageSquare, ShieldCheck, Mail, Lock, User as UserIcon, Terminal, Orbit } from "lucide-react";

interface AuthLayoutProps {
  onAuthSuccess: (user: User) => void;
}

export default function AuthLayout({ onAuthSuccess }: AuthLayoutProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [simulatedCode, setSimulatedCode] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [userPendingVerify, setUserPendingVerify] = useState<User | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Logo component
  const Logo = () => (
    <div id="logo-container" className="flex flex-col items-center justify-center space-y-2 mb-6">
      <div id="logo-badge" className="relative h-16 w-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 group hover:rotate-6 transition-transform duration-300">
        <span id="logo-letter" className="text-white font-extrabold text-4xl select-none tracking-tight font-sans">R</span>
        <div id="logo-node" className="absolute -bottom-1 -right-1 h-5.5 w-5.5 bg-zinc-950 border-2 border-red-500 rounded-full flex items-center justify-center">
          <Orbit className="h-3 w-3 text-red-500 animate-spin" />
        </div>
      </div>
      <h1 id="brand-title" className="text-white text-3xl font-extrabold tracking-wider font-sans">
        RED<span className="text-red-500">COAD</span>
      </h1>
      <p id="tagline-text" className="text-zinc-400 text-xs tracking-widest uppercase font-mono">Connect. Collaborate. Communicate.</p>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        // LOGIN
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loginKey: email, password })
        });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Login credentials failed.");
        }
        
        onAuthSuccess(data.user);
      } else {
        // REGISTER
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, displayName, email, password })
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Registration validation error.");
        }

        // Simulate mandatory Email Verification requirement!
        setUserPendingVerify(data.user);
        setVerificationSent(true);
        setSimulatedCode(Math.floor(100000 + Math.random() * 900000).toString());
      }
    } catch (err: any) {
      setError(err?.message || "An authentication fault occurred.");
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (userPendingVerify) {
      onAuthSuccess(userPendingVerify);
    }
  };

  if (verificationSent) {
    return (
      <div id="auth-verify-panel" className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 py-8">
        <div id="verify-card" className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600"></div>
          
          <Logo />

          <div id="verify-step-details" className="text-center space-y-4">
            <div className="h-12 w-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Mail className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Verify Your Email Address</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">
              We completed account registration for <span className="text-red-400 font-mono">@{userPendingVerify?.username}</span>. Enter the verification code below to authorize your session.
            </p>

            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg font-mono text-zinc-300 text-xs flex justify-between items-center my-4">
              <div className="flex items-center space-x-2 text-zinc-400">
                <Terminal className="h-3.5 w-3.5 text-zinc-500" />
                <span>[REDCOAD] Sandbox Email Stream:</span>
              </div>
              <span className="text-red-500 font-bold tracking-widest">{simulatedCode}</span>
            </div>

            <form onSubmit={verifyEmailCode} className="space-y-4 text-left">
              <div>
                <label className="block text-zinc-400 text-xs font-mono uppercase tracking-wide mb-1.5">Verification Code</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ShieldCheck className="h-4 w-4 text-zinc-500" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="block w-full pl-10 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 text-center tracking-widest text-lg"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-lg font-sans font-medium text-sm shadow-md transition-colors duration-200"
              >
                Complete Authorization
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div id="auth-forgot-panel" className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 py-8">
        <div id="forgot-card" className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600"></div>
          
          <Logo />

          <div id="reset-details" className="space-y-4">
            <h2 className="text-xl font-bold text-white text-center">Reset Your Password</h2>
            <p className="text-zinc-400 text-sm leading-relaxed text-center">
              Type your registered email address below. We'll simulate a secure credential token refresh process.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              alert("Password Recovery Token: For demonstration inside our secure container sandbox, credentials can be reset by signing up to a new account. Use any plain password.");
              setShowForgotPassword(false);
            }} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-xs font-mono uppercase tracking-wide mb-1.5">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-zinc-500" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="name@email.com"
                    className="block w-full pl-10 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-lg font-sans font-medium text-sm shadow-md transition-colors duration-200 animate-pulse"
              >
                Send Sandbox Reset Token
              </button>

              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="w-full text-zinc-500 hover:text-zinc-300 text-center text-xs font-mono transition-colors"
              >
                ← Back to Identification Gate
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="auth-core-panel" className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 py-8">
      <div id="auth-main-card" className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600"></div>
        
        <Logo />

        {error && (
          <div id="auth-err-ribbon" className="bg-red-950/40 border border-red-900/60 text-red-400 text-xs px-3.5 py-2.5 rounded-lg mb-4 flex items-center space-x-2 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping"></span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-zinc-400 text-xs font-mono uppercase tracking-wide mb-1.5">Username (Lowercase, no spaces)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-4 w-4 text-zinc-500" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. grace_hopper"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-650 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-mono uppercase tracking-wide mb-1.5">Display Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MessageSquare className="h-4 w-4 text-zinc-500" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Grace Hopper"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-zinc-400 text-xs font-mono uppercase tracking-wide mb-1.5">{isLogin ? "Username or Email" : "Email Address"}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type={isLogin ? "text" : "email"}
                required
                placeholder={isLogin ? "Enter your username or email" : "grace@redcoad.io"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-zinc-400 text-xs font-mono uppercase tracking-wide">Password</label>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-red-500 hover:text-red-400 font-mono"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white placeholder-zinc-650 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-lg font-sans font-medium text-sm shadow-md transition-all sm:py-3 cursor-pointer hover:shadow-red-500/10 disabled:opacity-50"
          >
            {loading ? "Decrypting Node Vault..." : isLogin ? "Authorize Session" : "Create REDCOAD Account"}
          </button>
        </form>

        <div id="auth-toggle-ribbon" className="mt-6 text-center border-t border-zinc-850 pt-4">
          <p className="text-zinc-400 text-xs font-sans">
            {isLogin ? "Need a custom connection key?" : "Already part of REDCOAD?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-red-500 hover:text-red-400 font-bold"
            >
              {isLogin ? "Register Port Profile" : "Authenticate Gate"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
