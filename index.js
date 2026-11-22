import express from 'express';
import cors from "cors";
import "dotenv/config";
import { MongoClient, ObjectId } from 'mongodb';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)


const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
// app.use(cors());
app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);


const client = new MongoClient(`mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@ac-gzaii2b-shard-00-00.lmhje2l.mongodb.net:27017,ac-gzaii2b-shard-00-01.lmhje2l.mongodb.net:27017,ac-gzaii2b-shard-00-02.lmhje2l.mongodb.net:27017/?ssl=true&replicaSet=atlas-mherdt-shard-0&authSource=admin`);

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}

const connectedClient = await connectToMongoDB();
const database = connectedClient.db("phWedPlanDB");
const users = database.collection("user");
const services = database.collection("services");
const bookings = database.collection("bookings");
const payments = database.collection("payments");
const transactions = database.collection("transactions");


app.get('/', (req, res) => {
    res.send('WedPlan is looping!');
});

app.get('/users', async (req, res) => {
    const cursor = users.find({});
    const result = await cursor.toArray();
    res.send(result);
})

app.get('/users/:id/premium', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await users.findOne(query);
    res.send(result);
})

// get user profile
// app.get("/users/:id", async (req, res) => {
//   try {
//     const userId = req.params.id;

//     console.log("Requested User ID:", userId);

//     // Search by Better Auth id or MongoDB _id
//     const conditions = [
//       { id: userId },
//     ];

//     if (ObjectId.isValid(userId)) {
//       conditions.push({
//         _id: new ObjectId(userId),
//       });
//     }

//     const user = await users.findOne(
//       { $or: conditions },
//       {
//         projection: {
//           name: 1,
//           email: 1,
//           image: 1,
//           role: 1,
//           isBlocked: 1,
//           businessName: 1,
//           subscriptionPlan: 1,
//           subscriptionExpiresAt: 1,
//         },
//       }
//     );

//     console.log("Found User:", user);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: {
//         id: user.id || user._id.toString(),
//         name: user.name || "",
//         email: user.email || "",
//         image: user.image || null,
//         role: user.role || "user",
//         isBlocked: user.isBlocked ?? false,
//         businessName: user.businessName || "",
//         subscriptionPlan: user.subscriptionPlan || "Free",
//         subscriptionExpiresAt:
//           user.subscriptionExpiresAt || null,
//       },
//     });

//   } catch (error) {
//     console.error("Profile fetch error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch profile",
//     });
//   }
// });

// get user profile
app.get("/users/:id", async (req, res) => {
    try {
        const userId = req.params.id;

        const conditions = [{ id: userId }];

        if (ObjectId.isValid(userId)) {
            conditions.push({
                _id: new ObjectId(userId),
            });
        }

        const user = await users.findOne(
            { $or: conditions },
            {
                projection: {
                    name: 1,
                    email: 1,
                    image: 1,
                    role: 1,
                    isBlocked: 1,
                    businessName: 1,
                    phone: 1,
                    city: 1,
                    bio: 1,
                    subscriptionPlan: 1,
                    subscriptionExpiresAt: 1,
                },
            }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                ...user,
                id: user.id || user._id.toString(),
            },
        });
    } catch (error) {
        console.error("GET profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch profile",
        });
    }
});

// update user profile
app.patch("/users/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            businessName,
            phone,
            city,
            bio,
            image,
        } = req.body;

        const updateData = {
            name,
            businessName,
            phone,
            city,
            bio,
        };

        // image পাঠানো হলে তবেই update হবে
        if (image !== undefined) {
            updateData.image = image;
        }

        const result = await users.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: updateData,
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({
                success: false,
                message: "User not found",
            });
        }

        const updatedUser = await users.findOne({
            _id: new ObjectId(id),
        });

        res.send({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser,
        });
    } catch (error) {
        console.error("Update user error:", error);

        res.status(500).send({
            success: false,
            message: "Failed to update profile",
        });
    }
});

app.get("/admin/users", async (req, res) => {
    try {
        const result = await users
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        res.status(200).json(result);
    } catch (error) {
        console.error("GET /admin/users ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch users",
        });
    }
});

