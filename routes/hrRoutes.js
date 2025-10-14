import express from "express";
import {
  getApplicantsByCompany,
  verifyApplicant,
  getVerifiedEmployees,
} from "../controller/hrController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();


const checkHRAccess = (req, res, next) => {
  const userRole = req.user.role;
  
  if (userRole !== "hr" && userRole !== "super_admin") {
    return res.status(403).json({ 
      msg: "Akses ditolak. Hanya HR atau Super Admin yang dapat mengakses endpoint ini." 
    });
  }
  
  next();
};


router.get(
  "/applicants", 
  authenticate, 
  checkHRAccess, 
  getApplicantsByCompany
);


router.put(
  "/verify-applicant/:id", 
  authenticate, 
  checkHRAccess, 
  verifyApplicant
);


router.get(
  "/verified-employees", 
  authenticate, 
  checkHRAccess, 
  getVerifiedEmployees
);

export default router;