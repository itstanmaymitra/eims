exports.getHome = (req, res, next) => {
    res.render('public/home', {
        pageTitle: 'Home',
        isAuthenticated: req.session.isAuthenticated,
        userType: req.session.userType,
        errorMessage: [],
        successMessage: []
    });
}