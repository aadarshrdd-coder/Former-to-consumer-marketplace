from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = (
        "id",
        "username",
        "email",
        "role",
        "phone",
        "is_staff",
        "is_active",
    )
    list_filter = ("role", "is_staff", "is_active")
    search_fields = ("username", "email", "phone")
    fieldsets = UserAdmin.fieldsets + (
        ("FarmDirect Information", {
            "fields": ("role", "phone", "address"),
        }),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("FarmDirect Information", {
            "fields": ("role", "phone", "address"),
        }),
    )
