import { Router } from "express";
import donor from "../controllers/donor.controller.js";
import authenticate from "../authorization/accessControl.js";
import { uploadTripMasterCsv } from "../config/multer.js";

const router = Router();

const handleDonorCsv = (req, res, next) => {
  uploadTripMasterCsv.single("file")(req, res, (err) => {
    if (!err) return next();
    return res.status(400).send({ message: "Choose a CSV file up to 5 MB." });
  });
};

router.get("/lookup", [authenticate], donor.lookupByEmail);
router.post("/import", [authenticate, handleDonorCsv], donor.importDonors);
router.get("/", [authenticate], donor.findAll);
router.post("/", [authenticate], donor.create);
router.put("/:id", [authenticate], donor.update);

export default router;