app.patch("/admin/users/:id/status",
    async (req, res) => {
        try {
            const { id } = req.params;
            const { isBlocked } = req.body;

            if (typeof isBlocked !== "boolean") {
                return res.status(400).json({
                    message: "Invalid account status",
                });
            }

            const result = await users.updateOne(
                {
                    _id: new ObjectId(id),
                    role: { $ne: "admin" },
                },
                {
                    $set: {
                        isBlocked,
                        updatedAt: new Date(),
                    },
                }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    message: "User not found or cannot be updated",
                });
            }

            return res.status(200).json({
                success: true,
                message: "User status updated successfully",
            });
        } catch (error) {
            console.error("UPDATE USER ERROR:", error);

            res.status(500).json({
                message: "Failed to update user",
            });
        }
    }
);


//services related apis

// app.post('/services', async (req, res) => {
//     const job = req.body;
//     const result = await services.insertOne(job);
//     res.send(result);
// })


app.get("/services", async (req, res) => {
    try {
        const { search, category, location, sort } = req.query;

        // Only approved services
        const query = {
            $expr: {
                $eq: [
                    { $toUpper: { $ifNull: ["$status", ""] } },
                    "APPROVED",
                ],
            },
        };

        // Search filter
        if (search && search.trim()) {
            const escapedSearch = String(search).replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            const searchRegex = new RegExp(escapedSearch, "i");

            query.$or = [
                { serviceName: searchRegex },
                { description: searchRegex },
                { category: searchRegex },
            ];
        }

        // Category filter
        if (category && category !== "all") {
            const escapedCategory = String(category).replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            query.category = {
                $regex: `^${escapedCategory}$`,
                $options: "i",
            };
        }

        // Location filter
        if (location && location.trim()) {
            const escapedLocation = String(location).replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            query.location = {
                $regex: escapedLocation,
                $options: "i",
            };
        }

        // Sorting
        let sortOption = { createdAt: -1 };

        if (sort === "price-low") {
            sortOption = { price: 1 };
        } else if (sort === "price-high") {
            sortOption = { price: -1 };
        }

        // Fetch services
        const result = await services
            .find(query)
            .sort(sortOption)
            .toArray();

        res.status(200).send({
            success: true,
            total: result.length,
            services: result,
        });

    } catch (error) {
        console.error("GET /services ERROR:", error);

        res.status(500).send({
            success: false,
            message: "Failed to fetch services",
        });
    }
});


// app.post("/services", async (req, res) => {
//   try {
//     const service = req.body;
//     const result = await services.insertOne(service);

//     res.status(201).send({
//       success: true,
//       message: "Service added successfully",
//       insertedId: result.insertedId,
//     });
//   } catch (error) {
//     console.error("Add service error:", error);

//     res.status(500).send({
//       success: false,
//       message: "Failed to add service",
//     });
//   }
// });

app.post("/services", async (req, res) => {
    try {
        const serviceData = req.body;

        const newService = {
            ...serviceData,
            // vendorId: req.user.uid, // Authentication middleware থেকে
            status: "Pending",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await services.insertOne(newService);

        console.log("Inserted successfully:", result.insertedId);

        return res.status(201).json({
            success: true,
            message: "Service created successfully",
            data: {
                insertedId: result.insertedId,
            },
        });
    } catch (error) {
        console.error("POST /services ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create service",
        });
    }
});

app.put("/services/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            serviceName,
            category,
            price,
            location,
            description,
            image,
        } = req.body;

        if (
            !serviceName ||
            !category ||
            !price ||
            !location
        ) {
            return res.status(400).send({
                message: "Required fields are missing",
            });
        }

        const result = await services.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    serviceName,
                    category,
                    price: Number(price),
                    location,
                    description,
                    image,
                    updatedAt: new Date(),
                },
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).send({
                message: "Service not found",
            });
        }

        res.send({
            success: true,
            message: "Service updated successfully",
        });

    } catch (error) {
        console.error("Update service error:", error);

        res.status(500).send({
            message: "Internal server error",
        });
    }
});

// app.get('/services', async (req, res) => {
//     const cursor = services.find({});
//     const result = await cursor.toArray();
//     res.send(result);
// })

