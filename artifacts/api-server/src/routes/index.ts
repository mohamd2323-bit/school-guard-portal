import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import appdataRouter from "./appdata.js";
import unifiedSupportRouter from "./unifiedSupport.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(appdataRouter);
router.use(unifiedSupportRouter);

export default router;
