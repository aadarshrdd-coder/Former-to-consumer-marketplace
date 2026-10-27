import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState({
    items: [],
    total_items: 0,
    cart_total: "0.00",
  });
  const [cartLoading, setCartLoading] = useState(false);

  async function refreshCart() {
    if (!user || user.role !== "customer") {
      setCart({
        items: [],
        total_items: 0,
        cart_total: "0.00",
      });
      return;
    }

    setCartLoading(true);

    try {
      const response = await api.get("/cart/");
      setCart(response.data);
    } finally {
      setCartLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === "customer") {
      refreshCart().catch(() => {});
    } else {
      setCart({
        items: [],
        total_items: 0,
        cart_total: "0.00",
      });
    }
  }, [user]);

  async function addToCart(productId, quantity = 1) {
    await api.post("/cart/add/", {
      product_id: productId,
      quantity,
    });

    await refreshCart();
  }

  async function addAllToCart(productIds = null, quantity = 1) {
    const payload = {};
    if (productIds && productIds.length > 0) {
      payload.product_ids = productIds;
    }
    if (quantity) {
      payload.quantity = quantity;
    }

    const response = await api.post("/cart/bulk-add/", payload);
    setCart({
      items: response.data.items,
      total_items: response.data.total_items,
      cart_total: response.data.cart_total,
    });
    return response.data;
  }

  async function updateQuantity(itemId, quantity) {
    await api.patch(`/cart/items/${itemId}/`, { quantity });
    await refreshCart();
  }

  async function removeFromCart(itemId) {
    await api.delete(`/cart/items/${itemId}/`);
    await refreshCart();
  }

  return (
    <CartContext.Provider
      value={{
        cart,
        cartLoading,
        refreshCart,
        addToCart,
        addAllToCart,
        updateQuantity,
        removeFromCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
