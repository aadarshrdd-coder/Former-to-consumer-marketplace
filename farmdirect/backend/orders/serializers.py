from rest_framework import serializers
from .models import Order, OrderItem

class OrderItemSerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(
        source="product.farmer.username",
        read_only=True,
    )
    farmer_id = serializers.IntegerField(
        source="product.farmer.id",
        read_only=True,
    )

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_name",
            "farmer_name",
            "farmer_id",
            "unit",
            "price",
            "quantity",
            "subtotal",
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_username = serializers.CharField(
        source="customer.username",
        read_only=True,
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "customer",
            "customer_username",
            "full_name",
            "phone",
            "delivery_address",
            "total_amount",
            "status",
            "payment_method",
            "items",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "customer",
            "customer_username",
            "total_amount",
            "status",
            "created_at",
        ]


class CheckoutSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=15)
    delivery_address = serializers.CharField()
    payment_method = serializers.ChoiceField(
        choices=Order.PAYMENT_CHOICES,
        default="cod",
    )
