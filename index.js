import express from 'express';
import cors from "cors";
import "dotenv/config";

import { MongoClient } from 'mongodb';

import { ObjectId } from "mongodb";


const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(cors());


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
const database = connectedClient.db("hireloopdb");
const users = database.collection("user");
const jobs = database.collection("jobs");
const applications = database.collection("applications");


app.get('/', (req, res) => {
    res.send('Hire loop is looping!');
});

app.get('/users', async (req, res) => {
    const cursor = users.find({});
    const result = await cursor.toArray();
    res.send(result);
})

//jobs related apis
app.post('/jobs', async (req, res) => {
    const job = req.body;
    const result = await jobs.insertOne(job);
    res.send(result);
})

// app.get('/jobs', async(req, res) => {

//     const query = {};
//     console.log('query', req.query);
//     if(req.query){
//         if(req.query.jobType){
//             query.jobType = req.query.jobType;
//         }
//         if(req.query.isRemote){
//             query.isRemote = req.query.isRemote === 'true'
//         }
//     }

//     const jobsData = jobs.find(query);
//     const result = await jobsData.toArray();
//     res.send(result);
// })




app.get("/jobs", async (req, res) => {
    try {
        const query = {};

        const { jobType, isRemote, search } = req.query;

        // Filter by job type
        if (jobType) {
            query.jobType = {
                $regex: `^${jobType}$`,
                $options: "i",
            };
        }

        // Filter by remote status
        if (isRemote !== undefined) {
            query.isRemote = isRemote === "true";
        }

        // Search by title, responsibilities, and requirements
        if (search) {
            query.$or = [
                { jobTitle: { $regex: search, $options: "i" } },
                { companyName: { $regex: search, $options: "i" } },
                { responsibilities: { $regex: search, $options: "i" } },
                { requirements: { $regex: search, $options: "i" } },
            ];
        }

        const result = await jobs.find(query).toArray();

        res.send(result);
    } catch (error) {
        res.status(500).send({ message: "Failed to fetch jobs" });
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
    if(req.query.applicantId){
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
    console.log(`Hire loop app listening on port ${port}`);
});