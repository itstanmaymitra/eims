const bcrypt = require('bcryptjs');
const OfficeAdmin = require('../models/officeAdmin');
const OfficeUser = require('../models/officeUser');
const Admin = require('../models/admin');

exports.getDashboard = (req, res, next) => {
    res.render('admin/dashboard', {
        pageTitle: 'Dashboard',
        isAuthenticated: req.session.isAuthenticated,
        userType: req.session.userType,
        errorMessage: req.flash('errorMessage'),
        successMessage: req.flash('successMessage'),
        path: '/admin/dashboard'
    });
}

exports.getAddOffice = (req, res, next) => {
    res.render('admin/addOffice', {
        pageTitle: 'Add New Office',
        isAuthenticated: req.session.isAuthenticated,
        userType: req.session.userType,
        errorMessage: req.flash('errorMessage'),
        successMessage: req.flash('successMessage'),
        path: '/admin/add-office'
    });
}

exports.postAddOffice = async (req, res, next) => {
    const { officeName, officeAddress, email, phone, username, password, confirmPassword } = req.body;

    if(password !== confirmPassword) {
        req.flash('errorMessage', 'Password and Confirm password field must have to match');
        return res.redirect('/admin/add-office');
    }

    try {
        const existingAdmin = await OfficeAdmin.findOne({$or: [{email: email}, {username: username}]});
        const existingOfficeAdmin = await OfficeUser.findOne({$or: [{email: email}, {username: username}]});
        const existingOfficeUser = await Admin.findOne({$or: [{email: email}, {username: username}]});
        

        if (existingOfficeAdmin || existingOfficeUser || existingAdmin) {
            req.flash('errorMessage', 'User already exists with the same username or email');
            return res.redirect('/admin/add-office');
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const officeAdmin = await OfficeAdmin.create({
            officeName,
            officeAddress,
            email,
            phone,
            username,
            password: hashedPassword
        });

        res.redirect('/admin/offices');
    } catch (error) {
        return next(new Error(error));
    }
}

exports.getOffices = (req, res, next) => {
    res.render('admin/offices', {
        pageTitle: 'All Offices',
        isAuthenticated: req.session.isAuthenticated,
        userType: req.session.userType,
        errorMessage: req.flash('errorMessage'),
        successMessage: req.flash('successMessage'),
        path: '/admin/offices'
    });
}