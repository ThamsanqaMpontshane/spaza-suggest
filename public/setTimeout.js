const errorMessage = document.querySelector('.error');
const successMessage = document.querySelector('.success');
const theId = document.querySelector('.theId');

if (errorMessage) {
    setTimeout(() => {
        errorMessage.remove();
    }, 3000);
}

if (successMessage) {
    setTimeout(() => {
        successMessage.remove();
    }, 3000);
}

if (theId) {
    setTimeout(() => {
        theId.remove();
    }, 11000);
}
