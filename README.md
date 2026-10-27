# Former-to-consumer-marketplace (FarmDirect)

A direct-to-consumer agricultural marketplace connecting farmers directly with consumers, bypassing middlemen to ensure fair pricing for farmers and fresh produce for buyers.

---

## 🌾 Features

- **Direct Farmer-to-Consumer Connection**: Farmers list fresh produce directly for local and regional buyers.
- **Role-based Authentication**: Secure accounts for Farmers, Consumers, and Admins.
- **Product Catalog & Inventory**: Browse seasonal fruits, vegetables, grains, and organic farm goods.
- **Cart & Order Processing**: Real-time cart calculations and order fulfillment workflows.
- **Notifications & Status Tracking**: Live updates on order status and dispatch.
- **Modern Responsive UI**: Built with React and Vite for smooth desktop and mobile browsing.

---

## 🛠️ Tech Stack

- **Backend**: Python, Django, Django REST Framework
- **Frontend**: React, Vite, JavaScript, CSS
- **Database**: SQLite (Development) / PostgreSQL (Production ready)
- **Authentication**: JWT / Token Authentication

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+) & npm
- Python (v3.10+) & pip

### 2. Backend Setup
```bash
cd farmdirect/backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 3. Frontend Setup
```bash
cd farmdirect/frontend
npm install
npm run dev
```

---

## 📁 Repository Structure
```
Former-to-consumer-marketplace/
├── farmdirect/
│   ├── backend/          # Django REST backend (accounts, products, cart, orders)
│   └── frontend/         # React frontend application
├── .gitignore            # Git exclusion rules
├── package.json          # Root workspace helper scripts
└── README.md             # Project documentation
```

---

## 📄 License
This project is licensed under the MIT License.
