import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import "./Checkout.css";

function Checkout() {
  const { user } = useAuth();
  const { cart, refreshCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    delivery_address: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role !== "customer") {
      setError("Only customers can place orders.");
      return;
    }

    if (!cart.items || cart.items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/orders/checkout/", {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        delivery_address: form.delivery_address.trim(),
      });

      setSuccess("Your order was placed successfully.");

      await refreshCart();

      const orderId = response.data.id ?? response.data.order?.id;

      if (orderId) {
        navigate(`/orders/${orderId}`);
      } else {
        navigate("/orders");
      }
    } catch (err) {
      const data = err.response?.data;

      if (typeof data === "string") {
        setError(data);
      } else if (data) {
        setError(
          Object.entries(data)
            .map(([key, value]) =>
              `${key}: ${Array.isArray(value) ? value.join(", ") : value}`
            )
            .join(" | ")
        );
      } else {
        setError("Could not place your order. Check your backend connection.");
      }
    } finally {
      setLoading(false);
    }
  }

  const total = Number(cart.cart_total || 0);

  return (
    <main className="checkout-page">
      <div className="checkout-heading">
        <p className="checkout-eyebrow">FARM DIRECT TO YOUR DOOR</p>
        <h1>Checkout</h1>
        <p>Complete your delivery details to order directly from farmers.</p>
      </div>

      {error && <div className="checkout-message error">{error}</div>}
      {success && <div className="checkout-message success">{success}</div>}

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <h2>Delivery details</h2>

          <label htmlFor="full_name">Full name</label>
          <input
            id="full_name"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            placeholder="Enter your full name"
            required
            maxLength={150}
          />

          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="Enter your phone number"
            required
            maxLength={15}
          />

          <label htmlFor="delivery_address">Delivery address</label>
          <textarea
            id="delivery_address"
            name="delivery_address"
            value={form.delivery_address}
            onChange={handleChange}
            placeholder="House number, street, village/city, PIN code"
            rows={4}
            required
          />

          <div className="payment-option">
            <span className="payment-icon">₹</span>
            <div>
              <strong>Cash on Delivery</strong>
              <p>Pay when your order arrives.</p>
            </div>
          </div>

          <button
            className="place-order-button"
            type="submit"
            disabled={loading || !cart.items?.length}
          >
            {loading ? "Placing order..." : "Place order"}
          </button>

          <Link className="back-to-cart" to="/cart">
            ← Back to cart
          </Link>
        </form>

        <aside className="checkout-summary">
          <h2>Order summary</h2>

          {cart.items?.length ? (
            cart.items.map((item) => (
              <div className="checkout-item" key={item.id}>
                <div>
                  <strong>{item.product_name}</strong>
                  <p>
                    {item.quantity} × ₹{Number(item.product_price).toFixed(2)}
                  </p>
                </div>
                <strong>₹{Number(item.subtotal).toFixed(2)}</strong>
              </div>
            ))
          ) : (
            <p>Your cart is empty.</p>
          )}

          <div className="summary-total">
            <span>Total</span>
            <strong>₹{total.toFixed(2)}</strong>
          </div>

          <p className="checkout-note">
            Final stock availability and prices are checked by the server
            when you place your order.
          </p>
        </aside>
      </div>
    </main>
  );
}

export default Checkout;
