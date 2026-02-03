document.addEventListener("DOMContentLoaded", () => {

  // ===== YEAR UPDATE =====
  const yearSpan = document.getElementById('year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // ===== MOBILE NAV =====
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isExpanded = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', !isExpanded);

      if (!isExpanded) {
        navLinks.style.display = 'flex';
        // Add active class for CSS transitions if needed
        setTimeout(() => navLinks.classList.add('active'), 10);
      } else {
        navLinks.classList.remove('active');
        navLinks.style.display = 'none';
      }
    });

    // Close menu when clicking a link on mobile
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 900) {
          navLinks.classList.remove('active');
          navLinks.style.display = 'none';
          hamburger.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  // ===== ANIMATION OBSERVER =====
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px"
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.animate-fade-in').forEach(el => {
    // Ensure initial state is applied via CSS or here
    observer.observe(el);
  });

  // ===== BOOK DATA (Simulated Database) =====
  // ===== BOOK DATA (Real Database) =====
  let books = [];

  async function fetchBooks() {
    try {
      const res = await fetch('http://127.0.0.1:5000/api/books');
      if (!res.ok) throw new Error('Failed to fetch books');
      const data = await res.json();

      books = data;

      // After fetching, render if on marketplace
      if (window.location.href.includes('Marketplace.html')) {
        renderBooks(books);
      }
    } catch (err) {
      console.error('Error loading books:', err);
      // Fallback or empty state could be shown here
    }
  }

  // Load books on init
  fetchBooks();

  // Remove local storage book check for now as we want source of truth to be DB
  // let books = JSON.parse(localStorage.getItem('bookVerse_books')) || initialBooks;

  function saveBooks() {
    localStorage.setItem('bookVerse_books', JSON.stringify(books));
  }

  // Generate Star Rating HTML
  function getStarRatingHTML(rating) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 !== 0;
    let html = '<span class="stars" style="color: #FFD700;">';
    for (let i = 0; i < fullStars; i++) html += '★';
    if (hasHalf) html += '½';
    html += '</span>';
    return html;
  }

  // ===== RENDER BOOKS (Marketplace) =====
  const bookGrid = document.getElementById('book-grid');

  function renderBooks(booksToRender) {
    if (!bookGrid) return;
    bookGrid.innerHTML = '';

    // Helper to create card HTML
    const createCard = (book) => `
            <div class="card-image-wrapper" style="position: relative; overflow: hidden; border-radius: 8px; margin-bottom: 12px;">
                <img src="${book.image || 'https://placehold.co/400x600/333/white?text=No+Image'}" alt="${book.title}" style="width: 100%; height: 250px; object-fit: cover; transition: transform 0.3s ease;">
                <span class="badge" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">${book.genre}</span>
            </div>
            
            <h3 style="font-size: 1.1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 4px;">${book.title}</h3>
            <p style="margin-bottom: 8px; color: var(--text-muted); font-size: 0.9rem;">${book.author}</p>
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                 <div class="rating" style="font-size: 0.9rem;">
                    ${getStarRatingHTML(book.rating || 0)} 
                    <span style="color: var(--text-muted); font-size: 0.8rem;">(${book.reviews || 0})</span>
                 </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                   <span class="text-gradient" style="font-weight: 700; font-size: 1.3rem;">₹${book.price}</span>
                   ${Math.random() > 0.5 ? '<span style="color: #ef4444; font-size: 0.8rem; margin-left: 5px;">LIVE</span>' : ''}
                </div>
                <button class="btn btn-primary btn-buy" data-id="${book.id}" style="padding: 8px 16px; font-size: 0.9rem;">Buy</button>
            </div>
    `;

    if (booksToRender.length === 0) {
      // 1. Show Message
      bookGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
          <p style="font-size: 1.2rem; margin-bottom: 20px;">No books found matching criteria.</p>
          <hr style="border-color: var(--border); margin: 30px auto; max-width: 200px;">
          <h3 style="color: #fff; margin-bottom: 20px;">But check out these popular titles:</h3>
        </div>
      `;

      // 2. Add Suggestions (Top 3 books or random)
      // Since 'books' is the full list, we pick from there.
      const suggestions = books.slice(0, 3);

      suggestions.forEach(book => {
        const card = document.createElement('div');
        card.className = 'card animate-fade-in product-card';
        card.innerHTML = createCard(book);
        bookGrid.appendChild(card);
        observer.observe(card);
      });

    } else {
      // Normal Render
      booksToRender.forEach(book => {
        const card = document.createElement('div');
        card.className = 'card animate-fade-in product-card';
        card.innerHTML = createCard(book);
        bookGrid.appendChild(card);
        observer.observe(card);
      });
    }

    // Attach buy listeners (works for both suggestions and normal)
    document.querySelectorAll('.btn-buy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const book = books.find(b => b.id == id);
        if (book) {
          addToCollection(book);
        }
      });
    });
  }

  // Initial Render if on Marketplace page
  if (window.location.href.includes('Marketplace.html') && bookGrid) {
    renderBooks(books);
  }

  // ===== FILTER & SEARCH LOGIC =====
  function filterBooks() {
    const searchTerm = document.querySelector('.search-bar input')?.value.toLowerCase() || '';

    // Get checked categories
    const checkedCats = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value);

    // Get price range
    const maxPrice = document.getElementById('priceRange')?.value || 5000;
    const priceDisplay = document.getElementById('priceVal');
    if (priceDisplay) priceDisplay.textContent = `₹${maxPrice}`;

    const filtered = books.filter(book => {
      const matchesSearch = book.title.toLowerCase().includes(searchTerm) || book.author.toLowerCase().includes(searchTerm);

      const matchesCategory = checkedCats.length === 0 || checkedCats.some(cat => {
        if (cat === 'Non-Fiction') {
          return ['Non-Fiction', 'History', 'Science', 'Biography'].includes(book.genre);
        }
        if (cat === 'Sci-Fi') {
          return ['Sci-Fi', 'Science Fiction'].includes(book.genre);
        }
        return book.genre === cat;
      });

      const matchesPrice = book.price <= maxPrice;

      return matchesSearch && matchesCategory && matchesPrice;
    });

    renderBooks(filtered);
  }

  // 1. Search Listener
  const searchInput = document.querySelector('.search-bar input');
  if (searchInput) {
    searchInput.addEventListener('input', filterBooks);
  }

  // 2. Category & Price Listeners (Event Delegation or direct attach if elements exist)
  // We'll attach these after DOM load to ensure elements exist if they are static, 
  // or we can attach to body if dynamic. Assuming static structure for now.
  const filterInputs = document.querySelectorAll('input[name="category"], #priceRange');
  filterInputs.forEach(input => {
    input.addEventListener('change', filterBooks);
    input.addEventListener('input', filterBooks); // for range slider live update
  });

  // ===== CONTACT FORM (Handled by contact.js) =====
  // Previous logic removed to avoid conflict.




  // ===== YOUR BOOKS (COLLECTION) LOGIC =====
  let collection = JSON.parse(localStorage.getItem('bookVerse_collection')) || [];

  // Migration from old cart if exists
  const oldCart = localStorage.getItem('bookVerse_cart');
  if (oldCart) {
    const parsed = JSON.parse(oldCart);
    if (Array.isArray(parsed) && parsed.length > 0) {
      collection = [...collection, ...parsed];
      localStorage.removeItem('bookVerse_cart');
    }
  }

  function saveCollection() {
    localStorage.setItem('bookVerse_collection', JSON.stringify(collection));
    updateCollectionUI();
  }

  function updateCollectionUI() {
    // Only run if we are on the Your Books page
    const collectionContainer = document.getElementById('collection-container');
    if (!collectionContainer) return;

    collectionContainer.innerHTML = '';

    if (collection.length === 0) {
      collectionContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <div style="font-size: 4rem; opacity: 0.3; margin-bottom: 20px;">📚</div>
                <h3>Your collection is empty.</h3>
                <p>Go to the <a href="Marketplace.html" style="color: var(--primary);">Marketplace</a> to add some books.</p>
            </div>
        `;
      collectionContainer.style.display = 'block';
    } else {
      collectionContainer.style.display = 'grid';
      collection.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'card animate-fade-in product-card';
        card.innerHTML = `
              <div class="card-image-wrapper" style="position: relative; overflow: hidden; border-radius: 8px; margin-bottom: 12px;">
                  <img src="${item.image}" alt="${item.title}" style="width: 100%; height: 250px; object-fit: cover;">
                  <span class="badge" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">${item.genre}</span>
              </div>
              
              <h3 style="font-size: 1.1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 4px;">${item.title}</h3>
              <p style="margin-bottom: 8px; color: var(--text-muted); font-size: 0.9rem;">${item.author}</p>
              
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                  <span class="text-gradient" style="font-weight: 700; font-size: 1.1rem;">₹${item.price}</span>
                  <button class="btn-remove-collection" data-index="${index}" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s ease;">Remove</button>
              </div>
          `;
        collectionContainer.appendChild(card);
      });

      // Attach remove listeners
      document.querySelectorAll('.btn-remove-collection').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.getAttribute('data-index'));
          collection.splice(index, 1);
          saveCollection();
        });
      });
    }
  }

  function addToCollection(book) {
    collection.push(book);
    saveCollection();
    window.location.href = 'cart.html';
  }

  // Initialize UI
  updateCollectionUI();



  // ===== SELL BOOK LOGIC =====
  const sellForm = document.getElementById('sell-form');
  if (sellForm) {
    sellForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = sellForm.querySelector('button');
      const originalText = btn.textContent;

      const title = document.getElementById('sell-title').value;
      const author = document.getElementById('sell-author').value;
      const price = document.getElementById('sell-price').value;

      btn.textContent = 'Listing...';
      btn.disabled = true;

      try {
        const res = await fetch('http://127.0.0.1:5000/api/books', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            author,
            price: Number(price),
            genre: 'Fiction', // Default
            image: 'https://placehold.co/400x600/333/white?text=User+Upload'
          })
        });

        if (!res.ok) throw new Error('Failed to list book');

        // Success
        btn.textContent = 'Listed! 🎉';
        btn.style.background = '#10B981';
        sellForm.reset();

        // Refresh books
        fetchBooks();

        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
          btn.style.background = '';
        }, 2000);

      } catch (err) {
        console.error(err);
        alert(err.message);
        btn.textContent = 'Error ❌';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
        }, 2000);
      }
    });
  }

});
