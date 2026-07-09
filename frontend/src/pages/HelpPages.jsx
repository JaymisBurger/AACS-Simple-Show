import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import { getAdminHelpRequest, getVendorHelpRequest } from '../services/opsService.js';
import './Dashboard.css';
import './Shows.css';

export function AdminHelpPage() {
  const [items, setItems] = useState([]);
  useEffect(() => { getAdminHelpRequest().then((data) => setItems(data.help || [])).catch(() => setItems([])); }, []);
  return <AdminLayout><HelpContent kicker="Admin Help" title="How to Manage an Event" items={items} /></AdminLayout>;
}

export function VendorHelpPage() {
  const [items, setItems] = useState([]);
  useEffect(() => { getVendorHelpRequest().then((data) => setItems(data.help || [])).catch(() => setItems([])); }, []);
  return <main className="vendor-shell"><header className="vendor-header"><div><p className="app-kicker">Vendor Help</p><h1>How Booth Selection Works</h1></div><Link className="button secondary link-button" to="/vendor">Dashboard</Link></header><HelpContent items={items} /></main>;
}

function HelpContent({ kicker, title, items }) {
  return (
    <>
      {title ? <section className="page-heading"><div>{kicker ? <p className="app-kicker">{kicker}</p> : null}<h2>{title}</h2></div></section> : null}
      <section className="placeholder-grid help-grid">
        {items.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.body}</p></article>)}
      </section>
    </>
  );
}
