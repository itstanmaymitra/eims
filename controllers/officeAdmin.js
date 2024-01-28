const fs = require("fs");
const path = require("path");

// packages
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const pdfMakePrinter = require("pdfmake/src/printer");

// models
const OfficeAdmin = require("../models/officeAdmin");
const OfficeUser = require("../models/officeUser");
const Admin = require("../models/admin");
const Report = require("../models/report");
const GeneratedReport = require("../models/generatedReport");

exports.getDashboard = async (req, res, next) => {
	const userId = new mongoose.Types.ObjectId(req.session.userId);

	try {
		const office = await OfficeAdmin.findById(userId).select("officeName");

		const reportsByDate = await Report.aggregate([
			{
				$lookup: {
					from: "officeusers",
					localField: "office",
					foreignField: "_id",
					as: "office",
				},
			},
			{ $unwind: "$office" },
			{
				$project: {
					date: 1,
					duration: 1,
					suffered_consumers: 1,
					"office.officeAdmin": 1,
				},
			},
			{
				$match: {
					"office.officeAdmin": userId,
				},
			},
			{
				$group: {
					_id: "$date",
					duration: {
						$sum: "$duration",
					},
					suffered_consumers: {
						$sum: "$suffered_consumers",
					},
				},
			},
			{ $sort: { _id: 1 } },
			{ $limit: 15 },
		]);

		const totalReports = await Report.aggregate([
			{ $sort: { date: -1 } },
			{ $limit: 30 },
			{
				$lookup: {
					from: "officeusers",
					localField: "office",
					foreignField: "_id",
					as: "office",
				},
			},
			{ $unwind: "$office" },
			{
				$project: {
					date: 1,
					duration: 1,
					suffered_consumers: 1,
					"office.officeAdmin": 1,
				},
			},
			{
				$match: {
					"office.officeAdmin": userId,
				},
			},
			{
				$group: {
					_id: null,
					duration: {
						$sum: "$duration",
					},
					suffered_consumers: {
						$sum: "$suffered_consumers",
					},
					count: { $sum: 1 },
				},
			},
		]);

		const officeWiseTotalReports = await Report.aggregate([
			{
				$lookup: {
					from: "officeusers",
					localField: "office",
					foreignField: "_id",
					as: "office",
				},
			},
			{ $unwind: "$office" },
			{
				$project: {
					duration: 1,
					suffered_consumers: 1,
					"office.officeAdmin": 1,
					"office._id": 1,
					"office.officeName": 1,
				},
			},
			{
				$match: {
					"office.officeAdmin": userId,
				},
			},
			{ $sort: { date: -1 } },
			{ $limit: 30 },
			{
				$group: {
					_id: {
						id: "$office._id",
						officeName: "$office.officeName",
					},
					duration: {
						$sum: "$duration",
					},
					suffered_consumers: {
						$sum: "$suffered_consumers",
					},
				},
			},
		]);

		const generatedReports = await GeneratedReport.find({ office: userId })
			.select("-reports")
			.sort({ createdAt: -1 })
			.limit(5);

		const recentReports = await Report.aggregate([
			{
				$lookup: {
					from: "officeusers",
					localField: "office",
					foreignField: "_id",
					as: "office",
				},
			},
			{ $unwind: "$office" },
			{
				$project: {
					date: 1,
					duration: 1,
					suffered_consumers: 1,
					"office.officeAdmin": 1,
				},
			},
			{
				$match: {
					"office.officeAdmin": userId,
				},
			},
			{
				$group: {
					_id: "$date",
					duration: {
						$sum: "$duration",
					},
					suffered_consumers: {
						$sum: "$suffered_consumers",
					},
				},
			},
			{ $sort: { _id: -1 } },
			{ $limit: 5 },
		]);

		const timeConvert = (n) => {
			const num = n;
			const hours = num / 60;
			const rhours = Math.floor(hours);
			const minutes = (hours - rhours) * 60;
			const rminutes = Math.round(minutes);
			return rhours + " hour(s) " + rminutes + " minute(s)";
		};

		return res.render("officeAdmin/dashboard", {
			pageTitle: "Dashboard",
			isAuthenticated: req.session.isAuthenticated,
			userType: req.session.userType,
			errorMessage: req.flash("errorMessage"),
			successMessage: req.flash("successMessage"),
			path: "/office-admin/dashboard",
			totalDuration: totalReports.length
				? timeConvert(totalReports[0].duration)
				: timeConvert(0),
			totalInterruptions: totalReports.length ? totalReports[0].count : 0,
			office,
			durationByDate: reportsByDate,
			sufferedConsumersByDate: reportsByDate,
			officeWiseTotalReports,
			recentReports,
			generatedReports,
		});
	} catch (error) {
		return next(error);
	}
};

exports.getAddOffice = (req, res, next) => {
	res.render("officeAdmin/addOffice", {
		pageTitle: "Add New Office",
		isAuthenticated: req.session.isAuthenticated,
		userType: req.session.userType,
		errorMessage: req.flash("errorMessage"),
		successMessage: req.flash("successMessage"),
		path: "/office-admin/add-office",
	});
};

exports.postAddOffice = async (req, res, next) => {
	const {
		officeName,
		officeAddress,
		email,
		phone,
		username,
		password,
		confirmPassword,
	} = req.body;

	if (password !== confirmPassword) {
		req.flash(
			"errorMessage",
			"Password and Confirm password field must have to match"
		);
		return res.redirect("/office-admin/add-office");
	}

	try {
		const existingAdmin = await OfficeAdmin.findOne({
			$or: [{ email: email }, { username: username }],
		});
		const existingOfficeAdmin = await OfficeUser.findOne({
			$or: [{ email: email }, { username: username }],
		});
		const existingOfficeUser = await Admin.findOne({
			$or: [{ email: email }, { username: username }],
		});

		if (existingOfficeUser || existingOfficeAdmin || existingAdmin) {
			req.flash(
				"errorMessage",
				"User already exists with the same username or email"
			);
			return res.redirect("/office-admin/add-office");
		}

		const hashedPassword = await bcrypt.hash(password, 12);

		const officeUser = await OfficeUser.create({
			officeName,
			officeAddress,
			email,
			phone,
			username,
			password: hashedPassword,
			officeAdmin: req.session.userId,
		});

		res.redirect("/office-admin/offices");
	} catch (error) {
		return next(new Error(error));
	}
};

