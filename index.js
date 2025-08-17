const express = require('express')
const app = express()
const cors = require('cors')
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 3000
dotenv.config();

// app.use(cors({
//     origin: ['http://localhost:5173', 'http://localhost:5174', 'https://tournest-bd.web.app/'],
//     credentials: true,
// }))
app.use(cors());
app.use(express.json())

var admin = require("firebase-admin");
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf-8')

var serviceAccount = JSON.parse(decoded);



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.upsc470.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


const stripe = require('stripe')(process.env.PAYMENT_GATEWAY_KEY);


async function run() {
    try {

        await client.connect();
        const db = client.db('tourNestDB');
        const usersCollection = db.collection('users')
        const packagesCollection = db.collection('packages')
        const bookingsCollection = client.db("tourNestDB").collection("bookings");
        const tourGuideCollection = db.collection('tourGuides')
        const storyCollection = db.collection('stories')
        const tourGuideApplicationsCollection = db.collection('tourGuideApplications')
        const paymentsCollection = db.collection('payments')


        // custom middlewares
        const verifyFBToken = async (req, res, next) => {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = authHeader.split(' ')[1];
            if (!token) {
                return res.status(401).send({ message: 'unauthorized access' })
            }

            // verify the token
            try {
                const decoded = await admin.auth().verifyIdToken(token);
                req.decoded = decoded;
                next();
            }
            catch (error) {
                return res.status(403).send({ message: 'forbidden access' })
            }
        }

        const verifyGuide = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            if (!user || user.role !== 'guide') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            if (!user || user.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }


        app.post('/users', async (req, res) => {
            const email = req.body.email
            const userExists = await usersCollection.findOne({ email });
            if (userExists) {
                return res.status(200).send({ message: 'User already exists', inserted: false });
            }

            const user = req.body

            const result = await usersCollection.insertOne(user);

            res.send(result)
        })



        app.get('/packages/count', verifyFBToken, verifyAdmin, async (req, res) => {
            try {
                const count = await packagesCollection.estimatedDocumentCount();
                res.send({ count });
            } catch (error) {
                res.status(500).send({ message: "Failed to count packages", error });
            }
        });



        // GET 3 random packages
        app.get('/packages/random', async (req, res) => {
            try {
                const result = await packagesCollection.aggregate([
                    { $sample: { size: 3 } }
                ]).toArray();
                res.send(result);
            } catch (error) {
                console.error('Failed to fetch random packages:', error);
                res.status(500).send({ message: 'Server error' });
            }
        });

        // GET package with id
        app.get('/packages/:id', async (req, res) => {
            try {
                const id = new ObjectId(req.params.id);
                const packageData = await packagesCollection.findOne({ _id: id });

                if (!packageData) {
                    return res.status(404).send({ message: 'Package not found' });
                }

                res.send(packageData);
            } catch (err) {
                console.error('Error fetching package:', err);
                res.status(500).send({ message: 'Internal server error' });
            }
        });

        //booking a package
        app.post('/bookings', verifyFBToken, async (req, res) => {
            try {
                const booking = req.body;
                const result = await bookingsCollection.insertOne(booking);
                res.send(result);
            } catch (error) {
                console.error('Failed to insert booking:', error);
                res.status(500).send({ message: 'Booking failed' });
            }
        });


        //get booking with user email
        // app.get('/bookings', verifyFBToken, async (req, res) => {
        //     const email = req.query.email;
        //     if (!email) return res.status(400).send({ message: 'Missing email' });
        //     const bookings = await bookingsCollection.find({ email }).toArray();
        //     res.send(bookings);
        // });

        app.get('/bookings', verifyFBToken, async (req, res) => {
            try {
                const email = req.query.email;
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;

                const query = { email };
                const totalCount = await bookingsCollection.countDocuments(query);
                const bookings = await bookingsCollection.find(query)
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                res.send({ bookings, totalCount });
            } catch (err) {
                res.status(500).send({ message: 'Failed to fetch bookings', error: err });
            }
        });



        // Get bookings assigned to a tour guide
        // app.get('/bookings/assigned', verifyFBToken, verifyGuide, async (req, res) => {
        //     try {
        //         const { email } = req.query;

        //         if (!email) return res.status(400).send({ message: 'Email required' });

        //         const bookings = await bookingsCollection.find({ guideNameEmail: email }).toArray();

        //         res.send(bookings);
        //     } catch (error) {

        //         res.status(500).send({ message: 'Server error', error: error.message });
        //     }
        // });

        app.get('/bookings/assigned', verifyFBToken, async (req, res) => {
            try {
                const email = req.query.email;
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;

                const query = { guideNameEmail: email }; // assuming guideEmail is stored
                const totalCount = await bookingsCollection.countDocuments(query);
                const bookings = await bookingsCollection
                    .find(query)
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                res.send({ bookings, totalCount });
            } catch (err) {
                res.status(500).send({ message: 'Failed to fetch assigned bookings', error: err });
            }
        });



        app.get('/bookings/:id', verifyFBToken, async (req, res) => {
            const { id } = req.params;
            try {
                const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
                if (!booking) {
                    return res.status(404).send({ message: 'Booking not found' });
                }
                res.send(booking);
            } catch (error) {
                res.status(500).send({ message: 'Server error', error });
            }
        });

        app.delete('/bookings/:id', verifyFBToken, async (req, res) => {
            const id = req.params.id;
            const result = await bookingsCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });


        app.get('/tourGuides/count', verifyFBToken, verifyAdmin, async (req, res) => {
            try {
                const count = await tourGuideCollection.estimatedDocumentCount();
                res.send({ count });
            } catch (error) {
                res.status(500).send({ message: "Failed to count tour guides", error });
            }
        });


        // GET 6 random tour guides
        app.get('/tourGuides/random', async (req, res) => {
            try {
                const result = await tourGuideCollection.aggregate([
                    { $sample: { size: 6 } }
                ]).toArray();
                res.send(result);
            } catch (err) {
                res.status(500).send({ message: 'Failed to fetch tour guides', error: err });
            }
        });


        // GET tourGuide with id
        app.get('/tourGuide/:id', async (req, res) => {
            try {
                const id = new ObjectId(req.params.id);
                const tourGuideData = await tourGuideCollection.findOne({ _id: id });

                if (!tourGuideData) {
                    return res.status(404).send({ message: 'Tour Guide not found' });
                }

                res.send(tourGuideData);
            } catch (err) {
                console.error('Error fetching tour guide:', err);
                res.status(500).send({ message: 'Internal server error' });
            }
        });


        // Get a single tour guide by email
        app.get('/tourGuides/email/:email', async (req, res) => {
            const email = req.params.email;

            try {
                const guide = await tourGuideCollection.findOne({ email: email });

                if (!guide) {
                    return res.status(404).send({ message: 'Tour guide not found' });
                }

                res.send(guide);
            } catch (error) {
                console.error('Error fetching tour guide:', error);
                res.status(500).send({ message: 'Server error' });
            }
        });


        app.patch('/tourGuides/:id', verifyFBToken, verifyGuide, async (req, res) => {
            const { id } = req.params;
            const updatedData = req.body;

            const result = await tourGuideCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );

            res.send(result);
        });



        app.get('/stories/count', verifyFBToken, verifyAdmin, async (req, res) => {
            try {
                const count = await storyCollection.estimatedDocumentCount();
                res.send({ count });
            } catch (error) {
                res.status(500).send({ message: "Failed to count stories", error });
            }
        });




        // GET 4 random tourist stories
        app.get('/stories/random', async (req, res) => {
            try {
                const result = await storyCollection.aggregate([
                    { $sample: { size: 4 } }
                ]).toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Failed to fetch stories', error });
            }
        });



        // Get all tourist stories
        // app.get('/stories', async (req, res) => {
        //     try {
        //         const result = await storyCollection.find().toArray();
        //         res.send(result);
        //     } catch (error) {
        //         res.status(500).send({ message: 'Failed to fetch stories', error });
        //     }
        // });

        app.get('/stories', async (req, res) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;

                const totalCount = await storyCollection.estimatedDocumentCount();

                const stories = await storyCollection
                    .find()
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                res.send({ stories, totalCount });
            } catch (error) {
                res.status(500).send({ message: 'Failed to fetch stories', error });
            }
        });


        app.post('/stories', verifyFBToken, async (req, res) => {
            const story = req.body;
            const result = await storyCollection.insertOne(story);
            res.send(result);
        });




        // GET stories by email
        app.get('/stories/user', verifyFBToken, async (req, res) => {
            const email = req.query.email;
            if (!email) return res.status(400).send({ message: 'Missing email' });

            const stories = await storyCollection.find({ email }).toArray();
            res.send(stories);
        });


        // Get stories of our Guides
        app.get('/getGuideStories/user', async (req, res) => {
            const email = req.query.email;
            if (!email) return res.status(400).send({ message: 'Missing email' });

            const stories = await storyCollection.find({ email }).toArray();
            res.send(stories);
        });


        // GET story with id
        app.get('/stories/:id', verifyFBToken, async (req, res) => {
            try {
                const id = new ObjectId(req.params.id);
                const storyData = await storyCollection.findOne({ _id: id });

                if (!storyData) {
                    return res.status(404).send({ message: 'story not found' });
                }

                res.send(storyData);
            } catch (err) {
                console.error('Error fetching tour guide:', err);
                res.status(500).send({ message: 'Internal server error' });
            }
        });

        //get story details with id
        app.get('/storyDetails/:id', async (req, res) => {
            try {
                const id = new ObjectId(req.params.id);
                const storyData = await storyCollection.findOne({ _id: id });

                if (!storyData) {
                    return res.status(404).send({ message: 'story not found' });
                }

                res.send(storyData);
            } catch (err) {
                console.error('Error fetching data:', err);
                res.status(500).send({ message: 'Internal server error' });
            }
        });



        app.get('/allTripsCard', async (req, res) => {
            try {
                const result = await packagesCollection.find().toArray();
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Failed to fetch stories', error });
            }
        });

        app.get('/allTrips', async (req, res) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;

                const totalCount = await packagesCollection.estimatedDocumentCount();
                const result = await packagesCollection.find().skip(skip).limit(limit).toArray();

                res.send({ result, totalCount });
            } catch (error) {
                res.status(500).send({ message: 'Failed to fetch trips', error });
            }
        });




        // app.get('/users/count', verifyFBToken, verifyAdmin, async (req, res) => {
        //     try {
        //         const role = req.query.role || 'user';
        //         const count = await usersCollection.countDocuments({ role });
        //         res.send({ count });
        //     } catch (error) {
        //         res.status(500).send({ message: "Failed to count users by role", error });
        //     }
        // });


        app.get('/users/count', verifyFBToken, verifyAdmin, async (req, res) => {
            try {
                const role = req.query.role;

                const query = role ? { role } : {};
                const count = await usersCollection.countDocuments(query);

                res.send({ count });
            } catch (error) {
                res.status(500).send({ message: "Failed to count users by role", error });
            }
        });



        // Get user role by email
        app.get('/users/role', verifyFBToken, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                return res.status(400).send({ message: 'Missing email' });
            }
            const user = await usersCollection.findOne({ email });
            if (!user) return res.status(404).send({ message: 'User not found' });
            res.send({ role: user.role });
        });



        // Update user profile (name and photo only)
        app.patch('/users/update', verifyFBToken, async (req, res) => {
            const { email, name, photoURL } = req.body;
            const result = await usersCollection.updateOne(
                { email },
                { $set: { name, photoURL } }
            );
            res.send(result);
        });


        app.post('/tourGuideApplications', verifyFBToken, async (req, res) => {
            const application = req.body;
            application.posted_at = new Date().toISOString();
            const result = await db.collection('tourGuideApplications').insertOne(application);
            res.send(result);
        });




        // DELETE story
        app.delete('/stories/:id', async (req, res) => {
            const id = req.params.id;
            const result = await storyCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });



        // PATCH update story (only if email matches)
        app.patch('/stories/:id', verifyFBToken, async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    name: updatedData.name,
                    tourDate: updatedData.tourDate,
                    tourDestination: updatedData.tourDestination,
                    description: updatedData.description,
                    tourDuration: updatedData.tourDuration
                }
            };

            const result = await storyCollection.updateOne(filter, updateDoc);
            res.send(result);
        });



        // PATCH: Remove a photo
        app.patch('/stories/remove-photo/:id', async (req, res) => {
            const id = req.params.id;
            const { photoURL } = req.body;
            const result = await storyCollection.updateOne(
                { _id: new ObjectId(id) },
                { $pull: { tourPhotos: photoURL } }
            );
            res.send(result);
        });



        // PATCH: Add new photo
        app.patch('/stories/add-photo/:id', async (req, res) => {
            const id = req.params.id;
            const { photoURL } = req.body;
            const result = await storyCollection.updateOne(
                { _id: new ObjectId(id) },
                { $push: { tourPhotos: photoURL } }
            );
            res.send(result);
        });



        app.post('/packages', verifyFBToken, verifyAdmin, async (req, res) => {
            try {
                const newPackage = req.body;
                const result = await packagesCollection.insertOne(newPackage);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Failed to add package', error });
            }
        });



        app.get('/users', verifyFBToken, verifyAdmin, async (req, res) => {
            try {
                const { search = '', role = '', limit = 10, skip = 0 } = req.query;

                const query = {
                    $and: [
                        role ? { role } : {},
                        {
                            $or: [
                                { name: { $regex: search, $options: 'i' } },
                                { email: { $regex: search, $options: 'i' } }
                            ]
                        }
                    ]
                };

                const users = await usersCollection
                    .find(query)
                    .skip(parseInt(skip))
                    .limit(parseInt(limit))
                    .toArray();

                res.send(users);
            } catch (error) {
                res.status(500).send({ message: 'Failed to fetch users', error });
            }
        });




        // GET all tour guide applications
        // app.get('/tourGuideApplications', verifyFBToken, verifyAdmin, async (req, res) => {
        //     const applications = await tourGuideApplicationsCollection.find().toArray();
        //     res.send(applications);
        // });

        app.get('/tourGuideApplications', verifyFBToken, verifyAdmin, async (req, res) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;

                const totalCount = await tourGuideApplicationsCollection.countDocuments();
                const applications = await tourGuideApplicationsCollection.find()
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                res.send({ applications, totalCount });
            } catch (error) {
                res.status(500).send({ message: 'Failed to fetch applications', error });
            }
        });




        // PATCH user role to 'guide'
        app.patch('/users/role', verifyFBToken, verifyAdmin, async (req, res) => {
            const { email, role } = req.body;
            const result = await usersCollection.updateOne({ email }, { $set: { role } });
            res.send(result);
        });

        // DELETE application by ID
        app.delete('/tourGuideApplications/:id', verifyFBToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const result = await tourGuideApplicationsCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);
        });


        app.post('/create-payment-intent', verifyFBToken, async (req, res) => {
            const { amount } = req.body;
            const paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency: 'bdt',
                payment_method_types: ['card'],
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        });


        app.post('/payments', verifyFBToken, async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            res.send(result);
        });


        app.patch('/bookings/:id', verifyFBToken, async (req, res) => {
            const id = req.params.id;
            const updateDoc = {
                $set: {
                    status: 'in review',
                    transactionId: req.body.transactionId
                }
            };
            const result = await bookingsCollection.updateOne(
                { _id: new ObjectId(id) },
                updateDoc
            );
            res.send(result);
        });




        // Update booking status
        app.patch('/bookings/status/:id', verifyFBToken, verifyGuide, async (req, res) => {
            const { id } = req.params;
            const { status } = req.body;
            const result = await bookingsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status } }
            );
            res.send(result);
        });



        // POST a new tour guide
        app.post('/tourGuides', verifyFBToken, verifyAdmin, async (req, res) => {
            try {
                const tourGuide = req.body;

                if (!tourGuide?.email || !tourGuide?.name) {
                    return res.status(400).send({ message: 'Name and Email are required' });
                }

                const existing = await tourGuideCollection.findOne({ email: tourGuide.email });

                if (existing) {
                    return res.status(409).send({ message: 'This user is already a tour guide' });
                }

                const result = await tourGuideCollection.insertOne(tourGuide);
                res.status(201).send(result);

            } catch (error) {
                console.error('Failed to add tour guide:', error);
                res.status(500).send({ message: 'Server error', error });
            }
        });

        // Get all tour guides
        app.get('/tourGuides', async (req, res) => {
            try {
                const guides = await tourGuideCollection.find().toArray();
                res.send(guides);
            } catch (err) {
                res.status(500).send({ message: 'Failed to fetch guides' });
            }
        });



        app.get('/payments/sum', verifyFBToken, verifyAdmin, async (req, res) => {
            try {
                const result = await paymentsCollection.aggregate([
                    {
                        $group: {
                            _id: null,
                            total: { $sum: "$amount" }
                        }
                    }
                ]).toArray();

                res.send({ total: result[0]?.total || 0 });
            } catch (error) {
                res.status(500).send({ message: "Failed to calculate total payment", error });
            }
        });





        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        app.get('/', (req, res) => {
            res.send('tourNest server is running')
        })

        app.listen(port, () => {
            console.log(`tourNest app listening on port ${port}`)
        })
    } catch (err) {
        console.error('MongoDB error:', err);
    }
}
run();