// app.get("/services", async (req, res) => {
//     try {
//         const result = await services.find({
//             $expr: {
//                 $eq: [
//                     { $toUpper: "$status" },
//                     "APPROVED",
//                 ],
//             },
//         }).toArray();

//         res.status(200).send(result);
//     } catch (error) {
//         console.error("GET /services ERROR:", error);

//         res.status(500).send({
//             message: "Failed to fetch services",
//         });
//     }
// });

// for sercices based on plan 

app.get("/vendor/services/count/:vendorId", async (req, res) => {
    try {
        const { vendorId } = req.params;

        if (!vendorId) {
            return res.status(400).send({
                success: false,
                message: "Vendor ID is required.",
            });
        }

        const count = await services.countDocuments({
            vendorId: vendorId,
        });

        return res.status(200).send({
            success: true,
            count,
            limit: 3,
            subscriptionPlan: "free",
        });

    } catch (error) {
        console.error("Service count error:", error);

        return res.status(500).send({
            success: false,
            message: "Failed to fetch service count.",
        });
    }
});


// app.post("/services", async (req, res) => {
//     try {
//         // 1. Verify Better Auth session
//         const session = await auth.api.getSession({
//             headers: fromNodeHeaders(req.headers),
//         });

//         if (!session?.user) {
//             return res.status(401).send({
//                 message: "Please login first.",
//             });
//         }

//         // 2. Find authenticated vendor
//         const vendor = await users.findOne({
//             email: session.user.email,
//         });

//         if (!vendor) {
//             return res.status(404).send({
//                 message: "User not found.",
//             });
//         }

//         // 3. Verify vendor role
//         if (vendor.role?.toLowerCase() !== "vendor") {
//             return res.status(403).send({
//                 message: "Only vendors can publish services.",
//             });
//         }

//         // 4. Check blocked account
//         if (vendor.isBlocked === true) {
//             return res.status(403).send({
//                 message: "Your account has been blocked.",
//             });
//         }

//         // 5. Get service information
//         const {
//             serviceName,
//             category,
//             description,
//             price,
//             location,
//             image,
//         } = req.body;

//         // 6. Validate required fields
//         if (
//             typeof serviceName !== "string" ||
//             !serviceName.trim() ||
//             typeof category !== "string" ||
//             !category.trim() ||
//             typeof description !== "string" ||
//             !description.trim() ||
//             typeof location !== "string" ||
//             !location.trim() ||
//             typeof image !== "string" ||
//             !image.trim() ||
//             price === "" ||
//             price === null ||
//             price === undefined ||
//             !Number.isFinite(Number(price)) ||
//             Number(price) <= 0
//         ) {
//             return res.status(400).send({
//                 message: "Please provide all required service information.",
//             });
//         }

//         // 7. Get subscription plan

//         const subscriptionPlan = String(
//             vendor.subscriptionPlan || "free"
//         ).trim().toLowerCase();

//         if (subscriptionPlan === "free") {
//             const vendorServiceCount = await services.countDocuments({
//                 vendorId: session.user.id,
//             });

//             if (vendorServiceCount >= 3) {
//                 return res.status(403).send({
//                     success: false,
//                     code: "SERVICE_LIMIT_REACHED",
//                     message:
//                         "You have already submitted 3 services. Upgrade to Premium to publish unlimited services.",
//                 });
//             }
//         }


//         // 9. Prepare service data
//         const newService = {
//             serviceName: serviceName.trim(),
//             category: category.trim(),
//             description: description.trim(),
//             price: Number(price),
//             location: location.trim(),
//             image: image.trim(),

//             vendorId: session.user.id,

//             // Always Pending until admin approval
//             status: "Pending",

//             createdAt: new Date(),
//             updatedAt: new Date(),
//         };

//         // 10. Insert service
//         const result = await services.insertOne(newService);

//         return res.status(201).send({
//             success: true,
//             message: "Service submitted successfully. Waiting for admin approval.",
//             insertedId: result.insertedId,
//         });

//     } catch (error) {
//         console.error("POST /services ERROR:", error);

//         return res.status(500).send({
//             success: false,
//             message: "Failed to create service.",
//         });
//     }
// });



// get single service by ID