exports.getOffices = async (req, res, next) => {
	try {
		const userId = new mongoose.Types.ObjectId(req.session.userId);
		const officeUsers = await OfficeUser.find({
			officeAdmin: userId,
		}).select("-password");

		res.render("officeAdmin/offices", {
			pageTitle: "All Offices",
			isAuthenticated: req.session.isAuthenticated,
			userType: req.session.userType,
			errorMessage: req.flash("errorMessage"),
			successMessage: req.flash("successMessage"),
			officeUsers: officeUsers,
			path: "/office-admin/offices",
		});
	} catch (error) {
		return next(new Error(error));
	}
};

exports.getReports = async (req, res, next) => {
	const userId = new mongoose.Types.ObjectId(req.session.userId);
	const ITEMS_PER_PAGE = Number(process.env.ITEMS_PER_PAGE);
	const page = +req.query.page || 1;
	const date = req.query.date;
	const fromDate = req.query.fromDate;
	const toDate = req.query.toDate;

	try {
		let totalReports;
		let reports;

		if (date) {
			totalReports = 1;

			reports = await Report.aggregate([
				{
					$lookup: {
						from: "officeusers",
						localField: "office",
						foreignField: "_id",
						as: "office",
					},
				},
				{ $unwind: "$office" },
				{
					$project: {
						date: 1,
						duration: 1,
						suffered_consumers: 1,
						office: 1,
					},
				},
				{
					$match: {
						"office.officeAdmin": userId,
						date: new Date(`${date}T00:00:00.000+00:00`),
					},
				},
				{
					$group: {
						_id: "$date",
						reportsByDate: {
							$push: {
								duration: "$duration",
								suffered_consumers: "$suffered_consumers",
								office: "$office",
							},
						},
					},
				},
				{
					$project: {
						_id: 1,
						"reportsByDate.duration": 1,
						"reportsByDate.suffered_consumers": 1,
						"reportsByDate.office.officeName": 1,
						"reportsByDate.office._id": 1,
					},
				},
				{ $sort: { _id: -1 } },
			]);

			const newReports = reports.map((report) => {
				let newArray = [];

				report.reportsByDate.forEach((r) => {
					let existingIndex = newArray.findIndex((item) => {
						return (
							item.office._id.toString() ===
							r.office._id.toString()
						);
					});

					if (existingIndex < 0) {
						newArray.push({ ...r, inturruptionCount: 1 });
					} else {
						newArray[existingIndex].duration += r.duration;
						newArray[existingIndex].suffered_consumers +=
							r.suffered_consumers;
						newArray[existingIndex].inturruptionCount += 1;
					}
				});

				report.reportsByDate = newArray;

				return report;
			});

			res.render("officeAdmin/reports", {
				pageTitle: "Reports",
				isAuthenticated: req.session.isAuthenticated,
				userType: req.session.userType,
				errorMessage: req.flash("errorMessage"),
				successMessage: req.flash("successMessage"),
				reports: newReports,
				path: "/office-admin/reports",
				currentPage: page,
				hasNextPage: false,
				hasPreviousPage: false,
				nextPage: page + 1,
				previousPage: page - 1,
				lastPage: Math.ceil(totalReports / ITEMS_PER_PAGE),
				date: date,
				fromDate: "",
				toDate: "",
			});
		} else if (fromDate && toDate) {
			totalReports = 1;

			reports = await Report.aggregate([
				{
					$lookup: {
						from: "officeusers",
						localField: "office",
						foreignField: "_id",
						as: "office",
					},
				},
				{ $unwind: "$office" },
				{
					$project: {
						date: 1,
						duration: 1,
						suffered_consumers: 1,
						office: 1,
					},
				},
				{
					$match: {
						"office.officeAdmin": userId,
						date: {
							$gte: new Date(`${fromDate}T00:00:00.000+00:00`),
							$lte: new Date(`${toDate}T00:00:00.000+00:00`),
						},
					},
				},
				{
					$group: {
						_id: "$date",
						reportsByDate: {
							$push: {
								duration: "$duration",
								suffered_consumers: "$suffered_consumers",
								office: "$office",
							},
						},
					},
				},
				{
					$project: {
						_id: 1,
						"reportsByDate.duration": 1,
						"reportsByDate.suffered_consumers": 1,
						"reportsByDate.office.officeName": 1,
						"reportsByDate.office._id": 1,
					},
				},
				{ $sort: { _id: -1 } },
			]);

			const newReports = reports.map((report) => {
				let newArray = [];

				report.reportsByDate.forEach((r) => {
					let existingIndex = newArray.findIndex((item) => {
						return (
							item.office._id.toString() ===
							r.office._id.toString()
						);
					});

					if (existingIndex < 0) {
						newArray.push({ ...r, inturruptionCount: 1 });
					} else {
						newArray[existingIndex].duration += r.duration;
						newArray[existingIndex].suffered_consumers +=
							r.suffered_consumers;
						newArray[existingIndex].inturruptionCount += 1;
					}
				});

				report.reportsByDate = newArray;

				return report;
			});

			res.render("officeAdmin/reports", {
				pageTitle: "Reports",
				isAuthenticated: req.session.isAuthenticated,
				userType: req.session.userType,
				errorMessage: req.flash("errorMessage"),
				successMessage: req.flash("successMessage"),
				reports: newReports,
				path: "/office-admin/reports",
				currentPage: page,
				hasNextPage: false,
				hasPreviousPage: false,
				nextPage: page + 1,
				previousPage: page - 1,
				lastPage: Math.ceil(totalReports / ITEMS_PER_PAGE),
				date: "",
				fromDate: fromDate,
				toDate: toDate,
			});
		} else {
			const reportCount = await Report.aggregate([
				{
					$lookup: {
						from: "officeusers",
						localField: "office",
						foreignField: "_id",
						as: "office",
					},
				},
				{ $unwind: "$office" },
				{
					$project: {
						date: 1,
						duration: 1,
						suffered_consumers: 1,
						office: 1,
					},
				},
				{
					$match: {
						"office.officeAdmin": userId,
					},
				},
				{
					$group: {
						_id: "$date",
						reportsByDate: {
							$push: {
								duration: "$duration",
								suffered_consumers: "$suffered_consumers",
								office: "$office",
							},
						},
					},
				},
				{
					$project: {
						_id: 1,
						"reportsByDate.duration": 1,
						"reportsByDate.suffered_consumers": 1,
						"reportsByDate.office.officeName": 1,
						"reportsByDate.office._id": 1,
					},
				},
				{ $count: "count" },
			]);

			if (reportCount.length) {
				totalReports = reportCount[0].count;
			}

			reports = await Report.aggregate([
				{
					$lookup: {
						from: "officeusers",
						localField: "office",
						foreignField: "_id",
						as: "office",
					},
				},
				{ $unwind: "$office" },
				{
					$project: {
						date: 1,
						duration: 1,
						suffered_consumers: 1,
						office: 1,
					},
				},
				{
					$match: {
						"office.officeAdmin": userId,
					},
				},
				{
					$group: {
						_id: "$date",
						reportsByDate: {
							$push: {
								duration: "$duration",
								suffered_consumers: "$suffered_consumers",
								office: "$office",
							},
						},
					},
				},
				{
					$project: {
						_id: 1,
						"reportsByDate.duration": 1,
						"reportsByDate.suffered_consumers": 1,
						"reportsByDate.office.officeName": 1,
						"reportsByDate.office._id": 1,
					},
				},
				{ $sort: { _id: -1 } },
				{ $skip: (page - 1) * ITEMS_PER_PAGE },
				{ $limit: ITEMS_PER_PAGE },
			]);

			const newReports = reports.map((report) => {
				let newArray = [];

				report.reportsByDate.forEach((r) => {
					let existingIndex = newArray.findIndex((item) => {
						return (
							item.office._id.toString() ===
							r.office._id.toString()
						);
					});

					if (existingIndex < 0) {
						newArray.push({ ...r, inturruptionCount: 1 });
					} else {
						newArray[existingIndex].duration += r.duration;
						newArray[existingIndex].suffered_consumers +=
							r.suffered_consumers;
						newArray[existingIndex].inturruptionCount += 1;
					}
				});

				report.reportsByDate = newArray;

				return report;
			});

			res.render("officeAdmin/reports", {
				pageTitle: "Reports",
				isAuthenticated: req.session.isAuthenticated,
				userType: req.session.userType,
				errorMessage: req.flash("errorMessage"),
				successMessage: req.flash("successMessage"),
				reports: newReports,
				path: "/office-admin/reports",
				currentPage: page,
				hasNextPage: ITEMS_PER_PAGE * page < totalReports,
				hasPreviousPage: page > 1,
				nextPage: page + 1,
				previousPage: page - 1,
				lastPage: Math.ceil(totalReports / ITEMS_PER_PAGE),
				date: "",
				fromDate: "",
				toDate: "",
			});
		}
	} catch (error) {
		return next(new Error(error));
	}
};

