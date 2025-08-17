# 🌍 TourNest

TourNest is a full-stack travel and tour booking web application that lets users explore packages, share stories, and connect with tour guides. Admins can manage packages and users, while guides can view assigned tours and apply to become guides.


# 🚀 Live Links

- 🔗 Client: https://tournest-bd.web.app
- 🔗 Server: https://tour-nest-server.vercel.app

# Admin email & password
- admin@gmail.com
- admin1234

# User email & password
- motiur@gmail.com
- Samsung77

# Guide email & password
- abdullah.hasan@tournest.com
- Samsung77


# 📝 Project Description
TourNest provides a seamless platform for travelers to:

- Book tour packages
- Share their travel stories
- Connect with verified tour guides

The app includes role-based dashboards for Admin, Guide, and Tourist to ensure personalized experiences and proper access control.


# 🌟 Top 5 Features
- ✅ JWT & Firebase Authentication
Secure login/signup with Firebase and backend token verification.

- 📦 Tour Package Booking System
Users can browse, filter, and book guided tours. Admins can add/manage packages.

- 👥 Role-Based Dashboards
Separate dashboards for Tourist, Guide, and Admin with tailored functionality.

- 📚 Tourist Story Sharing
Authenticated users can post and manage their travel experiences with photos.

- 💳 Stripe Payment Integration
Secure online payment during tour booking with Stripe.

- 📊 Dynamic Stats & Visual Insights
Dashboard shows personalized statistics like total bookings, earnings, assigned tours, and application status.

- 🔍 Search, Filter & Pagination
Optimized frontend and backend support for searching, filtering, and paginating stories, bookings, and trip packages.

- 📧 Newsletter & Contact Sections
Users can subscribe to newsletters and get travel updates through a clean, responsive section.

- 🌍 Tour Guide Application & Approval System
Tourists can apply to become guides, and admins can review, accept, or reject applications with role promotion.

- 🖼️ Swiper-based Image & Story Slider
Smooth, responsive Swiper carousels used for displaying package photos and stories with autoplay support.


# 🛠️ Technologies Used
## Frontend:
- React
- React Router DOM
- Axios
- React Hook Form
- TanStack React Query
- Firebase Auth
- Lottie React
- Swiper.js
- Tailwind CSS + DaisyUI


## Backend:
- Node.js + Express.js
- MongoDB (native driver)
- Firebase Admin SDK (for token verification)
- CORS, Dotenv
- Stripe (for payments)


## 📦 Important Packages:
- Frontend : react, axios, react-hook-form, react-query, firebase, swiper, tailwindcss, daisyui, lottie-react

- Backend: express, mongodb, cors, dotenv, firebase-admin, stripe


## ⚙️ How to Run Locally
✅ Prerequisites
- Node.js & npm installed
- MongoDB Atlas URI
- Firebase project (for Auth + Admin SDK)
- Stripe secret key

1. Clone the Repository
- git clone [(https://github.com/Masumiub/TourNest-Server.git)](https://github.com/Masumiub/TourNest-Server.git)
- cd tournest

2. Install Client Dependencies
- cd client
- npm install

3. Install Server Dependencies
cd ../server
npm install

4. Setup Environment Variables
In /server/.env
- PORT=3000
- DB_USER=your_mongodb_user
- DB_PASS=your_mongodb_pass
- FB_SERVICE_KEY=base64_encoded_firebase_admin_sdk_json
- STRIPE_SECRET_KEY=your_stripe_secret_key


To convert Firebase JSON to base64:
- cat firebase-service-account.json | base64


5. Run the Server
- npm start

6. Run the Client
- cd ../client
- npm run dev


# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
