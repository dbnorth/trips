import { Router } from "express";
import emailPictures from "../controllers/emailPicture.controller.js";
import { authenticate } from "../authorization/accessControl.js";
import { uploadEmailPicture } from "../config/multer.js";
import { convertUploadedPicture } from "../utils/heicToJpeg.js";

const router = Router();

const handlePictureUpload = (req, res, next) => {
  uploadEmailPicture.single("file")(req, res, (err) => {
    if (!err) return convertUploadedPicture(req, res, next);
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "The picture must be 2 MB or smaller."
        : "Upload a PNG, JPEG, GIF, or HEIC picture.";
    return res.status(400).send({ message });
  });
};

router.get("/", [authenticate], emailPictures.findAll);
router.post("/", [authenticate, handlePictureUpload], emailPictures.create);
router.put("/:id", [authenticate], emailPictures.update);
router.delete("/:id", [authenticate], emailPictures.delete);

export default router;