exports.getReportsByDate = async (req, res, next) => {
	const userId = new mongoose.Types.ObjectId(req.session.userId);
	const date = req.query.date;

	try {
		const reports = await Report.aggregate([
			{
				$lookup: {
					from: "officeusers",
					localField: "office",
					foreignField: "_id",
					as: "office",
				},
			},
			{ $unwind: "$office" },
			{
				$project: {
					date: 1,
					timeSlot: 1,
					startTime: 1,
					endTime: 1,
					duration: 1,
					suffered_consumers: 1,
					interruption_area: 1,
					reason: 1,
					"office.officeAdmin": 1,
					"office.officeName": 1,
				},
			},
			{
				$match: {
					"office.officeAdmin": userId,
					date: new Date(`${date}T00:00:00.000+00:00`),
				},
			},
			{
				$group: {
					_id: "$date",
					reportsByDate: {
						$push: {
							timeSlot: "$timeSlot",
							startTime: "$startTime",
							endTime: "$endTime",
							duration: "$duration",
							suffered_consumers: "$suffered_consumers",
							interruption_area: "$interruption_area",
							reason: "$reason",
							office: "$office",
						},
					},
				},
			},
		]);

		res.render("officeAdmin/reportsByDate", {
			pageTitle: `Reports - ${date}`,
			isAuthenticated: req.session.isAuthenticated,
			userType: req.session.userType,
			errorMessage: req.flash("errorMessage"),
			successMessage: req.flash("successMessage"),
			reports: reports,
			path: "/office-admin/reports-by-date",
			date: date,
			officeAdmin: userId,
		});
	} catch (error) {
		return next(error);
	}
};

