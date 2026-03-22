import express from "express";
import { eventBus } from "../utils/EventBus.js";

const router = express.Router();

router.get("/stream", (req, res) => {
  eventBus.addClient(req, res);
});

export default router;
