import { Router, type IRouter } from "express";
import healthRouter from "./health";
import charactersRouter from "./characters";

const router: IRouter = Router();

router.use(healthRouter);
router.use(charactersRouter);

export default router;
