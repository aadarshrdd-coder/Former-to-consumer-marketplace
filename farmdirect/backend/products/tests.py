from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from products.models import Product

class ProductAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.farmer = User.objects.create_user(
            username='farmer_test',
            email='farmer_test@example.com',
            password='Password123!',
            role='farmer'
        )
        self.customer = User.objects.create_user(
            username='customer_test',
            email='customer_test@example.com',
            password='Password123!',
            role='customer'
        )

    def test_list_products_public(self):
        url = reverse('product-list-create')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_create_rejected(self):
        url = reverse('product-list-create')
        data = {
            'name': 'Fresh Tomatoes',
            'category': 'vegetables',
            'description': 'Farm fresh',
            'price': '30.00',
            'quantity': 100,
            'unit': 'kg'
        }
        response = self.client.post(url, data, format='json')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_customer_cannot_create_product(self):
        self.client.force_authenticate(user=self.customer)
        url = reverse('product-list-create')
        data = {
            'name': 'Fresh Apples',
            'category': 'fruits',
            'description': 'Crisp apples',
            'price': '80.00',
            'quantity': 50,
            'unit': 'kg'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_farmer_can_create_product(self):
        self.client.force_authenticate(user=self.farmer)
        url = reverse('product-list-create')
        data = {
            'name': 'Organic Basmati Rice',
            'category': 'grains',
            'description': 'Aromatic long grain',
            'price': '95.00',
            'quantity': 200,
            'unit': 'kg'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Organic Basmati Rice')
        self.assertEqual(response.data['farmer_name'], 'farmer_test')
        self.assertEqual(Product.objects.count(), 1)

    def test_price_must_be_positive(self):
        self.client.force_authenticate(user=self.farmer)
        url = reverse('product-list-create')
        data = {
            'name': 'Invalid Product',
            'category': 'vegetables',
            'price': '0.00',
            'quantity': 10,
            'unit': 'kg'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('price', response.data)
