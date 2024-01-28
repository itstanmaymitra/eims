// const startInput = document.querySelector('#startTime');
// const endInput = document.querySelector('#endTime');


// let startTime;
// startInput.addEventListener('change', e => {
//     startTime = Number(e.target.value.split(':')[0]);
// });

// let endTime;
// startInput.addEventListener('change', e => {
//     endTime = Number(e.target.value.split(':')[0]);
// });

// console.log(startTime);

const errorBox = document.querySelector('.error');
const closeBtn = document.querySelector('.error__close-btn');

if (closeBtn) {

    closeBtn.addEventListener('click', (e) => {
        errorBox.remove();
    });
}

const successBox = document.querySelector('.success');
const successCloseBtn = document.querySelector('.success__close-btn');

if (successCloseBtn) {

    successCloseBtn.addEventListener('click', (e) => {
        successBox.remove();
    });
}

// navigation menu 
const burgerMenu = document.querySelector('#burgerMenu');
const sideBar = document.querySelector('.sidebar');
const wrapper = document.querySelector('.body-wrapper');

burgerMenu.addEventListener('click', e => {
    burgerMenu.classList.add('hide');
    sideBar.classList.add('sidebar__show');
    wrapper.classList.remove('hide');
});

wrapper.addEventListener('click', e => {
    wrapper.classList.add('hide');
    burgerMenu.classList.remove('hide');
    sideBar.classList.remove('sidebar__show');
})

console.log(burgerMenu);



