from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User

class AccountsAuthAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_farmer_registration(self):
        url = reverse('register')
        data = {
            "username": "farmer_step4",
            "email": "farmer_step4@example.com",
            "password": "FarmTest123!",
            "role": "farmer",
            "phone": "9876543210",
            "address": "Hyderabad, Telangana"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["username"], "farmer_step4")
        self.assertEqual(response.data["user"]["role"], "farmer")

    def test_customer_registration(self):
        url = reverse('register')
        data = {
            "username": "customer_step4",
            "email": "customer_step4@example.com",
            "password": "Customer123!",
            "role": "customer",
            "phone": "9123456780",
            "address": "Hyderabad, Telangana"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["role"], "customer")

    def test_login_and_profile_and_logout(self):
        # Register user
        user = User.objects.create_user(
            username="login_test_user",
            email="login_test@example.com",
            password="FarmTest123!",
            role="farmer",
            phone="9998887776",
            address="Village Farm"
        )

        # Login
        login_url = reverse('login')
        login_response = self.client.post(login_url, {
            "username": "login_test_user",
            "password": "FarmTest123!"
        }, format='json')
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn("token", login_response.data)
        token = login_response.data["token"]

        # Profile without token -> 401
        profile_url = reverse('profile')
        unauth_response = self.client.get(profile_url)
        self.assertEqual(unauth_response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Profile with token -> 200
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)
        auth_response = self.client.get(profile_url)
        self.assertEqual(auth_response.status_code, status.HTTP_200_OK)
        self.assertEqual(auth_response.data["username"], "login_test_user")

        # Logout
        logout_url = reverse('logout')
        logout_response = self.client.post(logout_url)
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)

        # Try profile again -> 401
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)
        after_logout = self.client.get(profile_url)
        self.assertEqual(after_logout.status_code, status.HTTP_401_UNAUTHORIZED)
