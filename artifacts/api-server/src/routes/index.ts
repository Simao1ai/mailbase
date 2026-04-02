import { Router, type IRouter } from "express";
import healthRouter from "./health";
import domainsRouter from "./domains";
import contactsRouter from "./contacts";
import listsRouter from "./lists";
import templatesRouter from "./templates";
import campaignsRouter from "./campaigns";
import analyticsRouter from "./analytics";
import transactionalRouter from "./transactional";
import tenantsRouter from "./tenants";
import inboxRouter from "./inbox";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/domains", domainsRouter);
router.use("/contacts", contactsRouter);
router.use("/lists", listsRouter);
router.use("/templates", templatesRouter);
router.use("/campaigns", campaignsRouter);
router.use("/analytics", analyticsRouter);
router.use("/transactional", transactionalRouter);
router.use("/tenants", tenantsRouter);
router.use("/inbox", inboxRouter);

export default router;
