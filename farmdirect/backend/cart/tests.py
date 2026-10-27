from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from products.models import Product
from cart.models import CartItem

class CartAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.farmer = User.objects.create_user(
            username='cart_farmer',
            email='cart_farmer@example.com',
            password='Password123!',
            role='farmer'
        )

        self.customer = User.objects.create_user(
            username='cart_customer',
            email='cart_customer@example.com',
            password='Password123!',
            role='customer'
        )

        self.product = Product.objects.create(
            farmer=self.farmer,
            name='Fresh Organic Tomatoes',
            category='vegetables',
            description='Juicy red tomatoes',
            price=30.00,
            quantity=50,
            unit='kg'
        )

    def test_unauthenticated_cart_access_denied(self):
        url = reverse('cart-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_farmer_cannot_access_customer_cart(self):
        self.client.force_authenticate(user=self.farmer)
        url = reverse('cart-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_view_empty_cart(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse('cart-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_items'], 0)
        self.assertEqual(response.data['cart_total'], '0.00')
        self.assertEqual(len(response.data['items']), 0)

    def test_customer_add_product_to_cart(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse('cart-add')
        data = {
            'product_id': self.product.id,
            'quantity': 3
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['quantity'], 3)
        self.assertEqual(response.data['subtotal'], '90.00')

        # Add more of the same product -> increments quantity
        response2 = self.client.post(url, {'product_id': self.product.id, 'quantity': 2}, format='json')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.data['quantity'], 5)
        self.assertEqual(response2.data['subtotal'], '150.00')

    def test_customer_update_quantity_and_delete(self):
        self.client.force_authenticate(user=self.customer)
        item = CartItem.objects.create(
            customer=self.customer,
            product=self.product,
            quantity=2
        )
        url = reverse('cart-item-detail', kwargs={'pk': item.id})

        # Update quantity
        patch_res = self.client.patch(url, {'quantity': 7}, format='json')
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data['quantity'], 7)

        # Delete item
        del_res = self.client.delete(url)
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)
        self.assertEqual(CartItem.objects.filter(id=item.id).count(), 0)
