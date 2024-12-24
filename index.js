const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_password}@cluster0.xggde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
   serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
   },
});

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
         const searchText = req.query.search;
         const email = req.query.email;
         let query = {};
         if (searchText)
            query = { post_title: { $regex: searchText, $options: "i" } };
         if (email) query = { organizer_email: email };
         const sortBy = req.query.sortby;
         if (sortBy === "dateAscending") sort.deadline = 1;
         const result = await allVolNeedPostCollection
            .find(query)
            .limit(showAtMost)
            .sort(sort)
            .toArray();
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
      app.get("/to-be-vol-req", async (req, res) => {
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
   } catch (err) {
      console.error(err);
   }
}
run();

app.listen(port, () => {
   console.log(`App listening on ${port}`);
});
