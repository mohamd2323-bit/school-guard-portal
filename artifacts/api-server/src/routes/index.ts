import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import appdataRouter from "./appdata.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(appdataRouter);

export default router;