app.get("/services/:serviceId", async (req, res) => {
    try {
        const { serviceId } = req.params;

        if (!ObjectId.isValid(serviceId)) {
            return res.status(400).send({
                success: false,
                message: "Invalid service ID",
            });
        }

        const service = await services.findOne({
            _id: new ObjectId(serviceId),
        });

        if (!service) {
            return res.status(404).send({
                success: false,
                message: "Service not found",
            });
        }

        // const status = String(service.status || "").toLowerCase();

        // if (status !== "APPROVED" || service.isActive !== true) {
        //   return res.status(404).send({
        //     success: false,
        //     message: "Service is not available",
        //   });
        // }

        let vendor = null;

        if (service.vendorId) {
            const vendorId = String(service.vendorId);

            vendor = await users.findOne(
                {
                    _id: ObjectId.isValid(vendorId)
                        ? new ObjectId(vendorId)
                        : vendorId,
                    role: "vendor",
                },
                {
                    projection: {
                        name: 1,
                        email: 1,
                        image: 1,
                        businessName: 1,
                    },
                }
            );
        }

        res.status(200).send({
            success: true,
            service: {
                ...service,
                _id: service._id.toString(),
                id: service._id.toString(),
                vendor: vendor
                    ? {
                        id: vendor._id.toString(),
                        name: vendor.name,
                        email: vendor.email,
                        image: vendor.image,
                        businessName: vendor.businessName,
                    }
                    : null,
            },
        });
    } catch (error) {
        console.error("Get service by ID error:", error);

        res.status(500).send({
            success: false,
            message: "Failed to load service details",
        });
    }
});


app.get("/vendor/services", async (req, res) => {
    try {
        const { vendorId } = req.query;

        if (!vendorId) {
            return res.status(400).json({
                success: false,
                message: "vendorId is required",
            });
        }

        const result = await services
            .find({ vendorId })
            .sort({ createdAt: -1 })
            .toArray();

        return res.status(200).json(result);
    } catch (error) {
        console.error("Get vendor services error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch vendor services",
        });
    }
});

app.get("/admin/services", async (req, res) => {
    try {
        const result = await services
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        res.status(200).json(result);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch services",
        });
    }
});

app.patch("/admin/services/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const normalizedStatus = status?.toUpperCase();

        if (!["APPROVED", "REJECTED"].includes(normalizedStatus)) {
            return res.status(400).json({
                message: "Invalid service status",
            });
        }

        const result = await services.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status: normalizedStatus,
                    updatedAt: new Date(),
                },
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                message: "Service not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Service status updated",
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update service status",
        });
    }
});

// app.delete('/services/:id', async (req, res) => {
//     const id = req.params.id;

//     const result = await services.deleteOne({
//         _id: new ObjectId(id)
//     });

//     res.send(result);
// });

app.delete("/services/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID",
            });
        }

        const result = await services.deleteOne({
            _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Service not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Service deleted successfully",
        });

    } catch (error) {
        console.error("Delete service error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete service",
        });
    }
});


// app.get("/services", async (req, res) => {
//   try {
//     const { search, category, location, sort } = req.query;

//     const query = {
//       $expr: {
//         $eq: [
//           { $toUpper: { $ifNull: ["$status", ""] } },
//           "APPROVED",
//         ],
//       },
//     };

//     // Search
//     if (search) {
//       const escapedSearch = String(search).replace(
//         /[.*+?^${}()|[\]\\]/g,
//         "\\$&"
//       );

//       const regex = new RegExp(escapedSearch, "i");

//       query.$or = [
//         { serviceName: regex },
//         { description: regex },
//         { category: regex },
//       ];
//     }

//     // Category
//     if (category && category !== "all") {
//       const escapedCategory = String(category).replace(
//         /[.*+?^${}()|[\]\\]/g,
//         "\\$&"
//       );

//       query.category = {
//         $regex: `^${escapedCategory}$`,
//         $options: "i",
//       };
//     }

//     // Location
//     if (location) {
//       const escapedLocation = String(location).replace(
//         /[.*+?^${}()|[\]\\]/g,
//         "\\$&"
//       );

//       query.location = {
//         $regex: escapedLocation,
//         $options: "i",
//       };
//     }

