import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user?.is_staff) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadStats() {
      try {
        const response = await api.get("/accounts/admin-dashboard/stats/");
        if (active) setStats(response.data);
      } catch (err) {
        if (active) {
          setError(
            err.response?.status === 403
              ? "Access denied. Please log in with a staff account."
              : "Could not load dashboard statistics."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadStats();

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  if (authLoading || loading) {
    return <main className="page-container"><p>Loading admin dashboard...</p></main>;
  }

  if (!user) {
    return (
      <main className="page-container admin-dashboard">
        <h1>Admin Dashboard</h1>
        <p>Please log in with an administrator account.</p>
        <Link to="/login" className="primary-button">Login</Link>
      </main>
    );
  }

  if (!user.is_staff) {
    return (
      <main className="page-container admin-dashboard">
        <h1>Access Restricted</h1>
        <p>This dashboard is available only to authorized staff.</p>
        <Link to="/" className="primary-button">Back to Home</Link>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-container admin-dashboard">
        <h1>Admin Dashboard</h1>
        <p className="dashboard-error">{error}</p>
        <button
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </main>
    );
  }

  const cards = [
    { label: "Total Users", value: stats.total_users, icon: "👥" },
    { label: "Farmers", value: stats.farmers, icon: "🌾" },
    { label: "Customers", value: stats.customers, icon: "🛍️" },
    { label: "Total Products", value: stats.total_products, icon: "🥬" },
    { label: "Products In Stock", value: stats.available_products, icon: "📦" },
    { label: "Total Orders", value: stats.total_orders, icon: "🧾" },
  ];

  return (
    <main className="page-container admin-dashboard">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">FARMDIRECT MANAGEMENT</p>
          <h1>Admin Dashboard</h1>
          <p>Monitor users, products, orders, and marketplace activity.</p>
        </div>

        <a
          className="secondary-button"
          href="http://127.0.0.1:8000/admin/"
          target="_blank"
          rel="noreferrer"
        >
          Open Django Admin ↗
        </a>
      </div>

      <section className="admin-stats-grid">
        {cards.map((card) => (
          <article className="admin-stat-card" key={card.label}>
            <span className="admin-stat-icon">{card.icon}</span>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="admin-status-section">
        <h2>Order Status Overview</h2>

        <div className="admin-status-grid">
          {Object.entries(stats.orders_by_status).map(([status, count]) => (
            <div className="admin-status-row" key={status}>
              <span className={`order-status status-${status}`}>
                {status}
              </span>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-revenue-card">
        <div>
          <p>Delivered Order Revenue</p>
          <h2>₹{Number(stats.delivered_order_revenue).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</h2>
          <span>Sum of orders marked delivered</span>
        </div>
        <span className="admin-revenue-icon">📈</span>
      </section>

      <section className="admin-shortcuts">
        <h2>Management Shortcuts</h2>
        <div className="admin-shortcut-links">
          <a href="http://127.0.0.1:8000/admin/auth/user/" target="_blank" rel="noreferrer">
            Manage Users ↗
          </a>
          <a href="http://127.0.0.1:8000/admin/products/product/" target="_blank" rel="noreferrer">
            Manage Products ↗
          </a>
          <a href="http://127.0.0.1:8000/admin/orders/order/" target="_blank" rel="noreferrer">
            Manage Orders ↗
          </a>
        </div>
      </section>
    </main>
  );
}
