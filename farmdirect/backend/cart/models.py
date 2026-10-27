from django.db import models
from django.conf import settings
from products.models import Product

class CartItem(models.Model):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cart_items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="cart_items",
    )
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["customer", "product"],
                name="unique_customer_cart_product",
            )
        ]

    def __str__(self):
        return f"{self.customer.username} - {self.product.name}"

    @property
    def total_price(self):
        return self.product.price * self.quantity