//     // Sorting
//     let sortOption = { createdAt: -1 };

//     if (sort === "price-low") {
//       sortOption = { price: 1 };
//     } else if (sort === "price-high") {
//       sortOption = { price: -1 };
//     }

//     const services = await servicesCollection
//       .find(query)
//       .sort(sortOption)
//       .toArray();

//     res.status(200).send({
//       success: true,
//       total: services.length,
//       services,
//     });

//   } catch (error) {
//     console.error("Get services error:", error);

//     res.status(500).send({
//       success: false,
//       message: "Failed to fetch services",
//     });
//   }
// });



// For Booking API


app.post("/bookings", async (req, res) => {
    try {
        const {
            customerId,
            serviceId,
            eventDate,
            eventLocation,
            message,
        } = req.body;

        if (!customerId || !serviceId || !eventDate || !eventLocation) {
            return res.status(400).json({
                success: false,
                message: "Required fields are missing",
            });
        }

        const newBooking = {
            customerId,
            serviceId,
            eventDate,
            eventLocation,
            message,
            status: "Pending",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await bookings.insertOne(newBooking);

        return res.status(201).json({
            success: true,
            message: "Booking created successfully",
            data: {
                insertedId: result.insertedId,
            },
        });
    } catch (error) {
        console.error("POST /bookings ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create booking",
        });
    }
});



app.get('/customer/bookings', async (req, res) => {
    const cursor = bookings.find({});
    const result = await cursor.toArray();
    res.send(result);
})

app.get("/vendor/bookings", async (req, res) => {
    try {
        const { vendorId } = req.query;

        if (!vendorId) {
            return res.status(400).json({
                success: false,
                message: "vendorId is required",
            });
        }

        // Find this vendor's services
        const vendorServices = await services
            .find({ vendorId: String(vendorId) })
            .toArray();

        const serviceIds = vendorServices.map((service) =>
            service._id.toString()
        );

        if (serviceIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
            });
        }

        // Find bookings for these services
        const result = await bookings
            .find({ serviceId: { $in: serviceIds } })
            .sort({ createdAt: -1 })
            .toArray();

        // Add service and customer information
        const enrichedBookings = await Promise.all(
            result.map(async (booking) => {
                const service = vendorServices.find(
                    (item) =>
                        item._id.toString() === String(booking.serviceId)
                );

                const customerId = String(booking.customerId || "");

                let customer = null;

                if (customerId) {
                    const conditions = [{ id: customerId }];

                    if (ObjectId.isValid(customerId)) {
                        conditions.push({
                            _id: new ObjectId(customerId),
                        });
                    }

                    customer = await users.findOne(
                        { $or: conditions },
                        {
                            projection: {
                                name: 1,
                                email: 1,
                                image: 1,
                            },
                        }
                    );
                }

                return {
                    ...booking,
                    _id: booking._id.toString(),
                    service: service
                        ? {
                            serviceName: service.serviceName,
                            price: service.price,
                            category: service.category,
                        }
                        : null,
                    customer: customer
                        ? {
                            name: customer.name,
                            email: customer.email,
                            image: customer.image,
                        }
                        : null,
                };
            })
        );

        return res.status(200).json({
            success: true,
            data: enrichedBookings,
        });
    } catch (error) {
        console.error("Vendor bookings error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch vendor bookings",
        });
    }
});

app.get("/vendor/bookings/:vendorId", async (req, res) => {
    try {
        const { vendorId } = req.params;

        // 1. Find all services of this vendor
        const vendorServices = await services
            .find({ vendorId: vendorId })
            .toArray();

        // 2. Get all service IDs
        const serviceIds = vendorServices.map((service) =>
            String(service._id)
        );

        // 3. Find bookings for those services
        const vendorBookings = await bookings
            .find({
                serviceId: { $in: serviceIds },
            })
            .sort({ createdAt: -1 })
            .toArray();

        // 4. Attach service and customer information
        const result = await Promise.all(
            vendorBookings.map(async (booking) => {
                const service = vendorServices.find(
                    (item) => String(item._id) === String(booking.serviceId)
                );

                const customer = await users.findOne({
                    _id: new ObjectId(booking.customerId),
                });

                return {
                    ...booking,
                    service: service
                        ? {
                            _id: service._id,
                            serviceName: service.serviceName,
                            category: service.category,
                            price: service.price,
                            image: service.image,
                            location: service.location,
                        }
                        : null,
                    customer: customer
                        ? {
                            _id: customer._id,
                            name: customer.name,
                            email: customer.email,
                            image: customer.image,
                        }
                        : null,
                };
            })
        );

        res.status(200).send({
            success: true,
            total: result.length,
            data: result,
        });
    } catch (error) {
        console.error("Vendor bookings error:", error);

        res.status(500).send({
            success: false,
            message: "Failed to fetch vendor bookings",
        });
    }
});

