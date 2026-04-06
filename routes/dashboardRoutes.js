import express from "express";
import auth from "../middleware/auth.js";
import {
  createApplication,
  createPortfolioAsset,
  deleteApplication,
  deletePortfolioAsset,
  getDashboardWorkspace,
  updatePortfolioAsset,
  updateApplication,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/workspace", auth, getDashboardWorkspace);
router.post("/applications", auth, createApplication);
router.put("/applications/:id", auth, updateApplication);
router.delete("/applications/:id", auth, deleteApplication);
router.post("/portfolio-assets", auth, createPortfolioAsset);
router.put("/portfolio-assets/:id", auth, updatePortfolioAsset);
router.delete("/portfolio-assets/:id", auth, deletePortfolioAsset);

export default router;
