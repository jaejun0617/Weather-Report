document.addEventListener('DOMContentLoaded', () => {
   console.log('DOM 준비');

   const mMenu = document.querySelector('.m-menu');
   const pcMenu = document.querySelector('.pc-menu ul');

   // 햄버거 버튼을 클릭하면
   mMenu.addEventListener('click', () => {
      pcMenu.classList.toggle('active');
   });
   // pc메뉴가 보여라
});
