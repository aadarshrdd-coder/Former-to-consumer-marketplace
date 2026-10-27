import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useNotification } from "../context/NotificationContext";

export default function ProductDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { notify } = useNotification();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/products/${id}/`);

        if (active) {
          setProduct(response.data);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.status === 404
              ? "This product could not be found."
              : "Unable to load this product. Please try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProduct();

    return () => {
      active = false;
    };
  }, [id]);

  function getImageUrl(image) {
    if (!image) return "";

    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }

    return `http://127.0.0.1:8000${image.startsWith("/") ? "" : "/"}${image}`;
  }

  async function handleAddToCart() {
    if (!user) {
      setError("Please log in to add products to your cart.");
      return;
    }

    if (user.role !== "customer") {
      setError("Only customer accounts can purchase products.");
      return;
    }

    if (!product || quantity < 1 || quantity > product.quantity) {
      setError("Please select a valid quantity.");
      return;
    }

    setAdding(true);
    setError("");
    setMessage("");

    try {
      await addToCart(product.id, quantity);
      setMessage(`${quantity} ${product.unit} of ${product.name} added to your cart.`);
      notify(`${quantity} ${product.unit} of ${product.name} added to your cart!`, "success");
    } catch (err) {
      const errDetail =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Unable to add this product. Please check the available stock.";
      setError(errDetail);
      notify(errDetail, "error");
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <main className="page-container product-detail-state">
        <p>Loading product details...</p>
      </main>
    );
  }

  if (error && !product) {
    return (
      <main className="page-container product-detail-state">
        <h2>Product unavailable</h2>
        <p>{error}</p>
        <Link className="primary-button" to="/">Back to Products</Link>
      </main>
    );
  }

  if (!product) return null;

  const imageUrl = getImageUrl(product.image);
  const available = Number(product.quantity) > 0;

  return (
    <main className="page-container product-detail-page">
      <Link to="/" className="back-link">
        ← Back to products
      </Link>

      <section className="product-detail-card">
        <div className="product-detail-image">
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} />
          ) : (
            <div className="detail-image-placeholder">
              {product.category === "vegetables"
                ? "🥬"
                : product.category === "fruits"
                ? "🍎"
                : product.category === "grains"
                ? "🌾"
                : "🧺"}
            </div>
          )}
        </div>

        <div className="product-detail-info">
          <span className="detail-category">
            {product.category}
          </span>

          <h1>{product.name}</h1>

          <p className="detail-farmer">
            Grown by <strong>{product.farmer_name || "Local farmer"}</strong>
          </p>

          <div className="detail-price">
            ₹{Number(product.price).toFixed(2)}
            <span> / {product.unit}</span>
          </div>

          <p className="detail-description">
            {product.description || "Fresh farm product, supplied directly by a local farmer."}
          </p>

          <p className={available ? "stock-available" : "stock-unavailable"}>
            {available
              ? `${product.quantity} ${product.unit} available`
              : "Currently out of stock"}
          </p>

          {product.created_at && (
            <p className="detail-date">
              Listed on {new Date(product.created_at).toLocaleDateString()}
            </p>
          )}

          {user?.role === "customer" && available && (
            <div className="quantity-selector">
              <label htmlFor="product-quantity">Quantity ({product.unit})</label>

              <div className="quantity-controls">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                >
                  −
                </button>

                <input
                  id="product-quantity"
                  type="number"
                  min="1"
                  max={product.quantity}
                  step="1"
                  value={quantity}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isInteger(value) && value >= 1) {
                      setQuantity(Math.min(value, Number(product.quantity)));
                    }
                  }}
                />

                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={quantity >= product.quantity}
                  onClick={() =>
                    setQuantity((current) =>
                      Math.min(Number(product.quantity), current + 1)
                    )
                  }
                >
                  +
                </button>
              </div>

              <p className="detail-subtotal">
                Subtotal: ₹{(Number(product.price) * quantity).toFixed(2)}
              </p>

              <button
                className="primary-button detail-cart-button"
                onClick={handleAddToCart}
                disabled={adding}
              >
                {adding ? "Adding..." : "Add to Cart"}
              </button>
            </div>
          )}

          {!user && (
            <Link className="primary-button detail-cart-button" to="/login">
              Login to Buy
            </Link>
          )}

          {user?.role === "farmer" && (
            <Link className="primary-button detail-cart-button" to="/farmer-dashboard">
              Manage Your Products
            </Link>
          )}

          {message && <p className="success-message" role="status">{message}</p>}
          {error && <p className="dashboard-error" role="alert">{error}</p>}

          <div className="detail-benefits">
            <p>🌱 Direct from local farmers</p>
            <p>🧺 Transparent product pricing</p>
            <p>🚚 Delivery address collected at checkout</p>
          </div>
        </div>
      </section>
    </main>
  );
}