// GET: Logged-in customer's bookings

app.get("/customer/bookings/:customerId", async (req, res) => {
    try {
        const { customerId } = req.params;

        const allBookings = await bookings.find({}).toArray();

        console.log("Requested ID:", customerId);
        console.log("Total Bookings:", allBookings.length);

        console.log(
            "Stored Customer IDs:",
            allBookings.map((b) => b.customerId)
        );

        // Get customer bookings
        const result = await bookings
            .find({ customerId })
            .sort({ createdAt: -1 })
            .toArray();

        console.log("Matched Bookings:", result.length);

        // Add service image and information
        const enrichedBookings = await Promise.all(
            result.map(async (booking) => {
                let service = null;

                if (booking.serviceId) {
                    const serviceId = booking.serviceId.toString();

                    // Find service by ObjectId
                    if (ObjectId.isValid(serviceId)) {
                        service = await services.findOne({
                            _id: new ObjectId(serviceId),
                        });
                    }

                    // Find service by string ID
                    if (!service) {
                        service = await services.findOne({
                            _id: serviceId,
                        });
                    }
                }

                console.log("Found Service:", service);

                return {
                    ...booking,

                    service: service
                        ? {
                            serviceName: service.serviceName,
                            image:
                                service.images?.[0] ||
                                service.image ||
                                service.imageUrl ||
                                "",
                            category: service.category,
                            price: service.price,
                        }
                        : null,
                };
            })
        );

        return res.status(200).json({
            success: true,
            message: "Bookings fetched successfully",
            data: enrichedBookings,
        });

    } catch (error) {
        console.error("GET BOOKINGS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch bookings",
        });
    }
});



// Helper: find customer using string or ObjectId
const findCustomer = async (customerId) => {
    if (!customerId) return null;

    const conditions = [{ _id: customerId }];

    if (ObjectId.isValid(customerId)) {
        conditions.push({ _id: new ObjectId(customerId) });
    }

    return users.findOne({ $or: conditions });
};

// GET: Get bookings for all services owned by this vendor
app.get("/vendor/bookings/:vendorId", async (req, res) => {
    try {
        const { vendorId } = req.params;

        const vendorServices = await services
            .find({ vendorId: String(vendorId) })
            .toArray();

        const serviceIds = vendorServices.map((service) =>
            String(service._id)
        );

        if (!serviceIds.length) {
            return res.status(200).send({
                success: true,
                total: 0,
                data: [],
            });
        }

        const vendorBookings = await bookings
            .find({
                serviceId: { $in: serviceIds },
            })
            .sort({ createdAt: -1 })
            .toArray();

        const result = await Promise.all(
            vendorBookings.map(async (booking) => {
                const service = vendorServices.find(
                    (item) => String(item._id) === String(booking.serviceId)
                );

                const customer = await findCustomer(
                    String(booking.customerId)
                );

                return {
                    ...booking,
                    customer: customer
                        ? {
                            _id: customer._id,
                            name: customer.name,
                            email: customer.email,
                            image: customer.image,
                        }
                        : null,
                    service: service
                        ? {
                            _id: service._id,
                            serviceName: service.serviceName,
                            name: service.serviceName,
                            category: service.category,
                            price: service.price,
                            image: service.image,
                            location: service.location,
                        }
                        : null,
                };
            })
        );

        res.status(200).send({
            success: true,
            total: result.length,
            data: result,
        });
    } catch (error) {
        console.error("Get vendor bookings error:", error);

        res.status(500).send({
            success: false,
            message: "Failed to fetch vendor bookings",
        });
    }
});

