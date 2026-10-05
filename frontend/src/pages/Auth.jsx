import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatApiError } from '../utils/apiError';

const initialSignup = {
  full_name: '',
  email: '',
  password: '',
  confirm_password: '',
};

export default function Auth() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [tab, setTab] = useState('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [signupForm, setSignupForm] = useState(initialSignup);
  const [signinForm, setSigninForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleSignupChange = (event) => {
    setSignupForm({ ...signupForm, [event.target.name]: event.target.value });
  };

  const handleSigninChange = (event) => {
    setSigninForm({ ...signinForm, [event.target.name]: event.target.value });
  };

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSignup = async (event) => {
    event.preventDefault();
    if (!signupForm.full_name.trim()) {
      setMessage({ type: 'error', text: 'Please enter your name.' });
      return;
    }
    if (!validateEmail(signupForm.email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    if (signupForm.password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }
    if (signupForm.password !== signupForm.confirm_password) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      await signup({
        full_name: signupForm.full_name,
        email: signupForm.email,
        password: signupForm.password,
      });
      setMessage({ type: 'success', text: 'Account created successfully! Taking you to your dashboard...' });
      setSignupForm(initialSignup);
      navigate('/dashboard');
    } catch (error) {
      const detail = formatApiError(error, 'Signup failed. Please try again.');
      setMessage({ type: 'error', text: detail });
    } finally {
      setLoading(false);
    }
  };

  const handleSignin = async (event) => {
    event.preventDefault();
    if (!signinForm.email.trim() || !signinForm.password.trim()) {
      setMessage({ type: 'error', text: 'Please enter both your email and password.' });
      return;
    }

    setLoading(true);
    try {
      await login(signinForm.email, signinForm.password);
      navigate('/dashboard');
    } catch (error) {
      const detail = formatApiError(error, 'Unable to sign in. Please check your details.');
      setMessage({ type: 'error', text: detail });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-visual">
        <div className="auth-visual-inner">
          <div className="logo-mark floaty" style={{ margin: '0 auto 18px', width: '92px', height: '92px', fontSize: '2.2rem' }}>A</div>
          <h1>AUTIASSIST</h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-soft)' }}>Learn • Communicate • Grow</p>
          <p style={{ maxWidth: '440px', margin: '0 auto', color: 'var(--text-soft)' }}>
            Learning made friendly.
          </p>
        </div>
      </div>

      <div className="auth-panel">
        <div className="form-card" style={{ width: '100%' }}>
          <div className="tab-row" aria-label="Authentication tabs">
            <button
              type="button"
              className={`tab-btn ${tab === 'signin' ? 'active' : ''}`}
              onClick={() => setTab('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`tab-btn ${tab === 'signup' ? 'active' : ''}`}
              onClick={() => setTab('signup')}
            >
              Sign Up
            </button>
          </div>

          {message.text && <div className={`auth-message ${message.type}`}>{message.text}</div>}

          {tab === 'signup' ? (
            <form onSubmit={handleSignup}>
              <div className="field-group">
                <label htmlFor="full_name">Full Name</label>
                <input id="full_name" className="input" name="full_name" value={signupForm.full_name} onChange={handleSignupChange} />
              </div>
              <div className="field-group">
                <label htmlFor="email">Email</label>
                <input id="email" className="input" name="email" type="email" value={signupForm.email} onChange={handleSignupChange} />
              </div>
              <div className="field-group">
                <label htmlFor="password">Password</label>
                <div className="password-row">
                  <input id="password" className="input" name="password" type={showPassword ? 'text' : 'password'} value={signupForm.password} onChange={handleSignupChange} />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div className="field-group">
                <label htmlFor="confirm_password">Confirm Password</label>
                <div className="password-row">
                  <input id="confirm_password" className="input" name="confirm_password" type={showConfirm ? 'text' : 'password'} value={signupForm.confirm_password} onChange={handleSignupChange} />
                  <button type="button" className="password-toggle" onClick={() => setShowConfirm((value) => !value)}>
                    {showConfirm ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button className="primary-btn" style={{ width: '100%' }} type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignin}>
              <div className="field-group">
                <label htmlFor="signin_email">Email</label>
                <input id="signin_email" className="input" name="email" type="email" value={signinForm.email} onChange={handleSigninChange} />
              </div>
              <div className="field-group">
                <label htmlFor="signin_password">Password</label>
                <div className="password-row">
                  <input id="signin_password" className="input" name="password" type={showPassword ? 'text' : 'password'} value={signinForm.password} onChange={handleSigninChange} />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button className="primary-btn" style={{ width: '100%' }} type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', gap: '8px', fontWeight: '700' }}>
                <button type="button" className="ghost-btn" onClick={() => setTab('signup')}>Don’t have an account? Sign Up</button>
                <button type="button" className="ghost-btn">Forgot Password?</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
