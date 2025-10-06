const themeToggle = document.getElementById('themeToggle');
const body = document.body;

let localStorageThemeKey = 'otbr-theme';
const url = window.location.pathname;
if(url.substr(0,7) === '/index.') {
	localStorageThemeKey = 'otbr-theme-index-html';
}
if(url.substr(0,5) === '/ota.') {
	localStorageThemeKey = 'otbr-theme-ota-html';
}

//-- Checking the saved theme
const savedTheme = localStorage.getItem(localStorageThemeKey);
if(savedTheme === 'dark') {
  body.classList.add('dark-theme');
  document.documentElement.setAttribute('data-bs-theme', 'dark');
} else {
	body.classList.remove('dark-theme');
  document.documentElement.setAttribute('data-bs-theme', 'light');
}

//console.log(url, savedTheme);

themeToggle.addEventListener('click', function() {
  
  //-- set for <body>
  body.classList.toggle('dark-theme');
  
  //-- Saving the theme selection
  const isDark = body.classList.contains('dark-theme');
  const newTheme = isDark ? 'dark' : 'light';
  localStorage.setItem(localStorageThemeKey, newTheme);
  //-- set for <html>
  document.documentElement.setAttribute('data-bs-theme', newTheme);
  
  /*
  //-- Adding animation when switching
  this.style.transform = 'scale(0.95)';
  setTimeout(() => {
    this.style.transform = 'scale(1)';
  }, 150);
  */

});

//-- Adding a handler for the keyboard
themeToggle.addEventListener('keypress', function(e) {
  if(e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    this.click();
  }
});

//-- Making the switch accessible to the keyboard
themeToggle.setAttribute('tabindex', '0');
themeToggle.setAttribute('role', 'button');
themeToggle.setAttribute('aria-label', 'Switch theme');
