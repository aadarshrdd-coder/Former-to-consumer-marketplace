import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

function Cart() {
  const { user } = useAuth();
  const {
    cart,
    cartLoading,
    updateQuantity,
    removeFromCart,
  } = useCart();

  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function changeQuantity(item, quantity) {
    if (quantity < 1) return;

    setError("");
    setBusyId(item.id);

    try {
      await updateQuantity(item.id, quantity);
    } catch (err) {
      const data = err.response?.data;
      const detail = data?.error || data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : "Unable to update the quantity."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(itemId) {
    setError("");
    setBusyId(itemId);

    try {
      await removeFromCart(itemId);
    } catch {
      setError("Unable to remove this item. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (!user) {
    return (
      <main className="container page">
        <h1>Your Shopping Cart</h1>
        <p>Please log in to view your cart.</p>
        <Link to="/login" className="primary-button">
          Login
        </Link>
      </main>
    );
  }

  if (user.role !== "customer") {
    return (
      <main className="container page">
        <h1>Your Shopping Cart</h1>
        <p>Shopping carts are available for customer accounts.</p>
        <Link to="/" className="primary-button">
          Browse Products
        </Link>
      </main>
    );
  }

  return (
    <main className="container page cart-page">
      <h1>Your Shopping Cart</h1>
      <p className="cart-subtitle">
        Fresh produce, directly from your farmers.
      </p>

      {error && <p className="error">{error}</p>}

      {cartLoading ? (
        <p>Loading your cart...</p>
      ) : cart.items.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">🧺</div>
          <h2>Your cart is empty</h2>
          <p>Explore fresh products and add something you love.</p>
          <Link to="/" className="primary-button">
            Browse Products
          </Link>
        </div>
      ) : (
        <>
          <div className="cart-layout">
            <section className="cart-items">
              {cart.items.map((item) => (
                <article className="cart-item" key={item.id}>
                  <div className="cart-item-icon">🌱</div>

                  <div className="cart-item-details">
                    <h3>{item.product_name}</h3>
                    <p>
                      ₹{item.product_price} / {item.product_unit}
                    </p>

                    <div className="quantity-controls">
                      <button
                        type="button"
                        aria-label={`Decrease ${item.product_name} quantity`}
                        disabled={
                          item.quantity <= 1 || busyId === item.id
                        }
                        onClick={() =>
                          changeQuantity(item, item.quantity - 1)
                        }
                      >
                        −
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        type="button"
                        aria-label={`Increase ${item.product_name} quantity`}
                        disabled={busyId === item.id}
                        onClick={() =>
                          changeQuantity(item, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="remove-button"
                      disabled={busyId === item.id}
                      onClick={() => handleRemove(item.id)}
                    >
                      {busyId === item.id ? "Updating..." : "Remove"}
                    </button>
                  </div>

                  <strong className="cart-item-subtotal">
                    ₹{Number(item.subtotal).toFixed(2)}
                  </strong>
                </article>
              ))}
            </section>

            <aside className="cart-summary">
              <h2>Order Summary</h2>

              <div className="summary-line">
                <span>Total quantity</span>
                <span>{cart.total_items}</span>
              </div>

              <div className="summary-line summary-total">
                <span>Subtotal</span>
                <span>₹{Number(cart.cart_total).toFixed(2)}</span>
              </div>

              <p className="summary-note">
                Delivery charges, if any, are not included.
              </p>

              <Link
                to="/checkout"
                className="checkout-button"
              >
                Proceed to Checkout →
              </Link>
            </aside>
          </div>

          <Link to="/" className="continue-shopping">
            ← Continue Shopping
          </Link>
        </>
      )}
    </main>
  );
}

export default Cart;
