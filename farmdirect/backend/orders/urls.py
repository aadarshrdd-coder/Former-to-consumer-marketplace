from django.urls import path
from .views import (
    CheckoutView,
    CustomerOrderListView,
    CustomerOrderDetailView,
    FarmerOrderListView,
    FarmerOrderStatusView,
)

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="checkout"),
    path("my-orders/", CustomerOrderListView.as_view(), name="my-orders"),
    path(
        "my-orders/<int:pk>/",
        CustomerOrderDetailView.as_view(),
        name="my-order-detail",
    ),
    path("farmer/", FarmerOrderListView.as_view(), name="farmer-orders"),
    path(
        "farmer/<int:pk>/status/",
        FarmerOrderStatusView.as_view(),
        name="farmer-order-status",
    ),
]
