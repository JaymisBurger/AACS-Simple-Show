import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './LoginPage.css';

function dashboardPathForRole(role) {
  return role === 'admin' ? '/admin' : '/vendor';
}

export function LoginPage() {
  const { isAuthenticated, login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    if (user.requiresPasswordChange) return <Navigate to="/change-password" replace />;
    return <Navigate to={dashboardPathForRole(user.role)} replace />;
  }

  function updateField(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Email and password are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const loggedInUser = await login(formData);
      const destination = loggedInUser.requiresPasswordChange
        ? '/change-password'
        : location.state?.from?.pathname || dashboardPathForRole(loggedInUser.role);
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div>
          <p className="app-kicker">Association Events</p>
          <h1 id="login-title">Sign in</h1>
          <p className="login-copy">Access your booth management dashboard.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              autoComplete="email"
              name="email"
              onChange={updateField}
              type="email"
              value={formData.email}
            />
          </label>

          <label>
            Password
            <input
              autoComplete="current-password"
              name="password"
              onChange={updateField}
              type="password"
              value={formData.password}
            />
          </label>

          {error ? <div className="form-error">{error}</div> : null}

          <button className="button primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
