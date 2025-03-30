// Navbar
const navItems = document.querySelectorAll('.nav-item');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const navItemsContainer = document.getElementById('nav-items');
const menuIcon = document.getElementById('menu-icon');
const closeIcon = document.getElementById('close-icon');
const searchButton = document.getElementById('search-button');
const searchOverlay = document.getElementById('search-overlay');
const searchInput = document.getElementById('search-input');
const searchClose = document.getElementById('search-close');

// Dropdown Menu Functionality
navItems.forEach(item => {
  const link = item.querySelector('.nav-link');
  
  // Toggle dropdown on click
  link.addEventListener('click', function(e) {
    e.preventDefault();
    
    // Close other dropdowns
    navItems.forEach(otherItem => {
      if (otherItem !== item) {
        otherItem.classList.remove('active');
      }
    });
    
    // Toggle current dropdown
    item.classList.toggle('active');
  });
});

// Close dropdowns when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.nav-item')) {
    navItems.forEach(item => {
      item.classList.remove('active');
    });
  }
});

// Mobile Menu Toggle
mobileMenuToggle.addEventListener('click', function() {
  navItemsContainer.classList.toggle('show');
  
  // Toggle icons
  if (navItemsContainer.classList.contains('show')) {
    menuIcon.style.display = 'none';
    closeIcon.style.display = 'block';
  } else {
    menuIcon.style.display = 'block';
    closeIcon.style.display = 'none';
  }
});

// Search Functionality
searchButton.addEventListener('click', function() {
  searchOverlay.classList.add('show');
  searchInput.focus();
});

searchClose.addEventListener('click', function() {
  searchOverlay.classList.remove('show');
});

// Close search on escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && searchOverlay.classList.contains('show')) {
    searchOverlay.classList.remove('show');
  }
});

// Close mobile menu when window is resized to desktop size
window.addEventListener('resize', function() {
  if (window.innerWidth > 768 && navItemsContainer.classList.contains('show')) {
    navItemsContainer.classList.remove('show');
    menuIcon.style.display = 'block';
    closeIcon.style.display = 'none';
  }
});