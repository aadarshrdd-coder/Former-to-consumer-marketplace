from django.contrib.auth import get_user_model
from django.db.models import Sum
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from products.models import Product
from orders.models import Order

User = get_user_model()


class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        users_by_role = {
            "farmers": User.objects.filter(role="farmer").count(),
            "customers": User.objects.filter(role="customer").count(),
        }
        orders_by_status = {
            "pending": Order.objects.filter(status="pending").count(),
            "confirmed": Order.objects.filter(status="confirmed").count(),
            "shipped": Order.objects.filter(status="shipped").count(),
            "delivered": Order.objects.filter(status="delivered").count(),
            "cancelled": Order.objects.filter(status="cancelled").count(),
        }
        completed_revenue = (
            Order.objects.filter(status="delivered")
            .aggregate(total=Sum("total_amount"))["total"] or 0
        )

        return Response({
            "total_users": User.objects.count(),
            "farmers": users_by_role["farmers"],
            "customers": users_by_role["customers"],
            "total_products": Product.objects.count(),
            "available_products": Product.objects.filter(quantity__gt=0).count(),
            "total_orders": Order.objects.count(),
            "orders_by_status": orders_by_status,
            "delivered_order_revenue": completed_revenue,
        })
