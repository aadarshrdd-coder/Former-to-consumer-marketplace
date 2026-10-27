import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function Orders() {
  const { user } = useAuth();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const successMessage = location.state?.message;

  useEffect(() => {
    if (!user || user.role !== "customer") {
      setLoading(false);
      return;
    }

    api
      .get("/orders/my-orders/")
      .then((response) => {
        const data = response.data;
        setOrders(Array.isArray(data) ? data : data.results || []);
      })
      .catch(() => {
        setError("Unable to load orders. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <main className="container page">
        <h1>My Orders</h1>
        <p>Please log in to view your orders.</p>
        <Link to="/login" className="primary-button">
          Login
        </Link>
      </main>
    );
  }

  if (user.role !== "customer") {
    return (
      <main className="container page">
        <h1>Orders</h1>
        <p>Customer order history is available through a customer account.</p>
        <Link to="/" className="primary-button">
          Back to Home
        </Link>
      </main>
    );
  }

  return (
    <main className="container page orders-page">
      <h1>My Orders</h1>

      {successMessage && (
        <div className="order-success">
          <span className="success-icon">✓</span>
          <div>
            <h2>Order placed successfully!</h2>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading your orders...</p>}

      {!loading && !error && orders.length === 0 && (
        <div className="empty-cart">
          <h2>No orders yet</h2>
          <p>Your completed checkout orders will appear here.</p>
          <Link to="/" className="primary-button">
            Explore Products
          </Link>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="orders-list">
          {orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="order-header">
                <div>
                  <p className="order-label">ORDER NUMBER</p>
                  <h2>#{order.id}</h2>
                </div>

                <span
                  className={`order-status status-${order.status}`}
                >
                  {order.status}
                </span>
              </div>

              <div className="order-meta">
                <p>
                  <strong>Placed:</strong>{" "}
                  {new Date(order.created_at).toLocaleString()}
                </p>
                <p>
                  <strong>Payment:</strong>{" "}
                  {order.payment_method === "cod"
                    ? "Cash on Delivery"
                    : order.payment_method}
                </p>
                <p>
                  <strong>Delivery to:</strong> {order.full_name}
                </p>
                <p>{order.delivery_address}</p>
              </div>

              <div className="order-products">
                {(order.items || []).map((item) => (
                  <div className="order-product" key={item.id}>
                    <div>
                      <strong>{item.product_name}</strong>
                      <p>
                        {item.quantity} × ₹{item.price} / {item.unit}
                      </p>
                    </div>
                    <strong>
                      ₹{Number(item.subtotal).toFixed(2)}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="order-total">
                <span>Order total</span>
                <strong>
                  ₹{Number(order.total_amount).toFixed(2)}
                </strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default Orders;
