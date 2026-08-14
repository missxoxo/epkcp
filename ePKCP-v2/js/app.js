document.querySelector('.eye').addEventListener('click', function () { const field=document.querySelector('#password'); field.type=field.type==='password'?'text':'password'; this.setAttribute('aria-label',field.type==='password'?'Papar kata laluan':'Sembunyi kata laluan'); });
document.querySelector('#login-form').addEventListener('submit', function (event) {
  event.preventDefault();
  const user = document.querySelector('#user');
  const password = document.querySelector('#password');
  
  if (!user.value.trim() || !password.value.trim()) {
    (user.value.trim() ? password : user).focus();
    return;
  }
  
  if (user.value.trim() === 'diyana.ghani' && password.value.trim() === 'epkcp2026') {
    window.location.href = 'dashboard.html';
  } else {
    alert('ID Pengguna atau Kata Laluan salah! Sila gunakan ID Pengguna: diyana.ghani dan Kata Laluan: epkcp2026');
  }
});
