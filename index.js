import express from 'express';
import cors from "cors";
import "dotenv/config";

import { MongoClient } from 'mongodb';

import { ObjectId } from "mongodb";


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
const transactions = database.collection("transactions");


app.get('/', (req, res) => {
    res.send('WedPlan is looping!');
});

app.get('/users', async (req, res) => {
    const cursor = users.find({});
    const result = await cursor.toArray();
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

// app.get('/services', async (req, res) => {
//     const cursor = services.find({});
//     const result = await cursor.toArray();
//     res.send(result);
// })

app.get("/services", async (req, res) => {
    try {
        const result = await services.find({
            $expr: {
                $eq: [
                    { $toUpper: "$status" },
                    "APPROVED",
                ],
            },
        }).toArray();

        res.status(200).send(result);
    } catch (error) {
        console.error("GET /services ERROR:", error);

        res.status(500).send({
            message: "Failed to fetch services",
        });
    }
});

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

// app.get("/customer/bookings/:customerId", async (req, res) => {
//   try {
//     const { customerId } = req.params;

//     // Get customer bookings (আগের working query)
//     const result = await bookings
//       .find({ customerId })
//       .sort({ createdAt: -1 })
//       .toArray();

//     console.log("Requested ID:", customerId);
//     console.log("Matched Bookings:", result.length);

//     // Enrich booking data
//     const enrichedBookings = await Promise.all(
//       result.map(async (booking) => {
//         let service = null;
//         let vendor = null;

//         // Find service using serviceId
//         if (booking.serviceId) {
//           const serviceId = booking.serviceId.toString();

//           // First try string ID
//           service = await services.findOne({
//             _id: serviceId,
//           });

//           // Then try ObjectId
//           if (!service && ObjectId.isValid(serviceId)) {
//             service = await services.findOne({
//               _id: new ObjectId(serviceId),
//             });
//           }
//         }

//         // Find vendor using vendorId
//         if (service?.vendorId) {
//           const vendorId = service.vendorId.toString();

//           const vendorQuery = [
//             { id: vendorId },
//             { _id: vendorId },
//           ];

//           if (ObjectId.isValid(vendorId)) {
//             vendorQuery.push({
//               _id: new ObjectId(vendorId),
//             });
//           }

//           vendor = await db.collection("user").findOne({
//             $or: vendorQuery,
//           });
//         }

//         // Return booking with service and vendor
//         return {
//           ...booking,

//           service: service
//             ? {
//                 serviceName: service.serviceName,

//                 image:
//                   (Array.isArray(service.images)
//                     ? service.images[0]
//                     : service.images) ||
//                   service.image ||
//                   service.imageUrl ||
//                   "",

//                 category: service.category,
//                 price: service.price,
//               }
//             : null,

//           vendor: vendor
//             ? {
//                 name: vendor.name,
//                 email: vendor.email,
//                 image: vendor.image,
//               }
//             : null,
//         };
//       })
//     );

//     return res.status(200).json({
//       success: true,
//       message: "Bookings fetched successfully",
//       data: enrichedBookings,
//     });

//   } catch (error) {
//     console.error("GET BOOKINGS ERROR:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch bookings",
//     });
//   }
// });


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

app.listen(port, () => {
    console.log(`WedPlan app listening on port ${port}`);
});