// PATCH: Accept or reject a pending booking
app.patch(
    "/vendor/bookings/:vendorId/:bookingId/status",
    async (req, res) => {
        try {
            const { vendorId, bookingId } = req.params;
            const { status } = req.body;

            if (!["Confirmed", "Rejected"].includes(status)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid booking status",
                });
            }

            if (!ObjectId.isValid(bookingId)) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid booking ID",
                });
            }

            // 1. Find services belonging to this vendor
            const vendorServices = await services
                .find({ vendorId: String(vendorId) })
                .project({ _id: 1 })
                .toArray();

            const serviceIds = vendorServices.map((service) =>
                String(service._id)
            );

            if (!serviceIds.length) {
                return res.status(403).send({
                    success: false,
                    message: "You do not own this booking",
                });
            }

            // 2. Update only if booking belongs to vendor's service
            // and its current status is Pending.
            const updatedBooking = await bookings.findOneAndUpdate(
                {
                    _id: new ObjectId(bookingId),
                    serviceId: { $in: serviceIds },
                    status: {
                        $in: ["Pending", "pending", "PENDING"],
                    },
                },
                {
                    $set: {
                        status,
                        updatedAt: new Date(),
                    },
                },
                {
                    returnDocument: "after",
                }
            );

            if (!updatedBooking) {
                return res.status(409).send({
                    success: false,
                    message:
                        "Booking not found, does not belong to you, or has already been processed.",
                });
            }

            res.status(200).send({
                success: true,
                message: `Booking ${status.toLowerCase()} successfully`,
                data: updatedBooking,
            });
        } catch (error) {
            console.error("Update booking status error:", error);

            res.status(500).send({
                success: false,
                message: "Failed to update booking status",
            });
        }
    }
);


// PATCH: Cancel pending booking
app.patch("/customer/bookings/:customerId/:bookingId/cancel",
    async (req, res) => {
        try {
            const { customerId, bookingId } = req.params;

            if (!ObjectId.isValid(bookingId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid booking ID",
                });
            }

            const result = await bookings.updateOne(
                {
                    _id: new ObjectId(bookingId),
                    customerId,
                    status: { $regex: /^pending$/i },
                },
                {
                    $set: {
                        status: "Cancelled",
                        updatedAt: new Date(),
                    },
                }
            );

            if (result.matchedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Booking not found or cannot be cancelled",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Booking cancelled successfully",
            });
        } catch (error) {
            console.error("CANCEL BOOKING ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to cancel booking",
            });
        }
    }
);


// Admin Dashboard Stats API
app.get("/admin/dashboard/stats", async (req, res) => {
    try {
        const [
            totalUsers,
            totalVendors,
            totalCustomers,
            publishedServices,
            totalTransactions,
            blockedUsers,
            pendingServices,
        ] = await Promise.all([
            // Total users
            users.countDocuments({}),

            // Total vendors
            users.countDocuments({
                role: { $regex: /^vendor$/i },
            }),

            // Total customers
            users.countDocuments({
                role: { $regex: /^customer$/i },
            }),

            // Approved / Published services
            services.countDocuments({
                status: { $regex: /^APPROVED$/i },
            }),

            // Total transactions
            transactions.countDocuments({}),

            // Blocked users
            users.countDocuments({
                isBlocked: true,
            }),

            // Pending services
            services.countDocuments({
                status: { $regex: /^PENDING$/i },
            }),
        ]);

        // Active users = Total users - Blocked users
        const activeUsers = totalUsers - blockedUsers;

        return res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalVendors,
                totalCustomers,
                publishedServices,
                totalTransactions,
                activeUsers,
                blockedUsers,
                pendingServices,
            },
        });
    } catch (error) {
        console.error("Admin Dashboard Stats Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard statistics",
        });
    }
});


// app.post('/payments/checkout-verify', async (req, res) => {
//     const { sessionId } = req.body;

//     if(!sessionId) {
//         return res.send({success: false, message: 'Session ID is required'});
//     }

//     const {
//         status,
//         payment_status,
//         customer_email,
//         metadata,
//         payment_intent
//     } = await stripe.checkout.sessions.retrieve(sessionId);

