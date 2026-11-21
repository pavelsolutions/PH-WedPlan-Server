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

// GET USER PROFILE
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

// UPDATE USER PROFILE
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
    console.error("Get services error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch services",
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
// GET /jobs/:id — single job for the details page
app.get("/jobs/:id", async (req, res) => {
    try {
        const job = await jobs.findOne({ _id: new ObjectId(req.params.id) });
        if (!job) {
            return res.status(404).send({ message: "Job not found" });
        }
        res.send(job);
    } catch (error) {
        console.error("GET /jobs/:id failed:", error);
        // wrong id format (not a valid ObjectId) → 400, not a crash
        if (error.message?.includes("ObjectId") || error.name?.includes("BSON")) {
            return res.status(400).send({ message: "Invalid job id" });
        }
        res.status(500).send({ message: "Failed to fetch job" });
    }
});


// app.get('/applications', async (req, res) => {
//     const cursor = applications.find({});
//     const result = await cursor.toArray();
//     res.send(result);
// })



// POST /applications — save a job application (job info + user info)
app.post("/applications", async (req, res) => {
    try {
        const { jobId, userId, jobInfo, userInfo } = req.body;

        // basic validation
        if (!jobId || !userId) {
            return res.status(400).send({ message: "jobId and userId are required" });
        }

        // one application per user per job
        const existing = await applications.findOne({ jobId, userId });
        if (existing) {
            return res.status(409).send({ message: "You already applied to this job" });
        }

        const application = {
            jobId,
            userId,
            jobInfo,           // snapshot: title, company, salary, deadline...
            userInfo,          // snapshot: name, email, role
            status: "Pending", // Pending → Reviewed → Accepted / Rejected
            appliedAt: new Date().toISOString(),
        };

        const result = await applications.insertOne(application);
        res.status(201).send(result);
    } catch (error) {
        console.error("POST /applications failed:", error);
        res.status(500).send({ message: "Failed to submit application" });
    }
});

app.get('/applications/count', async (req, res) => {
    const query = {}
    if (req.query.applicantId) {
        query.userId = req.query.applicantId
    }

    const result = await applications.countDocuments(query);
    res.send(result);
})

// GET /applications — filter by user if provided
app.get("/applications", async (req, res) => {
    try {
        const filter = {};
        if (req.query.userId) filter.userId = req.query.userId; // ← this line

        const apps = await applications
            .find(filter)
            .sort({ appliedAt: -1 })
            .toArray();
        res.send(apps);
    } catch (error) {
        console.error("GET /applications failed:", error);
        res.status(500).send({ message: "Failed to fetch applications" });
    }
});



app.put("/jobs/:id", async (req, res) => {
    const result = await jobs.updateOne(
        { _id: new ObjectId(req.params.id) },   // ← must cast: _id is stored as ObjectId
        { $set: req.body }
    );
    res.send(result);
});

app.delete("/jobs/:id", async (req, res) => {
    const result = await jobs.deleteOne({ _id: new ObjectId(req.params.id) });
    res.send(result);
});

app.listen(port, () => {
    console.log(`WedPlan app listening on port ${port}`);
});