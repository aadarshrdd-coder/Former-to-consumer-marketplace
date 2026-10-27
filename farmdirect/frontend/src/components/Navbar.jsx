import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import Notifications from "./Notifications";

function Navbar() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        🌱 FarmDirect
      </Link>

      <div className="nav-links">
        <Link to="/">Home</Link>

        {user?.role === "customer" && (
          <Link to="/cart" className="cart-nav-link">
            Cart {cart.total_items > 0 && <span className="cart-badge">{cart.total_items}</span>}
          </Link>
        )}

        {user?.role === "farmer" && (
          <>
            <Link to="/farmer-dashboard">My Dashboard</Link>
            <Link to="/farmer-orders">Customer Orders</Link>
          </>
        )}

        {user && <Link to="/orders">My Orders</Link>}
        {user && <Link to="/profile">My Profile</Link>}
        {user?.is_staff && (
          <Link to="/admin-dashboard">Admin Dashboard</Link>
        )}
        {user && <Notifications />}

        {user ? (
          <div className="user-nav">
            <span className="user-greeting">
              👤 {user.username} <small>({user.role})</small>
            </span>
            <button type="button" onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="register-link">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
