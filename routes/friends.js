import express from "express";
const router = express.Router();
import * as friendsController from "../controllers/friendsController.js";
import auth from "../middleware/auth.js";
import User from "../models/User.js";
import Friendship from "../models/Friendship.js";
router.get("/search", auth, async (req, res) => {
  try {
    const query = req.query.q?.trim();
    if (!query) {
      return res.status(400).json({ message: "Missing search query" });
    }

    const regex = new RegExp(query, "i");

    // Get the current user's data (friends list)
    const currentUser = await User.findById(req.user.id)
      .select("friends")
      .lean();

    // Friends array from user doc
    const friendsList = currentUser?.friends?.map(f => f.toString()) || [];

    // Get IDs with pending requests (both sent and received)
    const pendingRequests = await Friendship.find({
      $or: [
        { requester: req.user.id },
        { recipient: req.user.id }
      ],
      status: "pending"
    })
    .select("requester recipient")
    .lean();

    const pendingIds = pendingRequests.flatMap(r => [
      r.requester.toString(),
      r.recipient.toString()
    ]);

    // Combine friends + pending into an "exclude" list
    const excludeIds = [...new Set([req.user.id, ...friendsList, ...pendingIds])];

    // Find matching users that are not in exclude list
    const users = await User.find({
      _id: { $nin: excludeIds },
      $or: [
        { username: { $regex: regex } },
        { email: { $regex: regex } }
      ]
    })
      .select("_id username profilePicture")
      .limit(20);

    res.json(users);
  } catch (err) {
    console.error("Error searching users:", err);
    res.status(500).json({ message: "Error searching users" });
  }
});

router.post('/request/:id', auth, friendsController.sendRequest);
router.post('/accept/:id', auth, friendsController.acceptRequest);
router.delete('/:id',auth, friendsController.removeFriend);
router.post('/decline/:id', auth, friendsController.declineRequest);
router.get('/', auth, friendsController.getFriends);
router.get('/requests', auth, friendsController.getPendingRequests);


export default router;;
