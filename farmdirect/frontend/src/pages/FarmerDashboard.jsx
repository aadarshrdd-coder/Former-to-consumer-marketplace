import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";

const initialForm = {
  name: "",
  category: "vegetables",
  description: "",
  price: "",
  quantity: "",
  unit: "kg",
  image: null,
};

function FarmerDashboard() {
  const { user } = useAuth();
  const { notify } = useNotification();

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/products/");
      const data = response.data;
      const allProducts = Array.isArray(data)
        ? data
        : data.results || [];

      // Show only products owned by the logged-in farmer.
      setProducts(
        allProducts.filter(
          (product) => String(product.farmer) === String(user?.id)
        )
      );
    } catch {
      setError("Unable to load products. Check your Django server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === "farmer") {
      loadProducts();
    } else {
      setLoading(false);
    }
  }, [user]);

  function handleChange(event) {
    const { name, value, files } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: name === "image" ? files?.[0] || null : value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function startEditing(product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      description: product.description || "",
      price: String(product.price),
      quantity: String(product.quantity),
      unit: product.unit || "kg",
      image: null,
    });

    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (Number(form.price) <= 0) {
      setError("Price must be greater than zero.");
      return;
    }

    if (
      form.quantity === "" ||
      !Number.isInteger(Number(form.quantity)) ||
      Number(form.quantity) < 0
    ) {
      setError("Quantity must be a whole number of zero or more.");
      return;
    }

    const payload = new FormData();
    payload.append("name", form.name.trim());
    payload.append("category", form.category);
    payload.append("description", form.description);
    payload.append("price", form.price);
    payload.append("quantity", form.quantity);
    payload.append("unit", form.unit.trim() || "kg");

    if (form.image) {
      payload.append("image", form.image);
    }

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.patch(`/products/${editingId}/`, payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setMessage("Product updated successfully.");
      } else {
        await api.post("/products/", payload, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setMessage("Product added successfully.");
      }

      notify(
        editingId
          ? "Product updated successfully!"
          : "Product added successfully!",
        "success"
      );

      resetForm();
      await loadProducts();
    } catch (err) {
      const data = err.response?.data;

      if (data && typeof data === "object") {
        const errorDetail = Object.entries(data)
          .map(([field, value]) => {
            const detail = Array.isArray(value)
              ? value.join(", ")
              : String(value);
            return `${field}: ${detail}`;
          })
          .join(" | ");
        setError(errorDetail);
        notify(errorDetail, "error");
      } else {
        setError("Unable to save product. Please try again.");
        notify(
          err.response?.data?.detail ||
            "Something went wrong. Please try again.",
          "error"
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setDeletingId(product.id);

    try {
      await api.delete(`/products/${product.id}/`);
      setProducts((previous) =>
        previous.filter((item) => item.id !== product.id)
      );

      if (editingId === product.id) {
        resetForm();
      }

      setMessage("Product deleted successfully.");
      notify("Product deleted successfully!", "success");
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        "Unable to delete this product. It may be linked to an existing order.";

      setError(detail);
      notify(
        err.response?.data?.detail ||
          "Something went wrong. Please try again.",
        "error"
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (!user) {
    return (
      <main className="container page">
        <h1>Farmer Dashboard</h1>
        <p>Please log in with your farmer account.</p>
      </main>
    );
  }

  if (user.role !== "farmer") {
    return (
      <main className="container page">
        <h1>Farmer Dashboard</h1>
        <p>This page is only available to farmer accounts.</p>
      </main>
    );
  }

  return (
    <main className="container page farmer-dashboard">
      <section className="dashboard-heading">
        <div>
          <p className="eyebrow">FARMDIRECT SELLER CENTER</p>
          <h1>Farmer Dashboard</h1>
          <p>Manage your produce and keep your stock up to date.</p>
        </div>

        <div className="dashboard-count">
          <span>Your products</span>
          <strong>{products.length}</strong>
        </div>
      </section>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error dashboard-error">{error}</p>}

      <section className="farmer-form-card">
        <h2>{editingId !== null ? "Edit Product" : "Add a Product"}</h2>

        <form className="farmer-form" onSubmit={handleSubmit}>
          <div className="farmer-form-grid">
            <div>
              <label htmlFor="name">Product name</label>
              <input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                maxLength={150}
                placeholder="e.g. Fresh Tomatoes"
              />
            </div>

            <div>
              <label htmlFor="category">Category</label>
              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
              >
                <option value="vegetables">Vegetables</option>
                <option value="fruits">Fruits</option>
                <option value="grains">Grains</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="price">Price (₹ per unit)</label>
              <input
                id="price"
                name="price"
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="quantity">Available quantity</label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                step="1"
                value={form.quantity}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label htmlFor="unit">Unit</label>
              <select
                id="unit"
                name="unit"
                value={form.unit}
                onChange={handleChange}
              >
                <option value="kg">Kilogram (kg)</option>
                <option value="gram">Gram</option>
                <option value="piece">Piece</option>
                <option value="dozen">Dozen</option>
                <option value="litre">Litre</option>
                <option value="bag">Bag</option>
              </select>
            </div>

            <div>
              <label htmlFor="image">Product image (optional)</label>
              <input
                id="image"
                name="image"
                type="file"
                accept="image/*"
                onChange={handleChange}
              />
              {editingId !== null && (
                <small>Leave empty to keep the existing image.</small>
              )}
            </div>
          </div>

          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={form.description}
            onChange={handleChange}
            placeholder="Describe your product..."
          />

          <div className="farmer-form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId !== null
                  ? "Save Changes"
                  : "Add Product"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="my-products-section">
        <div className="section-heading">
          <h2>My Products</h2>
          <button
            type="button"
            className="secondary-button"
            onClick={loadProducts}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading && <p>Loading your products...</p>}

        {!loading && products.length === 0 && (
          <div className="empty-cart">
            <div className="empty-cart-icon">🌾</div>
            <h2>No products listed yet</h2>
            <p>Use the form above to list your first farm product.</p>
          </div>
        )}

        <div className="farmer-product-grid">
          {products.map((product) => (
            <article className="farmer-product-card" key={product.id}>
              {product.image ? (
                <img
                  src={
                    product.image.startsWith("http")
                      ? product.image
                      : `http://127.0.0.1:8000${product.image}`
                  }
                  alt={product.name}
                />
              ) : (
                <div className="farmer-product-placeholder">🌱</div>
              )}

              <div className="farmer-product-info">
                <span className="category">{product.category}</span>
                <h3>{product.name}</h3>
                <p className="price">
                  ₹{product.price} / {product.unit}
                </p>
                <p className="stock">
                  Stock: {product.quantity} {product.unit}
                </p>

                <div className="farmer-product-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => startEditing(product)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="danger-button"
                    disabled={deletingId === product.id}
                    onClick={() => handleDelete(product)}
                  >
                    {deletingId === product.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default FarmerDashboard;
