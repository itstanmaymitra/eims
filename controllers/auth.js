const OfficeUser = require('../models/officeUser');
const OfficeAdmin = require('../models/officeAdmin');
const Admin = require('../models/admin');

const bcrypt = require('bcryptjs');

exports.getLogin = (req, res, next) => {
    res.render('auth/login', {
        pageTitle: 'Login',
        isAuthenticated: req.session.isAuthenticated,
        userType: req.session.userType,
        errorMessage: req.flash('errorMessage'),
        successMessage: req.flash('successMessage'),
    });
}

exports.postLogin = async (req, res, next) => {
    const {email, password} = req.body;

    try {
        const officeUser = await OfficeUser.findOne({email});
        const officeAdmin = await OfficeAdmin.findOne({email});
        const admin = await Admin.findOne({email});

        if (officeUser) {
            const isMatch = await bcrypt.compare(password, officeUser.password);

            if (isMatch) {
                req.session.isAuthenticated = true;
                req.session.userType = officeUser.userType;
                req.session.userId = officeUser.id;
                res.redirect('/office-user/dashboard');
            } else {
                req.flash('errorMessage', 'Invalid Email/Username or Password');
                res.redirect('/login');
            }

        } else if (officeAdmin) {
            const isMatch = await bcrypt.compare(password, officeAdmin.password);

            if (isMatch) {
                req.session.isAuthenticated = true;
                req.session.userType = officeAdmin.userType;
                req.session.userId = officeAdmin.id;
                res.redirect('/office-admin/dashboard');
            } else {
                req.flash('errorMessage', 'Invalid Email/Username or Password');
                res.redirect('/login');
            }
            
        } else if (admin) {
            const isMatch = await bcrypt.compare(password, admin.password);

            if (isMatch) {
                req.session.isAuthenticated = true;
                req.session.userType = admin.userType;
                req.session.userId = admin.id;
                res.redirect('/admin/dashboard');
            } else {
                req.flash('errorMessage', 'Invalid Email/Username or Password');
                res.redirect('/login');
            }

        } else {
            req.flash('errorMessage', 'Invalid Email/Username or Password');
            res.redirect('/login');
        }
    } catch (error) {
        return next(new Error(error));
    }
}

exports.postLogout = (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        } else {
            res.redirect('/login');
        }
    });
}