exports.getOfficeUserData = async (req, res, next) => {
	const officeUserId = req.params.officeUserId;
	const ITEMS_PER_PAGE = Number(process.env.ITEMS_PER_PAGE);
	const page = +req.query.page || 1;
	const date = req.query.date;
	const fromDate = req.query.fromDate;
	const toDate = req.query.toDate;

	try {
		const officeUser = await OfficeUser.findById(officeUserId).select(
			"-password"
		);

		if (!officeUser) {
			req.flash(
				"errorMessage",
				"Could not find any office with this Id."
			);
			return res.redirect("/office-admin/offices");
		}

		let totalReports;
		let reports;

		if (date) {
			totalReports = 1;

			reports = await Report.aggregate([
				{
					$match: {
						office: new mongoose.Types.ObjectId(officeUserId),
						date: new Date(`${date}T00:00:00.000+00:00`),
					},
				},
				{
					$group: {
						_id: "$date",
						reportsByDate: {
							$push: {
								timeSlot: "$timeSlot",
								startTime: "$startTime",
								endTime: "$endTime",
								duration: "$duration",
								suffered_consumers: "$suffered_consumers",
								interruption_area: "$interruption_area",
								reason: "$reason",
							},
						},
					},
				},
				{ $sort: { _id: -1 } },
			]);

			res.render("officeAdmin/officeUserData", {
				pageTitle: officeUser.officeName,
				isAuthenticated: req.session.isAuthenticated,
				userType: req.session.userType,
				errorMessage: req.flash("errorMessage"),
				successMessage: req.flash("successMessage"),
				officeUser,
				reports,
				path: `/office-admin/offices/${officeUserId}`,
				currentPage: page,
				hasNextPage: false,
				hasPreviousPage: false,
				nextPage: page + 1,
				previousPage: page - 1,
				lastPage: Math.ceil(totalReports / ITEMS_PER_PAGE),
				date: date,
				fromDate: "",
				toDate: "",
			});
		} else if (fromDate && toDate) {
			totalReports = 1;

			reports = await Report.aggregate([
				{
					$match: {
						office: new mongoose.Types.ObjectId(officeUserId),
						date: {
							$gte: new Date(`${fromDate}T00:00:00.000+00:00`),
							$lte: new Date(`${toDate}T00:00:00.000+00:00`),
						},
					},
				},
				{
					$group: {
						_id: "$date",
						reportsByDate: {
							$push: {
								timeSlot: "$timeSlot",
								startTime: "$startTime",
								endTime: "$endTime",
								duration: "$duration",
								suffered_consumers: "$suffered_consumers",
								interruption_area: "$interruption_area",
								reason: "$reason",
							},
						},
					},
				},
				{ $sort: { _id: -1 } },
			]);

			res.render("officeAdmin/officeUserData", {
				pageTitle: officeUser.officeName,
				isAuthenticated: req.session.isAuthenticated,
				userType: req.session.userType,
				errorMessage: req.flash("errorMessage"),
				successMessage: req.flash("successMessage"),
				officeUser,
				reports,
				path: `/office-admin/offices/${officeUserId}`,
				currentPage: page,
				hasNextPage: false,
				hasPreviousPage: false,
				nextPage: page + 1,
				previousPage: page - 1,
				lastPage: Math.ceil(totalReports / ITEMS_PER_PAGE),
				date: "",
				fromDate: fromDate,
				toDate: toDate,
			});
		} else {
			const reportCount = await Report.aggregate([
				{ $sort: { _id: -1 } },
				{
					$match: {
						office: new mongoose.Types.ObjectId(officeUserId),
					},
				},
				{
					$group: {
						_id: "$date",
						reportsByDate: {
							$push: {
								timeSlot: "$timeSlot",
								startTime: "$startTime",
								endTime: "$endTime",
								duration: "$duration",
								suffered_consumers: "$suffered_consumers",
								interruption_area: "$interruption_area",
								reason: "$reason",
							},
						},
					},
				},
				{ $count: "count" },
			]);

			if (reportCount.length) {
				totalReports = reportCount[0].count;
			}

			reports = await Report.aggregate([
				{
					$match: {
						office: new mongoose.Types.ObjectId(officeUserId),
					},
				},
				{
					$group: {
						_id: "$date",
						reportsByDate: {
							$push: {
								timeSlot: "$timeSlot",
								startTime: "$startTime",
								endTime: "$endTime",
								duration: "$duration",
								suffered_consumers: "$suffered_consumers",
								interruption_area: "$interruption_area",
								reason: "$reason",
							},
						},
					},
				},
				{ $sort: { _id: -1 } },
				{ $skip: (page - 1) * ITEMS_PER_PAGE },
				{ $limit: ITEMS_PER_PAGE },
			]);

			res.render("officeAdmin/officeUserData", {
				pageTitle: officeUser.officeName,
				isAuthenticated: req.session.isAuthenticated,
				userType: req.session.userType,
				errorMessage: req.flash("errorMessage"),
				successMessage: req.flash("successMessage"),
				officeUser,
				reports,
				path: `/office-admin/offices/${officeUserId}`,
				currentPage: page,
				hasNextPage: ITEMS_PER_PAGE * page < totalReports,
				hasPreviousPage: page > 1,
				nextPage: page + 1,
				previousPage: page - 1,
				lastPage: Math.ceil(totalReports / ITEMS_PER_PAGE),
				date: "",
				fromDate: "",
				toDate: "",
			});
		}
	} catch (error) {
		return next(new Error(error));
	}
};

exports.getSettings = async (req, res, next) => {
	const userId = new mongoose.Types.ObjectId(req.session.userId);

	try {
		const officeAdmin = await OfficeAdmin.findById(userId).select(
			"-password"
		);

		if (!officeAdmin) {
			req.flash(
				"errorMessage",
				"Couldn't find any user with this ID please login and try again."
			);
			return res.redirect("/office-admin/settings");
		}

		res.render("officeAdmin/settings", {
			pageTitle: "Settings",
			isAuthenticated: req.session.isAuthenticated,
			userType: req.session.userType,
			errorMessage: req.flash("errorMessage"),
			successMessage: req.flash("successMessage"),
			user: officeAdmin,
			path: "/office-admin/settings",
		});
	} catch (error) {
		return next(new Error(error));
	}
};

