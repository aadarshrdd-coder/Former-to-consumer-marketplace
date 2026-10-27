from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from products.models import Product
from cart.models import CartItem
from orders.models import Order, OrderItem

class OrderAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.farmer = User.objects.create_user(
            username='order_farmer',
            email='order_farmer@example.com',
            password='Password123!',
            role='farmer'
        )

        self.customer = User.objects.create_user(
            username='order_customer',
            email='order_customer@example.com',
            password='Password123!',
            role='customer'
        )

        self.product = Product.objects.create(
            farmer=self.farmer,
            name='Farm Fresh Carrots',
            category='vegetables',
            description='Crunchy orange carrots',
            price=40.00,
            quantity=30,
            unit='kg'
        )

    def test_checkout_empty_cart_fails(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse('checkout')
        data = {
            "full_name": "Test Customer",
            "phone": "9876543210",
            "delivery_address": "Flat 101, Green Street"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_checkout_success_and_stock_reduction(self):
        self.client.force_authenticate(user=self.customer)

        # Add 5 kg carrots to cart
        CartItem.objects.create(
            customer=self.customer,
            product=self.product,
            quantity=5
        )

        url = reverse('checkout')
        data = {
            "full_name": "Test Customer",
            "phone": "9876543210",
            "delivery_address": "Flat 101, Green Street"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["total_amount"], "200.00")
        self.assertEqual(response.data["status"], "pending")
        self.assertEqual(len(response.data["items"]), 1)

        # Product stock reduced by 5
        self.product.refresh_from_db()
        self.assertEqual(self.product.quantity, 25)

        # Cart cleared
        self.assertEqual(CartItem.objects.filter(customer=self.customer).count(), 0)

        # View customer orders
        history_url = reverse('my-orders')
        history_res = self.client.get(history_url)
        self.assertEqual(history_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(history_res.data), 1)

    def test_farmer_status_update_and_cancellation_restores_stock(self):
        # Create order directly
        order = Order.objects.create(
            customer=self.customer,
            full_name="Customer",
            phone="999",
            delivery_address="Address",
            total_amount=120.00,
            status="pending"
        )
        OrderItem.objects.create(
            order=order,
            product=self.product,
            product_name=self.product.name,
            unit="kg",
            price=40.00,
            quantity=3,
            subtotal=120.00
        )
        # Farmer views orders
        self.client.force_authenticate(user=self.farmer)
        farmer_orders_url = reverse('farmer-orders')
        farmer_orders_res = self.client.get(farmer_orders_url)
        self.assertEqual(farmer_orders_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(farmer_orders_res.data), 1)

        # Farmer updates status to confirmed
        status_url = reverse('farmer-order-status', kwargs={'pk': order.id})
        patch_res = self.client.patch(status_url, {'status': 'confirmed'}, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data['status'], 'confirmed')

        # Farmer cancels order -> restores stock
        initial_stock = self.product.quantity
        cancel_res = self.client.patch(status_url, {'status': 'cancelled'}, format='json')
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.quantity, initial_stock + 3)
