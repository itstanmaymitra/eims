// { "_id" : 1, "item" : "abc", "price" : 10, "quantity" : 2, "date" : ISODate("2014-01-01T08:00:00Z") }
// { "_id" : 2, "item" : "jkl", "price" : 20, "quantity" : 1, "date" : ISODate("2014-02-03T09:00:00Z") }
// { "_id" : 3, "item" : "xyz", "price" : 5, "quantity" : 5, "date" : ISODate("2014-02-03T09:05:00Z") }
// { "_id" : 4, "item" : "abc", "price" : 10, "quantity" : 10, "date" : ISODate("2014-02-15T08:00:00Z") }
// { "_id" : 5, "item" : "xyz", "price" : 5, "quantity" : 10, "date" : ISODate("2014-02-15T09:05:00Z") }
// { "_id" : 6, "item" : "xyz", "price" : 5, "quantity" : 5, "date" : ISODate("2014-02-15T12:05:10Z") }
// { "_id" : 7, "item" : "xyz", "price" : 5, "quantity" : 10, "date" : ISODate("2014-02-15T14:12:12Z") }

const { isValidObjectId } = require("mongoose");



// db.reports.aggregate(
//     [
//         {$sort: {date: -1}},
//         {
//             $group: 
//             {
//                 _id: "$date",
//                 reports: {
//                      $push:  {
//                         officeUser: "$office"
//                     }
//                 }
//             }
//         }
//     ]
// )

db.reports.aggregate(
    [
        { $match: { office: ObjectId('60f740a9a58e941db4667eee') } },
        {
            $group: 
            {
                _id: "$date",
                reportsByDate: {
                     $push:  {
                        timeSlot: "$timeSlot",
                        startTime: "$startTime",
                        endTime: "$endTime",
                        duration: "$duration",
                        suffered_consumers: "$suffered_consumers",
                        interruption_area: "$interruption_area",
                        reason: "$reason"
                    }
                }
            }
        },
        { $sort: { _id: -1 } },
        { $skip: (1 - 1) * 5 },
        { $limit: 5 }
    ]
)

db.reports.aggregate(
    [
        {
            $lookup: {
                from: "officeusers",
                localField: "office",
                foreignField: "_id",
                as: "office" 
            }
        },
        {$unwind: '$office'},
        { 
            $project: {
                "date": 1,
                "timeSlot": 1,
                "startTime": 1,
                "endTime": 1,
                "duration": 1,
                "suffered_consumers": 1,
                "interruption_area": 1,
                "reason": 1,
                "office.officeAdmin": 1,
                "office.officeName": 1
            }
        },
        {
            $match: {
                "office.officeAdmin": ObjectId('60f586fd0cc7030a5858da3a'),
                date: new Date(`2021-08-06T00:00:00.000+00:00`)
            }
        },
        {
            $group: 
            {
                _id: "$date",
                reportsByDate: {
                     $push:  {
                        timeSlot: "$timeSlot",
                        startTime: "$startTime",
                        endTime: "$endTime",
                        duration: "$duration",
                        suffered_consumers: "$suffered_consumers",
                        interruption_area: "$interruption_area",
                        reason: "$reason",
                        office: "$office"
                    }
                }
            }
        },
    ]
)

db.reports.aggregate(
    [
        {
            $lookup: {
                from: "officeusers",
                localField: "office",
                foreignField: "_id",
                as: "office"
            },
        },
        {$unwind: '$office'},
        { 
            $project: {
                "date": 1,
                "duration": 1,
                "suffered_consumers": 1,
                "office": 1,
            }
        },  
        {
            $match: {
                "office.officeAdmin": userId,
                date: new Date(`${date}T00:00:00.000+00:00`)
            }
        },
        {
            $group: {
                _id: "$date",
                reportsByDate: {
                    $push:  {
                        duration: "$duration",
                        suffered_consumers: "$suffered_consumers",
                        office: "$office"
                    }
               }
            }
        },
        { 
            $project: {
                _id: 1,
                "reportsByDate.duration": 1,
                "reportsByDate.suffered_consumers": 1,
                "reportsByDate.office.officeName": 1,
                "reportsByDate.office._id": 1,
            }
        },
        { $sort: { _id: -1 } },
    ]
);


// Total duration By Date
db.reports.aggregate(
    [
        { $match: { office: ObjectId("6113dfc2b39d440015030a1e") } },
        {
            $group: 
            {
                _id: "$date",
                duration: {
                    $sum: "$duration"
                }
            }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 }
    ]
);

// Total Count of interruption
db.reports.aggregate(
    [
        { $match: { office: ObjectId("6113dfc2b39d440015030a1e") } },
        {
            $group: 
            {
                _id: "$date",
                count:{$sum:1}
            }
        },
    ]
);

db.reports.aggregate(
    [
        { $match: { office: ObjectId("6113dfc2b39d440015030a1e") } },
        { $sort: { date: -1 } },
        { $limit: 30 },
        {
            $group: 
            {
                _id: null,
                duration: {
                    $sum: "$duration"
                }
            }
        }
    ]
);


// Office Admin - totalDuration and totalSufferedConsumers
db.reports.aggregate (
    [
        {
            $lookup: {
                from: "officeusers",
                localField: "office",
                foreignField: "_id",
                as: "office" 
            }
        },
        {$unwind: '$office'},
        { 
            $project: {
                "date": 1,
                "duration": 1,
                "suffered_consumers": 1,
                "office.officeAdmin": 1,
            }
        },
        {
            $match: {
                "office.officeAdmin": ObjectId('6113dda1b39d440015030a0f')
            }
        },
        { $sort: { date: -1 } },
        { $limit: 15 },
        {
            $group: 
            {
                _id: "$date",
                duration: {
                    $sum: "$duration"
                },
                suffered_consumers: {
                    $sum: "$suffered_consumers"
                }
            }
        }
    ]
);


// Officewise total Duration and total suffered consumers (pie chart)
db.reports.aggregate (
    [
        {
            $lookup: {
                from: "officeusers",
                localField: "office",
                foreignField: "_id",
                as: "office" 
            }
        },
        {$unwind: '$office'},
        { 
            $project: {
                "duration": 1,
                "suffered_consumers": 1,
                "office.officeAdmin": 1,
                "office._id": 1,
                "office.officeName": 1
            }
        },
        {
            $match: {
                "office.officeAdmin": ObjectId('6113dda1b39d440015030a0f')
            }
        },
        { $sort: { date: -1 } },
        { $limit: 15 },
        {
            $group: 
            {
                _id: {id: "$office._id", officName: "$office.officeName"},
                duration: {
                    $sum: "$duration"
                },
                suffered_consumers: {
                    $sum: "$suffered_consumers"
                }
            }
        }
    ]
);

// Total count + total duration
db.reports.aggregate (
    [
        { $sort: { date: -1 } },
        { $limit: 30 },
        {
            $lookup: {
                from: "officeusers",
                localField: "office",
                foreignField: "_id",
                as: "office" 
            }
        },
        {$unwind: '$office'},
        { 
            $project: {
                "date": 1,
                "duration": 1,
                "suffered_consumers": 1,
                "office.officeAdmin": 1,
            }
        },
        {
            $match: {
                "office.officeAdmin": ObjectId('6113dda1b39d440015030a0f')
            }
        },
        {
            $group: 
            {
                _id: null,
                duration: {
                    $sum: "$duration"
                },
                suffered_consumers: {
                    $sum: "$suffered_consumers"
                },
                count:{$sum:1}
            }
        }
    ]
);