exports.postEditOfficeDetails = async (req, res, next) => {
	const userId = new mongoose.Types.ObjectId(req.session.userId);
	const { officeName, officeAddress, phone, password } = req.body;

	try {
		const officeAdmin = await OfficeAdmin.findById(userId);

		if (!officeAdmin) {
			req.flash(
				"errorMessage",
				"Couldn't find any user with this ID please login and try again."
			);
			return res.redirect("/office-admin/settings");
		}

		const isMatch = await bcrypt.compare(password, officeAdmin.password);

		if (!isMatch) {
			req.flash("errorMessage", "Enter a valid password and try again.");
			return res.redirect("/office-admin/settings");
		}

		officeAdmin.officeName = officeName;
		officeAdmin.officeAddress = officeAddress;
		officeAdmin.phone = phone;

		await officeAdmin.save();

		req.flash("successMessage", "Office details Updated Successfully");
		res.redirect("/office-admin/settings");
	} catch (error) {
		return next(new Error(error));
	}
};

exports.postChangePassword = async (req, res, next) => {
	const userId = new mongoose.Types.ObjectId(req.session.userId);
	const { password, newPassword } = req.body;

	try {
		const officeAdmin = await OfficeAdmin.findById(userId);

		if (!officeAdmin) {
			req.flash(
				"errorMessage",
				"Couldn't find any user with this ID please login and try again."
			);
			return res.redirect("/office-admin/settings");
		}

		const isMatch = await bcrypt.compare(password, officeAdmin.password);

		if (!isMatch) {
			req.flash(
				"errorMessage",
				"Enter a valid old password and try again."
			);
			return res.redirect("/office-admin/settings");
		}

		const hashedPassword = await bcrypt.hash(newPassword, 12);

		officeAdmin.password = hashedPassword;

		await officeAdmin.save();

		req.flash("successMessage", "Office Password Changed Successfully.");
		res.redirect("/office-admin/settings");
	} catch (error) {
		return next(new Error(error));
	}
};

exports.generateOfficeReport = async (req, res, next) => {
	const userId = new mongoose.Types.ObjectId(req.session.userId);
	const officeUserId = req.params.officeUserId;
	const ITEMS_PER_PAGE = Number(process.env.ITEMS_PER_PAGE);
	const page = +req.query.page || 1;
	const date = req.query.date;
	const fromDate = req.query.fromDate;
	const toDate = req.query.toDate;

	try {
		const officeUser = await OfficeUser.findById(officeUserId).select(
			"-password"
		);

		if (!officeUser) {
			req.flash(
				"errorMessage",
				"Could not find any office with this Id."
			);
			return res.redirect("/office-admin/offices");
		}

		let totalReports;
		let reports;

		if (date) {
			totalReports = 1;

			reports = await Report.aggregate([
				{
					$match: {
						office: new mongoose.Types.ObjectId(officeUserId),
						date: new Date(`${date}T00:00:00.000+00:00`),
					},
				},
				{
					$group: {
						_id: "$date",
						reportsByDate: {
							$push: {
								timeSlot: "$timeSlot",
								startTime: "$startTime",
								endTime: "$endTime",
								duration: "$duration",
								suffered_consumers: "$suffered_consumers",
								interruption_area: "$interruption_area",
								reason: "$reason",
							},
						},
					},
				},
				{ $sort: { _id: -1 } },
			]);

			const generatedReport = await GeneratedReport.create({
				office: userId,
				reports,
				reportType: "officeReport",
				onModel: "OfficeAdmin",
			});

			return res.redirect("/office-admin/generated-reports");
		} else if (fromDate && toDate) {
			totalReports = 1;

			reports = await Report.aggregate([
				{
					$match: {
						office: new mongoose.Types.ObjectId(officeUserId),
						date: {
							$gte: new Date(`${fromDate}T00:00:00.000+00:00`),
							$lte: new Date(`${toDate}T00:00:00.000+00:00`),
						},
					},
				},
				{
					$group: {
						_id: "$date",
						reportsByDate: {
							$push: {
								timeSlot: "$timeSlot",
								startTime: "$startTime",
								endTime: "$endTime",
								duration: "$duration",
								suffered_consumers: "$suffered_consumers",
								interruption_area: "$interruption_area",
								reason: "$reason",
							},
						},
					},
				},
				{ $sort: { _id: -1 } },
			]);

			const generatedReport = await GeneratedReport.create({
				office: userId,
				reports,
				reportType: "officeReport",
				onModel: "OfficeAdmin",
			});

			return res.redirect("/office-admin/generated-reports");
		} else {
			const reportCount = await Report.aggregate([
				{ $sort: { _id: -1 } },
				{
					$match: {
						office: new mongoose.Types.ObjectId(officeUserId),
					},
				},
				{
					$group: {
						_id: "$date",
						reportsByDate: {
							$push: {
								timeSlot: "$timeSlot",
								startTime: "$startTime",
								endTime: "$endTime",
								duration: "$duration",
								suffered_consumers: "$suffered_consumers",
								interruption_area: "$interruption_area",
								reason: "$reason",
							},
						},
					},
				},
				{ $count: "count" },
			]);

			totalReports = reportCount[0].count;

			reports = await Report.aggregate([
				{
					$match: {
						office: new mongoose.Types.ObjectId(officeUserId),
					},
				},
				{
					$group: {
						_id: "$date",
						reportsByDate: {
							$push: {
								timeSlot: "$timeSlot",
								startTime: "$startTime",
								endTime: "$endTime",
								duration: "$duration",
								suffered_consumers: "$suffered_consumers",
								interruption_area: "$interruption_area",
								reason: "$reason",
							},
						},
					},
				},
				{ $sort: { _id: -1 } },
				{ $skip: (page - 1) * ITEMS_PER_PAGE },
				{ $limit: ITEMS_PER_PAGE },
			]);

			const generatedReport = await GeneratedReport.create({
				office: userId,
				reports,
				reportType: "officeReport",
				onModel: "OfficeAdmin",
			});

			return res.redirect("/office-admin/generated-reports");
		}
	} catch (error) {
		return next(new Error(error));
	}
};

