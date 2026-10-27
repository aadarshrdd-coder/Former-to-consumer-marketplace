from django.urls import path
from .views import (
    CartListView,
    CartAddView,
    CartBulkAddView,
    CartItemDetailView,
)

urlpatterns = [
    path("", CartListView.as_view(), name="cart-list"),
    path("add/", CartAddView.as_view(), name="cart-add"),
    path("bulk-add/", CartBulkAddView.as_view(), name="cart-bulk-add"),
    path(
        "items/<int:pk>/",
        CartItemDetailView.as_view(),
        name="cart-item-detail",
    ),
]