//     if (status === 'complete' && payment_status === 'paid') {

//         const sessionQuery = { sessionId };

//         const existingPayment = await payments.findOne(sessionQuery);
//         if(existingPayment){
//             return res.send({success: false, message: 'Payment already verified'});
//         }

//         const payment = {
//             status,
//             payment_status,
//             customer_email,
//             userId: metadata.vendorId,
//             payment_date: new Date(),
//             payment_intent
//         }

//         const result = await payments.insertOne(payment);

//         const query = {_id:  new ObjectId(userId) }

//         const updateDoc = {
//             $set: {
//                 subscriptionPlan:metadata.plan,
//             }
//         }
//         const updateResult = await users.updateOne(
//             query,
//             updateDoc
//         )

//         res.send({success: true, result, updateResult});
//         return
//     }
//     res.send({success: false, message: 'Payment erification failed'});
// })

app.post("/payments/checkout-verify", async (req, res) => {
  try {
    // 1. Get session ID from frontend
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).send({
        success: false,
        message: "Session ID is required",
      });
    }

    // 2. Retrieve session from Stripe
    const checkoutSession =
      await stripe.checkout.sessions.retrieve(sessionId);

    const {
      status,
      payment_status,
      customer_email,
      metadata,
      payment_intent,
    } = checkoutSession;

    // 3. Verify payment status
    if (status !== "complete" || payment_status !== "paid") {
      return res.status(400).send({
        success: false,
        message: "Payment verification failed",
      });
    }

    // 4. Get vendor ID from Stripe metadata
    const vendorId = metadata?.vendorId;

    if (!vendorId) {
      return res.status(400).send({
        success: false,
        message: "Vendor ID missing from Stripe metadata",
      });
    }

    // 5. Get plan from metadata
    const plan = metadata?.plan || "premium";

    // 6. Find existing payment
    const existingPayment = await payments.findOne({
      sessionId: checkoutSession.id,
    });

    let paymentResult = null;

    // 7. Save payment only if it doesn't exist
    if (!existingPayment) {
      const payment = {
        sessionId: checkoutSession.id,
        payment_intent:
          typeof payment_intent === "string"
            ? payment_intent
            : payment_intent?.id || null,

        userId: vendorId,
        vendorId,

        customer_email:
          customer_email || null,

        amount:
          (checkoutSession.amount_total || 0) / 100,

        currency:
          checkoutSession.currency?.toUpperCase() || "USD",

        status,
        payment_status,

        plan,

        payment_date: new Date(),

        createdAt: new Date(),
      };

      paymentResult = await payments.insertOne(payment);
    }

    // 8. Find vendor in MongoDB
    let userQuery;

    // If vendor ID is a valid MongoDB ObjectId
    if (ObjectId.isValid(vendorId) && String(new ObjectId(vendorId)) === vendorId) {
      userQuery = {
        _id: new ObjectId(vendorId),
      };
    } else {
      // If vendor ID is a string
      userQuery = {
        $or: [
          { id: vendorId },
          { _id: vendorId },
        ],
      };
    }

    // 9. Update vendor subscription
    const updateDoc = {
      $set: {
        subscriptionPlan: plan,
        premiumActivatedAt: new Date(),
        premiumPaymentId: checkoutSession.id,
      },
    };

    const updateResult = await users.updateOne(
      userQuery,
      updateDoc
    );

    // 10. If vendor not found
    if (updateResult.matchedCount === 0) {
      console.error("Vendor not found:", vendorId);

      return res.status(404).send({
        success: false,
        message: "Payment verified but vendor not found",
        vendorId,
        paymentSaved: !!existingPayment || !!paymentResult,
      });
    }

    // 11. Send successful response
    return res.send({
      success: true,
      message: "Payment verified and Premium activated successfully",

      vendorId,

      subscriptionPlan: plan,

      payment: {
        alreadySaved: !!existingPayment,
        insertedId: paymentResult?.insertedId || null,
      },

      userUpdate: {
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Checkout verification error:", error);

    return res.status(500).send({
      success: false,
      message: "Server error during payment verification",
      error: error.message,
    });
  }
});

app.listen(port, () => {
    console.log(`WedPlan app listening on port ${port}`);
});