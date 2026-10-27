from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Notification
from .utils import create_notification

User = get_user_model()


class NotificationAPITests(APITestCase):
    def setUp(self):
        self.customer = User.objects.create_user(
            username="cust_notif_test",
            email="cust@test.com",
            password="password123",
            role="customer",
        )
        self.farmer = User.objects.create_user(
            username="farmer_notif_test",
            email="farmer@test.com",
            password="password123",
            role="farmer",
        )
        self.notif1 = create_notification(
            recipient=self.customer,
            title="Order placed",
            message="Your order #1 has been placed.",
            order_id=1,
        )
        self.notif2 = create_notification(
            recipient=self.customer,
            title="Order confirmed",
            message="Your order #1 is now confirmed.",
            order_id=1,
        )
        self.farmer_notif = create_notification(
            recipient=self.farmer,
            title="New order",
            message="Order #1 contains products from your farm.",
            order_id=1,
        )

    def test_anonymous_user_blocked(self):
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_notifications_isolated_by_recipient(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        titles = [item["title"] for item in response.data]
        self.assertIn("Order placed", titles)
        self.assertIn("Order confirmed", titles)
        self.assertNotIn("New order", titles)

    def test_unread_count(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.get("/api/notifications/unread-count/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unread_count"], 2)

    def test_mark_single_notification_read(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.patch(f"/api/notifications/{self.notif1.id}/read/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_read"])

        count_res = self.client.get("/api/notifications/unread-count/")
        self.assertEqual(count_res.data["unread_count"], 1)

    def test_cannot_mark_other_user_notification_read(self):
        self.client.force_authenticate(user=self.farmer)
        response = self.client.patch(f"/api/notifications/{self.notif1.id}/read/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_mark_all_read(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.post("/api/notifications/mark-all-read/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        count_res = self.client.get("/api/notifications/unread-count/")
        self.assertEqual(count_res.data["unread_count"], 0)

        # Farmer notifications should remain unread
        self.farmer_notif.refresh_from_db()
        self.assertFalse(self.farmer_notif.is_read)