exports.generateCombinedReport = async (req, res, next) => {
	const userId = new mongoose.Types.ObjectId(req.session.userId);
	const ITEMS_PER_PAGE = Number(process.env.ITEMS_PER_PAGE);
	const page = +req.query.page || 1;
	const date = req.query.date;
	const fromDate = req.query.fromDate;
	const toDate = req.query.toDate;

	try {
		let totalReports;
		let reports;

		if (date) {
			totalReports = 1;

			reports = await Report.aggregate([
				{
					$lookup: {
						from: "officeusers",
						localField: "office",
						foreignField: "_id",
						as: "office",
					},
				},
				{ $unwind: "$office" },
				{
					$project: {
						date: 1,
						duration: 1,
						suffered_consumers: 1,
						office: 1,
					},
				},
				{
					$match: {
						"office.officeAdmin": userId,
						date: new Date(`${date}T00:00:00.000+00:00`),
					},
				},
				{
					$group: {
						_id: "$date",
						reportsByDate: {
							$push: {
								duration: "$duration",
								suffered_consumers: "$suffered_consumers",
								office: "$office",
							},
						},
					},
				},
				{
					$project: {
						_id: 1,
						"reportsByDate.duration": 1,
						"reportsByDate.suffered_consumers": 1,
						"reportsByDate.office.officeName": 1,
						"reportsByDate.office._id": 1,
					},
				},
				{ $sort: { _id: -1 } },
			]);

			const newReports = reports.map((report) => {
				let newArray = [];

				report.reportsByDate.forEach((r) => {
					let existingIndex = newArray.findIndex((item) => {
						return (
							item.office._id.toString() ===
							r.office._id.toString()
						);
					});

					if (existingIndex < 0) {
						newArray.push({ ...r, inturruptionCount: 1 });
					} else {
						newArray[existingIndex].duration += r.duration;
						newArray[existingIndex].suffered_consumers +=
							r.suffered_consumers;
						newArray[existingIndex].inturruptionCount += 1;
					}
				});

				report.reportsByDate = newArray;

				return report;
			});

			const generatedReport = await GeneratedReport.create({
				office: userId,
				reports: newReports,
				reportType: "combinedReport",
				onModel: "OfficeAdmin",
			});

			return res.redirect("/office-admin/generated-reports");
		} else if (fromDate && toDate) {
			totalReports = 1;

			reports = await Report.aggregate([
				{
					$lookup: {
						from: "officeusers",
						localField: "office",
						foreignField: "_id",
						as: "office",
					},
				},
				{ $unwind: "$office" },
				{
					$project: {
						date: 1,
						duration: 1,
						suffered_consumers: 1,
						office: 1,
					},
				},
				{
					$match: {
						"office.officeAdmin": userId,
						date: {
							$gte: new Date(`${fromDate}T00:00:00.000+00:00`),
							$lte: new Date(`${toDate}T00:00:00.000+00:00`),
						},
					},
				},
				{
					$group: {
						_id: "$date",
						reportsByDate: {
							$push: {
								duration: "$duration",
								suffered_consumers: "$suffered_consumers",
								office: "$office",
							},
						},
					},
				},
				{
					$project: {
						_id: 1,
						"reportsByDate.duration": 1,
						"reportsByDate.suffered_consumers": 1,
						"reportsByDate.office.officeName": 1,
						"reportsByDate.office._id": 1,
					},
				},
				{ $sort: { _id: -1 } },
			]);

			const newReports = reports.map((report) => {
				let newArray = [];

				report.reportsByDate.forEach((r) => {
					let existingIndex = newArray.findIndex((item) => {
						return (
							item.office._id.toString() ===
							r.office._id.toString()
						);
					});

					if (existingIndex < 0) {
						newArray.push({ ...r, inturruptionCount: 1 });
					} else {
						newArray[existingIndex].duration += r.duration;
						newArray[existingIndex].suffered_consumers +=
							r.suffered_consumers;
						newArray[existingIndex].inturruptionCount += 1;
					}
				});

				report.reportsByDate = newArray;

				return report;
			});

			const generatedReport = await GeneratedReport.create({
				office: userId,
				reports: newReports,
				reportType: "combinedReport",
				onModel: "OfficeAdmin",
			});

			return res.redirect("/office-admin/generated-reports");
		} else {
			const reportCount = await Report.aggregate([
				{
					$lookup: {
						from: "officeusers",
						localField: "office",
						foreignField: "_id",
						as: "office",
					},
				},
				{ $unwind: "$office" },
				{
					$project: {
						date: 1,
						duration: 1,
						suffered_consumers: 1,
						office: 1,
					},
				},
				{
					$match: {
						"office.officeAdmin": userId,
					},
				},
				{
					$group: {
						_id: "$date",
						reportsByDate: {
							$push: {
								duration: "$duration",
								suffered_consumers: "$suffered_consumers",
								office: "$office",
							},
						},
					},
				},
				{
					$project: {
						_id: 1,
						"reportsByDate.duration": 1,
						"reportsByDate.suffered_consumers": 1,
						"reportsByDate.office.officeName": 1,
						"reportsByDate.office._id": 1,
					},
				},
				{ $count: "count" },
			]);

			totalReports = reportCount[0].count;

			reports = await Report.aggregate([
				{
					$lookup: {
						from: "officeusers",
						localField: "office",
						foreignField: "_id",
						as: "office",
					},
				},
				{ $unwind: "$office" },
				{
					$project: {
						date: 1,
						duration: 1,
						suffered_consumers: 1,
						office: 1,
					},
				},
				{
					$match: {
						"office.officeAdmin": userId,
					},
				},
				{
					$group: {
						_id: "$date",
						reportsByDate: {
							$push: {
								duration: "$duration",
								suffered_consumers: "$suffered_consumers",
								office: "$office",
							},
						},
					},
				},
				{
					$project: {
						_id: 1,
						"reportsByDate.duration": 1,
						"reportsByDate.suffered_consumers": 1,
						"reportsByDate.office.officeName": 1,
						"reportsByDate.office._id": 1,
					},
				},
				{ $sort: { _id: -1 } },
				{ $skip: (page - 1) * ITEMS_PER_PAGE },
				{ $limit: ITEMS_PER_PAGE },
			]);

			const newReports = reports.map((report) => {
				let newArray = [];

				report.reportsByDate.forEach((r) => {
					let existingIndex = newArray.findIndex((item) => {
						return (
							item.office._id.toString() ===
							r.office._id.toString()
						);
					});

					if (existingIndex < 0) {
						newArray.push({ ...r, inturruptionCount: 1 });
					} else {
						newArray[existingIndex].duration += r.duration;
						newArray[existingIndex].suffered_consumers +=
							r.suffered_consumers;
						newArray[existingIndex].inturruptionCount += 1;
					}
				});

				report.reportsByDate = newArray;

				return report;
			});

			const generatedReport = await GeneratedReport.create({
				office: userId,
				reports: newReports,
				reportType: "combinedReport",
				onModel: "OfficeAdmin",
			});

			return res.redirect("/office-admin/generated-reports");
		}
	} catch (error) {
		return next(new Error(error));
	}
};

