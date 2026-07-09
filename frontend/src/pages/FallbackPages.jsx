import { Link } from 'react-router-dom';
import './Dashboard.css';
import './Shows.css';

export function NotFoundPage() {
  return <Fallback title="Page not found" body="That page does not exist or has moved." action={<Link className="button primary link-button" to="/login">Go to Login</Link>} />;
}

export function PermissionDeniedPage() {
  return <Fallback title="Permission denied" body="You do not have access to that area." action={<Link className="button primary link-button" to="/login">Switch Account</Link>} />;
}

export function PublicLinkUnavailablePage({ message = 'This public link is disabled, expired, or unavailable.' }) {
  return <Fallback title="Public link unavailable" body={message} />;
}

function Fallback({ title, body, action }) {
  return (
    <main className="vendor-shell">
      <section className="empty-state">
        <h1>{title}</h1>
        <p>{body}</p>
        {action}
      </section>
    </main>
  );
}
