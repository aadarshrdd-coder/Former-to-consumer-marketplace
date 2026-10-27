from rest_framework import serializers
from .models import CartItem

class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
    )
    product_price = serializers.DecimalField(
        source="product.price",
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    product_unit = serializers.CharField(
        source="product.unit",
        read_only=True,
    )
    product_image = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_price",
            "product_unit",
            "product_image",
            "quantity",
            "subtotal",
            "added_at",
        ]
        read_only_fields = [
            "id",
            "product_name",
            "product_price",
            "product_unit",
            "product_image",
            "subtotal",
            "added_at",
        ]

    def get_product_image(self, obj):
        if obj.product.image:
            return obj.product.image.url
        return None

    def get_subtotal(self, obj):
        return f"{obj.total_price:.2f}"
