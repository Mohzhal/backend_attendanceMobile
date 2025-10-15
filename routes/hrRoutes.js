// routes/hrRoutes.js
import express from "express";
import {
  getApplicantsByCompany,
  verifyApplicant,
  getVerifiedEmployees,
} from "../controller/hrController.js";
import { 
  authenticate, 
  authorizeRoles 
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Semua route HR hanya bisa diakses oleh 'hr' dan 'super_admin'
router.get(
  "/applicants", 
  authenticate,
  authorizeRoles("hr", "super_admin"),
  getApplicantsByCompany
);

router.put(
  "/verify-applicant/:id", 
  authenticate,
  authorizeRoles("hr", "super_admin"),
  verifyApplicant
);

router.get(
  "/verified-employees", 
  authenticate,
  authorizeRoles("hr", "super_admin"),
  getVerifiedEmployees
);

export default router;