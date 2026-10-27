from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "category",
        "farmer",
        "price",
        "quantity",
        "unit",
        "created_at",
    )
    list_filter = ("category", "created_at")
    search_fields = ("name", "farmer__username")
    readonly_fields = ("created_at",)
