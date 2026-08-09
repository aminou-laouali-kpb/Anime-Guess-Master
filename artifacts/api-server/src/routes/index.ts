import { Router, type IRouter } from "express";
import healthRouter from "./health";
import charactersRouter from "./characters";
import roomsRouter from "./rooms";

const router: IRouter = Router();

router.use(healthRouter);
router.use(charactersRouter);
router.use(roomsRouter);

export default router;
