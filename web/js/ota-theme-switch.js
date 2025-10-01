const themeToggle = document.getElementById('themeToggle');
const currentTheme = localStorage.getItem('theme') || 'light';

//-- Installing the starter theme
document.documentElement.setAttribute('data-bs-theme', currentTheme);

themeToggle.addEventListener('click', () =>
{
  const currentTheme = document.documentElement.getAttribute('data-bs-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-bs-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  //-- Updating the icon
  themeToggle.innerHTML = newTheme === 'light' ? 
    '<i class="bi bi-moon-fill"></i>' : 
    '<i class="bi bi-sun-fill"></i>';
});