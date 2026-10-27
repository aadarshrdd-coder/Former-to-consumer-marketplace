from decimal import Decimal
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from products.models import Product
from .models import CartItem
from .serializers import CartItemSerializer

class CustomerOnly(IsAuthenticated):
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view)
            and getattr(request.user, "role", None) == "customer"
        )


class CartListView(APIView):
    permission_classes = [CustomerOnly]

    def get(self, request):
        items = CartItem.objects.filter(
            customer=request.user
        ).select_related("product")
        serializer = CartItemSerializer(items, many=True)
        total = sum(
            (item.total_price for item in items),
            Decimal("0.00"),
        )
        total_items = sum(item.quantity for item in items)
        return Response({
            "items": serializer.data,
            "total_items": total_items,
            "cart_total": f"{total:.2f}",
        }, status=status.HTTP_200_OK)


class CartAddView(APIView):
    permission_classes = [CustomerOnly]

    def post(self, request):
        product_id = request.data.get("product_id") or request.data.get("product")
        quantity = request.data.get("quantity", 1)

        if not product_id:
            return Response(
                {"error": "product_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            quantity = int(quantity)
        except (ValueError, TypeError):
            return Response(
                {"error": "Quantity must be a valid positive integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity <= 0:
            return Response(
                {"error": "Quantity must be greater than zero."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        product = get_object_or_404(Product, id=product_id)

        # Check stock
        if product.quantity < quantity:
            return Response(
                {"error": f"Only {product.quantity} units available in stock."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart_item, created = CartItem.objects.get_or_create(
            customer=request.user,
            product=product,
            defaults={"quantity": quantity},
        )

        if not created:
            new_qty = cart_item.quantity + quantity
            if product.quantity < new_qty:
                return Response(
                    {"error": f"Cannot add {quantity} more. Total in cart ({new_qty}) exceeds available stock ({product.quantity})."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            cart_item.quantity = new_qty
            cart_item.save()

        serializer = CartItemSerializer(cart_item)
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=status_code)


class CartBulkAddView(APIView):
    permission_classes = [CustomerOnly]

    def post(self, request):
        product_ids = request.data.get("product_ids")
        quantity = request.data.get("quantity", 1)

        try:
            quantity = int(quantity)
            if quantity <= 0:
                quantity = 1
        except (ValueError, TypeError):
            quantity = 1

        if product_ids and isinstance(product_ids, list):
            products = Product.objects.filter(id__in=product_ids, quantity__gt=0)
        else:
            products = Product.objects.filter(quantity__gt=0)

        added_or_updated = 0
        with transaction.atomic():
            for product in products:
                cart_item, created = CartItem.objects.get_or_create(
                    customer=request.user,
                    product=product,
                    defaults={"quantity": min(quantity, product.quantity)},
                )
                if created:
                    added_or_updated += 1
                else:
                    if cart_item.quantity < product.quantity:
                        new_qty = min(cart_item.quantity + quantity, product.quantity)
                        cart_item.quantity = new_qty
                        cart_item.save()
                        added_or_updated += 1

        items = CartItem.objects.filter(
            customer=request.user
        ).select_related("product")
        serializer = CartItemSerializer(items, many=True)
        total = sum(
            (item.total_price for item in items),
            Decimal("0.00"),
        )
        total_items = sum(item.quantity for item in items)

        return Response(
            {
                "message": f"Added {added_or_updated} product(s) to your cart.",
                "items": serializer.data,
                "total_items": total_items,
                "cart_total": f"{total:.2f}",
            },
            status=status.HTTP_200_OK,
        )


class CartItemDetailView(APIView):
    permission_classes = [CustomerOnly]

    def patch(self, request, pk):
        cart_item = get_object_or_404(CartItem, pk=pk, customer=request.user)
        quantity = request.data.get("quantity")

        if quantity is None:
            return Response(
                {"error": "quantity is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            quantity = int(quantity)
        except (ValueError, TypeError):
            return Response(
                {"error": "Quantity must be a valid positive integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity <= 0:
            cart_item.delete()
            return Response({"message": "Item removed from cart."}, status=status.HTTP_200_OK)

        if cart_item.product.quantity < quantity:
            return Response(
                {"error": f"Only {cart_item.product.quantity} units available in stock."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cart_item.quantity = quantity
        cart_item.save()
        serializer = CartItemSerializer(cart_item)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        cart_item = get_object_or_404(CartItem, pk=pk, customer=request.user)
        cart_item.delete()
        return Response({"message": "Item removed from cart."}, status=status.HTTP_200_OK)
