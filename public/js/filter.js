const singleBtn = document.querySelector('.filter__btn--single');
const rangeBtn = document.querySelector('.filter__btn--range');

const singleForm = document.querySelector('.filter__form--single');
const rangeForm = document.querySelector('.filter__form--range');

rangeBtn.addEventListener('click', e => {
    rangeBtn.classList.add('hide');
    singleBtn.classList.remove('hide');

    singleForm.classList.add('hide');
    rangeForm.classList.remove('hide');
});

singleBtn.addEventListener('click', e => {
    rangeBtn.classList.remove('hide');
    singleBtn.classList.add('hide');

    singleForm.classList.remove('hide');
    rangeForm.classList.add('hide');
});