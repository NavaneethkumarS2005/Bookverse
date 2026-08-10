import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Marketplace from './pages/Marketplace';
import Login from './pages/Login';
import Contact from './pages/Contact';
import Cart from './pages/Cart';
import Categories from './pages/Categories';
import Orders from './pages/Orders';
import SellBook from './pages/SellBook';
import AdminDashboard from './pages/AdminDashboard';
import BookDetails from './pages/BookDetails';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import UpcomingBooks from './pages/UpcomingBooks';
import Authors from './pages/Authors';
import Publishers from './pages/Publishers';
import BookFairs from './pages/BookFairs';
import DiscoveryDetails from './pages/DiscoveryDetails';
import BoothDetails from './pages/BoothDetails';

import CartDrawer from './components/CartDrawer';
import AIChatbot from './components/AIChatbot';

function App() {
  return (
    <CartProvider>
      <ThemeProvider>
        <Router>
          <div className="app-container">
            <CartDrawer />
            <AIChatbot />
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/sell" element={<SellBook />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/upcoming-books" element={<UpcomingBooks />} />
              <Route path="/authors" element={<Authors />} />
              <Route path="/publishers" element={<Publishers />} />
              <Route path="/book-fairs" element={<BookFairs />} />
              <Route path="/authors/:id" element={<DiscoveryDetails kind="authors" />} />
              <Route path="/publishers/:id" element={<DiscoveryDetails kind="publishers" />} />
              <Route path="/book-fairs/:id" element={<DiscoveryDetails kind="book-fairs" />} />
              <Route path="/booths/:id" element={<BoothDetails />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/book/:id" element={<BookDetails />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              {/* Fallback for other pages if not yet migrated */}
              <Route path="/community" element={<div style={{ paddingTop: '100px', textAlign: 'center' }}>Community Coming Soon</div>} />
            </Routes>
            <Footer />
          </div>
        </Router>
      </ThemeProvider>
    </CartProvider>
  );
}

export default App;
