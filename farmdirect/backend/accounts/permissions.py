from rest_framework import permissions

class IsFarmer(permissions.BasePermission):
    """
    Allows access only to authenticated users who have the 'farmer' role.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'farmer')


class IsCustomer(permissions.BasePermission):
    """
    Allows access only to authenticated users who have the 'customer' role.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'customer')


class IsAdminUser(permissions.BasePermission):
    """
    Allows access to admin users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.role == 'admin' or request.user.is_staff))


class IsFarmerOrReadOnly(permissions.BasePermission):
    """
    Safe methods allowed for any request, modifications only by farmers.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.role == 'farmer')