exports.generateCombinedReportByDate = async (req, res, next) => {
	const userId = new mongoose.Types.ObjectId(req.session.userId);
	const date = req.query.date;

	try {
		const reports = await Report.aggregate([
			{
				$lookup: {
					from: "officeusers",
					localField: "office",
					foreignField: "_id",
					as: "office",
				},
			},
			{ $unwind: "$office" },
			{
				$project: {
					date: 1,
					timeSlot: 1,
					startTime: 1,
					endTime: 1,
					duration: 1,
					suffered_consumers: 1,
					interruption_area: 1,
					reason: 1,
					"office.officeAdmin": 1,
					"office.officeName": 1,
				},
			},
			{
				$match: {
					"office.officeAdmin": userId,
					date: new Date(`${date}T00:00:00.000+00:00`),
				},
			},
			{
				$group: {
					_id: "$date",
					reportsByDate: {
						$push: {
							timeSlot: "$timeSlot",
							startTime: "$startTime",
							endTime: "$endTime",
							duration: "$duration",
							suffered_consumers: "$suffered_consumers",
							interruption_area: "$interruption_area",
							reason: "$reason",
							office: "$office",
						},
					},
				},
			},
		]);

		const generatedReport = await GeneratedReport.create({
			office: userId,
			reports: reports,
			reportType: "combinedReportByDate",
			onModel: "OfficeAdmin",
		});

		return res.redirect("/office-admin/generated-reports");
	} catch (error) {
		return next(error);
	}
};

exports.getGeneratedReports = async (req, res, next) => {
	const userId = new mongoose.Types.ObjectId(req.session.userId);

	try {
		const generatedReports = await GeneratedReport.find({ office: userId })
			.select("-reports")
			.sort({ createdAt: -1 });

		return res.render("officeAdmin/generatedReports", {
			pageTitle: "Generated Reports",
			isAuthenticated: req.session.isAuthenticated,
			userType: req.session.userType,
			errorMessage: req.flash("errorMessage"),
			successMessage: req.flash("successMessage"),
			path: "/office-admin/generated-reports",
			reports: generatedReports,
		});
	} catch (error) {
		return next(error);
	}
};

