import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  activateVendorRequest,
  changePasswordRequest,
  resetPasswordRequest
} from '../services/authService.js';
import './LoginPage.css';

export function ChangePasswordPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('ready');

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('saving');
    setMessage('');
    try {
      await changePasswordRequest(password);
      logout();
      navigate('/login', { replace: true, state: { message: 'Password changed. Sign in again.' } });
    } catch (requestError) {
      setMessage(requestError.response?.data?.message || 'Unable to change password.');
      setStatus('ready');
    }
  }

  return <PasswordPanel title="Change Password" subtitle={user.email} password={password} setPassword={setPassword} message={message} status={status} onSubmit={handleSubmit} />;
}

export function ActivateVendorPage() {
  return <TokenPasswordPage mode="activate" title="Activate Vendor Account" />;
}

export function ResetPasswordPage() {
  return <TokenPasswordPage mode="reset" title="Reset Password" />;
}

function TokenPasswordPage({ mode, title }) {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('ready');
  const token = searchParams.get('token') || '';

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('saving');
    setMessage('');
    try {
      if (mode === 'activate') {
        await activateVendorRequest({ token, password });
      } else {
        await resetPasswordRequest({ token, password });
      }
      setMessage('Password saved. You can sign in now.');
      setStatus('done');
    } catch (requestError) {
      setMessage(requestError.response?.data?.message || 'Unable to save password.');
      setStatus('ready');
    }
  }

  return (
    <PasswordPanel
      title={title}
      subtitle="Enter a new password to continue."
      password={password}
      setPassword={setPassword}
      message={message}
      status={status}
      onSubmit={handleSubmit}
      showLoginLink={status === 'done'}
    />
  );
}

function PasswordPanel({ title, subtitle, password, setPassword, message, status, onSubmit, showLoginLink = false }) {
  return (
    <main className="login-page">
      <section className="login-panel">
        <div>
          <p className="app-kicker">Association Events</p>
          <h1>{title}</h1>
          <p className="login-copy">{subtitle}</p>
        </div>
        <form className="login-form" onSubmit={onSubmit}>
          <label>New password<input autoComplete="new-password" minLength="8" onChange={(event) => setPassword(event.target.value)} type="password" value={password} /></label>
          {message ? <div className={showLoginLink ? 'success-message' : 'form-error'}>{message}</div> : null}
          {showLoginLink ? <Link className="button primary link-button" to="/login">Sign In</Link> : <button className="button primary" disabled={status === 'saving'} type="submit">{status === 'saving' ? 'Saving...' : 'Save Password'}</button>}
        </form>
      </section>
    </main>
  );
}
