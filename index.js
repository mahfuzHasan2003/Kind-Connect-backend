const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();

app.use(
   cors({
      origin: "http://localhost:5173",
      credentials: true,
      optionsSuccessStatus: 200,
   })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_password}@cluster0.xggde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
   serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
   },
});

// verify token
const verifyToken = (req, res, next) => {
   const token = req.cookies?.token;
   if (!token) return res.status(401).send({ message: "unauthorized access" });
   jwt.verify(token, process.env.SECRET_KEY, (error, decoded) => {
      if (error) {
         return res.status(401).send({ message: "unauthorized access" });
      }
      req.user = decoded;
      next();
   });
};

async function run() {
   try {
      await client.connect();
      console.log(
         "Pinged your deployment. You successfully connected to MongoDB!"
      );

      const database = client.db("kind-connect");
      const allVolNeedPostCollection = database.collection(
         "all_volunteer_need_posts"
      );
      const toBeVolReqCollection = database.collection(
         "all_to_be_vol_reqquest"
      );

      //    home route
      app.get("/", async (req, res) => res.send("Hallo Bruder!"));

      //    get all volunteer need posts
      app.get("/all-vol-need-posts", async (req, res) => {
         const sort = {};
         const showAtMost = parseInt(req.query.limit);
         const searchText = req.query.search || "";
         let searchQuery = {
            post_title: { $regex: searchText, $options: "i" },
         };
         const sortBy = req.query.sortby;
         if (sortBy === "dateAscending") sort.deadline = 1;
         const result = await allVolNeedPostCollection
            .find(searchQuery)
            .limit(showAtMost)
            .sort(sort)
            .toArray();
         res.send(result);
      });

      // get user all vol need posts
      app.get("/user-vol-need-posts/", verifyToken, async (req, res) => {
         const email = req.query.email;
         const result = await allVolNeedPostCollection
            .find({ organizer_email: email })
            .toArray();
         console.log(req.user?.email);
         res.send(result);
      });

      // post a volunteer need request
      app.post("/all-vol-need-posts", async (req, res) => {
         const postData = req.body;
         const result = await allVolNeedPostCollection.insertOne(postData);
         res.send(result);
      });

      // get a single volunteer post by id
      app.get("/vol-need-post/:id", async (req, res) => {
         const id = req.params.id;
         const result = await allVolNeedPostCollection.findOne({
            _id: new ObjectId(id),
         });
         res.send(result);
      });

      //  patch a single volunteer post by id
      app.patch("/vol-need-post/:id", async (req, res) => {
         const id = req.params.id;
         const updatedData = req.body;
         const result = await allVolNeedPostCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedData }
         );
         res.send(result);
      });

      // delete a single volunteer post by id
      app.delete("/vol-need-post/:id", async (req, res) => {
         const id = req.params.id;
         const result = await allVolNeedPostCollection.deleteOne({
            _id: new ObjectId(id),
         });
         res.send(result);
      });

      // get --> all to be vol request by user
      app.get("/to-be-vol-req", verifyToken, async (req, res) => {
         const email = req.query.email;
         const result = await toBeVolReqCollection
            .find({ "req_user.email": email })
            .toArray();
         res.send(result);
      });

      // delete a single request by id
      app.delete("/to-be-vol-req/:id", async (req, res) => {
         const id = req.params.id;
         const result = await toBeVolReqCollection.deleteOne({
            _id: new ObjectId(id),
         });
         res.send(result);
      });

      // post a to be vol req
      app.post("/to-be-vol-req", async (req, res) => {
         const reqData = req.body;
         const result = await toBeVolReqCollection.insertOne(reqData);

         // update volunteer needed number
         const decreaseVolNeeded = await allVolNeedPostCollection.updateOne(
            {
               _id: new ObjectId(reqData.vol_need_post_id),
            },
            {
               $inc: { volunteers_needed: -1 },
            }
         );
         res.send(result);
      });

      // JWT token varification
      app.post("/jwt", async (req, res) => {
         const email = req.body;
         const token = jwt.sign(email, process.env.SECRET_KEY, {
            expiresIn: "30d",
         });
         res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
         }).send({ success: true });
      });

      // remove cookies after logout
      app.get("/clear-token", async (req, res) => {
         res.clearCookie("token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
         }).send({ success: true });
      });
   } catch (err) {
      console.error(err);
   }
}
run();

app.listen(port, () => {
   console.log(`App listening on ${port}`);
});
