from .models import Notification


def create_notification(recipient, title, message, order_id=None):
    return Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        order_id=order_id,
    )
