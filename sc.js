require('dotenv').config();
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    await mongoose.connection.db.collection("users").deleteMany({});
    console.log("All users deleted");
    process.exit();
  })
  .catch(console.error);
