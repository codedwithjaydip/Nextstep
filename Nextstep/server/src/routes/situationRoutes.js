import { Router } from "express";
import * as situationController from "../controllers/situationController.js";

const router = Router();

router.post("/situations", situationController.createSituation);
router.get("/situations/:id", situationController.getSituation);
router.post("/situations/:id/answers", situationController.submitAnswers);
router.post("/situations/:id/updates", situationController.submitUpdate);
router.delete("/situations/:id", situationController.deleteSituation);

export default router;
