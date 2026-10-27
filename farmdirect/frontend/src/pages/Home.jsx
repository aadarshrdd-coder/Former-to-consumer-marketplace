import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useNotification } from "../context/NotificationContext";

export default function Home() {
  const { user } = useAuth();
  const { addToCart, addAllToCart } = useCart();
  const { notify } = useNotification();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("default");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [addingId, setAddingId] = useState(null);
  const [bulkAdding, setBulkAdding] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await api.get("/products/");
        const data = response.data;
        setProducts(Array.isArray(data) ? data : data.results || []);
      } catch {
        setError("Unable to load products. Please check the server and try again.");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        product.name.toLowerCase().includes(query) ||
        (product.description || "").toLowerCase().includes(query) ||
        (product.farmer_name || "").toLowerCase().includes(query);

      const matchesCategory =
        category === "all" || product.category === category;

      const matchesStock = !inStockOnly || product.quantity > 0;

      return matchesSearch && matchesCategory && matchesStock;
    });

    if (sort === "price-low") {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sort === "price-high") {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sort === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "newest") {
      result.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    }

    return result;
  }, [products, search, category, sort, inStockOnly]);

  const inStockProducts = useMemo(() => {
    return filteredProducts.filter((product) => product.quantity > 0);
  }, [filteredProducts]);

  async function handleAddToCart(product) {
    setAddingId(product.id);

    try {
      await addToCart(product.id, 1);
      notify(`${product.name} added to your cart!`, "success");
    } catch (err) {
      notify(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Unable to add the product to your cart.",
        "error"
      );
    } finally {
      setAddingId(null);
    }
  }

  async function handleAddAllToCart() {
    if (!user) {
      notify("Please log in as a customer to add products to your cart.", "info");
      navigate("/login");
      return;
    }

    if (user.role !== "customer") {
      notify(
        "Farmer accounts cannot purchase items. Please log in with a customer account.",
        "warning"
      );
      return;
    }

    if (inStockProducts.length === 0) {
      notify("No in-stock products available to add.", "error");
      return;
    }

    setBulkAdding(true);
    try {
      const ids = inStockProducts.map((p) => p.id);
      const res = await addAllToCart(ids, 1);
      notify(
        res.message || `Successfully added ${inStockProducts.length} products to your cart!`,
        "success"
      );
    } catch (err) {
      notify(
        err.response?.data?.error ||
          err.response?.data?.detail ||
          "Unable to add all products to cart.",
        "error"
      );
    } finally {
      setBulkAdding(false);
    }
  }

  function getImageUrl(image) {
    if (!image) return "";

    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }

    return `http://127.0.0.1:8000${image.startsWith("/") ? "" : "/"}${image}`;
  }

  return (
    <main className="home-page">
      <section className="hero">
        <div className="hero-content">
          <span className="hero-label">FRESH FROM LOCAL FARMS</span>
          <h1>Healthy food, directly from farmers.</h1>
          <p>
            Discover fresh vegetables, seasonal fruits and grains
            from farmers, all in one place.
          </p>
          <a className="primary-button hero-button" href="#products">
            Explore Products
          </a>
        </div>
      </section>

      <section className="product-section page-container" id="products">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FARM FRESH MARKETPLACE</p>
            <h2>Explore Fresh Products</h2>
            <p>Find what you need from our available farm products.</p>
          </div>
          <div className="heading-actions">
            <span className="result-count">
              {filteredProducts.length} products
            </span>
            <button
              type="button"
              className="primary-button add-all-button"
              disabled={bulkAdding || inStockProducts.length === 0}
              onClick={handleAddAllToCart}
              title="Add all available products to your cart"
            >
              {bulkAdding ? (
                "Adding All..."
              ) : (
                <>
                  <span className="add-all-icon">🛒</span>
                  <span>Add All to Cart ({inStockProducts.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="product-filters">
          <div className="search-field">
            <label htmlFor="product-search">Search products</label>
            <input
              id="product-search"
              type="search"
              placeholder="Try tomatoes, apples, rice..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="filter-field">
            <label htmlFor="category-filter">Category</label>
            <select
              id="category-filter"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              <option value="vegetables">Vegetables</option>
              <option value="fruits">Fruits</option>
              <option value="grains">Grains</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="sort-filter">Sort by</label>
            <select
              id="sort-filter"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="default">Recommended</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
              <option value="newest">Newest first</option>
            </select>
          </div>

          <label className="stock-filter">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(event) => setInStockOnly(event.target.checked)}
            />
            In stock only
          </label>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setSearch("");
              setCategory("all");
              setSort("default");
              setInStockOnly(false);
            }}
          >
            Reset
          </button>
        </div>

        {loading ? (
          <p className="loading-message">Loading fresh products...</p>
        ) : error ? (
          <div className="empty-products">
            <p>{error}</p>
            <button
              className="secondary-button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-products">
            <h3>No products found</h3>
            <p>Try another search or change your filters.</p>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product) => {
              const isFarmer = user?.role === "farmer";
              const canAdd = user?.role === "customer";
              const imageUrl = getImageUrl(product.image);

              return (
                <article className="product-card" key={product.id}>
                  <div className="product-image">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        loading="lazy"
                      />
                    ) : (
                      <div className="product-placeholder">
                        <span>
                          {product.category === "vegetables"
                            ? "🥬"
                            : product.category === "fruits"
                            ? "🍎"
                            : product.category === "grains"
                            ? "🌾"
                            : "🧺"}
                        </span>
                      </div>
                    )}

                    <span className="category-tag">
                      {product.category}
                    </span>
                  </div>

                  <div className="product-info">
                    <p className="farmer-label">
                      Grown by {product.farmer_name || "Local farmer"}
                    </p>
                    <h3>{product.name}</h3>
                    <Link
                      to={`/products/${product.id}`}
                      className="view-details-link"
                    >
                      View Details →
                    </Link>

                    <p className="product-description">
                      {product.description || "Fresh farm product."}
                    </p>

                    <div className="product-price-row">
                      <div>
                        <strong>₹{Number(product.price).toFixed(2)}</strong>
                        <span> / {product.unit}</span>
                      </div>

                      <span
                        className={
                          product.quantity > 0
                            ? "stock-available"
                            : "stock-unavailable"
                        }
                      >
                        {product.quantity > 0
                          ? `${product.quantity} ${product.unit} left`
                          : "Out of stock"}
                      </span>
                    </div>

                    {canAdd && (
                      <button
                        className="primary-button add-cart-button"
                        disabled={
                          product.quantity <= 0 ||
                          addingId === product.id
                        }
                        onClick={() => handleAddToCart(product)}
                      >
                        {addingId === product.id
                          ? "Adding..."
                          : product.quantity <= 0
                          ? "Out of Stock"
                          : "Add to Cart"}
                      </button>
                    )}

                    {!user && (
                      <Link
                        className="primary-button add-cart-button"
                        to="/login"
                      >
                        Login to Buy
                      </Link>
                    )}

                    {isFarmer && (
                      <p className="farmer-own-products-note">
                        Manage your listings from your dashboard.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
