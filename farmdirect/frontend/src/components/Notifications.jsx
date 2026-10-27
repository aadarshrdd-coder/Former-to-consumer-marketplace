import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Notifications() {
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const [listResponse, countResponse] = await Promise.all([
        api.get("/notifications/"),
        api.get("/notifications/unread-count/"),
      ]);

      const data = listResponse.data;
      setItems(Array.isArray(data) ? data : data.results || []);
      setUnreadCount(countResponse.data.unread_count || 0);
      setError("");
    } catch {
      setError("Unable to load notifications.");
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    loadNotifications();

    const intervalId = window.setInterval(loadNotifications, 30000);

    return () => window.clearInterval(intervalId);
  }, [user, loadNotifications]);

  async function markAsRead(notification) {
    if (notification.is_read) return;

    try {
      await api.patch(`/notifications/${notification.id}/read/`);

      setItems((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      );

      setUnreadCount((current) => Math.max(0, current - 1));
    } catch {
      setError("Could not mark this notification as read.");
    }
  }

  async function markAllRead() {
    try {
      await api.post("/notifications/mark-all-read/");

      setItems((current) =>
        current.map((item) => ({ ...item, is_read: true }))
      );

      setUnreadCount(0);
      setError("");
    } catch {
      setError("Could not mark notifications as read.");
    }
  }

  if (!user) return null;

  return (
    <div className="notification-wrapper">
      <button
        type="button"
        className="notification-bell"
        onClick={() => {
          const nextOpen = !open;
          setOpen(nextOpen);
          if (nextOpen) loadNotifications();
        }}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section className="notification-panel">
          <div className="notification-panel-heading">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {error && <p className="dashboard-error">{error}</p>}

          {items.length === 0 ? (
            <p className="notification-empty">You're all caught up!</p>
          ) : (
            <div className="notification-list">
              {items.map((item) => (
                <article
                  className={`notification-item ${
                    item.is_read ? "read" : "unread"
                  }`}
                  key={item.id}
                >
                  <button
                    type="button"
                    className="notification-content"
                    onClick={() => markAsRead(item)}
                  >
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <time>
                      {new Date(item.created_at).toLocaleString()}
                    </time>
                  </button>

                  {item.order_id && (
                    <Link
                      to={
                        user.role === "farmer"
                          ? "/farmer-orders"
                          : "/orders"
                      }
                      onClick={() => {
                        setOpen(false);
                        markAsRead(item);
                      }}
                    >
                      View order #{item.order_id}
                    </Link>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
