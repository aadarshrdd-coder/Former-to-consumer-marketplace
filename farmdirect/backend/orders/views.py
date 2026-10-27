from decimal import Decimal
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from products.models import Product
from cart.models import CartItem
from notifications.utils import create_notification
from .models import Order, OrderItem
from .serializers import OrderSerializer, CheckoutSerializer

User = get_user_model()

class CustomerOnly(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view)
            and getattr(request.user, "role", None) == "customer"
        )


class FarmerOnly(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view)
            and getattr(request.user, "role", None) == "farmer"
        )


class CheckoutView(APIView):
    permission_classes = [CustomerOnly]

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        cart_items = CartItem.objects.filter(
            customer=request.user
        ).select_related("product")

        if not cart_items.exists():
            return Response(
                {"error": "Your cart is empty. Add products before placing an order."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Validate stock and calculate total with database locks
            total_amount = Decimal("0.00")
            product_updates = []

            for item in cart_items:
                product = Product.objects.select_for_update().get(pk=item.product_id)
                if product.quantity < item.quantity:
                    return Response(
                        {
                            "error": (
                                f"Insufficient stock for '{product.name}'. "
                                f"Requested: {item.quantity}, Available: {product.quantity}."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                subtotal = product.price * item.quantity
                total_amount += subtotal
                product_updates.append((product, item.quantity, subtotal))

            # Create the order
            order = Order.objects.create(
                customer=request.user,
                full_name=data["full_name"],
                phone=data["phone"],
                delivery_address=data["delivery_address"],
                total_amount=total_amount,
                payment_method=data.get("payment_method", "cod"),
                status="pending",
            )

            # Create order item snapshots & decrement stock
            for product, quantity, subtotal in product_updates:
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    product_name=product.name,
                    unit=product.unit,
                    price=product.price,
                    quantity=quantity,
                    subtotal=subtotal,
                )
                product.quantity -= quantity
                product.save(update_fields=["quantity"])

            # Notify the customer.
            create_notification(
                recipient=request.user,
                title="Order placed successfully",
                message=f"Your order #{order.id} has been placed.",
                order_id=order.id,
            )

            # Notify every farmer whose products are in this order.
            farmer_ids = set(
                item.product.farmer_id for item in cart_items
            )
            for farmer_id in farmer_ids:
                farmer = User.objects.get(pk=farmer_id)
                create_notification(
                    recipient=farmer,
                    title="New customer order",
                    message=f"Order #{order.id} contains products from your farm.",
                    order_id=order.id,
                )

            # Clear cart
            cart_items.delete()

        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


class CustomerOrderListView(APIView):
    permission_classes = [CustomerOnly]

    def get(self, request):
        orders = Order.objects.filter(
            customer=request.user
        ).prefetch_related("items", "items__product", "items__product__farmer").order_by("-created_at")
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CustomerOrderDetailView(APIView):
    permission_classes = [CustomerOnly]

    def get(self, request, pk):
        order = get_object_or_404(
            Order.objects.prefetch_related("items", "items__product", "items__product__farmer"),
            pk=pk,
            customer=request.user,
        )
        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FarmerOrderListView(APIView):
    permission_classes = [FarmerOnly]

    def get(self, request):
        orders = Order.objects.filter(
            items__product__farmer=request.user
        ).distinct().prefetch_related(
            "items", "items__product", "items__product__farmer"
        ).order_by("-created_at")
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FarmerOrderStatusView(APIView):
    permission_classes = [FarmerOnly]

    def patch(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        items = order.items.all().select_related("product")

        # Verify that this order contains products from this farmer
        farmer_items = [item for item in items if item.product.farmer_id == request.user.id]
        if not farmer_items:
            return Response(
                {"error": "You do not have products in this order."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # For simplicity, verify that all items belong to this farmer for order-level status change
        if len(farmer_items) != len(items):
            return Response(
                {"error": "This order contains items from multiple farmers. Partial order fulfillment is not supported."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_status = request.data.get("status")
        allowed_transitions = {
            "pending": {"confirmed", "cancelled"},
            "confirmed": {"shipped", "cancelled"},
            "shipped": {"delivered"},
            "delivered": set(),
            "cancelled": set(),
        }

        if new_status not in allowed_transitions:
            return Response(
                {"error": "Invalid order status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_status not in allowed_transitions[order.status]:
            return Response(
                {
                    "error": (
                        f"Cannot change status from "
                        f"{order.status} to {new_status}."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Restore stock when a pending or confirmed order is cancelled
        with transaction.atomic():
            if new_status == "cancelled":
                for item in items:
                    product = Product.objects.select_for_update().get(
                        pk=item.product_id
                    )
                    product.quantity += item.quantity
                    product.save(update_fields=["quantity"])

            order.status = new_status
            order.save(update_fields=["status"])

            create_notification(
                recipient=order.customer,
                title="Order status updated",
                message=f"Your order #{order.id} is now {order.status}.",
                order_id=order.id,
            )

        return Response({
            "message": "Order status updated.",
            "order_id": order.id,
            "status": order.status,
        }, status=status.HTTP_200_OK)
