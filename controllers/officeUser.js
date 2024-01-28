const fs = require("fs");
const path = require("path");

// packages
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const pdfMakePrinter = require("pdfmake/src/printer");

// models
const Report = require("../models/report");
const OfficeUser = require("../models/officeUser");
const GeneratedReport = require("../models/generatedReport");

exports.getDashboard = async (req, res, next) => {
	const userId = new mongoose.Types.ObjectId(req.session.userId);

	try {
		const office = await OfficeUser.findById(userId).select("officeName");

		const totalReports = await Report.aggregate([
			{ $match: { office: userId } },
			{ $sort: { date: -1 } },
			{ $limit: 30 },
			{
				$group: {
					_id: null,
					count: {
						$sum: 1,
					},
					duration: {
						$sum: "$duration",
					},
				},
			},
		]);

		const reportsByDate = await Report.aggregate([
			{ $match: { office: userId } },
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

		const recentReports = await Report.aggregate([
			{ $match: { office: userId } },
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

		const generatedReports = await GeneratedReport.find({ office: userId })
			.select("-reports")
			.sort({ createdAt: -1 })
			.limit(5);

		const timeConvert = (n) => {
			const num = n;
			const hours = num / 60;
			const rhours = Math.floor(hours);
			const minutes = (hours - rhours) * 60;
			const rminutes = Math.round(minutes);
			return rhours + " hour(s) " + rminutes + " minute(s)";
		};

		return res.render("officeUser/dashboard", {
			pageTitle: "Dashboard",
			isAuthenticated: req.session.isAuthenticated,
			userType: req.session.userType,
			errorMessage: req.flash("errorMessage"),
			successMessage: req.flash("successMessage"),
			path: "/office-user/dashboard",
			totalDuration: totalReports.length
				? timeConvert(totalReports[0].duration)
				: timeConvert(0),
			totalInterruptions: totalReports.length ? totalReports[0].count : 0,
			office,
			durationByDate: reportsByDate,
			sufferedConsumersByDate: reportsByDate,
			recentReports,
			generatedReports,
		});
	} catch (error) {
		return next(error);
	}
};

exports.getAddReport = (req, res, next) => {
	res.render("officeUser/addReport", {
		pageTitle: "Add Report",
		isAuthenticated: req.session.isAuthenticated,
		userType: req.session.userType,
		errorMessage: req.flash("errorMessage"),
		successMessage: req.flash("successMessage"),
		path: "/office-user/add-report",
	});
};

exports.postAddReport = async (req, res, next) => {
	const {
		date,
		timeSlot,
		startTime,
		endTime,
		suffered_consumers,
		interruption_area,
		reason,
	} = req.body;

	const getDuration = (startTime, endTime) => {
		const start = Number(startTime.split(":")[0]);
		const end = Number(endTime.split(":")[0]);
		const currentDate = new Date().toLocaleDateString();
		const startDate = new Date(`${currentDate} ${startTime}`);
		const endDate = new Date(`${currentDate} ${endTime}`);

		if (start > end) {
			const newEndDate = new Date(endDate.setDate(endDate.getDate() + 1));
			return (newEndDate - startDate) / 60000;
		}

		return (endDate - startDate) / 60000;
	};

	const duration = getDuration(startTime, endTime);

	try {
		const report = await Report.create({
			date,
			timeSlot,
			startTime,
			endTime,
			duration,
			suffered_consumers: Number(suffered_consumers),
			interruption_area,
			reason,
			office: req.session.userId,
		});

		res.redirect("/office-user/reports");
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
					$match: {
						office: userId,
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

			return res.render("officeUser/reports", {
				pageTitle: "Reports",
				isAuthenticated: req.session.isAuthenticated,
				userType: req.session.userType,
				errorMessage: req.flash("errorMessage"),
				successMessage: req.flash("successMessage"),
				reports,
				path: "/office-user/reports",
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
						office: userId,
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

			return res.render("officeUser/reports", {
				pageTitle: "Reports",
				isAuthenticated: req.session.isAuthenticated,
				userType: req.session.userType,
				errorMessage: req.flash("errorMessage"),
				successMessage: req.flash("successMessage"),
				reports,
				path: "/office-user/reports",
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
				{ $match: { office: userId } },
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
				{ $match: { office: userId } },
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

			return res.render("officeUser/reports", {
				pageTitle: "Reports",
				isAuthenticated: req.session.isAuthenticated,
				userType: req.session.userType,
				errorMessage: req.flash("errorMessage"),
				successMessage: req.flash("successMessage"),
				reports,
				path: "/office-user/reports",
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
		const officeUser = await OfficeUser.findById(userId).select(
			"-password"
		);

		if (!officeUser) {
			req.flash(
				"errorMessage",
				"Couldn't find any user with this ID please login and try again."
			);
			return res.redirect("/office-user/settings");
		}

		res.render("officeUser/settings", {
			pageTitle: "Settings",
			isAuthenticated: req.session.isAuthenticated,
			userType: req.session.userType,
			errorMessage: req.flash("errorMessage"),
			successMessage: req.flash("successMessage"),
			user: officeUser,
			path: "/office-user/settings",
		});
	} catch (error) {
		return next(new Error(error));
	}
};

exports.postEditOfficeDetails = async (req, res, next) => {
	const userId = new mongoose.Types.ObjectId(req.session.userId);
	const { officeName, officeAddress, phone, password } = req.body;

	try {
		const officeUser = await OfficeUser.findById(userId);

		if (!officeUser) {
			req.flash(
				"errorMessage",
				"Couldn't find any user with this ID please login and try again."
			);
			return res.redirect("/office-user/settings");
		}

		const isMatch = await bcrypt.compare(password, officeUser.password);

		if (!isMatch) {
			req.flash("errorMessage", "Enter a valid password and try again.");
			return res.redirect("/office-user/settings");
		}

		officeUser.officeName = officeName;
		officeUser.officeAddress = officeAddress;
		officeUser.phone = phone;

		await officeUser.save();

		req.flash("successMessage", "Office details Updated Successfully");
		res.redirect("/office-user/settings");
	} catch (error) {
		return next(new Error(error));
	}
};

exports.postChangePassword = async (req, res, next) => {
	const userId = new mongoose.Types.ObjectId(req.session.userId);
	const { password, newPassword } = req.body;

	try {
		const officeUser = await OfficeUser.findById(userId);

		if (!officeUser) {
			req.flash(
				"errorMessage",
				"Couldn't find any user with this ID please login and try again."
			);
			return res.redirect("/office-user/settings");
		}

		const isMatch = await bcrypt.compare(password, officeUser.password);

		if (!isMatch) {
			req.flash(
				"errorMessage",
				"Enter a valid old password and try again."
			);
			return res.redirect("/office-user/settings");
		}

		const hashedPassword = await bcrypt.hash(newPassword, 12);

		officeUser.password = hashedPassword;

		await officeUser.save();

		req.flash("successMessage", "Office Password Changed Successfully.");
		res.redirect("/office-user/settings");
	} catch (error) {
		return next(new Error(error));
	}
};

exports.generateReport = async (req, res, next) => {
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
					$match: {
						office: userId,
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
				onModel: "OfficeUser",
			});

			return res.redirect("/office-user/generated-reports");
		} else if (fromDate && toDate) {
			totalReports = 1;

			reports = await Report.aggregate([
				{
					$match: {
						office: userId,
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
				onModel: "OfficeUser",
			});

			return res.redirect("/office-user/generated-reports");
		} else {
			const reportCount = await Report.aggregate([
				{ $match: { office: userId } },
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
				{ $match: { office: userId } },
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
				onModel: "OfficeUser",
			});

			return res.redirect("/office-user/generated-reports");
		}
	} catch (error) {
		return next(new Error(error));
	}
};

exports.getGeneratedReports = async (req, res, next) => {
	const userId = new mongoose.Types.ObjectId(req.session.userId);

	try {
		const generatedReports = await GeneratedReport.find({ office: userId })
			.select("-reports")
			.sort({ createdAt: -1 })
			.limit(10);

		return res.render("officeUser/generatedReports", {
			pageTitle: "Generated Reports",
			isAuthenticated: req.session.isAuthenticated,
			userType: req.session.userType,
			errorMessage: req.flash("errorMessage"),
			successMessage: req.flash("successMessage"),
			path: "/office-user/generated-reports",
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
					table: officeReport.table,
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
				englishFont: {
					font: "Roboto",
				},
				bengaliFont: {
					font: "AdorshoLipi",
				},
				tableRowDate: {
					color: "#1C1D32",
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
				// res.send(doc);
			} catch (error) {
				return next(error);
			}
		};

		return generatePdf(docDefination, res);
	} catch (error) {
		return next(error);
	}
};
