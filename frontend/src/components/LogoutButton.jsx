import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function LogoutButton({ className = '' }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <button className={`button secondary ${className}`} type="button" onClick={handleLogout}>
      Logout
    </button>
  );
}
