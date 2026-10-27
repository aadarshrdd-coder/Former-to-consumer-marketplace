from rest_framework import generics
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import Product
from .serializers import ProductSerializer
from .permissions import IsFarmerOrReadOnly

class ProductListCreateView(generics.ListCreateAPIView):
    queryset = Product.objects.select_related("farmer").all()
    serializer_class = ProductSerializer
    permission_classes = [
        IsAuthenticatedOrReadOnly,
        IsFarmerOrReadOnly,
    ]

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)

class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.select_related("farmer").all()
    serializer_class = ProductSerializer
    permission_classes = [
        IsAuthenticatedOrReadOnly,
        IsFarmerOrReadOnly,
    ]
