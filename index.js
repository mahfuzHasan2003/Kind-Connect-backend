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

      //    home route
      app.get("/", async (req, res) => res.send("Hallo Bruder!"));

      //    get all volunteer need posts
      app.get("/all-vol-need-posts", async (req, res) => {
         const sort = {};
         const showAtMost = parseInt(req.query.limit);
         const sortBy = req.query.sortby;
         if (sortBy === "dateAscending") sort.deadline = 1;
         const data = await allVolNeedPostCollection
            .find()
            .limit(showAtMost)
            .sort(sort)
            .toArray();
         res.send(data);
      });

      // get a single volunteer post by id
      app.get("/vol-need-post/:id", async (req, res) => {
         const id = req.params.id;
         const data = await allVolNeedPostCollection.findOne({
            _id: new ObjectId(id),
         });
         res.send(data);
      });
   } catch (err) {
      console.error(err);
   }
}
run();

app.listen(port, () => {
   console.log(`App listening on ${port}`);
});
