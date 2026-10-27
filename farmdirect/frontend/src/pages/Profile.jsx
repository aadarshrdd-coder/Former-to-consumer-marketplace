import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const { notify } = useNotification();

  const [form, setForm] = useState({
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadProfile() {
      try {
        const response = await api.get("/accounts/profile/");

        if (active) {
          setForm({
            phone: response.data.phone || "",
            address: response.data.address || "",
          });
        }
      } catch {
        if (active) {
          setError("Unable to load your profile. Please try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (form.phone && !/^[0-9+\-\s()]{7,15}$/.test(form.phone)) {
      setError("Please enter a valid phone number.");
      return;
    }

    setSaving(true);

    try {
      await api.patch("/accounts/profile/", form);
      setMessage("Your profile was updated successfully.");
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.detail ||
          "Unable to save your profile. Please check your details and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordForm.old_password || !passwordForm.new_password) {
      setPasswordError("Please enter both current and new password.");
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    if (passwordForm.old_password === passwordForm.new_password) {
      setPasswordError("New password cannot be the same as your current password.");
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await api.post("/accounts/change-password/", passwordForm);
      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
      }
      setPasswordSuccess(response.data.message || "Password changed successfully!");
      notify("Your password was updated successfully!", "success");
      setPasswordForm({
        old_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err) {
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Failed to change password. Please check your current password.";
      setPasswordError(errMsg);
      notify(errMsg, "error");
    } finally {
      setPasswordSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="page-container profile-page">
        <p>Loading your profile...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="page-container profile-page">
        <h1>My Profile</h1>
        <p>Please log in to view your profile.</p>
        <Link className="primary-button" to="/login">
          Go to Login
        </Link>
      </main>
    );
  }

  return (
    <main className="page-container profile-page">
      <section className="profile-card">
        <div className="profile-heading">
          <div className="profile-avatar">
            {(user.username || "U").charAt(0).toUpperCase()}
          </div>

          <div>
            <p className="eyebrow">ACCOUNT SETTINGS</p>
            <h1>My Profile</h1>
            <p>Manage your contact and delivery information.</p>
          </div>
        </div>

        <div className="profile-readonly">
          <div>
            <span>Username</span>
            <strong>{user.username}</strong>
          </div>

          <div>
            <span>Email</span>
            <strong>{user.email || "Not provided"}</strong>
          </div>

          <div>
            <span>Account type</span>
            <strong>{user.role}</strong>
          </div>
        </div>

        {error && (
          <p className="dashboard-error" role="alert">
            {error}
          </p>
        )}

        {message && (
          <p className="success-message" role="status">
            {message}
          </p>
        )}

        <form className="profile-form" onSubmit={handleSubmit}>
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            maxLength={15}
            value={form.phone}
            onChange={handleChange}
            placeholder="Enter your phone number"
          />

          <label htmlFor="address">Delivery address</label>
          <textarea
            id="address"
            name="address"
            rows={4}
            maxLength={1000}
            value={form.address}
            onChange={handleChange}
            placeholder="House number, street, village or city, PIN code"
          />

          <button
            type="submit"
            className="primary-button profile-save-button"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>

        <hr className="profile-divider" />

        <div className="profile-section-heading">
          <h2>Change Password</h2>
          <p>Update your credentials to keep your account secure.</p>
        </div>

        {passwordError && (
          <p className="dashboard-error" role="alert">
            {passwordError}
          </p>
        )}

        {passwordSuccess && (
          <p className="success-message" role="status">
            {passwordSuccess}
          </p>
        )}

        <form className="profile-form password-form" onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label htmlFor="old_password">Current Password</label>
            <input
              id="old_password"
              name="old_password"
              type={showPasswords ? "text" : "password"}
              required
              value={passwordForm.old_password}
              onChange={handlePasswordChange}
              placeholder="Enter current password"
              autoComplete="current-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="new_password">New Password (min 8 characters)</label>
            <input
              id="new_password"
              name="new_password"
              type={showPasswords ? "text" : "password"}
              required
              minLength={8}
              value={passwordForm.new_password}
              onChange={handlePasswordChange}
              placeholder="Enter new password"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm_password">Confirm New Password</label>
            <input
              id="confirm_password"
              name="confirm_password"
              type={showPasswords ? "text" : "password"}
              required
              minLength={8}
              value={passwordForm.confirm_password}
              onChange={handlePasswordChange}
              placeholder="Re-enter new password"
              autoComplete="new-password"
            />
          </div>

          <label className="show-password-toggle">
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
            />
            Show passwords
          </label>

          <button
            type="submit"
            className="secondary-button password-submit-button"
            disabled={passwordSaving}
          >
            {passwordSaving ? "Updating Password..." : "Update Password"}
          </button>
        </form>

        <div className="profile-links">
          <Link to="/orders">View My Orders →</Link>
          {user.role === "farmer" && (
            <Link to="/farmer-dashboard">My Farmer Dashboard →</Link>
          )}
        </div>
      </section>
    </main>
  );
}
