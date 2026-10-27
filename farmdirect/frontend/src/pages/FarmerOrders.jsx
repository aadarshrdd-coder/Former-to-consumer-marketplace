import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function getErrorMessage(error) {
  const data = error.response?.data;

  if (!data) {
    return "Could not connect to the server. Check that Django is running.";
  }

  if (typeof data === "string") return data;

  return Object.entries(data)
    .map(([key, value]) => {
      const message = Array.isArray(value) ? value.join(" ") : String(value);
      return `${key}: ${message}`;
    })
    .join(" ");
}

function getAvailableActions(status) {
  if (status === "pending") {
    return [
      { label: "Confirm Order", status: "confirmed" },
      { label: "Cancel Order", status: "cancelled" },
    ];
  }

  if (status === "confirmed") {
    return [
      { label: "Mark as Shipped", status: "shipped" },
      { label: "Cancel Order", status: "cancelled" },
    ];
  }

  if (status === "shipped") {
    return [{ label: "Mark as Delivered", status: "delivered" }];
  }

  return [];
}

export default function FarmerOrders() {
  const { user, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadOrders = useCallback(async () => {
    setError("");

    try {
      const response = await api.get("/orders/farmer/");
      const data = response.data;
      setOrders(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === "farmer") {
      loadOrders();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, user, loadOrders]);

  async function updateStatus(orderId, status) {
    const action = status === "cancelled" ? "cancel this order" : "update this order";
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;

    setUpdatingId(orderId);
    setError("");
    setMessage("");

    try {
      await api.patch(`/orders/farmer/${orderId}/status/`, { status });

      setMessage(`Order #${orderId} updated successfully.`);
      await loadOrders();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  if (authLoading) {
    return <main className="container page"><p>Checking account...</p></main>;
  }

  if (!user) {
    return (
      <main className="container page">
        <h2>Farmer Orders</h2>
        <p>Please log in to view your orders.</p>
      </main>
    );
  }

  if (user.role !== "farmer") {
    return (
      <main className="container page">
        <h2>Access Restricted</h2>
        <p>This page is available to farmer accounts only.</p>
      </main>
    );
  }

  return (
    <main className="container page farmer-orders-page">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">FARMER WORKSPACE</p>
          <h1>Customer Orders</h1>
          <p>Manage orders for products purchased from your farm.</p>
        </div>

        <button
          className="secondary-button"
          onClick={loadOrders}
          disabled={loading}
        >
          Refresh Orders
        </button>
      </div>

      <div className="orders-summary">
        <div className="dashboard-count">
          <span>Total orders</span>
          <strong>{orders.length}</strong>
        </div>
        <div className="dashboard-count">
          <span>Pending orders</span>
          <strong>
            {orders.filter((order) => order.status === "pending").length}
          </strong>
        </div>
        <div className="dashboard-count">
          <span>Completed orders</span>
          <strong>
            {orders.filter((order) => order.status === "delivered").length}
          </strong>
        </div>
      </div>

      {error && <p className="dashboard-error">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      {loading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <section className="empty-orders">
          <h2>No orders yet</h2>
          <p>Customer orders containing your products will appear here.</p>
        </section>
      ) : (
        <div className="farmer-orders-list">
          {orders.map((order) => {
            const items = order.items || [];

            return (
              <article className="farmer-order-card" key={order.id}>
                <div className="farmer-order-top">
                  <div>
                    <h2>Order #{order.id}</h2>
                    <p>
                      Placed:{" "}
                      {order.created_at
                        ? new Date(order.created_at).toLocaleString()
                        : "Date unavailable"}
                    </p>
                  </div>

                  <span className={`order-status status-${order.status}`}>
                    {String(order.status || "unknown").replaceAll("_", " ")}
                  </span>
                </div>

                <div className="farmer-customer-details">
                  <h3>Delivery details</h3>
                  <p><strong>Name:</strong> {order.full_name || "Not provided"}</p>
                  <p><strong>Phone:</strong> {order.phone || "Not provided"}</p>
                  <p>
                    <strong>Address:</strong>{" "}
                    {order.delivery_address || "Not provided"}
                  </p>
                  <p>
                    <strong>Payment:</strong>{" "}
                    {(order.payment_method || "cod").toUpperCase()}
                  </p>
                </div>

                <div className="farmer-order-items">
                  <h3>Products</h3>

                  {items.length === 0 ? (
                    <p>No product details returned by the API.</p>
                  ) : (
                    items.map((item) => (
                      <div className="farmer-order-item" key={item.id}>
                        <div>
                          <strong>{item.product_name}</strong>
                          <p>
                            {item.quantity} {item.unit} × ₹
                            {Number(item.price || 0).toFixed(2)}
                          </p>
                        </div>
                        <strong>
                          ₹{Number(item.subtotal || 0).toFixed(2)}
                        </strong>
                      </div>
                    ))
                  )}
                </div>

                <div className="farmer-order-bottom">
                  <div>
                    <span>Order total</span>
                    <strong>
                      ₹{Number(order.total_amount || 0).toFixed(2)}
                    </strong>
                  </div>

                  <div className="farmer-order-actions">
                    {getAvailableActions(order.status).map((action) => (
                      <button
                        key={action.status}
                        className={
                          action.status === "cancelled"
                            ? "danger-button"
                            : "primary-button"
                        }
                        disabled={updatingId === order.id}
                        onClick={() => updateStatus(order.id, action.status)}
                      >
                        {updatingId === order.id
                          ? "Updating..."
                          : action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