exports.getPDFReport = async (req, res, next) => {
	const reportId = req.params.reportId;
	const reportName = "report-" + reportId + ".pdf";
	const reportPath = path.join("reports", reportName);

	try {
		const generatedReport = await GeneratedReport.findById(
			reportId
		).populate("office", ["officeName", "officeAddress"]);

		if (!generatedReport) {
			return next(new Error("Could not find any report."));
		}

		if (generatedReport.office._id.toString() !== req.session.userId) {
			return next(
				new Error("You are not authorized to download this file")
			);
		}

		const officeReport = {
			table: {
				widths: ["auto", "auto", "auto", "auto", "auto", "auto", "*"],
				body: [
					[
						{ text: "Time Slot", style: "tableHeader" },
						{ text: "Start Time", style: "tableHeader" },
						{ text: "End Time", style: "tableHeader" },
						{ text: "Duration(Min)", style: "tableHeader" },
						{ text: "Suffered Consumers", style: "tableHeader" },
						{ text: "Interruption Area", style: "tableHeader" },
						{ text: "Reason", style: "tableHeader" },
					],
				],
			},
		};

		const combinedReport = {
			table: {
				widths: ["*", "auto", "auto", "auto"],
				body: [
					[
						{ text: "Office", style: "tableHeader" },
						{
							text: "Number of Inturruptions",
							style: "tableHeader",
						},
						{
							text: "Total Inturruption Duration (Min)",
							style: "tableHeader",
						},
						{
							text: "Total Suffered Consumers",
							style: "tableHeader",
						},
					],
				],
			},
		};

		const combinedReportByDate = {
			table: {
				widths: [
					"*",
					"auto",
					"auto",
					"auto",
					"auto",
					"auto",
					"auto",
					"*",
				],
				body: [
					[
						{ text: "Office", style: "tableHeader" },
						{ text: "Time Slot", style: "tableHeader" },
						{ text: "Start Time", style: "tableHeader" },
						{ text: "End Time", style: "tableHeader" },
						{ text: "Duration(Min)", style: "tableHeader" },
						{ text: "Suffered Consumers", style: "tableHeader" },
						{ text: "Interruption Area", style: "tableHeader" },
						{ text: "Reason", style: "tableHeader" },
					],
				],
			},
		};

		const checkEnglish = (text) => {
			return /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?\s]*$/.test(
				text
			);
		};

		if (generatedReport.reportType === "officeReport") {
			generatedReport.reports.forEach((report) => {
				officeReport.table.body.push([
					{
						text: report._id.toUTCString().split("00:00:00")[0],
						style: "tableRowDate",
						colSpan: 7,
						alignment: "center",
						fillColor: "#D6D6D6",
					},
					{},
					{},
					{},
					{},
					{},
					{},
				]);

				report.reportsByDate.forEach((data) => {
					officeReport.table.body.push([
						data.timeSlot === "slot1" ? "9AM - 9PM" : "9PM - 9AM",
						data.startTime,
						data.endTime,
						data.duration,
						data.suffered_consumers,
						{
							text: data.interruption_area,
							style: checkEnglish(data.interruption_area)
								? "englishFont"
								: "bengaliFont",
						},
						{
							text: data.reason,
							style: checkEnglish(data.reason)
								? "englishFont"
								: "bengaliFont",
						},
					]);
				});
			});
		}

		if (generatedReport.reportType === "combinedReport") {
			generatedReport.reports.forEach((report) => {
				combinedReport.table.body.push([
					{
						text: report._id.toUTCString().split("00:00:00")[0],
						style: "tableRowDate",
						colSpan: 4,
						alignment: "center",
						fillColor: "#D6D6D6",
					},
					{},
					{},
					{},
				]);

				report.reportsByDate.forEach((data) => {
					combinedReport.table.body.push([
						data.office.officeName,
						data.inturruptionCount,
						data.duration,
						data.suffered_consumers,
					]);
				});
			});
		}

		if (generatedReport.reportType === "combinedReportByDate") {
			generatedReport.reports.forEach((report) => {
				combinedReportByDate.table.body.push([
					{
						text: report._id.toUTCString().split("00:00:00")[0],
						style: "tableRowDate",
						colSpan: 8,
						alignment: "center",
						fillColor: "#D6D6D6",
					},
					{},
					{},
					{},
					{},
					{},
					{},
					{},
				]);

				report.reportsByDate.forEach((data) => {
					combinedReportByDate.table.body.push([
						data.office.officeName,
						data.timeSlot === "slot1" ? "9AM - 9PM" : "9PM - 9AM",
						data.startTime,
						data.endTime,
						data.duration,
						data.suffered_consumers,
						{
							text: data.interruption_area,
							style: checkEnglish(data.interruption_area)
								? "englishFont"
								: "bengaliFont",
						},
						{
							text: data.reason,
							style: checkEnglish(data.reason)
								? "englishFont"
								: "bengaliFont",
						},
					]);
				});
			});
		}

		const docDefination = {
			pageSize: "A4",
			pageMargins: [35, 35, 35, 35],
			content: [
				{ text: generatedReport.office.officeName, style: "header" },
				{
					text: generatedReport.office.officeAddress,
					style: "subHeader",
				},
				{
					style: "table",
					table:
						generatedReport.reportType === "officeReport"
							? officeReport.table
							: generatedReport.reportType === "combinedReport"
							? combinedReport.table
							: combinedReportByDate.table,
					layout: {
						hLineColor: function (i, node) {
							return i === 0 || i === node.table.body.length
								? "#43475F"
								: "#43475F";
						},
						vLineColor: function (i, node) {
							return i === 0 || i === node.table.body.length
								? "#43475F"
								: "#43475F";
						},
					},
				},
			],
			defaultStyle: {
				font: "Roboto",
			},
			styles: {
				header: {
					fontSize: 20,
					alignment: "center",
					color: "#1C1D32",
					margin: [0, 0, 0, 5],
				},
				subHeader: {
					fontSize: 10,
					alignment: "center",
					color: "#43475F",
					margin: [0, 0, 0, 20],
				},
				table: {
					fontSize: 10,
				},
				tableRowDate: {
					color: "#1C1D32",
				},
				englishFont: {
					font: "Roboto",
				},
				bengaliFont: {
					font: "AdorshoLipi",
				},
				tableHeader: {
					fillColor: "#1C1D32",
					color: "#D6D6D6",
				},
			},
		};

		const generatePdf = (docDefination, res) => {
			try {
				// // Define font files
				const fontDescriptors = {
					Roboto: {
						normal: "./fonts/Roboto-Regular.ttf",
						bold: "./fonts/Roboto-Bold.ttf",
						italics: "./fonts/Roboto-Italic.ttf",
						bolditalics: "./fonts/Roboto-BoldItalic.ttf",
					},
					AdorshoLipi: {
						normal: "./fonts/AdorshoLipi.ttf",
					},
				};

				const printer = new pdfMakePrinter(fontDescriptors);

				const doc = printer.createPdfKitDocument(docDefination);

				doc.pipe(
					fs.createWriteStream(reportPath).on("error", (err) => {
						console.error(err.message);
					})
				);

				doc.on("end", () => {
					console.log("PDF successfully created and stored");
				});

				doc.end();

				res.setHeader("Content-Type", "application/pdf");
				res.setHeader(
					"Content-Disposition",
					'inline; filename="' + reportName + '"'
				);
				doc.pipe(res);
			} catch (error) {
				return next(error);
			}
		};

		return generatePdf(docDefination, res);
	} catch (error) {
		return next(error);
	}
};
