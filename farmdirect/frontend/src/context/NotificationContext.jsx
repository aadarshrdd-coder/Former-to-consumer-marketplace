import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [nextId, setNextId] = useState(1);

  const dismiss = useCallback((id) => {
    setNotifications((current) =>
      current.filter((item) => item.id !== id)
    );
  }, []);

  const notify = useCallback(
    (message, type = "success") => {
      const id = Date.now() + Math.random();

      setNotifications((current) => [
        ...current,
        { id, message, type },
      ]);

      setNextId((current) => current + 1);

      setTimeout(() => {
        dismiss(id);
      }, 4000);
    },
    [dismiss]
  );

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}

      <div
        className="notification-container"
        aria-live="polite"
        aria-atomic="false"
      >
        {notifications.map((item) => (
          <div
            className={`notification notification-${item.type}`}
            key={item.id}
            role={item.type === "error" ? "alert" : "status"}
          >
            <span>{item.message}</span>

            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotification must be used inside NotificationProvider"
    );
  }

  return context;
}
