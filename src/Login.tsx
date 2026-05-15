import { useState } from 'react';
import { useAuth } from './AuthContext';
import './login.css';

export default function Login() {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    try {
      await login(email, password);
      // Redirect will be handled by the App component
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleGoogleLogin = () => {
    // Mock OAuth login
    setLocalError('Google login is coming soon');
  };

  const handleGithubLogin = () => {
    // Mock OAuth login
    setLocalError('GitHub login is coming soon');
  };

  return (
    <div className="login-page">
      {/* Left Side: Branding */}
      <div className="login-branding">
        <div className="branding-content">
          <div className="branding-glow"></div>
          <div className="branding-card">
            <div className="branding-avatar">AI</div>
            <h1 className="branding-title">Persona</h1>
            <p className="branding-tagline">
              Chat with your intelligent AI companion
            </p>
          </div>
          <div className="branding-accent"></div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="login-form-container">
        <div className="login-form-card">
          <div className="form-header">
            <h2>Welcome back</h2>
            <p>Sign in to continue to your AI companion</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-input"
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div className="form-group">
              <div className="password-header">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <a href="#forgot" className="forgot-link">
                  Forgot?
                </a>
              </div>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="form-input"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  disabled={isLoading}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁' : '👁‍🗨'}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  className="checkbox-input"
                />
                <span className="checkbox-text">Remember me</span>
              </label>
            </div>

            {/* Error Message */}
            {(error || localError) && (
              <div className="error-message">
                <span className="error-icon">⚠</span>
                {error || localError}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="login-button"
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign in'
              )}
            </button>

            {/* Divider */}
            <div className="form-divider">
              <span>OR</span>
            </div>

            {/* OAuth Buttons */}
            <div className="oauth-buttons">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="oauth-button"
                title="Continue with Google"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <text x="12" y="15" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="bold">
                    G
                  </text>
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={handleGithubLogin}
                disabled={isLoading}
                className="oauth-button"
                title="Continue with GitHub"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8c0-.5.5-1 1-1s1 .5 1 1-.5 1-1 1-1-.5-1-1z" />
                </svg>
                <span>GitHub</span>
              </button>
            </div>

            {/* Signup Link */}
            <p className="signup-text">
              Don't have an account?{' '}
              <a href="#signup" className="signup-link">
                Create one
              </a>
            </p>
          </form>
        </div>

        {/* Bottom Text */}
        <div className="login-footer">
          <p className="footer-text">
            🔒 Your login is secure. We never store passwords.
          </p>
        </div>
      </div>
    </div>
  );
}
